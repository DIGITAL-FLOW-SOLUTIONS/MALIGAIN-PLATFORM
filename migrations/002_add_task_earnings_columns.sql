-- Incremental migration: add per-task earnings columns to the wallet table.
-- These columns receive task reward credits instead of main_wallet.
-- Only referral bonuses may credit main_wallet.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS tiktok_earnings             NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS youtube_earnings            NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS blogs_earnings              NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS reel_earnings               NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS ads_earnings                NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS movie_earnings              NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS survey_earnings             NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS chatwithforeigners_earnings NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS video_earnings              NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet ADD COLUMN IF NOT EXISTS trivia_earnings             NUMERIC(12,2) NOT NULL DEFAULT 0;
