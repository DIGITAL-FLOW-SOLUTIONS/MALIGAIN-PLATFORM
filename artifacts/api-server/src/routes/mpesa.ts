import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { triggerReferralBonus } from "../lib/referralBonus";

const router: IRouter = Router();

function num(val: unknown): number {
  return parseFloat(String(val ?? "0")) || 0;
}

// ---------------------------------------------------------------------------
// Parse ExternalReference → { txnType, userId }
// Format: MUL-activate-{userId}-{ts}  |  MUL-recharge-{userId}-{ts}  |  MUL-payclient-{userId}-{ts}
// ---------------------------------------------------------------------------
function parseExternalRef(ref: string): { txnType: string; userId: number; txnExtra: string } | null {
  const parts = ref.split("-");
  if (parts[0] !== "MUL" || parts.length < 4) return null;
  const userId = Number(parts[2]);
  if (!userId) return null;
  const txnType = parts[1] ?? ""; // "activate" | "recharge" | "payclient" | "invest"
  // For invest: MUL-invest-{userId}-{investmentId}-{ts} → txnExtra = investmentId
  const txnExtra = parts[3] ?? "";
  return { txnType, userId, txnExtra };
}

// ---------------------------------------------------------------------------
// Credit user based on txnType — used for both the normal path (found txn row)
// and the resilient path (no txn row, process directly from ExternalReference)
// ---------------------------------------------------------------------------
async function creditUser(opts: {
  txnType: string;
  txnExtra: string;
  userId: number;
  creditAmount: number;
  txnId: unknown;
  checkoutRequestId: string;
  externalReference: string;
  log: Request["log"];
}): Promise<void> {
  const { txnType, txnExtra, userId, creditAmount, txnId, checkoutRequestId, externalReference, log } = opts;

  if (txnType === "activate") {
    log.info({ step: "credit_activate", userId }, "CALLBACK_DEBUG: Setting users.status = active");

    // Atomically flip status from inactive → active.
    // Using .eq("status", "inactive") means: if the user is already active (a retry callback),
    // zero rows are updated and we skip referral bonuses — preventing double-crediting.
    const { data: updatedUser, error: userErr } = await supabase
      .from("users")
      .update({ status: "active" })
      .eq("id", userId)
      .eq("status", "inactive")   // <-- idempotency guard
      .select("id, status");
    log.info({ step: "credit_activate_user_result", supabaseError: userErr, updatedUser }, "CALLBACK_DEBUG: users update result");

    const wasJustActivated = updatedUser && updatedUser.length > 0;

    if (txnId) {
      const { error: txnErr } = await supabase
        .from("transactions")
        .update({ status: "completed" })
        .eq("id", txnId);
      log.info({ step: "credit_activate_txn_result", supabaseError: txnErr }, "CALLBACK_DEBUG: txn → completed");
    } else if (wasJustActivated) {
      // No pending row existed and we actually activated — insert a completed record
      const { error: insErr } = await supabase.from("transactions").insert({
        user_id: userId,
        type: "recharge",
        amount: creditAmount,
        status: "completed",
        description: `PAYHERO:${checkoutRequestId}:activate (recovered from ${externalReference})`,
      });
      log.info({ step: "credit_activate_insert_result", supabaseError: insErr }, "CALLBACK_DEBUG: inserted completed txn");
    }

    if (wasJustActivated) {
      log.info({ step: "credit_activate_referral", userId }, "CALLBACK_DEBUG: Triggering referral bonus");
      await triggerReferralBonus(userId, log);
      log.info({ step: "credit_activate_referral_done" }, "CALLBACK_DEBUG: Referral bonus done");
    } else {
      log.info({ step: "credit_activate_skipped", userId }, "CALLBACK_DEBUG: User already active — skipping referral bonus (duplicate callback)");
    }

  } else if (txnType === "recharge") {
    log.info({ step: "credit_recharge", userId, creditAmount }, "CALLBACK_DEBUG: Fetching wallet");

    const { data: wallets, error: walletFetchErr } = await supabase
      .from("wallet")
      .select("main_wallet, total_earned")
      .eq("user_id", userId)
      .limit(1);
    log.info({ step: "credit_recharge_wallet_fetch", supabaseError: walletFetchErr, wallets }, "CALLBACK_DEBUG: wallet fetch");

    if (wallets && wallets.length > 0) {
      const w = wallets[0] as Record<string, unknown>;
      const newMain   = num(w["main_wallet"])  + creditAmount;
      const newEarned = num(w["total_earned"]) + creditAmount;
      log.info({ step: "credit_recharge_wallet_update", oldMain: w["main_wallet"], newMain }, "CALLBACK_DEBUG: updating wallet");
      const { error: walletErr } = await supabase
        .from("wallet")
        .update({ main_wallet: newMain, total_earned: newEarned })
        .eq("user_id", userId);
      log.info({ step: "credit_recharge_wallet_result", supabaseError: walletErr }, "CALLBACK_DEBUG: wallet update result");
    } else {
      log.error({ step: "credit_recharge_no_wallet", userId }, "CALLBACK_DEBUG: No wallet row found");
    }

    if (txnId) {
      const { error: txnErr } = await supabase.from("transactions").update({ status: "completed" }).eq("id", txnId);
      log.info({ step: "credit_recharge_txn_result", supabaseError: txnErr }, "CALLBACK_DEBUG: recharge txn → completed");
    } else {
      const { error: insErr } = await supabase.from("transactions").insert({
        user_id: userId,
        type: "recharge",
        amount: creditAmount,
        status: "completed",
        description: `PAYHERO:${checkoutRequestId}:recharge (recovered from ${externalReference})`,
      });
      log.info({ step: "credit_recharge_insert_result", supabaseError: insErr }, "CALLBACK_DEBUG: inserted completed txn");
    }

  } else if (txnType === "pay-client" || txnType === "payclient") {
    const downlineUserId = Number(txnExtra);
    log.info({ step: "credit_payclient", userId, downlineUserId, txnExtra }, "CALLBACK_DEBUG: pay-client activation");

    if (downlineUserId) {
      const { data: dlUpdate, error: dlErr } = await supabase
        .from("users")
        .update({ status: "active" })
        .eq("id", downlineUserId)
        .select("id, status");
      log.info({ step: "credit_payclient_downline_result", supabaseError: dlErr, dlUpdate }, "CALLBACK_DEBUG: downline update");

      if (txnId) {
        await supabase.from("transactions").update({ status: "completed" }).eq("id", txnId);
      } else {
        await supabase.from("transactions").insert({
          user_id: userId,
          type: "recharge",
          amount: creditAmount,
          status: "completed",
          description: `PAYHERO:${checkoutRequestId}:pay-client:${downlineUserId} (recovered from ${externalReference})`,
        });
      }

      log.info({ step: "credit_payclient_referral", downlineUserId }, "CALLBACK_DEBUG: Referral bonus for downline");
      await triggerReferralBonus(downlineUserId, log);
      log.info({ step: "credit_payclient_referral_done" }, "CALLBACK_DEBUG: done");
    } else {
      log.error({ step: "credit_payclient_no_downline", txnExtra }, "CALLBACK_DEBUG: Missing downline ID");
    }

  } else if (txnType === "invest") {
    // txnExtra = investmentId
    const investmentId = Number(txnExtra);
    log.info({ step: "credit_invest", userId, investmentId }, "CALLBACK_DEBUG: Activating investment");

    if (investmentId) {
      const now = new Date();
      const nextCredit = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const { error: invErr } = await supabase
        .from("user_investments")
        .update({
          status: "active",
          start_date: now.toISOString(),
          next_credit_at: nextCredit,
          updated_at: now.toISOString(),
        })
        .eq("id", investmentId)
        .eq("status", "pending");
      log.info({ step: "credit_invest_result", supabaseError: invErr }, "CALLBACK_DEBUG: investment activated");

      if (txnId) {
        await supabase.from("transactions").update({ status: "completed" }).eq("id", txnId);
      } else {
        await supabase.from("transactions").insert({
          user_id: userId,
          type: "investment",
          amount: creditAmount,
          status: "completed",
          description: `PAYHERO:${checkoutRequestId}:invest:${investmentId} (recovered from ${externalReference})`,
        });
      }
    } else {
      log.error({ step: "credit_invest_no_id", txnExtra }, "CALLBACK_DEBUG: Missing investment ID");
    }

  } else {
    log.error({ step: "credit_unknown_type", txnType }, "CALLBACK_DEBUG: Unknown txnType — nothing credited");
  }
}

