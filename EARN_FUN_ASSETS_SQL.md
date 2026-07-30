# Earn-Fun Assets — SQL Setup

Copy and run this in your **Supabase SQL Editor**.

```sql
-- ============================================================
--  earn_fun_assets
--  Stores admin-uploaded content for the "Earn with Fun" pages.
--  Categories: tiktok | youtube | movies | reals | ads
--  asset_type:  video_link (YouTube URL)  |  image_url (direct image)
-- ============================================================
CREATE TABLE IF NOT EXISTS earn_fun_assets (
  id           BIGSERIAL PRIMARY KEY,
  category     TEXT        NOT NULL
                 CHECK (category IN ('tiktok', 'youtube', 'movies', 'reals', 'ads')),
  title        TEXT        NOT NULL,
  url          TEXT        NOT NULL,
  thumbnail_url TEXT,
  asset_type   TEXT        NOT NULL DEFAULT 'video_link'
                 CHECK (asset_type IN ('video_link', 'image_url')),
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-category lookups
CREATE INDEX IF NOT EXISTS idx_earn_fun_assets_category
  ON earn_fun_assets (category, is_active, sort_order);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_earn_fun_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_earn_fun_updated_at ON earn_fun_assets;
CREATE TRIGGER trg_earn_fun_updated_at
  BEFORE UPDATE ON earn_fun_assets
  FOR EACH ROW EXECUTE FUNCTION set_earn_fun_updated_at();
```

## Optional seed data (sample videos)

```sql
INSERT INTO earn_fun_assets (category, title, url, asset_type, sort_order) VALUES
-- TikTok (YouTube Shorts / viral short-form)
('tiktok', 'Funny Viral Short', 'https://www.youtube.com/watch?v=QH2-TGUlwu4', 'video_link', 1),
('tiktok', 'Dance Challenge Reel', 'https://www.youtube.com/watch?v=2vjPBrBU-TM', 'video_link', 2),

-- YouTube
('youtube', 'Never Gonna Give You Up', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video_link', 1),
('youtube', 'Shape of You – Ed Sheeran', 'https://www.youtube.com/watch?v=JGwWNGJdvx8', 'video_link', 2),

-- Movies
('movies', 'Interstellar Official Trailer', 'https://www.youtube.com/watch?v=sGbxmsDFVnE', 'video_link', 1),
('movies', 'Inception Official Trailer', 'https://www.youtube.com/watch?v=66TuSJo4dZM', 'video_link', 2),

-- Reals
('reals', 'Funny Moments Reel', 'https://www.youtube.com/watch?v=7ytELs3omCI', 'video_link', 1),
('reals', 'Classic Viral Reel', 'https://www.youtube.com/watch?v=StTqXEQ2l-Y', 'video_link', 2),

-- Ads (video)
('ads', 'Nike – You Can''t Stop Us', 'https://www.youtube.com/watch?v=iqJgFTOAQQI', 'video_link', 1),
('ads', 'Coca-Cola Holiday Ad', 'https://www.youtube.com/watch?v=8bCB3tbAqmA', 'video_link', 2);
```
