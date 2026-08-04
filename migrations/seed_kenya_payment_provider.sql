-- Kenya automatic payment provider.
-- PayHero is the default. Change the value to HASHBACK to switch Kenya
-- automatic activation to Hashback immediately.
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('kenya_payment_provider', 'PAYHERO', now())
ON CONFLICT (key) DO NOTHING;