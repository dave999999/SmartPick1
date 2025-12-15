-- Reset rate limit for testing user: davit.batumashvili@gmail.com
-- This clears the rate limiting counter

-- Option 1: If you have a rate_limits table
-- DELETE FROM rate_limits WHERE identifier = 'davit.batumashvili@gmail.com';

-- Option 2: Rate limiting is usually handled in-memory or Redis
-- You need to restart your backend server OR wait for the timeout

-- To bypass rate limiting temporarily for testing, you can:
-- 1. Restart your Edge Functions
-- 2. Wait 24 minutes
-- 3. Or temporarily disable rate limiting in your code

-- Check if there's a rate_limits table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%rate%';

-- If rate limiting is stored in database, show records for this user
-- (Uncomment if rate_limits table exists)
-- SELECT * FROM rate_limits WHERE identifier LIKE '%davit.batumashvili%';
