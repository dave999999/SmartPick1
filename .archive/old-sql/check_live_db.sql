-- Check RLS status on all tables
SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for overly permissive RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  CASE
    WHEN qual = 'true' THEN '⚠️ PERMISSIVE (true)'
    ELSE 'OK'
  END as policy_risk
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- List all SECURITY DEFINER functions
SELECT
  n.nspname as schema,
  p.proname as function_name,
  CASE WHEN p.prosecdef THEN '⚠️ SECURITY DEFINER' ELSE 'NORMAL' END as security_mode
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true
ORDER BY p.proname;

-- Check migration history
SELECT
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC
LIMIT 20;

-- Count records in critical tables
SELECT
  'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'partners', COUNT(*) FROM partners
UNION ALL
SELECT 'offers', COUNT(*) FROM offers
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations
UNION ALL
SELECT 'user_points', COUNT(*) FROM user_points
UNION ALL
SELECT 'partner_points', COUNT(*) FROM partner_points
UNION ALL
SELECT 'point_transactions', COUNT(*) FROM point_transactions;

-- Check for any active penalties
SELECT COUNT(*) as active_penalties
FROM user_penalties
WHERE expires_at > NOW();

-- Check realtime replication slot
SELECT
  slot_name,
  plugin,
  slot_type,
  active
FROM pg_replication_slots
WHERE slot_name LIKE '%realtime%';
