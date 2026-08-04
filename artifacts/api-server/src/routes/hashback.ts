import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { requireAuth } from "../middlewares/auth";
import { getActivationFee } from "../lib/appSettings";
import {
  getHashbackAccountId,
  hasHashbackWebhookSecret,
  pullHashbackTransaction,
  verifyHashbackSignature,
} from "../lib/hashback";
import { supabase } from "../lib/supabase";
import { triggerReferralBonus } from "../lib/referralBonus";

const router: IRouter = Router();

function amount(value: unknown): number {
  return Number(value ?? 0) || 0;
}

function activationDescription(reference: string): string {
  return `HASHBACK:${reference}:activate`;
}

router.post("/activate", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const accountId = getHashbackAccountId();
    const apiKey = String(process.env["hashback_api_key"] ?? "").trim();

    if (!accountId || !apiKey) {
      res.status(503).json({
        error: "ConfigurationError",
        message: "Hashback payment is not configured yet.",
      });
      return;
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, country, status")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      res.status(404).json({ error: "NotFound", message: "User not found." });
      return;
    }

    if (String((user as Record<string, unknown>)["country"] ?? "") !== "KE") {
      res.status(400).json({
        error: "ValidationError",
        message: "Hashback activation is available for Kenya users only.",
      });
      return;
    }

    if (String((user as Record<string, unknown>)["status"] ?? "") === "active") {
      res.status(400).json({ error: "AlreadyActive", message: "Account is already active." });
      return;
    }

    const activationAmount = await getActivationFee("KE");
    const reference = `MUL-HB-activate-${userId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "recharge",
        amount: activationAmount,
        status: "pending",
        description: activationDescription(reference),
      })
      .select("id")
      .single();

    if (transactionError || !transaction) {
      req.log.error({ transactionError, userId }, "Failed to create Hashback activation transaction");
      res.status(500).json({ error: "ServerError", message: "Failed to prepare Hashback payment." });
      return;
    }

    res.json({
      accountId,
      amount: activationAmount,
      currency: "KES",
      reference,
      transactionId: (transaction as Record<string, unknown>)["id"],
    });
  } catch (err) {
    req.log.error({ err }, "Hashback activation setup error");
    res.status(500).json({ error: "ServerError", message: "Failed to prepare Hashback payment." });
  }
});

router.get("/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const reference = String(req.query["reference"] ?? "").trim();
    if (!reference) {
      res.status(400).json({ error: "ValidationError", message: "Payment reference is required." });
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id, status, amount, description")
      .eq("user_id", userId)
      .like("description", `HASHBACK:${reference}:activate%`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    const transaction = (data?.[0] ?? null) as Record<string, unknown> | null;
    if (!transaction) {
      res.status(404).json({ error: "NotFound", message: "Hashback payment not found." });
      return;
    }

    res.json({
      status: String(transaction["status"] ?? "pending"),
      amount: amount(transaction["amount"]),
    });
  } catch (err) {
    req.log.error({ err }, "Hashback payment status error");
    res.status(500).json({ error: "ServerError", message: "Failed to check Hashback payment status." });
  }
});

export async function handleHashbackCallback(req: Request, res: Response): Promise<void> {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = String(req.get("X-Hashpay-Signature") ?? "");

  try {
    if (hasHashbackWebhookSecret() && !verifyHashbackSignature(rawBody, signature)) {
      res.status(401).send("Invalid Hashback webhook signature");
      return;
    }

    if (!hasHashbackWebhookSecret()) {
      req.log.error(
        "HASHBACK_WEBHOOK_SECRET is not configured; refusing to process callback",
      );
      res.status(503).json({
        error: "ConfigurationError",
        message: "Hashback webhook secret is not configured.",
      });
      return;
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
    const event = String(payload["event"] ?? "");
    const responseCode = payload["ResponseCode"];
    const reference = String(payload["TransactionReference"] ?? "").trim();
    const hashbackTransactionId = String(payload["TransactionID"] ?? "").trim();
    const callbackAmount = amount(payload["TransactionAmount"]);
    const configuredAccountId = getHashbackAccountId();
    const callbackAccountId = String(payload["AccountID"] ?? "").trim();

    req.log.info(
      {
        event,
        responseCode,
        reference,
        hashbackTransactionId,
        callbackAmount,
        callbackAccountId,
      },
      "HASHBACK_CALLBACK: Received payment callback",
    );

    if (event !== "payment.success" || Number(responseCode) !== 0) {
      res.status(200).json({ received: true });
      return;
    }

    if (!reference || !hashbackTransactionId) {
      res.status(400).json({ error: "InvalidCallback", message: "Missing Hashback payment reference." });
      return;
    }

    if (callbackAccountId && configuredAccountId && callbackAccountId !== configuredAccountId) {
      res.status(401).json({ error: "InvalidCallback", message: "Hashback account mismatch." });
      return;
    }

    const { data: pendingTransactions, error: lookupError } = await supabase
      .from("transactions")
      .select("id, user_id, amount, status, description")
      .like("description", `HASHBACK:${reference}:activate%`)
      .limit(1);

    if (lookupError) throw lookupError;
    const transaction = (pendingTransactions?.[0] ?? null) as Record<string, unknown> | null;
    if (!transaction) {
      req.log.warn({ reference }, "HASHBACK_CALLBACK: No matching pending transaction");
      res.status(404).json({ error: "NotFound", message: "Hashback payment reference not found." });
      return;
    }

    if (String(transaction["status"]) === "completed") {
      res.status(200).json({ received: true });
      return;
    }

    const expectedAmount = amount(transaction["amount"]);
    if (callbackAmount !== expectedAmount) {
      req.log.error({ reference, callbackAmount, expectedAmount }, "HASHBACK_CALLBACK: Amount mismatch");
      res.status(422).json({ error: "AmountMismatch", message: "Hashback payment amount mismatch." });
      return;
    }

    const pullResult = await pullHashbackTransaction(hashbackTransactionId);
    const pulledAmount = amount(pullResult.data?.amount);
    if (!pullResult.success || !pullResult.data || pulledAmount !== expectedAmount) {
      req.log.error(
        { reference, hashbackTransactionId, pullResult, expectedAmount, pulledAmount },
        "HASHBACK_CALLBACK: PULL API validation failed",
      );
      res.status(502).json({ error: "VerificationFailed", message: "Hashback transaction could not be verified." });
      return;
    }

    const userId = Number(transaction["user_id"]);
    const { data: updatedUsers, error: userError } = await supabase
      .from("users")
      .update({ status: "active" })
      .eq("id", userId)
      .eq("status", "inactive")
      .select("id");

    if (userError) throw userError;

    const updatedDescription = `${activationDescription(reference)}:${hashbackTransactionId}`;
    const { error: transactionUpdateError } = await supabase
      .from("transactions")
      .update({ status: "completed", description: updatedDescription })
      .eq("id", transaction["id"]);

    if (transactionUpdateError) throw transactionUpdateError;

    if (updatedUsers && updatedUsers.length > 0) {
      await triggerReferralBonus(userId, req.log);
    }

    req.log.info(
      { reference, hashbackTransactionId, userId, amount: expectedAmount },
      "HASHBACK_CALLBACK: Kenya account activated",
    );
    res.status(200).json({ received: true });
  } catch (err) {
    req.log.error({ err }, "HASHBACK_CALLBACK: Processing failed");
    res.status(500).json({ error: "ServerError", message: "Hashback callback processing failed." });
  }
}

export default router;