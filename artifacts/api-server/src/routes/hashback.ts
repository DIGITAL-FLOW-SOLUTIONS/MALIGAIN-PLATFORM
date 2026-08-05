import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { requireAuth } from "../middlewares/auth";
import { getActivationFee, getKenyaAutomaticPaymentProvider } from "../lib/appSettings";
import {
  getHashbackAccountId,
  hasHashbackWebhookSecret,
  pullHashbackTransaction,
  verifyHashbackSignature,
} from "../lib/hashback";
import { supabase } from "../lib/supabase";
import { pool } from "../lib/db";
import { triggerReferralBonus } from "../lib/referralBonus";

const router: IRouter = Router();

function amount(value: unknown): number {
  return Number(value ?? 0) || 0;
}

type HashbackPaymentType = "activate" | "investment" | "spin";

function paymentDescription(reference: string, type: HashbackPaymentType, extra?: number): string {
  return extra ? `HASHBACK:${reference}:${type}:${extra}` : `HASHBACK:${reference}:${type}`;
}

router.post("/activate", requireAuth, async (req: Request, res: Response) => {
  try {
    const automaticProvider = await getKenyaAutomaticPaymentProvider();
    if (automaticProvider !== "HASHBACK") {
      res.status(409).json({
        error: "PaymentProviderChanged",
        message: "Hashback is currently disabled for Kenya. Please use PayHero M-Pesa.",
        provider: automaticProvider,
      });
      return;
    }

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
        description: paymentDescription(reference, "activate"),
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

async function createHashbackPayment(
  req: Request,
  res: Response,
  type: "investment" | "spin",
): Promise<void> {
  let createdInvestmentId: number | null = null;
  try {
    const automaticProvider = await getKenyaAutomaticPaymentProvider();
    if (automaticProvider !== "HASHBACK") {
      res.status(409).json({
        error: "PaymentProviderChanged",
        message: "Hashback is currently disabled for Kenya. Please use PayHero M-Pesa.",
        provider: automaticProvider,
      });
      return;
    }
    const userId = req.session.userId!;
    const accountId = getHashbackAccountId();
    const apiKey = String(process.env["hashback_api_key"] ?? "").trim();
    if (!accountId || !apiKey) {
      res.status(503).json({ error: "ConfigurationError", message: "Hashback payment is not configured yet." });
      return;
    }
    const { data: user, error: userError } = await supabase.from("users").select("id, country, status").eq("id", userId).single();
    if (userError || !user || String((user as Record<string, unknown>)["country"] ?? "") !== "KE") {
      res.status(400).json({ error: "ValidationError", message: "Hashback payments are available for Kenya users only." });
      return;
    }

    let amount = 0;
    let extra = 0;
    if (type === "investment") {
      const planId = Number(req.body?.planId);
      if (!planId) {
        res.status(400).json({ error: "ValidationError", message: "Investment plan is required." });
        return;
      }
      const { data: plan, error: planError } = await supabase.from("investment_plans").select("*").eq("id", planId).eq("is_active", true).single();
      if (planError || !plan) {
        res.status(404).json({ error: "NotFound", message: "Investment plan not found." });
        return;
      }
      const p = plan as Record<string, unknown>;
      const { data: pending } = await supabase.from("user_investments").select("id").eq("user_id", userId).eq("plan_id", planId).eq("status", "pending").limit(1);
      if (pending?.length) {
        res.status(409).json({ error: "Conflict", message: "You already have a pending payment for this plan." });
        return;
      }
      const { data: investment, error: investmentError } = await supabase.from("user_investments").insert({
        user_id: userId, plan_id: planId, plan_name: p["name"], brand_name: p["brand_name"],
        category: p["category"], deposit_amount: Number(p["deposit_amount"]) || 0,
        daily_profit_amount: Number(p["daily_profit"]) || 0, total_days: Number(p["total_days"]),
        total_profit: Number(p["total_profit"]) || 0, image_url: p["image_url"] ?? null, status: "pending",
      }).select("id").single();
      if (investmentError || !investment) throw investmentError ?? new Error("Failed to create investment");
      extra = Number((investment as Record<string, unknown>)["id"]);
      createdInvestmentId = extra;
      amount = Number(p["deposit_amount"]) || 0;
    } else {
      amount = Math.floor(Number(req.body?.amount) || 0);
      if (amount < 1) {
        res.status(400).json({ error: "ValidationError", message: "A valid deposit amount is required." });
        return;
      }
    }

    const reference = `MUL-HB-${type}-${userId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const { data: transaction, error: transactionError } = await supabase.from("transactions").insert({
      user_id: userId,
      type: type === "investment" ? "investment" : "recharge",
      amount,
      status: "pending",
      description: paymentDescription(reference, type, extra),
    }).select("id").single();
    if (transactionError || !transaction) throw transactionError ?? new Error("Failed to prepare Hashback payment");

    res.json({
      accountId,
      amount,
      currency: "KES",
      reference,
      transactionId: (transaction as Record<string, unknown>)["id"],
      investmentId: type === "investment" ? extra : undefined,
    });
  } catch (err) {
    if (createdInvestmentId) {
      await supabase
        .from("user_investments")
        .update({ status: "cancelled" })
        .eq("id", createdInvestmentId)
        .eq("status", "pending");
    }
    req.log.error({ err, type }, "Hashback payment setup error");
    res.status(500).json({ error: "ServerError", message: "Failed to prepare Hashback payment." });
  }
}

router.post("/investment", requireAuth, async (req: Request, res: Response) => {
  await createHashbackPayment(req, res, "investment");
});

router.post("/spin", requireAuth, async (req: Request, res: Response) => {
  await createHashbackPayment(req, res, "spin");
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
      .like("description", `HASHBACK:${reference}:%`)
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
      .like("description", `HASHBACK:${reference}:%`)
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
    const descriptionParts = String(transaction["description"] ?? "").split(":");
    const paymentType = descriptionParts[2];
    const extraId = Number(descriptionParts[3] ?? 0);
    if (paymentType !== "activate" && paymentType !== "investment" && paymentType !== "spin") {
      res.status(422).json({ error: "InvalidCallback", message: "Unknown Hashback payment type." });
      return;
    }

    let activatedNow = false;
    let spinCredited = false;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const lockedTransaction = await client.query<{
        id: number;
        user_id: number;
        amount: string;
        status: string;
        description: string;
      }>(
        `SELECT id, user_id, amount, status, description
         FROM transactions
         WHERE id = $1
         FOR UPDATE`,
        [transaction["id"]],
      );
      const current = lockedTransaction.rows[0];
      if (!current) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "NotFound", message: "Hashback payment transaction not found." });
        return;
      }
      if (current.status === "completed") {
        await client.query("COMMIT");
        res.status(200).json({ received: true });
        return;
      }
      if (current.status === "failed") {
        await client.query("COMMIT");
        res.status(200).json({ received: true });
        return;
      }

      if (paymentType === "activate") {
        const updatedUser = await client.query(
          `UPDATE users
           SET status = 'active'
           WHERE id = $1 AND status = 'inactive'
           RETURNING id`,
          [userId],
        );
        activatedNow = (updatedUser.rowCount ?? 0) > 0;
      } else if (paymentType === "investment") {
        const now = new Date();
        const updatedInvestment = await client.query(
          `UPDATE user_investments
           SET status = 'active',
               start_date = $1,
               next_credit_at = $2,
               updated_at = $1
           WHERE id = $3 AND user_id = $4 AND status = 'pending'
           RETURNING id`,
          [
            now.toISOString(),
            new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            extraId,
            userId,
          ],
        );
        if (updatedInvestment.rowCount !== 1) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Conflict", message: "Hashback investment is no longer pending." });
          return;
        }
      } else {
        await client.query(
          `INSERT INTO wallet (user_id, spin_balance, spin_earnings)
           VALUES ($1, $2, 0)
           ON CONFLICT (user_id) DO UPDATE
           SET spin_balance = wallet.spin_balance + EXCLUDED.spin_balance`,
          [userId, expectedAmount],
        );
        spinCredited = true;
      }

      const updatedTransaction = await client.query(
        `UPDATE transactions
         SET status = 'completed',
             description = $2
         WHERE id = $1 AND status = 'pending'
         RETURNING id`,
        [current.id, `${current.description}:${hashbackTransactionId}`],
      );
      if (updatedTransaction.rowCount !== 1) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Conflict", message: "Hashback payment was already processed." });
        return;
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    if (activatedNow) {
      await triggerReferralBonus(userId, req.log);
    }
    if (spinCredited) {
      try {
        const { spinEventBus } = await import("../lib/spin-events");
        spinEventBus.emit(`wallet:${userId}`);
      } catch { /* non-fatal */ }
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