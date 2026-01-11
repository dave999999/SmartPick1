-- Simple check: How many users are actually tracked in user_presence?

-- 1. Count all user_presence records
SELECT COUNT(*) as total_presence_records
FROM user_presence;

-- 2. Show all user_presence records (if any exist)
SELECT 
    user_id,
    platform,
    last_seen,
    EXTRACT(EPOCH FROM (NOW() - last_seen))::INTEGER as seconds_ago
FROM user_presence
ORDER BY last_seen DESC;

-- 3. Check if user_presence table even has admin-only tracking enabled
SELECT 
    'user_presence RLS policies' as check_name,
    pol.policyname,
    pol.roles,
    pol.cmd,
    pol.qual
FROM pg_policies pol
WHERE pol.tablename = 'user_presence'
ORDER BY pol.cmd;
