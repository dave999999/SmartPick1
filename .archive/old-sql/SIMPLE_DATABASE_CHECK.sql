-- ============================================================================
-- SIMPLE DATABASE CHECK - Run each section separately
-- ============================================================================

-- SECTION 1: List all tables
-- Copy/paste and run this first
SELECT tablename as table_name
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- SECTION 2: Tables with user_id column
-- Run this second
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;

-- SECTION 3: partner_points table structure
-- Run this third
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'partner_points'
ORDER BY ordinal_position;

-- SECTION 4: Count policies per table
-- Run this fourth
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;

-- SECTION 5: Check if problematic tables exist
-- Run this fifth
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_penalties') THEN 'EXISTS' ELSE 'MISSING' END as user_penalties,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'penalty_offense_history') THEN 'EXISTS' ELSE 'MISSING' END as penalty_offense_history,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'penalty_point_transactions') THEN 'EXISTS' ELSE 'MISSING' END as penalty_point_transactions,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_rules') THEN 'EXISTS' ELSE 'MISSING' END as alert_rules,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_events') THEN 'EXISTS' ELSE 'MISSING' END as alert_events,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_alerts') THEN 'EXISTS' ELSE 'MISSING' END as system_alerts;
