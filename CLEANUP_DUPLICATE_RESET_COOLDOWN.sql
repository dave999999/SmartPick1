-- =========================================================
-- CLEANUP DUPLICATE reset_user_cooldown FUNCTION
-- =========================================================
-- Issue: reset_user_cooldown exists in 2 versions
-- Error: "Could not choose the best candidate function"
-- This script removes the old version and keeps the correct one
-- =========================================================

-- STEP 1: Check which versions exist
DO $$ BEGIN RAISE NOTICE '=== CHECKING FOR DUPLICATE FUNCTIONS ==='; END $$;
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  oidvectortypes(proargtypes) AS parameter_types
FROM pg_proc 
WHERE proname = 'reset_user_cooldown'
ORDER BY oid;

-- STEP 2: Count total versions
DO $$ BEGIN RAISE NOTICE '=== COUNTING VERSIONS ==='; END $$;
SELECT COUNT(*) AS total_versions
FROM pg_proc 
WHERE proname = 'reset_user_cooldown';

-- STEP 3: Drop OLD version (only 1 parameter)
DO $$ BEGIN RAISE NOTICE '=== DROPPING OLD VERSION (1 parameter) ==='; END $$;
DROP FUNCTION IF EXISTS reset_user_cooldown(UUID) CASCADE;

-- STEP 4: Keep NEW version (2 parameters with default)
-- This is already created in FIX_COOLDOWN_LIFT_EXPLOIT.sql
-- Signature: reset_user_cooldown(p_user_id UUID, p_lift_type TEXT DEFAULT 'free')

-- STEP 5: Verify only 1 version exists now
DO $$ BEGIN RAISE NOTICE '=== FINAL VERIFICATION (should be 1) ==='; END $$;
SELECT COUNT(*) AS should_be_one
FROM pg_proc 
WHERE proname = 'reset_user_cooldown';

-- STEP 6: Show remaining version
DO $$ BEGIN RAISE NOTICE '=== REMAINING VERSION ==='; END $$;
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc 
WHERE proname = 'reset_user_cooldown';

-- ✅ CLEANUP COMPLETE!
-- Summary:
-- - Removed old version: reset_user_cooldown(p_user_id UUID)
-- - Kept new version: reset_user_cooldown(p_user_id UUID, p_lift_type TEXT DEFAULT 'free')
-- - Frontend can now call the function without ambiguity
-- Next: Test cooldown reset after 3 cancellations
