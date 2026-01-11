-- Check who is currently connected to your app (realtime + recent activity)
-- Note: Realtime websocket connections are tracked in user_presence table
-- PostgreSQL pg_stat_activity shows internal Supabase services, not browser connections

-- 1. Check recent user activity (last 5 minutes)
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'role' as role,
    up.platform,
    up.last_seen,
    EXTRACT(EPOCH FROM (NOW() - up.last_seen))::INTEGER as seconds_ago
FROM auth.users u
LEFT JOIN user_presence up ON u.id = up.user_id
WHERE up.last_seen > NOW() - INTERVAL '5 minutes'
ORDER BY up.last_seen DESC;

-- 2. Check active reservations (users might be on MyPicks page)
SELECT 
    COUNT(DISTINCT r.user_id) as active_customers,
    COUNT(*) as total_active_reservations
FROM reservations r
WHERE r.status = 'active'
  AND r.expires_at > NOW();

-- 3. Check online partners (might be on partner dashboard)
SELECT 
    p.business_name,
    u.email,
    up.last_seen,
    up.platform,
    COUNT(o.id) as active_offers
FROM partners p
JOIN auth.users u ON p.user_id = u.id
LEFT JOIN user_presence up ON u.id = up.user_id
LEFT JOIN offers o ON p.id = o.partner_id AND o.status = 'active'
WHERE up.last_seen > NOW() - INTERVAL '10 minutes'
GROUP BY p.id, p.business_name, u.email, up.last_seen, up.platform
ORDER BY up.last_seen DESC;

-- 4. Check recent authentication activity (users logged in recently)
SELECT 
    COUNT(DISTINCT user_id) as unique_users_last_hour
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND action IN ('LOGIN', 'TOKEN_REFRESHED');

-- 5. Summary: Who is likely connected right now
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'full_name' as name,
    u.raw_user_meta_data->>'role' as role,
    up.platform,
    up.last_seen,
    CASE 
        WHEN up.last_seen > NOW() - INTERVAL '1 minute' THEN '🟢 Active'
        WHEN up.last_seen > NOW() - INTERVAL '5 minutes' THEN '🟡 Recent'
        WHEN up.last_seen > NOW() - INTERVAL '15 minutes' THEN '🟠 Idle'
        ELSE '⚫ Offline'
    END as activity_status,
    EXTRACT(EPOCH FROM (NOW() - up.last_seen))::INTEGER as seconds_since_activity
FROM auth.users u
LEFT JOIN user_presence up ON u.id = up.user_id
WHERE up.last_seen > NOW() - INTERVAL '15 minutes'
ORDER BY up.last_seen DESC
LIMIT 50;
