import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";

const router: IRouter = Router();

const COUNTRY_NAMES: Record<string, string> = {
  KE: "Kenya", TZ: "Tanzania", UG: "Uganda",
  GH: "Ghana", ZM: "Zambia", CM: "Cameroon",
};

const CURRENCY_LABELS: Record<string, string> = {
  KES: "🇰🇪 Kenya (KES)",
  TZS: "🇹🇿 Tanzania (TZS)",
  UGX: "🇺🇬 Uganda (UGX)",
  GHS: "🇬🇭 Ghana (GHS)",
  ZMW: "🇿🇲 Zambia (ZMW)",
  XAF: "🇨🇲 Cameroon (XAF)",
};

// ── In-memory cache ────────────────────────────────────────────────────────
// Stats are expensive to compute. Cache for 60 s so repeated admin-tab
// refreshes (every 30 s) only hit the DB at most once per minute.
const CACHE_TTL_MS = 60_000;
let statsCache: { payload: unknown; expiresAt: number } | null = null;

function num(v: unknown) { return parseFloat(String(v ?? "0")) || 0; }

// ── walletsByCountry ────────────────────────────────────────────────────────

/**
 * Format the result of the `get_team_earnings_by_country` SQL RPC.
 * The function runs GROUP BY + SUM inside PostgreSQL and returns one row
 * per country — typically 6 rows.  No row-scanning in Node required.
 */
function formatCountryRpcResult(
  rows: Array<{ country: string; total_team_earnings: number | string }>,
): Array<{ code: string; name: string; total: number }> {
  return rows
    .filter(r => r.country && r.country !== "OTHER")
    .sort((a, b) => num(b.total_team_earnings) - num(a.total_team_earnings))
    .map(r => ({
      code: r.country.toUpperCase(),
      name: COUNTRY_NAMES[r.country.toUpperCase()] ?? r.country,
      total: Math.round(num(r.total_team_earnings) * 100) / 100,
    }));
}

// ── Row-scan fallback (used only if SQL function is not yet created) ────────
// This path is a safety net; once get_team_earnings_by_country exists in
// Supabase the fetchAllRows code path is never reached.

const PAGE_SIZE = 1000;
const MAX_PAGES = 100; // safety cap: 100 × 1 000 = 100 000 rows

async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[] | null; error: unknown }> {
  const all: T[] = [];
  let from = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { data: all, error: null };
}

function buildWalletsByCountryFromRows(
  usersData: unknown[] | null,
  walletsData: unknown[] | null,
): Array<{ code: string; name: string; total: number }> {
  if (!usersData || !walletsData) return [];

  const userCountryMap: Record<number, string> = {};
  for (const u of usersData) {
    const row = u as Record<string, unknown>;
    const raw = String(row["country"] ?? "").toUpperCase().trim();
    userCountryMap[row["id"] as number] = raw || "OTHER";
  }

  const totals: Record<string, number> = {};
  for (const w of walletsData) {
    const row = w as Record<string, unknown>;
    const country = userCountryMap[row["user_id"] as number] ?? "OTHER";
    totals[country] = (totals[country] ?? 0) + num(row["team_earnings"]);
  }

  return Object.entries(totals)
    .filter(([code]) => code !== "OTHER")
    .sort((a, b) => b[1] - a[1])
    .map(([code, total]) => ({
      code,
      name: COUNTRY_NAMES[code] ?? code,
      total: Math.round(total * 100) / 100,
    }));
}

/**
 * Fetch wallets-by-country.
 *
 * Fast path  — calls get_team_earnings_by_country() SQL function.
 *              PostgreSQL runs JOIN + GROUP BY + SUM server-side and returns
 *              6 rows.  O(1) network transfer regardless of user count.
 *
 * Fallback   — if the SQL function doesn't exist yet, falls back to scanning
 *              all users + wallets with pagination.  Create the function once
 *              in the Supabase SQL editor (see README / comment below) to
 *              eliminate this path permanently.
 */
