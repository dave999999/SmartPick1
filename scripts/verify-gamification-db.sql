-- ============================================
-- Gamification Database Verification Script
-- Run this in Supabase SQL Editor to check setup
-- ============================================

-- 1. Check if tables exist
SELECT
  'user_stats' as table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stats') as exists
UNION ALL
SELECT
  'achievement_definitions',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievement_definitions')
UNION ALL
SELECT
  'user_achievements',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements');

-- 2. Check if referral columns exist in users table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('referral_code', 'referred_by');

-- 3. Check if functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'init_user_stats',
    'generate_referral_code',
    'update_user_stats_on_reservation',
    'update_user_streak',
    'check_user_achievements'
  );

-- 4. Check if triggers exist
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN (
  'create_user_stats_trigger',
  'update_stats_on_reservation'
);

-- 5. Check achievement definitions count
SELECT
  COUNT(*) as total_achievements,
  COUNT(*) FILTER (WHERE is_active = true) as active_achievements
FROM achievement_definitions;

-- 6. Check user_stats count
SELECT
  COUNT(*) as total_user_stats,
  COUNT(*) FILTER (WHERE total_reservations > 0) as users_with_reservations
FROM user_stats;

-- ============================================
-- If any checks fail, you need to run:
-- supabase/migrations/20250106_create_gamification_tables.sql
-- ============================================
