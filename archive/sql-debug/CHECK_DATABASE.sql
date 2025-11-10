-- ============================================
-- CHECK IF GAMIFICATION TABLES EXIST
-- Run this to verify database setup
-- ============================================

-- Check if tables exist
SELECT 
  'partner_points' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'partner_points'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'partner_point_transactions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'partner_point_transactions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'user_points' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_points'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'point_transactions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'point_transactions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if functions exist
SELECT 
  'add_user_points' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'add_user_points'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'add_partner_points' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'add_partner_points'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- If any table is missing, show this message
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_points') THEN
    RAISE NOTICE '❌ partner_points table is MISSING - You need to run RESTORE_GAMIFICATION.sql';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_partner_points') THEN
    RAISE NOTICE '❌ add_partner_points function is MISSING - You need to run RESTORE_GAMIFICATION.sql';
  END IF;
END $$;
