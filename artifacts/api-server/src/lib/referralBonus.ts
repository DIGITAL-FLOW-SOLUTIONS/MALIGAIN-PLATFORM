import { supabase } from "./supabase";
import { sendReferralBonusEmail } from "./mailer";
import { getBonusTable, COUNTRY_CURRENCY } from "./appSettings";

function num(v: unknown): number {
  return parseFloat(String(v ?? "0")) || 0;
}

export interface ReferralBonusResult {
  emailsSent: number;
  emailsFailed: number;
  noEmail: number;
}

/**
 * Triggered on every user activation (M-Pesa or Eversend admin approval).
 * Walks up to 3 levels of uplines and credits each with their referral bonus
 * in their own local currency into main_wallet, team_earnings, and total_earned.
 * Bonus amounts are loaded from the database (app_settings) at runtime.
 */
export async function triggerReferralBonus(activatedUserId: number, log?: { error: (...args: unknown[]) => void }): Promise<ReferralBonusResult> {
  const result: ReferralBonusResult = { emailsSent: 0, emailsFailed: 0, noEmail: 0 };
  try {
    const BONUS_TABLE = await getBonusTable();

    const { data: activatedRows } = await supabase
      .from("users")
      .select("id, username, country, referred_by")
      .eq("id", activatedUserId)
      .limit(1);

    const activated = (activatedRows ?? [])[0] as Record<string, unknown> | undefined;
    if (!activated || !activated["referred_by"]) return result;

    const downlineCountry = String(activated["country"] ?? "KE").toUpperCase();
    const downlineUsername = String(activated["username"] ?? "a member");
    const l1Id = activated["referred_by"] as number;

    const { data: l1Rows } = await supabase
      .from("users")
      .select("id, username, email, country, referred_by")
      .eq("id", l1Id)
      .limit(1);

    const l1 = (l1Rows ?? [])[0] as Record<string, unknown> | undefined;
    if (!l1) return result;

    let l2: Record<string, unknown> | undefined;
    const l2Id = l1["referred_by"] as number | null ?? null;
    if (l2Id) {
      const { data: l2Rows } = await supabase
        .from("users")
        .select("id, username, email, country, referred_by")
        .eq("id", l2Id)
        .limit(1);
      l2 = (l2Rows ?? [])[0] as Record<string, unknown> | undefined;
    }

    let l3: Record<string, unknown> | undefined;
    if (l2 && l2["referred_by"]) {
      const l3Id = l2["referred_by"] as number;
      const { data: l3Rows } = await supabase
        .from("users")
        .select("id, username, email, country, referred_by")
        .eq("id", l3Id)
        .limit(1);
      l3 = (l3Rows ?? [])[0] as Record<string, unknown> | undefined;
    }

    const l1Username = String(l1["username"] ?? "a member");
    const l2Username = l2 ? String(l2["username"] ?? "a member") : "";

    const chain: Array<{ upline: Record<string, unknown>; level: 1 | 2 | 3; knownAs: string }> = [
      { upline: l1, level: 1, knownAs: downlineUsername },
      ...(l2 ? [{ upline: l2, level: 2 as const, knownAs: l1Username }] : []),
      ...(l3 ? [{ upline: l3, level: 3 as const, knownAs: l2Username }] : []),
    ];

    for (const { upline, level, knownAs } of chain) {
      const uplineId = upline["id"] as number;
      const uplineCountry = String(upline["country"] ?? "KE").toUpperCase();
      const uplineEmail = upline["email"] as string | undefined;
      const uplineUsername = String(upline["username"] ?? "");

      const bonusRow = BONUS_TABLE[uplineCountry]?.[downlineCountry];
      if (!bonusRow) continue;

      const bonusAmount = bonusRow[level - 1];
      if (!bonusAmount || bonusAmount <= 0) continue;

      const { data: wallets } = await supabase
        .from("wallet")
        .select("main_wallet, team_earnings, total_earned, today_earnings")
        .eq("user_id", uplineId)
        .limit(1);

      const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
      if (!wallet) continue;

      await supabase.from("wallet").update({
        main_wallet:    num(wallet["main_wallet"])    + bonusAmount,
        team_earnings:  num(wallet["team_earnings"])  + bonusAmount,
        total_earned:   num(wallet["total_earned"])   + bonusAmount,
        today_earnings: num(wallet["today_earnings"]) + bonusAmount,
      }).eq("user_id", uplineId);

      await supabase.from("transactions").insert({
        user_id: uplineId,
        type: "referral",
        amount: bonusAmount,
        status: "completed",
        description: `Level ${level} referral bonus — activation of user #${activatedUserId}`,
      });

      await supabase.from("bonus_history").insert({
        user_id: uplineId,
        tier_id: null,
        level,
        from_user_id: activatedUserId,
        amount: bonusAmount,
        description: `Level ${level} referral bonus — ${knownAs} activated`,
      });

      if (uplineEmail) {
        // Email shows the downline's country currency & same-country rate so the
        // upline feels the international flavour of their referral — actual wallet
        // credit (bonusAmount in upline's currency) is never changed.
        const emailCurrency = COUNTRY_CURRENCY[downlineCountry] ?? COUNTRY_CURRENCY[uplineCountry] ?? uplineCountry;
        const downlineSameCountryRow = BONUS_TABLE[downlineCountry]?.[downlineCountry];
        const emailAmount = (downlineSameCountryRow?.[level - 1] ?? 0) > 0
          ? downlineSameCountryRow![level - 1]
          : bonusAmount;
        try {
          await sendReferralBonusEmail({
            toEmail: uplineEmail,
            username: uplineUsername,
            level,
            amount: emailAmount,
            currency: emailCurrency,
            downlineUsername: knownAs,
          });
          result.emailsSent++;
        } catch (err: unknown) {
          result.emailsFailed++;
          log?.error(err, `[referralBonus] Email notification failed for upline #${uplineId} (${uplineEmail}) level ${level}`);
        }
      } else {
        result.noEmail++;
      }
    }
  } catch (err) {
    log?.error(err, `triggerReferralBonus failed for user #${activatedUserId}`);
  }
  return result;
}
