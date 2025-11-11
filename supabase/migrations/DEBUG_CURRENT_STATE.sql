-- ============================================
-- DEBUG: Check Current State Before Fix
-- ============================================

-- 1. Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'update_stats_on_pickup';

-- 2. Check if user_stats table exists and structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;

-- 3. Check your user's data
SELECT 
  u.id,
  u.name,
  u.is_partner,
  p.id as partner_id,
  us.user_id as has_user_stats,
  us.total_reservations,
  us.total_money_saved
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
LEFT JOIN user_stats us ON us.user_id = u.id
WHERE u.is_partner = true
LIMIT 5;

-- 4. Check your active reservations
SELECT 
  r.id,
  r.status,
  r.customer_id,
  r.partner_id,
  u.name as customer_name,
  p.business_name as partner_name
FROM reservations r
JOIN users u ON u.id = r.customer_id
JOIN partners p ON p.id = r.partner_id
WHERE r.status = 'ACTIVE'
ORDER BY r.created_at DESC
LIMIT 10;

-- 5. Check if check_user_achievements function exists
SELECT 
  proname as function_name,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'check_user_achievements';
