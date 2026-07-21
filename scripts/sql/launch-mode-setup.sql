-- =============================================================================
-- MALIGAIN — Launch Mode Setup
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================
--
-- Adds two rows to app_settings:
--   launch_mode_enabled  →  "false"   (toggle via Admin → Settings → Launch Mode)
--   launch_date          →  ISO UTC string for Saturday 8 Aug 2026 at 1:00 PM EAT
--                           (East Africa Time = UTC+3, so 13:00 EAT = 10:00 UTC)
--
-- The admin can edit both values from the Admin Panel → Settings → Launch Mode.
-- =============================================================================

INSERT INTO app_settings (key, value, updated_at)
VALUES
  ('launch_mode_enabled', 'false',                   NOW()),
  ('launch_date',         '2026-08-08T10:00:00.000Z', NOW())
ON CONFLICT (key) DO UPDATE
  SET value      = EXCLUDED.value,
      updated_at = NOW();

-- Verify:
SELECT key, value, updated_at
FROM   app_settings
WHERE  key IN ('launch_mode_enabled', 'launch_date')
ORDER  BY key;
