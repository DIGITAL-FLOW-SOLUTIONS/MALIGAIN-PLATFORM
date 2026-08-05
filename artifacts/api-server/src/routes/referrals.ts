import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "../lib/db";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";
import { initiateSTKPush } from "../lib/payhero";
import { getActivationFee } from "../lib/appSettings";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/downlines", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const levelFilter = (req.query["level"] as string) ?? "all";
    const statusFilter = (req.query["status"] as string) ?? "all";
    const search = (req.query["search"] as string) ?? "";

    // Use the same authoritative users source as the admin referral tree.
    // Referral registration still accepts both usernames and legacy codes;
    // the tree itself is always resolved through the stored referred_by ID.
    const { data: l1Data, error: l1Error } = await supabase
      .from("users")
      .select("*")
      .eq("referred_by", userId);
    if (l1Error) throw l1Error;
    const l1 = (l1Data ?? []) as Array<Record<string, unknown>>;
    const l1Ids = l1.map(u => u["id"] as number);

    // Fetch L2 — no row limit
    let l2: Array<Record<string, unknown>> = [];
    if (l1Ids.length > 0) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("referred_by", l1Ids);
      if (error) throw error;
      l2 = (data ?? []) as Array<Record<string, unknown>>;
    }
    const l2Ids = l2.map(u => u["id"] as number);

    // Fetch L3 — no row limit
    let l3: Array<Record<string, unknown>> = [];
    if (l2Ids.length > 0) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("referred_by", l2Ids);
      if (error) throw error;
      l3 = (data ?? []) as Array<Record<string, unknown>>;
    }

    // Compute referral counts from data we already have
    const referralCountMap: Record<number, number> = {};
    for (const u of l2) {
      const refBy = u["referred_by"] as number;
      referralCountMap[refBy] = (referralCountMap[refBy] || 0) + 1;
    }
    for (const u of l3) {
      const refBy = u["referred_by"] as number;
      referralCountMap[refBy] = (referralCountMap[refBy] || 0) + 1;
    }

    // Build combined list with level tags
    const allMembers = [
      ...l1.map(u => ({ ...u, _level: "level1" })),
      ...l2.map(u => ({ ...u, _level: "level2" })),
      ...l3.map(u => ({ ...u, _level: "level3" })),
    ];

    // Counts per level
    const levelCounts: Record<string, number> = {
      level1: l1.length,
      level2: l2.length,
      level3: l3.length,
    };
    const levelActiveCounts: Record<string, number> = {
      level1: l1.filter(u => u["status"] === "active").length,
      level2: l2.filter(u => u["status"] === "active").length,
      level3: l3.filter(u => u["status"] === "active").length,
    };

    // Apply filters
    let filtered = allMembers as Array<Record<string, unknown> & { _level: string }>;
    if (levelFilter !== "all") {
      filtered = filtered.filter(u => u._level === levelFilter);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(u => u["status"] === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(u =>
        String(u["username"] ?? "").toLowerCase().includes(q) ||
        String(u["phone"] ?? "").toLowerCase().includes(q),
      );
    }

    const totalActive = allMembers.filter(u => u["status"] === "active").length;
    const totalInactive = allMembers.filter(u => u["status"] !== "active").length;

    res.json({
      downlines: filtered.map(u => ({
        id: u["id"],
        username: u["username"],
        phone: u["phone"] ?? null,
        country: u["country"] ?? null,
        status: u["status"],
        level: u._level,
        referralCount: referralCountMap[u["id"] as number] ?? 0,
        joinedAt: u["created_at"],
        avatarInitials: String(u["username"] ?? "??").substring(0, 2).toUpperCase(),
      })),
      total: allMembers.length,
      active: totalActive,
      inactive: totalInactive,
      levelCounts,
      levelActiveCounts,
    });
  } catch (err) {
    req.log.error({ err }, "Get downlines error");
    res.status(500).json({ error: "ServerError", message: "Failed to get downlines" });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("username, referral_code")
      .eq("id", userId)
      .maybeSingle();
    if (userError) throw userError;

    if (!user) {
      res.status(404).json({ error: "NotFound", message: "User not found" });
      return;
    }

    const username = String(user["username"] ?? "");
    const referralCode = user["referral_code"];

    // Count all direct referrals with no row limit
    const { data: referralData, error: referralsError } = await supabase
      .from("users")
      .select("status, created_at")
      .eq("referred_by", userId);
    if (referralsError) throw referralsError;
    const referrals = (referralData ?? []) as Array<{ status: string; created_at: string }>;

    const activated = referrals.filter(r => r.status === "active").length;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayReferrals = referrals.filter(r =>
      r.created_at && new Date(r.created_at) >= todayStart,
    ).length;

    // Sum referral bonus earnings — no row limit
    const { rows: bonusTxns } = await pool.query<{ amount: string }>(
      `SELECT amount FROM transactions WHERE user_id = $1 AND type = 'referral' AND status = 'completed'`,
      [userId],
    );

    const totalEarned = bonusTxns.reduce(
      (sum, t) => sum + (parseFloat(t.amount) || 0),
      0,
    );

    const host = "https://www.maligain.com";

    res.json({
      // New links identify the referrer by their unique username. Keep
      // referralCode in the response for existing clients/admin tooling.
      inviteLink: `${host}/register?ref=${encodeURIComponent(username)}`,
      referralCode,
      totalInvited: referrals.length,
      totalActivated: activated,
      totalEarned,
      todayReferrals,
    });
  } catch (err) {
    req.log.error({ err }, "Get referral stats error");
    res.status(500).json({ error: "ServerError", message: "Failed to get referral stats" });
  }
});

