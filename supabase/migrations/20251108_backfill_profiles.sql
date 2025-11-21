-- Backfill missing public.users profiles from auth.users
-- Date: 2025-11-08

BEGIN;

-- Ensure pgcrypto for future use if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert any missing profiles based on auth.users
INSERT INTO public.users (id, email, name, avatar_url)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'name', u.email) AS name,
       u.raw_user_meta_data->>'avatar_url' AS avatar_url
FROM auth.users u
LEFT JOIN public.users p ON p.id = u.id
WHERE p.id IS NULL;

COMMIT;