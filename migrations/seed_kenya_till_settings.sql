-- Kenya manual M-Pesa Till payment settings.
-- Run this in the Supabase SQL editor after app_settings exists.
INSERT INTO public.app_settings (key, value, updated_at)
VALUES
  ('kenya_till_number', '5580730', now()),
  ('kenya_till_business_name', 'ZANY TECH EXPERTS', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();