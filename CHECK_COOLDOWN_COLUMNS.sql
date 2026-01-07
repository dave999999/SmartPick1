-- =========================================================
-- CHECK users TABLE STRUCTURE
-- =========================================================
-- Find out what columns exist for cooldown tracking
-- =========================================================

-- STEP 1: Show all columns in users table
DO $$ BEGIN RAISE NOTICE '=== CHECKING users TABLE COLUMNS ==='; END $$;
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- STEP 2: Search for cooldown-related columns
DO $$ BEGIN RAISE NOTICE '=== SEARCHING FOR COOLDOWN COLUMNS ==='; END $$;
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND (
    column_name LIKE '%cooldown%' OR
    column_name LIKE '%cancel%' OR
    column_name LIKE '%suspend%'
  )
ORDER BY column_name;

-- STEP 3: Check user_cancellation_tracking table
DO $$ BEGIN RAISE NOTICE '=== CHECKING user_cancellation_tracking TABLE ==='; END $$;
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'user_cancellation_tracking'
ORDER BY ordinal_position;
