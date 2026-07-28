# Investment Feature — SQL Setup

Run the following SQL in your Supabase **SQL Editor** to create all the tables needed for the Investment PRO feature.

---

## Step 1 — Create investment_plans table

```sql
CREATE TABLE IF NOT EXISTS investment_plans (
  id           SERIAL PRIMARY KEY,
  brand_name   TEXT NOT NULL DEFAULT 'TEKSAN',
  name         TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('basic', 'premium')),
  deposit_amount  NUMERIC(15,2) NOT NULL,
  daily_profit    NUMERIC(15,2) NOT NULL,
  total_days      INTEGER NOT NULL DEFAULT 120,
  total_profit    NUMERIC(15,2) NOT NULL,
  image_url       TEXT,
  country         TEXT NOT NULL DEFAULT 'ALL',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_plans_country  ON investment_plans(country);
CREATE INDEX IF NOT EXISTS idx_investment_plans_active   ON investment_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_investment_plans_category ON investment_plans(category);
```

---

## Step 2 — Create user_investments table

```sql
CREATE TABLE IF NOT EXISTS user_investments (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id             INTEGER REFERENCES investment_plans(id),
  plan_name           TEXT NOT NULL,
  brand_name          TEXT NOT NULL,
  category            TEXT NOT NULL,
  deposit_amount      NUMERIC(15,2) NOT NULL,
  daily_profit_amount NUMERIC(15,2) NOT NULL,
  total_days          INTEGER NOT NULL DEFAULT 120,
  total_profit        NUMERIC(15,2) NOT NULL,
  image_url           TEXT,
  total_earned        NUMERIC(15,2) NOT NULL DEFAULT 0,
  days_elapsed        INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','completed','cancelled')),
  start_date          TIMESTAMPTZ,
  last_credited_at    TIMESTAMPTZ,
  next_credit_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_investments_user_id ON user_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_investments_status  ON user_investments(status);
CREATE INDEX IF NOT EXISTS idx_user_investments_next    ON user_investments(next_credit_at)
  WHERE status = 'active';
```

---

## Step 3 — Add investment_balance column to wallet

```sql
ALTER TABLE wallet
  ADD COLUMN IF NOT EXISTS investment_balance NUMERIC(15,2) NOT NULL DEFAULT 0;
```

---

## Step 4 — Add investment & investment_profit to transaction type enum (if it's an enum)

> Only run this if your `transactions` table uses a PostgreSQL enum for `type`.
> If `type` is just TEXT, skip this step.

```sql
-- Check if it's an enum first:
SELECT typname FROM pg_type WHERE typname = 'transaction_type';

-- If the above returns a row, run:
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'investment';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'investment_profit';
```

---

## Step 5 (Optional) — Seed some sample Basic Plans for testing

```sql
-- Uganda Basic Plans (UGX)
INSERT INTO investment_plans (brand_name, name, category, deposit_amount, daily_profit, total_days, total_profit, country, sort_order) VALUES
  ('TEKSAN', 'MiniCore 2KVA Portable Generator', 'basic',  20000,  4000, 120, 480000,  'UG', 1),
  ('TEKSAN', 'UrbanLite 3.5KVA Generator',       'basic',  38000,  7600, 120, 912000,  'UG', 2),
  ('TEKSAN', 'PowerNest 5KVA Generator',          'basic',  80000, 16000, 120, 1920000, 'UG', 3),
  ('TEKSAN', 'MegaCore 8KVA Generator',           'premium',150000, 30000, 120, 3600000, 'UG', 4);

-- Kenya Basic Plans (KES)
INSERT INTO investment_plans (brand_name, name, category, deposit_amount, daily_profit, total_days, total_profit, country, sort_order) VALUES
  ('TEKSAN', 'MiniCore 2KVA Portable Generator', 'basic',  2000,  400, 120, 48000,  'KE', 1),
  ('TEKSAN', 'UrbanLite 3.5KVA Generator',       'basic',  4000,  800, 120, 96000,  'KE', 2),
  ('TEKSAN', 'PowerNest 5KVA Generator',          'basic',  8000, 1600, 120, 192000, 'KE', 3),
  ('TEKSAN', 'MegaCore 8KVA Generator',           'premium',15000, 3000, 120, 360000, 'KE', 4);
```

---

## After running the SQL

1. Go to the **Admin Panel → Investment Plans** to create plans for each country with real images and amounts.
2. Go to **Admin Panel → Investments** (Payment Verifications tab) to approve user investment payments.
3. Users can now access **Investment PRO → Investment Plans** from their sidebar.

The background worker runs every **10 minutes** and credits daily profits once **24 hours** have elapsed since each plan started (or last credit).
