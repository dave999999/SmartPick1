-- Safe backfill of public.users that avoids duplicate inserts into user_points
-- Date: 2025-11-08
-- Fixed: Use DISABLE TRIGGER USER instead of ALL to avoid system triggers

BEGIN;

-- 1) Temporarily disable user triggers on users to prevent grant_welcome_points() from firing during backfill
ALTER TABLE public.users DISABLE TRIGGER USER;

-- 2) Insert missing profiles and capture inserted ids
WITH missing AS (
  SELECT u.id, u.email,
         COALESCE(u.raw_user_meta_data->>'name', u.email) AS name,
         u.raw_user_meta_data->>'avatar_url' AS avatar_url
  FROM auth.users u
  LEFT JOIN public.users p ON p.id = u.id
  WHERE p.id IS NULL
), ins AS (
  INSERT INTO public.users (id, email, name, avatar_url)
  SELECT id, email, name, avatar_url FROM missing
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
-- 3) Optionally seed user_points for the newly inserted users only, ignoring duplicates
INSERT INTO public.user_points (user_id, balance)
SELECT id, 100 FROM ins
ON CONFLICT (user_id) DO NOTHING;

-- 4) Re-enable user triggers
ALTER TABLE public.users ENABLE TRIGGER USER;

COMMIT;