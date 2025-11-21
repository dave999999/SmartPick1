-- ============================================
-- FIX EXISTING ACHIEVEMENTS - Add reward_claimed column
-- Date: 2025-11-11
-- ============================================
-- Updates existing user_achievements to have reward_claimed column
-- Sets to TRUE for old achievements (they already got points auto-awarded)

-- First, ensure the column exists
ALTER TABLE user_achievements 
  ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT false;

ALTER TABLE user_achievements 
  ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMPTZ;

ALTER TABLE user_achievements 
  ADD COLUMN IF NOT EXISTS points_awarded INT DEFAULT 0;

-- Update existing achievements to mark as claimed (they got points already)
-- Any achievement unlocked before this migration should be marked as claimed
UPDATE user_achievements
SET 
  reward_claimed = true,
  reward_claimed_at = unlocked_at,  -- Set to unlock time since they got points immediately
  points_awarded = ad.reward_points
FROM achievement_definitions ad
WHERE 
  user_achievements.achievement_id = ad.id
  AND user_achievements.reward_claimed IS NULL;  -- Only update if not set

-- Also update where it's explicitly false but was unlocked before migration
UPDATE user_achievements ua
SET 
  reward_claimed = CASE 
    -- If unlocked before today and not yet claimed, assume it was auto-awarded (old system)
    WHEN ua.unlocked_at < NOW() - INTERVAL '1 hour' AND ua.reward_claimed = false THEN true
    ELSE ua.reward_claimed
  END,
  reward_claimed_at = CASE 
    WHEN ua.unlocked_at < NOW() - INTERVAL '1 hour' AND ua.reward_claimed = false THEN ua.unlocked_at
    ELSE ua.reward_claimed_at
  END,
  points_awarded = CASE 
    WHEN ua.unlocked_at < NOW() - INTERVAL '1 hour' AND ua.reward_claimed = false THEN ad.reward_points
    ELSE ua.points_awarded
  END
FROM achievement_definitions ad
WHERE ua.achievement_id = ad.id;

-- Log results
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count 
  FROM user_achievements 
  WHERE reward_claimed = true;
  
  RAISE NOTICE '✅ Updated existing achievements';
  RAISE NOTICE '✅ % achievements marked as claimed', v_updated_count;
  RAISE NOTICE '✅ Old achievements won''t show "Claim Reward" button';
  RAISE NOTICE '✅ New achievements will require manual claim';
END $$;
