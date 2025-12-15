-- ============================================================================
-- SUPABASE DATABASE DIAGNOSTIC SCRIPT
-- ============================================================================
-- Run this in Supabase SQL Editor to understand your current database structure
-- This will help create an accurate fix for the linter warnings
-- ============================================================================

-- ============================================================================
-- PART 1: List all tables in public schema
-- ============================================================================
SELECT 
  '=== ALL TABLES IN PUBLIC SCHEMA ===' as info;

SELECT 
  tablename as table_name,
  tableowner as owner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- PART 2: Check which tables have user_id column
-- ============================================================================
SELECT 
  '=== TABLES WITH user_id COLUMN ===' as info;

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;

-- ============================================================================
-- PART 3: Check all columns for key tables
-- ============================================================================
SELECT 
  '=== COLUMNS IN KEY TABLES ===' as info;

-- Users table
SELECT 'users' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Partners table
SELECT 'partners' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'partners'
ORDER BY ordinal_position;

-- Offers table
SELECT 'offers' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'offers'
ORDER BY ordinal_position;

-- Reservations table
SELECT 'reservations' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reservations'
ORDER BY ordinal_position;

-- Partner_points table
SELECT 'partner_points' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'partner_points'
ORDER BY ordinal_position;

-- User_penalties table (if exists)
SELECT 'user_penalties' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_penalties'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 4: Count current RLS policies
-- ============================================================================
SELECT 
  '=== CURRENT RLS POLICIES COUNT ===' as info;

SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC, tablename;

-- ============================================================================
-- PART 5: Find policies with auth.uid() that need optimization
-- ============================================================================
SELECT 
  '=== POLICIES WITH auth.uid() (NEED OPTIMIZATION) ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual::text LIKE '%auth.uid()%' THEN 'Yes - USING clause'
    WHEN with_check::text LIKE '%auth.uid()%' THEN 'Yes - WITH CHECK clause'
    ELSE 'No'
  END as has_unwrapped_auth_uid
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
ORDER BY tablename, policyname;

-- ============================================================================
-- PART 6: Find duplicate policies on same table
-- ============================================================================
SELECT 
  '=== TABLES WITH MULTIPLE POLICIES (POTENTIAL DUPLICATES) ===' as info;

SELECT 
  tablename,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 1
ORDER BY policy_count DESC, tablename;

-- ============================================================================
-- PART 7: Find duplicate indexes
-- ============================================================================
SELECT 
  '=== POTENTIAL DUPLICATE INDEXES ===' as info;

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%_idx%'
ORDER BY tablename, indexname;

-- ============================================================================
-- PART 8: Summary statistics
-- ============================================================================
SELECT 
  '=== DATABASE SUMMARY ===' as info;

SELECT 
  'Total Tables' as metric,
  COUNT(*)::text as value
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Total RLS Policies' as metric,
  COUNT(*)::text as value
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Total Indexes' as metric,
  COUNT(*)::text as value
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Tables with RLS' as metric,
  COUNT(DISTINCT tablename)::text as value
FROM pg_policies 
WHERE schemaname = 'public';

-- ============================================================================
-- PART 9: Check for specific problematic tables
-- ============================================================================
SELECT 
  '=== CHECKING FOR POTENTIALLY PROBLEMATIC TABLES ===' as info;

SELECT 
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
    AND c.table_name = t.table_name 
    AND c.column_name = 'user_id'
  ) THEN 'Yes' ELSE 'No' END as has_user_id_column,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' 
    AND p.tablename = t.table_name
  ) THEN 'Yes' ELSE 'No' END as has_policies
FROM (
  SELECT 'user_penalties' as table_name UNION ALL
  SELECT 'penalty_offense_history' UNION ALL
  SELECT 'penalty_point_transactions' UNION ALL
  SELECT 'alert_rules' UNION ALL
  SELECT 'alert_events' UNION ALL
  SELECT 'system_alerts' UNION ALL
  SELECT 'partner_activity_logs' UNION ALL
  SELECT 'announcement_reads' UNION ALL
  SELECT 'direct_messages'
) t
WHERE EXISTS (
  SELECT 1 FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = t.table_name
)
ORDER BY table_name;

-- ============================================================================
-- DONE
-- ============================================================================
SELECT 
  '=== DIAGNOSTIC COMPLETE ===' as info,
  'Review the results above to understand your database structure' as next_step;
