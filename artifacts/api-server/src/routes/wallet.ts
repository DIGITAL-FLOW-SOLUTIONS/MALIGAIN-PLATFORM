import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";
import { initiateSTKPush, normalizePhone } from "../lib/payhero";
import { sendWithdrawalRequestNotificationEmail } from "../lib/mailer";
import { getWithdrawalRule } from "../lib/appSettings";

const router: IRouter = Router();
router.use(requireAuth);

function num(val: unknown): number {
  return parseFloat(String(val ?? "0")) || 0;
}

router.get("/balances", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    let { data: wallets } = await supabase
      .from("wallet")
      .select("*")
      .eq("user_id", userId)
      .limit(1);

    if (!wallets || wallets.length === 0) {
      const { data: newWallet } = await supabase
        .from("wallet")
        .insert({
          user_id: userId,
          team_earnings: 0,
          main_wallet: 0,
          total_withdrawn: 0,
          total_earned: 0,
          today_earnings: 0,
          affiliate_balance: 0,
          commissions: 0,
        })
        .select()
        .single();
      wallets = newWallet ? [newWallet] : [];
    }

    const wallet = wallets[0] as Record<string, unknown> | undefined;
    if (!wallet) {
      res.status(500).json({ error: "ServerError", message: "Wallet not found" });
      return;
    }

    // Count active members (direct referrals)
    const { count: activeMembers } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", userId)
      .eq("status", "active");

    // Count products owned
    const { count: productsOwned } = await supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    res.json({
      teamEarnings: num(wallet["team_earnings"]),
      mainWallet: num(wallet["main_wallet"]),
      totalWithdrawn: num(wallet["total_withdrawn"]),
      totalEarned: num(wallet["total_earned"]),
      todayEarnings: num(wallet["today_earnings"]),
      activeMembers: activeMembers ?? 0,
      productsOwned: productsOwned ?? 0,
      commissions: num(wallet["commissions"]),
      affiliateBalance: num(wallet["affiliate_balance"]),
      // Per-task earnings
      tiktokEarnings: num(wallet["tiktok_earnings"]),
      youtubeEarnings: num(wallet["youtube_earnings"]),
      blogsEarnings: num(wallet["blogs_earnings"]),
      reelEarnings: num(wallet["reel_earnings"]),
      adsEarnings: num(wallet["ads_earnings"]),
      movieEarnings: num(wallet["movie_earnings"]),
      surveyEarnings: num(wallet["survey_earnings"]),
      chatWithForeignersEarnings: num(wallet["chatwithforeigners_earnings"]),
      videoEarnings: num(wallet["video_earnings"]),
      triviaEarnings: num(wallet["trivia_earnings"]),
    });
  } catch (err) {
    req.log.error({ err }, "Get wallet error");
    res.status(500).json({ error: "ServerError", message: "Failed to get wallet" });
  }
});

router.post("/withdraw", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { amount, phoneNumber } = req.body;
    const requestedAmount = Number(amount);

    // Get user country
    const { data: users } = await supabase.from("users").select("country").eq("id", userId).limit(1);
    const userCountry = ((users ?? [])[0] as Record<string, unknown> | undefined)?.["country"] as string | undefined;
    const countryCode = (userCountry ?? "KE").toUpperCase();
    const rules = getWithdrawalRule(countryCode);

    if (!amount || requestedAmount < rules.min) {
      res.status(400).json({
        error: "ValidationError",
        message: `Minimum withdrawal for your country is ${rules.currency} ${rules.min}`,
      });
      return;
    }

    const { data: wallets } = await supabase
      .from("wallet")
      .select("main_wallet, total_withdrawn")
      .eq("user_id", userId)
      .limit(1);

    if (!wallets || wallets.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "Wallet not found" });
      return;
    }

    const wallet = wallets[0] as Record<string, unknown>;
    const mainWallet = num(wallet["main_wallet"]);
    const totalWithdrawn = num(wallet["total_withdrawn"]);

    // Withdrawals are funded from main_wallet only.
    if (mainWallet < requestedAmount) {
      res.status(400).json({
        error: "InsufficientFunds",
        message: "You have insufficient main wallet balance",
      });
      return;
    }

    const netAmount = requestedAmount - rules.charge;

    await supabase
      .from("wallet")
      .update({
        main_wallet:     mainWallet - requestedAmount,
        total_withdrawn: totalWithdrawn + requestedAmount,
      })
      .eq("user_id", userId);

    // Record only the net amount (after charge) in the transaction
    await supabase.from("transactions").insert({
      user_id: userId,
      type: "withdrawal",
      amount: netAmount,
      status: "pending",
      description: `Withdrawal to ${phoneNumber} · Gross: ${rules.currency} ${requestedAmount} · Charge: ${rules.currency} ${rules.charge}`,
    });

    res.json({ message: "Withdrawal request submitted successfully", success: true });

    // Notify all admins that have a notification email set (fire-and-forget)
    try {
      const { data: userRows } = await supabase
        .from("users")
        .select("username, phone, country")
        .eq("id", userId)
        .limit(1);
      const user = (userRows ?? [])[0] as Record<string, unknown> | undefined;

      const { data: adminRows } = await supabase
        .from("admin_users")
        .select("admin_notification_email")
        .not("admin_notification_email", "is", null);

      const recipients = ((adminRows ?? []) as Array<Record<string, unknown>>)
        .map((a) => String(a["admin_notification_email"] ?? "").trim())
        .filter(Boolean);

      if (recipients.length > 0 && user) {
        const country = String(user["country"] ?? "KE").toUpperCase();
        const currency = getWithdrawalRule(country).currency;

        await Promise.allSettled(
          recipients.map((toEmail) =>
            sendWithdrawalRequestNotificationEmail({
              toEmail,
              username: String(user["username"] ?? "Unknown"),
              phone: String(phoneNumber ?? user["phone"] ?? "—"),
              amount: requestedAmount,
              currency,
              country,
              requestedAt: new Date().toISOString(),
            })
          )
        );
      }
    } catch (notifyErr) {
      req.log.error({ notifyErr }, "Admin withdrawal notification failed (non-fatal)");
    }
  } catch (err) {
    req.log.error({ err }, "Withdraw error");
    res.status(500).json({ error: "ServerError", message: "Withdrawal failed" });
  }
});

