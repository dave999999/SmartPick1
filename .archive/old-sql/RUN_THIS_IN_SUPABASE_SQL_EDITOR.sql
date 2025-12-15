-- =====================================================
-- STEP 1: CHECK FOR EXISTING PENALTY TABLES
-- =====================================================
-- Run this first to see if tables already exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_penalties', 'penalty_offense_history', 'penalty_point_transactions');

-- If any tables exist, you'll need to drop them first (CAREFUL - this deletes data!)
-- Uncomment if needed:
-- DROP TABLE IF EXISTS public.penalty_point_transactions CASCADE;
-- DROP TABLE IF EXISTS public.penalty_offense_history CASCADE;
-- DROP TABLE IF EXISTS public.user_penalties CASCADE;
