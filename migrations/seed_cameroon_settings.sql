-- Run this in your Supabase SQL editor to seed the initial Cameroon MTN settings
INSERT INTO app_settings (key, value, business_name)
VALUES ('cm_mtn_phone', '+254757574729', 'Charles Nzive')
ON CONFLICT (key) DO NOTHING;
