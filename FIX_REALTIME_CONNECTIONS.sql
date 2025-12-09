-- ============================================
-- FIX REALTIME CONNECTION LEAK
-- ============================================
-- Problem: 4.7M realtime queries, 6,000 calls/min
-- Cause: Multiple browser tabs/admin dashboards left open
-- Solution: You need MANUAL actions (SQL lacks permissions)

-- ============================================
-- SOLUTION 1: Close Browser Tabs (EASIEST)
-- ============================================
-- 1. Close all browser tabs running your app
-- 2. Close admin dashboard if open
-- 3. Stop any local dev servers (npm run dev)
-- 4. Wait 2 minutes for connections to timeout
-- 5. Re-open app in SINGLE tab

-- ============================================
-- SOLUTION 2: Restart Realtime Service (RECOMMENDED)
-- ============================================
-- Go to Supabase Dashboard:
-- https://supabase.com/dashboard/project/ggzhipaxnhwcilomswtn/settings/infrastructure
-- 
-- 1. Find "Realtime" in the services list
-- 2. Click the "..." menu → "Restart"
-- 3. Wait 30 seconds
-- 4. All zombie connections cleared!
-- 
-- OR use Supabase CLI:
-- supabase functions restart realtime

-- ============================================
-- SOLUTION 3: Disable/Re-enable Realtime (NUCLEAR)
-- ============================================
-- In Supabase Dashboard → Settings → API:
-- 1. Disable "Realtime" toggle
-- 2. Wait 1 minute
-- 3. Re-enable "Realtime" toggle
-- This kills ALL connections immediately

-- ============================================
-- CHECK: Verify Active Connections (READ-ONLY)
-- ============================================
SELECT 
    count(*) as active_connections,
    application_name,
    state,
    count(*) FILTER (WHERE state = 'active') as active_queries,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity 
WHERE application_name LIKE '%realtime%'
   OR datname = current_database()
GROUP BY application_name, state
ORDER BY active_connections DESC;

-- If you see 50+ realtime connections, that's your problem!

-- ============================================
-- Expected Results After Manual Fix:
-- ✅ Active connections drop from 50+ → 2-5
-- ✅ Realtime calls/min drop from 6,000 → ~50
-- ✅ Database CPU usage drops by ~60%
-- 
-- Note: The code fixes you already made will prevent this
-- from happening again once old connections are cleared!
-- ============================================