// ---------------------------------------------------------------------------
// POST /callback — PayHero sends payment result here
// ---------------------------------------------------------------------------
router.post("/callback", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  req.log.info({ step: "1_received", body }, "CALLBACK_DEBUG: Raw callback received");

  try {
    // ── Unwrap nested body.response ───────────────────────────────────────────
    const inner = (
      body["response"] != null && typeof body["response"] === "object"
        ? body["response"]
        : body
    ) as Record<string, unknown>;

    const checkoutRequestId = String(inner["CheckoutRequestID"] ?? "");
    const externalReference = String(inner["ExternalReference"] ?? inner["User_Reference"] ?? "");
    const resultCode        = inner["ResultCode"];
    const resultDesc        = String(inner["ResultDesc"] ?? "");
    const amountPaid        = num(inner["Amount"] ?? inner["amount"] ?? 0);

    const isSuccess =
      resultCode !== undefined && resultCode !== null
        ? Number(resultCode) === 0
        : body["status"] === true;

    req.log.info(
      { step: "2_parsed", checkoutRequestId, externalReference, resultCode, resultDesc, amountPaid, isSuccess, innerKeys: Object.keys(inner) },
      "CALLBACK_DEBUG: Parsed fields"
    );

    // ── Look up pending transaction row ────────────────────────────────────────
    let resolvedTxn: Record<string, unknown> | null = null;

    if (checkoutRequestId) {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .like("description", `%:${checkoutRequestId}:%`)
        .limit(1);
      req.log.info({ step: "3_checkout_lookup", found: data?.length ?? 0, supabaseError: error }, "CALLBACK_DEBUG: CheckoutRequestID lookup");
      if (data && data.length > 0) resolvedTxn = data[0] as Record<string, unknown>;
    }

    if (!resolvedTxn && externalReference) {
      const parsed = parseExternalRef(externalReference);
      req.log.info({ step: "4_extref_fallback", externalReference, parsed }, "CALLBACK_DEBUG: ExternalReference fallback");
      if (parsed) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", parsed.userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1);
        req.log.info({ step: "4_extref_result", found: data?.length ?? 0, supabaseError: error }, "CALLBACK_DEBUG: ExternalReference DB lookup");
        if (data && data.length > 0) resolvedTxn = data[0] as Record<string, unknown>;
      }
    }

    req.log.info({ step: "5_txn_found", txn: resolvedTxn }, "CALLBACK_DEBUG: Transaction row (null = will use ExternalReference directly)");

    // ── Guard duplicate ────────────────────────────────────────────────────────
    if (resolvedTxn && (resolvedTxn["status"] === "completed" || resolvedTxn["status"] === "failed")) {
      req.log.info({ step: "5_duplicate", txnStatus: resolvedTxn["status"] }, "CALLBACK_DEBUG: Already settled — ignoring");
      res.json({ success: true });
      return;
    }

    // ── Handle failed payment ─────────────────────────────────────────────────
    if (!isSuccess) {
      req.log.warn({ step: "6_failed", resultCode, resultDesc }, "CALLBACK_DEBUG: Payment FAILED");
      if (resolvedTxn) {
        await supabase.from("transactions").update({ status: "failed", description: `FAILED:${resolvedTxn["description"]}` }).eq("id", resolvedTxn["id"]);
      }
      res.json({ success: true });
      return;
    }

    // ── Resolve type + credit info ────────────────────────────────────────────
    let txnType     = "";
    let txnExtra    = "";
    let userId      = 0;
    let creditAmount = amountPaid;

    if (resolvedTxn) {
      const desc   = String(resolvedTxn["description"] ?? "");
      const parts  = desc.split(":");
      txnType      = parts[2] ?? "";
      txnExtra     = parts[3] ?? "";
      userId       = Number(resolvedTxn["user_id"]);
      creditAmount = num(resolvedTxn["amount"]);
    } else {
      // No pending row — fall back to ExternalReference
      const parsed = parseExternalRef(externalReference);
      if (!parsed) {
        req.log.error({ step: "6_no_ref", externalReference }, "CALLBACK_DEBUG: Cannot parse ExternalReference — giving up");
        res.json({ success: true });
        return;
      }
      txnType      = parsed.txnType;   // "activate" | "recharge" | "payclient" | "invest"
      txnExtra     = parsed.txnExtra;  // investmentId for "invest" type
      userId       = parsed.userId;
      creditAmount = amountPaid;       // use amount from PayHero callback
      req.log.info({ step: "6_extref_credit", txnType, txnExtra, userId, creditAmount }, "CALLBACK_DEBUG: Processing from ExternalReference (no pending txn)");
    }

    req.log.info({ step: "7_credit", txnType, userId, creditAmount }, "CALLBACK_DEBUG: Crediting user");

    await creditUser({
      txnType,
      txnExtra,
      userId,
      creditAmount,
      txnId:             resolvedTxn ? resolvedTxn["id"] : null,
      checkoutRequestId,
      externalReference,
      log: req.log,
    });

    req.log.info({ step: "8_done", txnType, userId, creditAmount }, "CALLBACK_DEBUG: Complete");
    res.json({ success: true });

  } catch (err) {
    req.log.error({ step: "ERROR", err, body }, "CALLBACK_DEBUG: Unhandled exception");
    res.json({ success: true });
  }
});