router.post("/recharge", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { amount, phoneNumber } = req.body;
    const MIN_RECHARGE = 50;
    const MAX_RECHARGE = 50000;

    if (!amount || Number(amount) < MIN_RECHARGE) {
      res.status(400).json({ error: "ValidationError", message: `Minimum recharge is Ksh ${MIN_RECHARGE}` });
      return;
    }
    if (Number(amount) > MAX_RECHARGE) {
      res.status(400).json({ error: "ValidationError", message: `Maximum recharge is Ksh ${MAX_RECHARGE}` });
      return;
    }
    if (!phoneNumber || phoneNumber.trim().length < 9) {
      res.status(400).json({ error: "ValidationError", message: "A valid phone number is required" });
      return;
    }

    const domain = process.env["APP_URL"]
      ?? `${req.protocol}://${req.get("host")}`;
    const callbackUrl = `${domain}/callbackurl/callback`;

    const stkResult = await initiateSTKPush({
      phoneNumber,
      amount: Number(amount),
      externalReference: `MUL-recharge-${userId}-${Date.now()}`,
      callbackUrl,
    });

    if (!stkResult.success || !stkResult.CheckoutRequestID) {
      req.log.error({ stkResult }, "PayHero STK push recharge failed");
      res.status(502).json({ error: "PaymentError", message: stkResult.errorMessage ?? stkResult.error ?? "Failed to initiate payment." });
      return;
    }

    const { data: txn, error: txnInsertErr } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "recharge",
        amount: Number(amount),
        status: "pending",
        description: `PAYHERO:${stkResult.CheckoutRequestID}:recharge`,
      })
      .select("id")
      .single();

    if (txnInsertErr) {
      req.log.error({ txnInsertErr, userId, checkoutRequestId: stkResult.CheckoutRequestID }, "Failed to insert recharge transaction into DB");
    }

    req.log.info({ txnId: (txn as Record<string, unknown> | null)?.["id"], checkoutRequestId: stkResult.CheckoutRequestID }, "Recharge transaction inserted");

    res.json({
      pending: true,
      checkoutRequestId: stkResult.CheckoutRequestID,
      transactionId: (txn as Record<string, unknown> | null)?.["id"] ?? null,
      message: "M-Pesa payment prompt sent to your phone. Enter your PIN to complete the deposit.",
    });
  } catch (err) {
    req.log.error({ err }, "Recharge error");
    res.status(500).json({ error: "ServerError", message: "Recharge failed. Please try again." });
  }
});

router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const typeFilter = req.query["type"] as string ?? "all";

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    const { data: transactions } = await query;
    const list = (transactions ?? []) as Array<Record<string, unknown>>;

    const totalPaidOut = list
      .filter(t => t["type"] === "withdrawal" && t["status"] === "completed")
      .reduce((sum, t) => sum + num(t["amount"]), 0);

    const totalPending = list.filter(t => t["status"] === "pending").length;

    res.json({
      transactions: list.map(t => ({
        id: t["id"],
        type: t["type"],
        amount: num(t["amount"]),
        status: t["status"],
        description: t["description"],
        createdAt: t["created_at"],
      })),
      total: list.length,
      totalPaidOut,
      totalPending,
    });
  } catch (err) {
    req.log.error({ err }, "Get transactions error");
    res.status(500).json({ error: "ServerError", message: "Failed to get transactions" });
  }
});

export default router;
