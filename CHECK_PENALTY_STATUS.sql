-- ============================================
-- CHECK CURRENT PENALTY STATUS
-- ============================================
-- Purpose: Verify penalty state and why popup might not show
-- User: batumashvili.davit@gmail.com
-- ============================================

-- 1. Check user's penalty_count
SELECT 
  id,
  email,
  name,
  penalty_count,
  current_penalty_level,
  is_suspended,
  suspended_until,
  reliability_score
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

-- 2. Check all user_penalties records (active and inactive)
SELECT 
  id,
  user_id,
  offense_number,
  offense_type,
  penalty_type,
  suspended_until,
  is_active,
  acknowledged,
  can_lift_with_points,
  points_required,
  created_at,
  updated_at
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC;

-- 3. Test the get_active_penalty function (same as frontend uses)
SELECT * FROM get_active_penalty(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- 4. Check what makes a penalty "active" by looking at the function
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'get_active_penalty';