// ---------------------------------------------------------------------------
// GET /status — frontend polls this to detect payment completion
// ---------------------------------------------------------------------------
router.get("/status", async (req: Request, res: Response) => {
  try {
    const txnId      = req.query["txn_id"] as string;
    const checkoutId = req.query["checkout_id"] as string;

    if (!txnId && !checkoutId) {
      res.status(400).json({ error: "ValidationError", message: "txn_id or checkout_id required" });
      return;
    }

    let txn: Record<string, unknown> | null = null;

    if (txnId) {
      const { data } = await supabase
        .from("transactions")
        .select("id, status, description, amount")
        .eq("id", Number(txnId))
        .limit(1);
      txn = (data?.[0] as Record<string, unknown> | null) ?? null;
    } else {
      const { data } = await supabase
        .from("transactions")
        .select("id, status, description, amount")
        .like("description", `%:${checkoutId}:%`)
        .limit(1);
      txn = (data?.[0] as Record<string, unknown> | null) ?? null;
    }

    if (!txn) {
      res.status(404).json({ error: "NotFound", message: "Transaction not found" });
      return;
    }

    const status   = String(txn["status"] ?? "pending");
    const desc     = String(txn["description"] ?? "");
    const isFailed = status === "failed" || desc.startsWith("FAILED:");

    res.json({
      status: isFailed ? "failed" : status,
      amount: num(txn["amount"]),
    });
  } catch (err) {
    req.log.error({ err }, "Payment status check error");
    res.status(500).json({ error: "ServerError", message: "Failed to check status" });
  }
});

export default router;
