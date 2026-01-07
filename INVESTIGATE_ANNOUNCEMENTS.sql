-- =========================================================
-- INVESTIGATE: announcements table
-- =========================================================
-- Check if this table exists and is used by the app
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== CHECKING ANNOUNCEMENTS TABLE ==='; END $$;

-- Check if table exists and its structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'announcements'
ORDER BY ordinal_position;

-- Check if table has any data
DO $$ 
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM announcements;
  RAISE NOTICE 'Announcements table has % rows', row_count;
END $$;

-- Check current RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'announcements';

-- ⚠️ DECISION NEEDED:
-- If table has 0 rows and app doesn't use it:
--   → DROP the permissive INSERT policy
-- If table is used:
--   → Check who should create announcements (admin only? or users?)
