import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { getActivationFee } from "../lib/appSettings";
import { pool } from "../lib/db";
import {
  collectSoleasPay,
  hasSoleasPayApiKey,
  hasSoleasPayCallbackSecret,
  type SoleasPayData,
  type SoleasPayService,
  verifySoleasPayCallbackSignature,
  verifySoleasPayPayment,
} from "../lib/soleaspay";
import { supabase } from "../lib/supabase";
import { triggerReferralBonus } from "../lib/referralBonus";

const router = Router();
const SOLEASPAY_CURRENCY = "XAF";
const MIN_RECHARGE = 50;
const MAX_RECHARGE = 50000;

function amount(value: unknown): number {
  return Math.round(Number(value ?? 0) || 0);
}

function service(value: unknown): SoleasPayService | null {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 ? parsed : null;
}

function normalizeCameroonWallet(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237")) return digits;
  return `237${digits}`;
}

function orderId(userId: number, type: "activate" | "recharge"): string {
  return `MUL-SP-${type}-${userId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function baseDescription(order: string, type: "activate" | "recharge"): string {
  return `SOLEASPAY:${order}:${type}`;
}

function descriptionForPayId(base: string, payId: string | null | undefined): string {
  return payId ? `${base}:${payId}` : base;
}

function payIdFromDescription(description: string): string {
  const parts = description.split(":");
  return parts[3] ?? "";
}

function typeFromDescription(description: string): "activate" | "recharge" | null {
  const type = description.split(":")[2];
  return type === "activate" || type === "recharge" ? type : null;
}

function appUrl(req: Request): string {
  return String(process.env["APP_URL"] ?? `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function isCameroon(user: Record<string, unknown>): boolean {
  return String(user["country"] ?? "").trim().toUpperCase() === "CM";
}

async function findTransaction(order: string, userId?: number) {
  let query = supabase
    .from("transactions")
    .select("id, user_id, amount, status, description")
    .like("description", `SOLEASPAY:${order}:%`)
    .order("created_at", { ascending: false })
    .limit(1);
  if (userId !== undefined) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data?.[0] ?? null) as Record<string, unknown> | null;
}

