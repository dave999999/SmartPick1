-- Test the EXACT query that the app uses (as anonymous user would see it)
-- This simulates what happens on the homepage

-- First, check what policies exist now
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'offers'
ORDER BY policyname;

-- Try to select offers as if we're anonymous (no auth)
-- This should work if RLS is configured correctly
SELECT 
    id,
    title,
    status,
    expires_at,
    quantity_available
FROM public.offers
WHERE status = 'ACTIVE'
AND expires_at > NOW()
AND quantity_available > 0
LIMIT 5;
