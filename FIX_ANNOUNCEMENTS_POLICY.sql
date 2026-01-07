-- =========================================================
-- FIX: announcements INSERT Policy
-- =========================================================
-- Issue: WITH CHECK (true) allows anyone to insert
-- Fix Option 1: Only admins can create announcements
-- Fix Option 2: Drop policy if table unused
-- Risk: LOW - Need to verify who should create announcements
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== FIXING announcements INSERT RLS ==='; END $$;

-- Check if table has any rows first
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM announcements;
  
  IF row_count = 0 THEN
    RAISE NOTICE '⚠️ Announcements table is EMPTY - might be unused';
  ELSE
    RAISE NOTICE 'ℹ️ Announcements table has % rows', row_count;
  END IF;
END $$;

-- OPTION 1: If announcements are admin-only (recommended)
-- Drop the permissive policy
DROP POLICY IF EXISTS "Anyone can insert announcements" ON announcements;

-- Only service role / backend functions can create announcements
-- No policy = only SECURITY DEFINER functions can write
-- Users can still READ if there's a SELECT policy

-- OPTION 2: If users should create announcements (uncomment if needed)
-- DROP POLICY IF EXISTS "Anyone can insert announcements" ON announcements;
-- CREATE POLICY "Users can create their own announcements"
-- ON announcements
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (user_id = auth.uid());  -- Assuming announcements has user_id column

-- Verify the fix
DO $$ BEGIN RAISE NOTICE '=== VERIFICATION ==='; END $$;

SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'announcements' 
  AND cmd = 'INSERT';

-- If query returns 0 rows = INSERT policy removed (admins only via backend)
-- If query returns rows = Users can create announcements (check policy)

-- ✅ WHAT CHANGED:
-- BEFORE: WITH CHECK (true) - Anyone could insert announcements
-- AFTER: No INSERT policy - Only backend/admin functions can create announcements
--
-- ⚠️ IMPACT ON APP:
-- - If app doesn't use announcements: ZERO impact
-- - If backend creates announcements: ZERO impact (SECURITY DEFINER bypasses RLS)
-- - If users create announcements directly: Need to uncomment OPTION 2 above
--
-- ✅ RESULT: 1 warning fixed, improved security
