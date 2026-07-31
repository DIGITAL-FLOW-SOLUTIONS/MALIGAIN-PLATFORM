import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";
import { getWelcomeBonusSettings, COUNTRY_CURRENCY } from "../lib/appSettings";

const router: IRouter = Router();
router.use(requireAuth);

function num(value: unknown): number {
  return parseFloat(String(value ?? "0")) || 0;
}

function normalizeCountry(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  const aliases: Record<string, string> = {
    KENYA: "KE", TANZANIA: "TZ", UGANDA: "UG", RWANDA: "RW", BURUNDI: "BI",
    ZAMBIA: "ZM", BOTSWANA: "BW", CAMEROON: "CM", GHANA: "GH", NIGERIA: "NG",
    "SOUTH SUDAN": "SS", CONGO: "CG", "DEMOCRATIC REPUBLIC OF THE CONGO": "CG", MALAWI: "MW",
  };
  return aliases[raw] ?? raw;
}

async function getWelcomeBonusForUser(userId: number) {
  const [{ data: userRows }, settings] = await Promise.all([
    supabase.from("users").select("country").eq("id", userId).limit(1),
    getWelcomeBonusSettings(),
  ]);
  const country = normalizeCountry((userRows ?? [])[0]?.country);
  const config = settings[country] ?? null;
  const { count: activeReferrals } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", userId)
    .eq("status", "active");
  const { data: claims } = await supabase
    .from("transactions")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("type", "bonus")
    .eq("description", "Welcome bonus")
    .limit(1);
  const claimed = (claims ?? []).length > 0;
  const currentReferrals = activeReferrals ?? 0;
  return {
    country,
    currency: COUNTRY_CURRENCY[country] ?? "KES",
    amount: config?.amount ?? 0,
    requiredReferrals: config?.requiredReferrals ?? 0,
    currentReferrals,
    claimed,
    canClaim: Boolean(config && !claimed && currentReferrals >= config.requiredReferrals),
    claimedAt: (claims ?? [])[0]?.created_at ?? null,
  };
}

router.get("/welcome", async (req: Request, res: Response) => {
  try {
    res.json(await getWelcomeBonusForUser(req.session.userId!));
  } catch (err) {
    req.log.error({ err }, "Get welcome bonus error");
    res.status(500).json({ error: "ServerError", message: "Failed to fetch welcome bonus" });
  }
});

router.post("/welcome/claim", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const bonus = await getWelcomeBonusForUser(userId);

    if (!bonus.amount || !bonus.requiredReferrals) {
      res.status(404).json({ error: "NotFound", message: "Welcome bonus is not configured for your country." });
      return;
    }
    if (bonus.claimed) {
      res.status(409).json({ error: "AlreadyClaimed", message: "Your welcome bonus has already been claimed." });
      return;
    }
    if (bonus.currentReferrals < bonus.requiredReferrals) {
      res.status(400).json({
        error: "NotEligible",
        message: `You need ${bonus.requiredReferrals - bonus.currentReferrals} more active Level 1 referral${bonus.requiredReferrals - bonus.currentReferrals === 1 ? "" : "s"} to claim this bonus.`,
      });
      return;
    }

    // The unique partial index in welcome-bonus-setup.sql makes this insert
    // atomic across concurrent requests. The pre-check above keeps normal
    // requests fast and the constraint handles double-click/race scenarios.
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "bonus",
        amount: bonus.amount,
        status: "pending",
        description: "Welcome bonus",
      })
      .select("id")
      .single();

    if (transactionError || !transaction) {
      if (transactionError?.code === "23505") {
        res.status(409).json({ error: "AlreadyClaimed", message: "Your welcome bonus has already been claimed." });
        return;
      }
      throw transactionError ?? new Error("Failed to record welcome bonus");
    }

    const { data: wallets } = await supabase
      .from("wallet")
      .select("main_wallet, total_earned, today_earnings")
      .eq("user_id", userId)
      .limit(1);
    let wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
    if (!wallet) {
      const { data: createdWallet, error: walletCreateError } = await supabase
        .from("wallet")
        .insert({ user_id: userId, main_wallet: 0, total_earned: 0, today_earnings: 0 })
        .select("main_wallet, total_earned, today_earnings")
        .single();
      if (walletCreateError || !createdWallet) throw walletCreateError ?? new Error("Failed to create wallet");
      wallet = createdWallet as Record<string, unknown>;
    }

    const { error: walletError } = await supabase
      .from("wallet")
      .update({
        main_wallet: num(wallet.main_wallet) + bonus.amount,
        total_earned: num(wallet.total_earned) + bonus.amount,
        today_earnings: num(wallet.today_earnings) + bonus.amount,
      })
      .eq("user_id", userId);
    if (walletError) throw walletError;

    const { error: completeError } = await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", (transaction as Record<string, unknown>).id);
    if (completeError) throw completeError;

    res.json({
      success: true,
      message: `${bonus.currency} ${bonus.amount.toLocaleString()} welcome bonus credited to your main wallet.`,
      ...await getWelcomeBonusForUser(userId),
    });
  } catch (err) {
    req.log.error({ err }, "Claim welcome bonus error");
    res.status(500).json({ error: "ServerError", message: "Unable to claim welcome bonus. Please try again." });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    // Get bonus tiers (seeded via SQL)
    const { data: tiersData } = await supabase
      .from("bonus_tiers")
      .select("*")
      .order("sort_order", { ascending: true });

    const tiers = (tiersData ?? []) as Array<Record<string, unknown>>;

    // Get user bonus history
    const { data: historyData } = await supabase
      .from("bonus_history")
      .select("*, bonus_tiers(name)")
      .eq("user_id", userId)
      .order("claimed_at", { ascending: false });

    const history = (historyData ?? []) as Array<Record<string, unknown>>;

    // Count user's active referrals
    const { count: activeReferrals } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", userId)
      .eq("status", "active");

    const referralCount = activeReferrals ?? 0;
    const totalEarned = history.reduce((sum, h) => sum + parseFloat(String(h["amount"] ?? "0")), 0);

    const tiersWithProgress = tiers.map(t => ({
      id: t["id"],
      name: t["name"],
      requiredReferrals: t["required_referrals"],
      bonusAmount: parseFloat(String(t["bonus_amount"] ?? "0")),
      currentReferrals: referralCount,
      achieved: referralCount >= Number(t["required_referrals"]),
    }));

    const nextTier = tiersWithProgress.find(t => !t.achieved);
    const nextTierProgress = nextTier
      ? Math.min(100, (referralCount / Number(nextTier.requiredReferrals)) * 100)
      : 100;

    res.json({
      balance: totalEarned,
      totalEarned,
      tiers: tiersWithProgress,
      history: history.map(h => {
        const tierInfo = h["bonus_tiers"] as Record<string, unknown> | null;
        return {
          id: h["id"],
          tierName: tierInfo?.["name"] ?? "Unknown",
          amount: parseFloat(String(h["amount"] ?? "0")),
          claimedAt: h["claimed_at"],
        };
      }),
      nextTierName: nextTier?.name ?? null,
      nextTierProgress,
    });
  } catch (err) {
    req.log.error({ err }, "Get bonuses error");
    res.status(500).json({ error: "ServerError", message: "Failed to get bonuses" });
  }
});

export default router;
