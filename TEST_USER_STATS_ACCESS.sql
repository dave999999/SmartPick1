-- Verify the user_stats record exists for your user
-- Replace the UUID with your actual user ID

SELECT * FROM public.user_stats 
WHERE user_id = 'f10291ae-6fca-4aeb-b1a9-cbbce2733234';

-- Check RLS policy
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_stats';

-- Test if the user can actually access their own stats
-- This simulates what the frontend query does
SET request.jwt.claims = '{"sub": "f10291ae-6fca-4aeb-b1a9-cbbce2733234", "role": "authenticated"}';
SELECT * FROM public.user_stats WHERE user_id = 'f10291ae-6fca-4aeb-b1a9-cbbce2733234';
