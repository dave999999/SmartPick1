-- ============================================
-- ADD RLS POLICIES FOR ACHIEVEMENTS
-- Date: 2025-11-11
-- ============================================
-- Fixes the "RLS Enabled No Policy" issue
-- Allows users to read their own achievements

-- Enable RLS (already enabled but ensuring)
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER_ACHIEVEMENTS POLICIES
-- ============================================

-- Users can read their own achievements
CREATE POLICY "Users can view their own achievements"
ON user_achievements
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own achievements (for manual testing)
CREATE POLICY "Users can insert their own achievements"
ON user_achievements
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own achievements (for claiming rewards)
CREATE POLICY "Users can update their own achievements"
ON user_achievements
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- ACHIEVEMENT_DEFINITIONS POLICIES
-- ============================================

-- Everyone can read achievement definitions (public info)
CREATE POLICY "Anyone can view achievement definitions"
ON achievement_definitions
FOR SELECT
TO authenticated, anon
USING (true);

-- Only service role can modify definitions
CREATE POLICY "Service role can manage achievement definitions"
ON achievement_definitions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON user_achievements TO authenticated;
GRANT INSERT ON user_achievements TO authenticated;
GRANT UPDATE ON user_achievements TO authenticated;

GRANT SELECT ON achievement_definitions TO authenticated, anon;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies created for achievements';
  RAISE NOTICE '✅ Users can now read their own achievements';
  RAISE NOTICE '✅ Everyone can read achievement definitions';
  RAISE NOTICE '✅ Refresh your browser to see achievements!';
END $$;
