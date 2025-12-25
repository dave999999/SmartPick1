-- ============================================
-- FIX OFFENSE NUMBER CONSTRAINT
-- ============================================
-- Extend constraint to allow offense 5-10
-- ============================================

-- Drop old constraint that only allowed 1-4
ALTER TABLE user_penalties 
  DROP CONSTRAINT IF EXISTS user_penalties_offense_number_check;

-- Add new constraint allowing 1-10
ALTER TABLE user_penalties 
  ADD CONSTRAINT user_penalties_offense_number_check 
  CHECK (offense_number BETWEEN 1 AND 10);

-- Verify
SELECT 
  '✅ CONSTRAINT UPDATED' as status,
  'Offense numbers now: 1-10' as info;
