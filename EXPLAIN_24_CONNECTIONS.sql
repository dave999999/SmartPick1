-- ==============================================================
-- WHAT ARE THOSE 24 CONNECTIONS IN SUPABASE DASHBOARD?
-- ==============================================================

-- 1. Check if ANY users are tracked (your app uses admin-only presence tracking)
SELECT COUNT(*) as total_users_in_presence_table FROM user_presence;

-- 2. Show ALL presence records (if any)
SELECT * FROM user_presence ORDER BY last_seen DESC LIMIT 20;

-- 3. Count active reservations (users on MyPicks page would have these)
SELECT 
    COUNT(DISTINCT user_id) as users_with_reservations,
    COUNT(*) as total_active_reservations
FROM reservations 
WHERE status = 'active' AND expires_at > NOW();

-- 4. Count recent logins (last hour)
SELECT COUNT(*) as total_logins_last_hour
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND action = 'LOGIN';

-- ==============================================================
-- EXPLANATION OF THE 24 CONNECTIONS YOU SEE:
-- ==============================================================
-- 
-- The "24 Connected Clients" in Supabase dashboard shows:
-- ✅ PostgreSQL connection pool (internal services)
-- ✅ PostgREST connections (API server)
-- ✅ Realtime server connections
-- ✅ Auth server connections
-- ✅ Storage server connections
-- 
-- This is NOT the number of users on your app!
-- 
-- Real user connections come from:
-- 1. Realtime subscriptions (MyPicks page, Telegram status)
-- 2. User presence tracking (admin-only in your app)
-- 
-- If user_presence is EMPTY, your admin-only tracking is working
-- and those 24 connections are Supabase internal services.
-- ==============================================================
