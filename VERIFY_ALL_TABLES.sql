-- ============================================
-- VERIFY ALL REQUIRED TABLES EXIST
-- Run this to check what's missing
-- ============================================

SELECT 
  'user_points' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_points'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - RUN SUPABASE_SETUP.SQL!' END as status
UNION ALL
SELECT 
  'point_transactions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'point_transactions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - RUN SUPABASE_SETUP.SQL!' END as status
UNION ALL
SELECT 
  'partner_points' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'partner_points'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - RUN COMPLETE_SETUP_ALL_IN_ONE.SQL!' END as status
UNION ALL
SELECT 
  'partner_point_transactions' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'partner_point_transactions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - RUN COMPLETE_SETUP_ALL_IN_ONE.SQL!' END as status
UNION ALL
SELECT 
  'user_stats' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_stats'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING - RUN SUPABASE_SETUP.SQL!' END as status;

SELECT '' as blank;
SELECT '⚠️  IF ANY TABLE IS MISSING:' as warning;
SELECT '1. Find supabase-setup.sql or supabase-setup-fixed.sql' as step1;
SELECT '2. Run it in Supabase SQL Editor' as step2;
SELECT '3. Then run COMPLETE_SETUP_ALL_IN_ONE.sql' as step3;
