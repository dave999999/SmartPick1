-- ============================================
-- Grant 5000 Points to batumashvili.davit@gmail.com
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Find the user and verify current balance
SELECT 
  id,
  email,
  name,
  smart_points,
  created_at
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

-- Step 2: Grant 5000 points
DO $$
DECLARE
  v_user_id UUID;
  v_current_balance INT;
BEGIN
  -- Get user ID
  SELECT id, smart_points 
  INTO v_user_id, v_current_balance
  FROM users 
  WHERE email = 'batumashvili.davit@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: batumashvili.davit@gmail.com';
  END IF;
  
  -- Update balance
  UPDATE users
  SET 
    smart_points = smart_points + 5000,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Create transaction record for audit trail
  INSERT INTO point_transactions (
    user_id,
    points,
    type,
    description,
    created_at
  ) VALUES (
    v_user_id,
    5000,
    'ADMIN_GRANT',
    'Manual grant: 5000 points added by admin',
    NOW()
  );
  
  RAISE NOTICE 'Successfully granted 5000 points to user %', v_user_id;
  RAISE NOTICE 'Previous balance: %', v_current_balance;
  RAISE NOTICE 'New balance: %', v_current_balance + 5000;
END $$;

-- Step 3: Verify the update
SELECT 
  id,
  email,
  name,
  smart_points,
  updated_at
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

-- Step 4: Check transaction history
SELECT 
  id,
  points,
  type,
  description,
  created_at
FROM point_transactions
WHERE user_id = (
  SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'
)
ORDER BY created_at DESC
LIMIT 5;