async function fetchWalletsByCountry(
  log: Request["log"],
): Promise<Array<{ code: string; name: string; total: number }>> {
  // ── Fast path: DB-side aggregation ──────────────────────────────────────
  const { data: rpcRows, error: rpcErr } = await supabase.rpc(
    "get_team_earnings_by_country",
  ) as { data: Array<{ country: string; total_team_earnings: number }> | null; error: unknown };

  if (!rpcErr && rpcRows) {
    return formatCountryRpcResult(rpcRows);
  }

  // ── Fallback: row-scan (remove once SQL function is created) ─────────────
  log.warn(
    { err: rpcErr },
    "get_team_earnings_by_country RPC not found — falling back to row scan. " +
    "Create the SQL function in Supabase to eliminate this path.",
  );

  const [usersResult, walletsResult] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from("users").select("id, country").order("id", { ascending: true }).range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase.from("wallet").select("user_id, team_earnings").order("user_id", { ascending: true }).range(from, to),
    ),
  ]);

  if (usersResult.error) log.warn({ err: usersResult.error }, "Failed to fetch users for walletsByCountry fallback");
  if (walletsResult.error) log.warn({ err: walletsResult.error }, "Failed to fetch wallets for walletsByCountry fallback");

  return buildWalletsByCountryFromRows(
    usersResult.data as unknown[] | null,
    walletsResult.data as unknown[] | null,
  );
}