router.get("/lookup", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const phone = req.query["phone"] as string;

    if (!phone || phone.trim().length < 9) {
      res.status(400).json({ error: "ValidationError", message: "Please provide a valid phone number" });
      return;
    }

    const phoneClean = phone.replace(/\s+/g, "");

    // No row limit — fetch all direct downlines from the same source as admin.
    const { data: downlineData, error: downlinesError } = await supabase
      .from("users")
      .select("id, username, phone, status, created_at")
      .eq("referred_by", userId);
    if (downlinesError) throw downlinesError;
    const downlines = (downlineData ?? []) as Array<Record<string, unknown>>;

    const found = downlines.find(u => {
      const p = String(u["phone"] ?? "");
      return p.endsWith(phoneClean.replace(/^\+?2540?/, "").replace(/^\+?254/, "")) ||
             p === phoneClean ||
             p.replace(/^\+?254/, "0") === phoneClean ||
             phoneClean.replace(/^\+?254/, "0") === p;
    });

    if (!found) {
      res.status(404).json({ error: "NotFound", message: "No direct downline found with this phone number" });
      return;
    }

    res.json({
      id: found["id"],
      username: found["username"],
      phone: found["phone"],
      status: found["status"],
      joinedAt: found["created_at"],
    });
  } catch (err) {
    req.log.error({ err }, "Lookup downline error");
    res.status(500).json({ error: "ServerError", message: "Failed to look up downline" });
  }
});

router.post("/pay-client", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { downlineId, phoneNumber } = req.body as { downlineId?: string; phoneNumber?: string };

    if (!downlineId) {
      res.status(400).json({ error: "ValidationError", message: "Downline ID is required" });
      return;
    }
    if (!phoneNumber || phoneNumber.trim().length < 9) {
      res.status(400).json({ error: "ValidationError", message: "Please provide your M-Pesa number" });
      return;
    }

    const { data: dlData, error: downlineError } = await supabase
      .from("users")
      .select("id, username, phone, status")
      .eq("id", downlineId)
      .eq("referred_by", userId)
      .limit(1);
    if (downlineError) throw downlineError;
    const dl = (dlData ?? []) as Array<Record<string, unknown>>;

    if (!dl.length) {
      res.status(404).json({ error: "NotFound", message: "Downline not found or not your direct referral" });
      return;
    }

    const downline = dl[0]!;

    const stkAmount = await getActivationFee("KE");
    const domain = process.env["APP_URL"] ?? `${req.protocol}://${req.get("host")}`;
    const callbackUrl = `${domain}/callbackurl/callback`;

    const stkResult = await initiateSTKPush({
      phoneNumber,
      amount: stkAmount,
      externalReference: `MUL-payclient-${userId}-${Date.now()}`,
      callbackUrl,
    });

    if (!stkResult.success || !stkResult.CheckoutRequestID) {
      req.log.error({ stkResult }, "PayHero STK push pay-client failed");
      res.status(502).json({ error: "PaymentError", message: stkResult.errorMessage ?? stkResult.error ?? "Failed to initiate payment." });
      return;
    }

    const { rows: txnRows } = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, status, description)
       VALUES ($1, 'recharge', $2, 'pending', $3)
       RETURNING id`,
      [userId, stkAmount, `PAYHERO:${stkResult.CheckoutRequestID}:pay-client:${downline["id"]}`],
    ).catch((txnInsertErr) => {
      req.log.error({ txnInsertErr, userId, checkoutRequestId: stkResult.CheckoutRequestID }, "Failed to insert pay-client transaction");
      return { rows: [] };
    });

    req.log.info({ txnId: txnRows[0]?.id ?? null, checkoutRequestId: stkResult.CheckoutRequestID }, "Pay-client transaction inserted");

    res.json({
      pending: true,
      checkoutRequestId: stkResult.CheckoutRequestID,
      transactionId: txnRows[0]?.id ?? null,
      message: "M-Pesa payment prompt sent to your phone. Enter your PIN to activate the client.",
    });
  } catch (err) {
    req.log.error({ err }, "Pay-client error");
    res.status(500).json({ error: "ServerError", message: "Failed to initiate payment. Please try again." });
  }
});

export default router;