async function settlePayment(params: {
  orderId: string;
  success: boolean;
  status: string;
  data?: SoleasPayData | null;
  log: Request["log"];
}): Promise<"completed" | "failed" | "pending" | "not_found"> {
  const transaction = await findTransaction(params.orderId);
  if (!transaction) {
    params.log.warn({ orderId: params.orderId }, "SoleasPay callback has no matching transaction");
    return "not_found";
  }

  const currentStatus = String(transaction["status"] ?? "pending");
  if (currentStatus === "completed") return "completed";
  if (currentStatus === "failed") return "failed";

  const status = params.status.toUpperCase();
  if (!params.success || status === "FAILURE" || status === "REFUND") {
    await supabase.from("transactions").update({ status: "failed" }).eq("id", transaction["id"]);
    return "failed";
  }
  if (status !== "SUCCESS" && status !== "STATUS") return "pending";

  const expectedAmount = amount(transaction["amount"]);
  const callbackAmount = amount(params.data?.amount);
  const callbackCurrency = String(params.data?.currency ?? SOLEASPAY_CURRENCY).toUpperCase();
  if (callbackAmount !== expectedAmount || callbackCurrency !== SOLEASPAY_CURRENCY) {
    params.log.error(
      { orderId: params.orderId, callbackAmount, expectedAmount, callbackCurrency },
      "SoleasPay payment validation failed",
    );
    return "pending";
  }

  const userId = Number(transaction["user_id"]);
  const transactionType = typeFromDescription(String(transaction["description"] ?? ""));
  if (!transactionType) return "pending";

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, country, status")
    .eq("id", userId)
    .single();
  if (userError || !user || !isCameroon(user as Record<string, unknown>)) {
    params.log.error({ orderId: params.orderId, userId, userError }, "SoleasPay user validation failed");
    return "pending";
  }

  const client = await pool.connect();
  let activatedNow = false;
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
      return "not_found";
    }
    if (current.status === "completed") {
      await client.query("COMMIT");
      return "completed";
    }
    if (current.status === "failed") {
      await client.query("COMMIT");
      return "failed";
    }

    if (transactionType === "activate") {
      const updatedUser = await client.query(
        `UPDATE users
         SET status = 'active'
         WHERE id = $1 AND status = 'inactive'
         RETURNING id`,
        [userId],
      );
      activatedNow = updatedUser.rowCount > 0;
    } else {
      const lockedWallet = await client.query<{
        main_wallet: string;
        total_earned: string;
      }>(
        `SELECT main_wallet, total_earned
         FROM wallet
         WHERE user_id = $1
         FOR UPDATE`,
        [userId],
      );
      const wallet = lockedWallet.rows[0];
      if (!wallet) {
        await client.query("ROLLBACK");
        params.log.error({ orderId: params.orderId, userId }, "SoleasPay recharge has no wallet");
        return "pending";
      }

      await client.query(
        `UPDATE wallet
         SET main_wallet = main_wallet + $1,
             total_earned = total_earned + $1
         WHERE user_id = $2`,
        [expectedAmount, userId],
      );
    }

    const completedTransaction = await client.query(
      `UPDATE transactions
       SET status = 'completed'
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [transaction["id"]],
    );
    if (completedTransaction.rowCount !== 1) {
      await client.query("ROLLBACK");
      return "pending";
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  if (activatedNow) {
    await triggerReferralBonus(userId, params.log);
  }

  params.log.info(
    { orderId: params.orderId, userId, type: transactionType, amount: expectedAmount },
    "SoleasPay payment completed",
  );
  return "completed";
}

async function startPayment(req: Request, res: Response, type: "activate" | "recharge"): Promise<void> {
  try {
    if (!hasSoleasPayApiKey()) {
      res.status(503).json({ error: "ConfigurationError", message: "SoleasPay payment is not configured yet." });
      return;
    }

    const userId = req.session!["userId"] as number;
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, username, email, phone, country, status")
      .eq("id", userId)
      .single();
    const user = userData as Record<string, unknown> | null;
    if (userError || !user) {
      res.status(404).json({ error: "NotFound", message: "User not found." });
      return;
    }
    if (!isCameroon(user)) {
      res.status(400).json({ error: "ValidationError", message: "SoleasPay is available for Cameroon users only." });
      return;
    }
    if (type === "activate" && String(user["status"]) === "active") {
      res.status(400).json({ error: "AlreadyActive", message: "Account is already active." });
      return;
    }

    const selectedService = service(req.body?.service);
    const phoneNumber = String(req.body?.phoneNumber ?? "").trim();
    if (!selectedService || phoneNumber.replace(/\D/g, "").length < 9) {
      res.status(400).json({ error: "ValidationError", message: "A valid Cameroon phone number and payment method are required." });
      return;
    }

    const requestedAmount = Number(req.body?.amount);
    const paymentAmount = type === "activate" ? await getActivationFee("CM") : requestedAmount;
    if (type === "recharge" && (!Number.isFinite(paymentAmount) || paymentAmount < MIN_RECHARGE || paymentAmount > MAX_RECHARGE)) {
      res.status(400).json({
        error: "ValidationError",
        message: `Recharge amount must be between XAF ${MIN_RECHARGE} and XAF ${MAX_RECHARGE}.`,
      });
      return;
    }

    const paymentOrderId = orderId(userId, type);
    const description = baseDescription(paymentOrderId, type);
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "recharge",
        amount: Math.round(paymentAmount),
        status: "pending",
        description,
        phone_number: phoneNumber,
      })
      .select("id")
      .single();
    if (transactionError || !transaction) {
      req.log.error({ transactionError, userId, type }, "Failed to create SoleasPay transaction");
      res.status(500).json({ error: "ServerError", message: "Failed to prepare SoleasPay payment." });
      return;
    }

    const result = await collectSoleasPay({
      service: selectedService,
      wallet: normalizeCameroonWallet(phoneNumber),
      amount: Math.round(paymentAmount),
      orderId: paymentOrderId,
      description: `MULACENT ${type} payment`,
      payer: String(user["username"] ?? user["email"] ?? "MULACENT user"),
      payerEmail: String(user["email"] ?? ""),
      successUrl: `${appUrl(req)}/payment-status?type=${type}&provider=soleaspay&order_id=${encodeURIComponent(paymentOrderId)}`,
      failureUrl: `${appUrl(req)}/payment-status?type=${type}&provider=soleaspay&order_id=${encodeURIComponent(paymentOrderId)}`,
    });
    const payId = String(result.data?.reference ?? "").trim();

    if (!result.success || !payId) {
      await supabase.from("transactions").update({ status: "failed" }).eq("id", transaction["id"]);
      req.log.error({ result, userId, type }, "SoleasPay payment initiation failed");
      res.status(502).json({ error: "PaymentError", message: result.message ?? "Failed to initiate SoleasPay payment." });
      return;
    }

    await supabase
      .from("transactions")
      .update({ description: descriptionForPayId(description, payId) })
      .eq("id", transaction["id"]);

    res.json({
      pending: true,
      provider: "soleaspay",
      orderId: paymentOrderId,
      payId,
      transactionId: transaction["id"],
      amount: Math.round(paymentAmount),
      currency: SOLEASPAY_CURRENCY,
      message: "Payment request sent. Confirm it on your Cameroon mobile-money phone.",
    });
  } catch (err) {
    req.log.error({ err, type }, "SoleasPay payment setup error");
    res.status(500).json({ error: "ServerError", message: "Failed to prepare SoleasPay payment." });
  }
}

router.post("/activate", requireAuth, async (req, res): Promise<void> => {
  await startPayment(req, res, "activate");
});

router.post("/recharge", requireAuth, async (req, res): Promise<void> => {
  await startPayment(req, res, "recharge");
});

router.get("/status", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.session!["userId"] as number;
    const paymentOrderId = String(req.query["order_id"] ?? "").trim();
    if (!paymentOrderId) {
      res.status(400).json({ error: "ValidationError", message: "Payment order is required." });
      return;
    }

    const transaction = await findTransaction(paymentOrderId, userId);
    if (!transaction) {
      res.status(404).json({ error: "NotFound", message: "SoleasPay payment not found." });
      return;
    }

    let status = String(transaction["status"] ?? "pending");
    const description = String(transaction["description"] ?? "");
    const payId = payIdFromDescription(description);
    const selectedService = service(req.query["service"]) ?? 1;
    if (status === "pending" && payId) {
      const verification = await verifySoleasPayPayment({
        service: selectedService,
        orderId: paymentOrderId,
        payId,
      });
      if (verification.success && verification.data) {
        status = await settlePayment({
          orderId: paymentOrderId,
          success: true,
          status: "STATUS",
          data: verification.data,
          log: req.log,
        });
      } else if (String(verification.status ?? "").toUpperCase() === "FAILURE") {
        status = await settlePayment({
          orderId: paymentOrderId,
          success: false,
          status: "FAILURE",
          data: verification.data,
          log: req.log,
        });
      }
    }

    res.json({
      status,
      amount: amount(transaction["amount"]),
      currency: SOLEASPAY_CURRENCY,
    });
  } catch (err) {
    req.log.error({ err }, "SoleasPay payment status error");
    res.status(500).json({ error: "ServerError", message: "Failed to check SoleasPay payment status." });
  }
});

export async function handleSoleasPayCallback(req: Request, res: Response): Promise<void> {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = String(req.get("x-private-key") ?? "");

  if (!hasSoleasPayCallbackSecret()) {
    req.log.error("SOLEASPAY_CALLBACK_SECRET is not configured; refusing callback");
    res.status(503).json({ error: "ConfigurationError", message: "SoleasPay callback secret is not configured." });
    return;
  }
  if (!verifySoleasPayCallbackSignature(rawBody, signature)) {
    res.status(401).send("Invalid SoleasPay callback signature");
    return;
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf8")) as {
      success?: boolean;
      status?: string;
      data?: SoleasPayData | null;
    };
    const externalReference = String(payload.data?.external_reference ?? "").trim();
    if (!externalReference) {
      res.status(400).json({ error: "InvalidCallback", message: "Missing SoleasPay order reference." });
      return;
    }

    const result = await settlePayment({
      orderId: externalReference,
      success: payload.success === true,
      status: String(payload.status ?? ""),
      data: payload.data,
      log: req.log,
    });
    if (result === "not_found") {
      res.status(404).json({ error: "NotFound", message: "SoleasPay payment reference not found." });
      return;
    }
    res.status(200).json({ received: true });
  } catch (err) {
    req.log.error({ err }, "SoleasPay callback processing failed");
    res.status(500).json({ error: "ServerError", message: "SoleasPay callback processing failed." });
  }
}

export default router;