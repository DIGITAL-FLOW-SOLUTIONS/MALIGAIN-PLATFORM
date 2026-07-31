-- MALIGAIN welcome bonus settings and one-time claim protection.
-- Run this in the Supabase SQL editor.

INSERT INTO app_settings (key, value, updated_at)
VALUES
  ('welcome_bonus_KE_amount', '150', NOW()), ('welcome_bonus_KE_referrals', '30', NOW()),
  ('welcome_bonus_TZ_amount', '3500', NOW()), ('welcome_bonus_TZ_referrals', '12', NOW()),
  ('welcome_bonus_UG_amount', '5000', NOW()), ('welcome_bonus_UG_referrals', '25', NOW()),
  ('welcome_bonus_RW_amount', '350', NOW()), ('welcome_bonus_RW_referrals', '25', NOW()),
  ('welcome_bonus_BI_amount', '6000', NOW()), ('welcome_bonus_BI_referrals', '25', NOW()),
  ('welcome_bonus_ZM_amount', '50', NOW()), ('welcome_bonus_ZM_referrals', '25', NOW()),
  ('welcome_bonus_BW_amount', '50', NOW()), ('welcome_bonus_BW_referrals', '25', NOW()),
  ('welcome_bonus_CM_amount', '800', NOW()), ('welcome_bonus_CM_referrals', '25', NOW()),
  ('welcome_bonus_GH_amount', '20', NOW()), ('welcome_bonus_GH_referrals', '25', NOW()),
  ('welcome_bonus_NG_amount', '4000', NOW()), ('welcome_bonus_NG_referrals', '25', NOW()),
  ('welcome_bonus_SS_amount', '5000', NOW()), ('welcome_bonus_SS_referrals', '20', NOW()),
  ('welcome_bonus_CG_amount', '3500', NOW()), ('welcome_bonus_CG_referrals', '25', NOW()),
  ('welcome_bonus_MW_amount', '3500', NOW()), ('welcome_bonus_MW_referrals', '25', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Prevent concurrent requests from claiming the welcome bonus twice.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_one_welcome_bonus_per_user
  ON transactions (user_id)
  WHERE type = 'bonus' AND description = 'Welcome bonus';