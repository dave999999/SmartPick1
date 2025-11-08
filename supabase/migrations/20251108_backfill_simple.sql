-- Simple backfill: insert missing profiles without disabling triggers
-- Date: 2025-11-08
-- Works because ON CONFLICT DO NOTHING prevents duplicates and errors

BEGIN;

-- Insert any missing profiles from auth.users
-- If trigger already created one, ON CONFLICT ignores it
INSERT INTO public.users (id, email, name, avatar_url, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.email) AS name,
  u.raw_user_meta_data->>'avatar_url' AS avatar_url,
  'CUSTOMER' AS role
FROM auth.users u
LEFT JOIN public.users p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ensure user_points exists for all users (needed for gamification)
INSERT INTO public.user_points (user_id, balance)
SELECT id, 100 
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_points)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;