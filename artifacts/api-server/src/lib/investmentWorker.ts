/**
 * Investment Worker — runs every 10 minutes.
 * Credits daily profit to active investments once 24 hours have elapsed
 * since the last credit (or since start_date for the first credit).
 * Stops when total_earned >= total_profit and marks investment as completed.
 */
import { supabase } from "./supabase";
import { logger } from "./logger";

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ONE_DAY_MS  = 24 * 60 * 60 * 1000;

function num(v: unknown): number { return parseFloat(String(v ?? "0")) || 0; }

async function runCycle(): Promise<void> {
  try {
    const now = new Date();

    // Fetch all active investments where next_credit_at <= now
    const { data, error } = await supabase
      .from("user_investments")
      .select("*")
      .eq("status", "active")
      .lte("next_credit_at", now.toISOString());

    if (error) {
      logger.error({ err: error }, "Investment worker: fetch error");
      return;
    }

    const due = (data ?? []) as Array<Record<string, unknown>>;
    if (due.length === 0) return;

    logger.info({ count: due.length }, "Investment worker: crediting profits");

    for (const inv of due) {
      const invId          = inv["id"] as number;
      const userId         = inv["user_id"] as number;
      const dailyProfit    = num(inv["daily_profit_amount"]);
      const totalProfit    = num(inv["total_profit"]);
      const currentEarned  = num(inv["total_earned"]);
      const daysElapsed    = Number(inv["days_elapsed"]) || 0;
      const totalDays      = Number(inv["total_days"]) || 120;

      // How much can we still credit?
      const remaining  = totalProfit - currentEarned;
      const toCredit   = Math.min(dailyProfit, remaining);

      if (toCredit <= 0) {
        // Already reached max — mark completed
        await supabase.from("user_investments")
          .update({ status: "completed", updated_at: now.toISOString() })
          .eq("id", invId);
        continue;
      }

      const newEarned  = currentEarned + toCredit;
      const newDays    = daysElapsed + 1;
      const isComplete = newEarned >= totalProfit || newDays >= totalDays;
      const nextCredit = new Date(now.getTime() + ONE_DAY_MS).toISOString();

      // Update investment
      await supabase.from("user_investments").update({
        total_earned: newEarned,
        days_elapsed: newDays,
        last_credited_at: now.toISOString(),
        next_credit_at: isComplete ? null : nextCredit,
        status: isComplete ? "completed" : "active",
        updated_at: now.toISOString(),
      }).eq("id", invId);

      // Credit investment_balance on wallet
      const { data: wallets } = await supabase
        .from("wallet")
        .select("investment_balance, total_earned")
        .eq("user_id", userId)
        .limit(1);

      if (wallets && wallets.length > 0) {
        const w = wallets[0] as Record<string, unknown>;
        await supabase.from("wallet").update({
          investment_balance: num(w["investment_balance"]) + toCredit,
          total_earned: num(w["total_earned"]) + toCredit,
        }).eq("user_id", userId);
      }

      // Insert transaction record
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "investment_profit",
        amount: toCredit,
        status: "completed",
        description: `Daily profit: ${String(inv["plan_name"])} (Day ${newDays}/${totalDays})`,
      });

      logger.info({ invId, userId, toCredit, newEarned, isComplete }, "Investment worker: credited");
    }
  } catch (err) {
    logger.error({ err }, "Investment worker: unhandled error");
  }
}

export function startInvestmentWorker(): void {
  logger.info("Investment worker started");
  // Run immediately on startup, then every 10 minutes
  void runCycle();
  setInterval(() => { void runCycle(); }, INTERVAL_MS);
}