// ── Fallback for full stats (used if get_admin_stats RPC is unavailable) ───
async function computeStatsFallback(sevenDaysAgo: string) {
  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: inactiveUsers },
    { count: suspendedUsers },
    { count: pendingVerifications },
    { count: pendingWithdrawals },
    { count: totalTransactions },
    { count: recentSignups },
    { data: kesDepositData },
    { data: eversendDepositData },
    { data: withdrawalData },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "inactive"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("eversend_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("type", "withdrawal").eq("status", "pending"),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("transactions").select("amount").eq("type", "recharge").eq("status", "completed"),
    supabase.from("eversend_verifications").select("amount_paid, currency").eq("status", "approved"),
    supabase.from("transactions").select("amount, description").eq("type", "withdrawal").eq("status", "completed"),
  ]);

  const kesTotal = (kesDepositData ?? []).reduce(
    (s, r) => s + num((r as Record<string, unknown>)["amount"]), 0,
  );

  const eversendByCurrency: Record<string, number> = {};
  for (const row of (eversendDepositData ?? [])) {
    const r = row as Record<string, unknown>;
    const currency = String(r["currency"] ?? "KES").toUpperCase();
    eversendByCurrency[currency] = (eversendByCurrency[currency] ?? 0) + num(r["amount_paid"]);
  }

  const depositMap: Record<string, number> = { KES: kesTotal };
  for (const [currency, total] of Object.entries(eversendByCurrency)) {
    depositMap[currency === "KES" ? "KES" : currency] = (depositMap[currency] ?? 0) + total;
  }

  const withdrawalMap: Record<string, number> = {};
  for (const row of (withdrawalData ?? [])) {
    const r = row as Record<string, unknown>;
    const desc = String(r["description"] ?? "");
    const m = desc.match(/·\s*Gross:\s*([A-Z]{3})/);
    const currency = m ? m[1] : "KES";
    withdrawalMap[currency] = (withdrawalMap[currency] ?? 0) + num(r["amount"]);
  }

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    inactiveUsers: inactiveUsers ?? 0,
    suspendedUsers: suspendedUsers ?? 0,
    recentSignups: recentSignups ?? 0,
    pendingVerifications: pendingVerifications ?? 0,
    pendingWithdrawals: pendingWithdrawals ?? 0,
    totalTransactions: totalTransactions ?? 0,
    depositMap,
    withdrawalMap,
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    // Serve from cache if still fresh
    if (statsCache && Date.now() < statsCache.expiresAt) {
      res.json(statsCache.payload);
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run both queries in parallel.
    // get_team_earnings_by_country returns 6 rows — all aggregation is DB-side.
    const [rpcResult, walletsByCountry] = await Promise.all([
      supabase.rpc("get_admin_stats", { seven_days_ago: sevenDaysAgo }),
      fetchWalletsByCountry(req.log),
    ]);

    const { data: rpcData, error: rpcError } = rpcResult;

    let payload: Record<string, unknown>;

    if (!rpcError && rpcData) {
      // ── Fast path: everything computed inside PostgreSQL ──────────────────
      const d = rpcData as Record<string, unknown>;

      const buildCurrencyList = (
        base: Record<string, number>,
        extra: Array<{ currency: string; total: string | number }> | null,
        kesOverride?: number,
      ) => {
        const map: Record<string, number> = { ...base };
        for (const row of (extra ?? [])) {
          map[row.currency] = (map[row.currency] ?? 0) + num(row.total);
        }
        if (kesOverride !== undefined) map["KES"] = kesOverride;
        return Object.entries(map)
          .filter(([, total]) => total > 0)
          .sort(([a], [b]) => a === "KES" ? -1 : b === "KES" ? 1 : a.localeCompare(b))
          .map(([currency, total]) => ({
            currency,
            label: CURRENCY_LABELS[currency] ?? currency,
            total: Math.round(total * 100) / 100,
          }));
      };

      const eversendDeposits = d["eversendDeposits"] as Array<{ currency: string; total: string }> | null;
      const wdByCurrency = d["withdrawalsByCurrency"] as Array<{ currency: string; total: string }> | null;

      const depositsByCurrency = buildCurrencyList(
        {},
        eversendDeposits,
        num(d["kesDeposits"]),
      );

      const withdrawalsByCurrency = (wdByCurrency ?? [])
        .filter(r => num(r.total) > 0)
        .sort((a, b) => a.currency === "KES" ? -1 : b.currency === "KES" ? 1 : a.currency.localeCompare(b.currency))
        .map(r => ({
          currency: r.currency,
          label: CURRENCY_LABELS[r.currency] ?? r.currency,
          total: Math.round(num(r.total) * 100) / 100,
        }));

      payload = {
        totalUsers: Number(d["totalUsers"] ?? 0),
        activeUsers: Number(d["activeUsers"] ?? 0),
        inactiveUsers: Number(d["inactiveUsers"] ?? 0),
        suspendedUsers: Number(d["suspendedUsers"] ?? 0),
        recentSignups: Number(d["recentSignups"] ?? 0),
        pendingVerifications: Number(d["pendingVerifications"] ?? 0),
        pendingWithdrawals: Number(d["pendingWithdrawals"] ?? 0),
        totalTransactions: Number(d["totalTransactions"] ?? 0),
        depositsByCurrency,
        withdrawalsByCurrency,
        walletsByCountry,
      };
    } else {
      // ── Fallback: original approach (works before the SQL function is created) ──
      if (rpcError) {
        req.log.warn({ err: rpcError }, "get_admin_stats RPC not available, using fallback");
      }
      const fb = await computeStatsFallback(sevenDaysAgo);

      const makeCurrencyList = (map: Record<string, number>) =>
        Object.entries(map)
          .filter(([, t]) => t > 0)
          .sort(([a], [b]) => a === "KES" ? -1 : b === "KES" ? 1 : a.localeCompare(b))
          .map(([currency, total]) => ({
            currency,
            label: CURRENCY_LABELS[currency] ?? currency,
            total: Math.round(total * 100) / 100,
          }));

      payload = {
        totalUsers: fb.totalUsers,
        activeUsers: fb.activeUsers,
        inactiveUsers: fb.inactiveUsers,
        suspendedUsers: fb.suspendedUsers,
        recentSignups: fb.recentSignups,
        pendingVerifications: fb.pendingVerifications,
        pendingWithdrawals: fb.pendingWithdrawals,
        totalTransactions: fb.totalTransactions,
        depositsByCurrency: makeCurrencyList(fb.depositMap),
        withdrawalsByCurrency: makeCurrencyList(fb.withdrawalMap),
        walletsByCountry,
      };
    }

    // Store in cache
    statsCache = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "ServerError", message: "Failed to load stats" });
  }
});

export default router;
