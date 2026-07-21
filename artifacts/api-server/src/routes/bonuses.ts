import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth);

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
