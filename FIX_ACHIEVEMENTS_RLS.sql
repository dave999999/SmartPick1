-- ================================================
-- FIX: Achievements not showing (RLS issue)
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Drop existing policy
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievement_definitions;

-- 2. Recreate with explicit SELECT permissions
CREATE POLICY "Anyone can view achievements"
  ON achievement_definitions
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- 3. Verify RLS is enabled
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

-- 4. Test query (should return 50)
SELECT COUNT(*) as total_achievements
FROM achievement_definitions
WHERE is_active = true;

-- 5. Show some examples
SELECT id, name, icon, tier, category
FROM achievement_definitions
WHERE is_active = true
ORDER BY tier, category
LIMIT 10;
