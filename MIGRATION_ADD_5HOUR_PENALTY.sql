-- ============================================
-- STEP 1: DATABASE MIGRATION FOR SUSPENSION SYSTEM
-- ============================================
-- Add 5-hour penalty type and lift points calculation
-- ============================================

-- Part 1: Add '5hour' penalty type to enum constraint
ALTER TABLE user_penalties 
  DROP CONSTRAINT IF EXISTS user_penalties_penalty_type_check;

ALTER TABLE user_penalties 
  ADD CONSTRAINT user_penalties_penalty_type_check 
  CHECK (penalty_type IN ('warning', '1hour', '5hour', '24hour', 'permanent'));

-- Part 2: Create function to calculate lift points based on offense number
CREATE OR REPLACE FUNCTION calculate_lift_points(offense_num INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE 
    WHEN offense_num = 4 THEN 100   -- 1-hour suspension: 100 points
    WHEN offense_num = 5 THEN 500   -- 5-hour suspension: 500 points
    WHEN offense_num >= 6 THEN 1000 -- 24-hour+ suspension: 1000 points
    ELSE 0                          -- Warnings: can't lift
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Part 3: Add helper function to format suspension duration for display
CREATE OR REPLACE FUNCTION get_suspension_duration(penalty_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN penalty_type = '1hour' THEN '1 საათი'
    WHEN penalty_type = '5hour' THEN '5 საათი'
    WHEN penalty_type = '24hour' THEN '24 საათი'
    WHEN penalty_type = 'permanent' THEN 'მუდმივი'
    ELSE 'გაფრთხილება'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Part 4: Verify the changes
SELECT 
  'MIGRATION COMPLETE ✅' as status,
  'Penalty types now include: warning, 1hour, 5hour, 24hour, permanent' as info;

-- Test the calculate_lift_points function
SELECT 
  'LIFT POINTS CALCULATION:' as test,
  calculate_lift_points(4) as offense_4_points,
  calculate_lift_points(5) as offense_5_points,
  calculate_lift_points(6) as offense_6_points;

-- ============================================
-- RESULT
-- ============================================
-- ✅ 5-hour penalty type added
-- ✅ calculate_lift_points() function created
-- ✅ get_suspension_duration() helper created
-- Ready for lift_penalty_with_points() function!
-- ============================================
