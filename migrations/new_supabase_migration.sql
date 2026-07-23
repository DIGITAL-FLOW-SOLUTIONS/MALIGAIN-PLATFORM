-- =============================================================================
-- MALIGAIN — Full Schema Migration
-- Generated: 2026-07-23
--
-- PURPOSE: Recreate the complete database schema on a new Supabase project.
--          This script is DATA-FREE — it only creates structure.
--          Run this in your new Supabase project: Dashboard → SQL Editor → New query
--
-- HOW TO USE:
--   1. In your NEW Supabase project, go to SQL Editor and paste + run this entire script.
--   2. After it runs, also run the seed block at the bottom for app_settings defaults.
--   3. See the NOTES section at the top for things to do via the Supabase Dashboard.
--
-- NOTES:
--   • Extensions: pgcrypto and uuid-ossp must be enabled in your new project.
--     Go to: Dashboard → Database → Extensions → search and enable each one.
--     (supabase_vault, hypopg, index_advisor, pg_stat_statements are Supabase-internal
--      and will already be present or managed automatically.)
--   • No RLS policies exist in the source database — none needed here.
--   • No triggers exist in the source database — none needed here.
--   • The "tasks" system is hardcoded in server code, NOT in the database.
--     No tasks or task_completions tables are needed.
--   • After running this script, update your .env / Replit Secrets with
--     the new project's SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_SECRET.
-- =============================================================================


-- =============================================================================
-- STEP 1: EXTENSIONS
-- (Enable pgcrypto and uuid-ossp via Dashboard → Database → Extensions first,
--  then these CREATE EXTENSION lines are a safety net.)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- STEP 2: ENUM TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('withdrawal', 'recharge', 'bonus', 'commission', 'referral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- STEP 3: TABLES (ordered by dependency)
-- =============================================================================

-- ── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id             SERIAL PRIMARY KEY,
  username       TEXT   NOT NULL UNIQUE,
  email          TEXT   NOT NULL UNIQUE,
  password_hash  TEXT   NOT NULL,
  phone          TEXT,
  country        TEXT,
  referral_code  TEXT   NOT NULL UNIQUE,
  referred_by    INTEGER REFERENCES public.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  status         public.user_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── wallet ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES public.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  team_earnings     NUMERIC(12,2) NOT NULL DEFAULT 0,
  main_wallet       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_withdrawn   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earned      NUMERIC(12,2) NOT NULL DEFAULT 0,
  today_earnings    NUMERIC(12,2) NOT NULL DEFAULT 0,
  affiliate_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  commissions       NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_user_id_unique UNIQUE (user_id)
);

-- ── transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES public.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  type         public.transaction_type NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  status       public.transaction_status NOT NULL DEFAULT 'pending',
  description  TEXT NOT NULL,
  phone_number TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                 SERIAL PRIMARY KEY,
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  price              NUMERIC(12,2) NOT NULL,
  original_price     NUMERIC(12,2),
  category           TEXT NOT NULL,
  image_url          TEXT,
  sold_count         INTEGER NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── purchases ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES public.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  product_id  INTEGER NOT NULL REFERENCES public.products(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  amount_paid NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── bonus_tiers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_tiers (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  required_referrals INTEGER NOT NULL,
  bonus_amount       NUMERIC(12,2) NOT NULL,
  sort_order         INTEGER NOT NULL DEFAULT 0
);

-- ── bonus_history ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_history (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES public.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  tier_id    INTEGER NOT NULL REFERENCES public.bonus_tiers(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  amount     NUMERIC(12,2) NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── eversend_verifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eversend_verifications (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  screenshot_url TEXT NOT NULL,
  amount_paid    NUMERIC NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  admin_note     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  currency       TEXT
);

-- ── tournaments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournaments (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  prizes     TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── admin_users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── admin_audit_log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id             SERIAL PRIMARY KEY,
  admin_username TEXT NOT NULL,
  action         TEXT NOT NULL,
  target_type    TEXT,
  target_id      TEXT,
  details        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── app_settings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  business_name TEXT
);


-- =============================================================================
-- STEP 4: INDEXES (non-PK, non-unique-constraint)
-- =============================================================================

-- bonus_history
CREATE INDEX IF NOT EXISTS bonus_history_claimed_at_idx     ON public.bonus_history (claimed_at);
CREATE INDEX IF NOT EXISTS idx_bonus_history_claimed         ON public.bonus_history (claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bonus_history_user_id         ON public.bonus_history (user_id);

-- bonus_tiers
CREATE INDEX IF NOT EXISTS bonus_tiers_sort_order_idx        ON public.bonus_tiers (sort_order);

-- eversend_verifications
CREATE INDEX IF NOT EXISTS eversend_verifications_created_at_idx ON public.eversend_verifications (created_at);
CREATE INDEX IF NOT EXISTS eversend_verifications_status_idx     ON public.eversend_verifications (status);
CREATE INDEX IF NOT EXISTS idx_eversend_status                   ON public.eversend_verifications (status);
CREATE INDEX IF NOT EXISTS idx_eversend_user_id                  ON public.eversend_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_eversend_verifications_user_id    ON public.eversend_verifications (user_id);

-- purchases
CREATE INDEX IF NOT EXISTS purchases_user_id_idx             ON public.purchases (user_id);

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_created_at       ON public.transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status      ON public.transactions (type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id          ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx       ON public.transactions (created_at);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx          ON public.transactions (user_id);

-- users
CREATE INDEX IF NOT EXISTS idx_users_country                 ON public.users (country);
CREATE INDEX IF NOT EXISTS idx_users_created_at              ON public.users (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_status                  ON public.users (status);
CREATE INDEX IF NOT EXISTS users_created_at_idx              ON public.users (created_at);
CREATE INDEX IF NOT EXISTS users_phone_idx                   ON public.users (phone);
CREATE INDEX IF NOT EXISTS users_referred_by_idx             ON public.users (referred_by);

-- wallet
CREATE INDEX IF NOT EXISTS idx_wallet_user_id                ON public.wallet (user_id);
CREATE INDEX IF NOT EXISTS wallet_user_id_idx                ON public.wallet (user_id);
CREATE INDEX IF NOT EXISTS wallet_user_id_idx1               ON public.wallet (user_id);


-- =============================================================================
-- STEP 5: STORED FUNCTIONS
-- =============================================================================

-- credit_wallet: upserts a wallet row and credits the amount
CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id integer, p_amount numeric)
  RETURNS void
  LANGUAGE sql
AS $function$
  INSERT INTO wallet (user_id, main_wallet, total_earned, team_earnings,
                      affiliate_balance, commissions, total_withdrawn, today_earnings)
  VALUES (p_user_id, p_amount, p_amount, 0, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    main_wallet  = wallet.main_wallet  + p_amount,
    total_earned = wallet.total_earned + p_amount;
$function$;

-- get_admin_stats: returns a JSON object of platform-wide KPIs for the admin dashboard
CREATE OR REPLACE FUNCTION public.get_admin_stats(seven_days_ago timestamp with time zone)
  RETURNS json
  LANGUAGE sql
  STABLE
AS $function$
  SELECT json_build_object(
    'totalUsers',          (SELECT count(*) FROM users),
    'activeUsers',         (SELECT count(*) FROM users WHERE status = 'active'),
    'inactiveUsers',       (SELECT count(*) FROM users WHERE status = 'inactive'),
    'suspendedUsers',      (SELECT count(*) FROM users WHERE status = 'suspended'),
    'recentSignups',       (SELECT count(*) FROM users WHERE created_at >= seven_days_ago),
    'pendingVerifications',(SELECT count(*) FROM eversend_verifications WHERE status = 'pending'),
    'pendingWithdrawals',  (SELECT count(*) FROM transactions WHERE type = 'withdrawal' AND status = 'pending'),
    'totalTransactions',   (SELECT count(*) FROM transactions),
    'kesDeposits', (
      SELECT COALESCE(SUM(amount), 0)
      FROM transactions WHERE type = 'recharge' AND status = 'completed'
    ),
    'eversendDeposits', (
      SELECT COALESCE(json_agg(r), '[]'::json) FROM (
        SELECT currency, SUM(amount_paid) AS total
        FROM eversend_verifications WHERE status = 'approved'
        GROUP BY currency
      ) r
    ),
    'withdrawalsByCurrency', (
      SELECT COALESCE(json_agg(r), '[]'::json) FROM (
        SELECT
          COALESCE(substring(description FROM '·\s*Gross:\s*([A-Z]{3})'), 'KES') AS currency,
          SUM(amount) AS total
        FROM transactions WHERE type = 'withdrawal' AND status = 'completed'
        GROUP BY 1
      ) r
    ),
    'walletsByCountry', (
      SELECT COALESCE(json_agg(r), '[]'::json) FROM (
        SELECT u.country, SUM(w.main_wallet) AS total
        FROM wallet w JOIN users u ON u.id = w.user_id
        GROUP BY u.country
      ) r
    )
  );
$function$;

-- get_team_earnings_by_country: returns a table of country → total team_earnings
CREATE OR REPLACE FUNCTION public.get_team_earnings_by_country()
  RETURNS TABLE(country text, total_team_earnings numeric)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
AS $function$
  SELECT
    u.country,
    COALESCE(SUM(w.team_earnings), 0)::NUMERIC AS total_team_earnings
  FROM users u
  LEFT JOIN wallet w ON w.user_id = u.id
  WHERE u.country IS NOT NULL AND TRIM(u.country) <> ''
  GROUP BY u.country
  ORDER BY total_team_earnings DESC;
$function$;


-- =============================================================================
-- STEP 6: SEED — app_settings defaults
-- These are the minimum configuration rows the app expects at startup.
-- Add or adjust values as needed before going live.
-- =============================================================================

INSERT INTO public.app_settings (key, value, updated_at)
VALUES
  ('launch_mode_enabled', 'false',                    now()),
  ('launch_date',         '2026-08-08T10:00:00.000Z', now())
ON CONFLICT (key) DO UPDATE
  SET value      = EXCLUDED.value,
      updated_at = now();

-- If you use MTN Cameroon, also add the phone setting:
-- INSERT INTO public.app_settings (key, value, business_name)
-- VALUES ('cm_mtn_phone', '+254757574729', 'Charles Nzive')
-- ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- STEP 7: VERIFY — run these SELECT statements to confirm everything was created
-- =============================================================================

SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER  BY table_name;
-- Expected 12 rows: admin_audit_log, admin_users, app_settings, bonus_history,
-- bonus_tiers, eversend_verifications, products, purchases, tournaments,
-- transactions, users, wallet

SELECT typname FROM pg_type
WHERE  typtype = 'e'
AND    typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER  BY typname;
-- Expected 3 rows: transaction_status, transaction_type, user_status

SELECT proname FROM pg_proc p
JOIN   pg_namespace n ON p.pronamespace = n.oid
WHERE  n.nspname = 'public'
ORDER  BY proname;
-- Expected 3 rows: credit_wallet, get_admin_stats, get_team_earnings_by_country
