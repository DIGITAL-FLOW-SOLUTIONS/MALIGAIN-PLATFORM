import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth);

// Prize amounts per country [rank1, rank2, rank3] — equivalent value in local currency
const PRIZE_AMOUNTS: Record<string, [number, number, number]> = {
  KE: [2000,  1000,  500  ],
  UG: [57000, 28500, 14000],
  TZ: [40000, 20000, 10000],
  GH: [160,   80,    40   ],
  ZM: [280,   140,   70   ],
  CM: [8800,  4400,  2200 ],
};

const CURRENCY_CODES: Record<string, string> = {
  KE: "KES", UG: "UGX", TZ: "TZS", GH: "GHS", ZM: "ZK", CM: "XAF",
};

function getWeekBounds(weeksAgo = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const daysToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + daysToMonday - weeksAgo * 7);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setMilliseconds(0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

function getWeekId(weekStart: Date): string {
  // ISO week number
  const d = new Date(weekStart.valueOf());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function num(v: unknown) { return parseFloat(String(v ?? "0")) || 0; }

function prizeLabel(country: string, rank: number): string {
  const code = country.toUpperCase();
  const amounts = PRIZE_AMOUNTS[code] ?? PRIZE_AMOUNTS["KE"];
  const currency = CURRENCY_CODES[code] ?? "KES";
  const amount = amounts[rank - 1] ?? 0;
  return `${currency} ${amount.toLocaleString()}`;
}

async function finalizePreviousWeek(log?: { error: (...a: unknown[]) => void }): Promise<void> {
  try {
    const { weekStart: prevStart, weekEnd: prevEnd } = getWeekBounds(1);
    const weekId = getWeekId(prevStart);

    // Check if already finalized
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("type", "tournament_prize")
      .like("description", `tournament:${weekId}:%`)
      .limit(1);

    if (existing && existing.length > 0) return;

    // Get all active users
    const { data: activeUsers } = await supabase
      .from("users")
      .select("id, username, country")
      .eq("status", "active");

    const users = (activeUsers ?? []) as Array<Record<string, unknown>>;
    if (!users.length) return;

    // Count each user's referrals activated last week
    const standings = await Promise.all(
      users.map(async (u) => {
        const { count } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("referred_by", u["id"])
          .eq("status", "active")
          .gte("created_at", prevStart.toISOString())
          .lte("created_at", prevEnd.toISOString());
        return {
          userId: u["id"] as number,
          username: String(u["username"] ?? ""),
          country: String(u["country"] ?? "KE").toUpperCase(),
          referrals: count ?? 0,
        };
      })
    );

    // Require at least 3 referrals to be eligible, take top 3
    const top3 = standings
      .filter(e => e.referrals >= 3)
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 3);

    if (!top3.length) return;

    for (let i = 0; i < top3.length; i++) {
      const winner = top3[i]!;
      const rank = i + 1;
      const prizeAmounts = PRIZE_AMOUNTS[winner.country] ?? PRIZE_AMOUNTS["KE"];
      const prizeAmount = prizeAmounts[rank - 1] ?? 0;
      if (prizeAmount <= 0) continue;

      // Credit wallet
      const { data: wallets } = await supabase
        .from("wallet")
        .select("main_wallet, total_earned")
        .eq("user_id", winner.userId)
        .limit(1);

      const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
      if (wallet) {
        await supabase.from("wallet").update({
          main_wallet:  num(wallet["main_wallet"])  + prizeAmount,
          total_earned: num(wallet["total_earned"]) + prizeAmount,
        }).eq("user_id", winner.userId);
      }

      await supabase.from("transactions").insert({
        user_id: winner.userId,
        type: "tournament_prize",
        amount: prizeAmount,
        status: "completed",
        description: `tournament:${weekId}:rank${rank}`,
      });
    }
  } catch (err) {
    log?.error(err, "finalizePreviousWeek failed");
  }
}

async function getPreviousWinners(): Promise<Array<{ rank: number; username: string; prize: string; avatarInitials: string; weekId: string }>> {
  try {
    const { weekStart: prevStart } = getWeekBounds(1);
    const weekId = getWeekId(prevStart);

    const { data } = await supabase
      .from("transactions")
      .select("user_id, amount, description, users(username, country)")
      .eq("type", "tournament_prize")
      .like("description", `tournament:${weekId}:%`);

    if (!data || !data.length) return [];

    return (data as Array<Record<string, unknown>>)
      .map(t => {
        const user = t["users"] as Record<string, unknown> | null;
        const desc = String(t["description"] ?? "");
        const rankMatch = desc.match(/rank(\d+)$/);
        const rank = rankMatch ? parseInt(rankMatch[1]) : 0;
        const country = String(user?.["country"] ?? "KE").toUpperCase();
        const currency = CURRENCY_CODES[country] ?? "KES";
        const amount = num(t["amount"]);
        return {
          rank,
          username: String(user?.["username"] ?? "Unknown"),
          prize: `${currency} ${amount.toLocaleString()}`,
          avatarInitials: String(user?.["username"] ?? "??").substring(0, 2).toUpperCase(),
          weekId,
        };
      })
      .sort((a, b) => a.rank - b.rank);
  } catch {
    return [];
  }
}

// In-memory guard: track the last time finalizePreviousWeek was actually attempted
// so we don't re-run it on every single tournament page load.
let lastFinalizeAttemptMs = 0;
const FINALIZE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

router.get("/current", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    // Finalize previous week's prizes in the background (non-blocking).
    // The cooldown prevents hammering the DB on every page load; the DB-level
    // duplicate check inside finalizePreviousWeek() handles concurrent servers.
    const now = Date.now();
    if (now - lastFinalizeAttemptMs > FINALIZE_COOLDOWN_MS) {
      lastFinalizeAttemptMs = now;
      finalizePreviousWeek(req.log).catch(() => {});
    }

    // Current week bounds
    const { weekStart, weekEnd } = getWeekBounds(0);

    const endsAt = new Date(weekEnd);

    // Fetch the current user's country for localized prizes
    const { data: currentUserRows } = await supabase
      .from("users")
      .select("country")
      .eq("id", userId)
      .limit(1);
    const currentUserCountry = String(
      ((currentUserRows ?? [])[0] as Record<string, unknown> | undefined)?.["country"] ?? "KE"
    ).toUpperCase();

    // Build leaderboard: count only this week's activated referrals
    const { data: allUsers } = await supabase
      .from("users")
      .select("id, username")
      .eq("status", "active")
      .limit(100);

    const users = (allUsers ?? []) as Array<Record<string, unknown>>;

    const leaderboardEntries = await Promise.all(
      users.map(async (u) => {
        const { count } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("referred_by", u["id"])
          .eq("status", "active")
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString());
        return {
          userId: u["id"],
          username: String(u["username"] ?? ""),
          referrals: count ?? 0,
          avatarInitials: String(u["username"] ?? "??").substring(0, 2).toUpperCase(),
          isCurrentUser: u["id"] === userId,
        };
      })
    );

    // Keep only participants with at least 1 referral this week, then sort
    const sorted = leaderboardEntries
      .filter(e => e.referrals > 0)
      .sort((a, b) => b.referrals - a.referrals)
      .map((e, idx) => ({ ...e, rank: idx + 1 }));

    const userPos = sorted.find(e => e.isCurrentUser) ?? null;

    // Prizes in the current user's currency
    const prizes = [1, 2, 3].map(rank => ({
      rank,
      prize: prizeLabel(currentUserCountry, rank),
    }));

    // Previous week's winners
    const previousWinners = await getPreviousWinners();

    res.json({
      id: 1,
      name: "Weekly Referral Tournament",
      endsAt: endsAt.toISOString(),
      prizes,
      leaderboard: sorted,
      userPosition: userPos,
      previousWinners,
    });
  } catch (err) {
    req.log.error({ err }, "Get tournament error");
    res.status(500).json({ error: "ServerError", message: "Failed to get tournament" });
  }
});

export default router;
