-- =====================================================
-- Migration: Add Reservation Slot Unlocking System
-- Date: 2025-11-17
-- Description: Adds columns for progressive reservation slot unlocking
-- =====================================================

-- Add max_reservation_quantity column to users table (default 3)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS max_reservation_quantity INTEGER DEFAULT 3 NOT NULL;

-- Add purchased_slots JSONB column to track purchase history
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS purchased_slots JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries on max_reservation_quantity
CREATE INDEX IF NOT EXISTS idx_users_max_reservation_quantity 
ON users(max_reservation_quantity);

-- Comment on columns for documentation
COMMENT ON COLUMN users.max_reservation_quantity IS 'Maximum number of items user can reserve per offer (default 3, max 10)';
COMMENT ON COLUMN users.purchased_slots IS 'History of purchased slot upgrades with timestamps and costs';

-- =====================================================
-- Function: Purchase Reservation Slot
-- =====================================================
CREATE OR REPLACE FUNCTION purchase_reservation_slot(
  p_user_id UUID,
  p_slot_number INTEGER,
  p_cost INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_max INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_purchase_record JSONB;
BEGIN
  -- Get current max slots from users table
  SELECT max_reservation_quantity
  INTO v_current_max
  FROM users
  WHERE id = p_user_id;

  -- Validation checks
  IF v_current_max IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_slot_number != v_current_max + 1 THEN
    RAISE EXCEPTION 'Must purchase slots sequentially. Current max: %, requested: %', v_current_max, p_slot_number;
  END IF;

  IF p_slot_number > 10 THEN
    RAISE EXCEPTION 'Maximum slot limit is 10';
  END IF;

  -- Get current balance from user_points table
  SELECT balance
  INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User points record not found';
  END IF;

  IF v_current_balance < p_cost THEN
    RAISE EXCEPTION 'Insufficient points. Need: %, have: %', p_cost, v_current_balance;
  END IF;

  -- Deduct points from user_points table
  v_new_balance := v_current_balance - p_cost;
  
  UPDATE user_points
  SET balance = v_new_balance
  WHERE user_id = p_user_id;

  -- Create purchase record
  v_purchase_record := jsonb_build_object(
    'slot', p_slot_number,
    'cost', p_cost,
    'timestamp', NOW(),
    'balance_after', v_new_balance
  );

  -- Update user: increment max, append purchase record
  UPDATE users
  SET 
    max_reservation_quantity = p_slot_number,
    purchased_slots = purchased_slots || v_purchase_record
  WHERE id = p_user_id;

  -- Record transaction in point_transactions table
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (
    p_user_id,
    -p_cost,
    'slot_unlock',
    v_current_balance,
    v_new_balance,
    jsonb_build_object('slot_number', p_slot_number)
  );

  -- Check for achievements (slot unlock milestones)
  PERFORM check_user_achievements(p_user_id);

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'new_max', p_slot_number,
    'new_balance', v_new_balance,
    'cost', p_cost
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_reservation_slot TO authenticated;

-- =====================================================
-- Validation: Check current state
-- =====================================================
-- Verify column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'max_reservation_quantity'
  ) THEN
    RAISE NOTICE '✅ max_reservation_quantity column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add max_reservation_quantity column';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'purchased_slots'
  ) THEN
    RAISE NOTICE '✅ purchased_slots column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add purchased_slots column';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully';
END $$;

-- =====================================================
-- Sample Query: Check user slot data
-- =====================================================
-- SELECT 
--   id,
--   email,
--   max_reservation_quantity,
--   purchased_slots,
--   balance
-- FROM users
-- WHERE email = 'your-email@example.com';
