-- Quick fix: Update your 4th offense penalty to correct type
-- This will make the new SuspensionModal appear

-- First check current penalty
SELECT 
  id,
  offense_number,
  penalty_type,
  is_active,
  suspended_until,
  '❌ Wrong type for 4th offense!' as issue
FROM user_penalties
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND offense_number = 4
  AND is_active = true;

-- Fix it: Change penalty_type from 'warning' to '1hour'
UPDATE user_penalties
SET 
  penalty_type = '1hour',
  suspended_until = NOW() + INTERVAL '1 hour',
  acknowledged = false  -- Force modal to show again
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND offense_number = 4
  AND is_active = true;

-- Verify fix
SELECT 
  id,
  offense_number,
  penalty_type,
  is_active,
  suspended_until,
  '✅ Fixed! Now refresh browser' as status
FROM user_penalties
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND offense_number = 4
  AND is_active = true;
