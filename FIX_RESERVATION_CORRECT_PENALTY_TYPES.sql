-- ============================================
-- FIX RESERVATION BLOCKING - CORRECT VERSION
-- ============================================
-- Issue: Function checks penalty_type = 'suspension' but actual types are:
--   - 'warning' (should NOT block)
--   - '1hour', '24hour', 'permanent' (SHOULD block)
-- ============================================

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS create_reservation_atomic(UUID, UUID, INTEGER, TEXT, NUMERIC, TIMESTAMPTZ);

-- Step 2: Recreate with CORRECT penalty type check
CREATE FUNCTION create_reservation_atomic(
  p_offer_id UUID,
  p_customer_id UUID,
  p_quantity INTEGER,
  p_qr_code TEXT,
  p_total_price NUMERIC,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer RECORD;
  v_customer_id UUID := p_customer_id;
  v_user_status TEXT;
  v_max_reservation_quantity INTEGER;
  v_has_suspension BOOLEAN := FALSE;
  v_active_count INTEGER;
  v_points_cost INTEGER;
  v_current_balance INTEGER;
  v_reservation_id UUID;
  v_result JSON;
BEGIN
  -- Lock the offer row FOR UPDATE
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF v_offer.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity available. Only % items left.', v_offer.quantity_available;
  END IF;

  IF v_offer.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Offer is not active';
  END IF;

  IF v_offer.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  -- Lock user row
  SELECT status, max_reservation_quantity INTO v_user_status, v_max_reservation_quantity
  FROM users
  WHERE id = v_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_user_status = 'BANNED' THEN
    RAISE EXCEPTION 'Your account has been banned due to repeated no-shows. Please contact support.';
  END IF;

  -- ✅✅✅ CRITICAL FIX: Only block suspensions (1hour, 24hour, permanent), NOT warnings ✅✅✅
  SELECT EXISTS(
    SELECT 1 FROM user_penalties
    WHERE user_id = v_customer_id 
    AND is_active = true
    AND penalty_type IN ('1hour', '24hour', 'permanent')  -- ✅ FIXED: Correct penalty types!
    FOR UPDATE
  ) INTO v_has_suspension;

  IF v_has_suspension THEN
    RAISE EXCEPTION 'Cannot create reservation: You have an active penalty on your account';
  END IF;

  -- Check active reservation count
  SELECT COUNT(*) INTO v_active_count
  FROM reservations
  WHERE customer_id = v_customer_id 
  AND status = 'ACTIVE';

  IF v_active_count >= 1 THEN
    RAISE EXCEPTION 'You can only have 1 active reservation at a time. Please pick up your current reservation before making a new one.';
  END IF;

  -- Validate quantity
  IF v_max_reservation_quantity IS NULL THEN
    v_max_reservation_quantity := 3;
  END IF;

  IF p_quantity > v_max_reservation_quantity THEN
    RAISE EXCEPTION 'You can reserve up to % items per offer.', v_max_reservation_quantity;
  END IF;

  -- Calculate points cost
  v_points_cost := p_quantity * 5;

  -- Check and deduct points
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = v_customer_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You need % points.', v_points_cost;
  END IF;

  -- Calculate new balance
  v_current_balance := v_current_balance - v_points_cost;

  -- Update user points
  UPDATE user_points
  SET balance = v_current_balance
  WHERE user_id = v_customer_id;

  -- Log the transaction with correct column names
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (
    v_customer_id,
    -v_points_cost,
    'RESERVATION_CREATED',
    v_current_balance + v_points_cost,
    v_current_balance,
    jsonb_build_object('offer_id', p_offer_id, 'quantity', p_quantity, 'points_per_unit', 5)
  );

  -- Update offer quantity
  UPDATE offers
  SET quantity_available = quantity_available - p_quantity
  WHERE id = p_offer_id;

  -- Create reservation
  INSERT INTO reservations (
    offer_id, customer_id, partner_id, qr_code,
    quantity, total_price, status, expires_at
  )
  VALUES (
    p_offer_id, v_customer_id, v_offer.partner_id, p_qr_code,
    p_quantity, p_total_price, 'ACTIVE', p_expires_at
  )
  RETURNING id INTO v_reservation_id;

  -- Return result
  SELECT json_build_object(
    'id', v_reservation_id,
    'offer_id', p_offer_id,
    'customer_id', v_customer_id,
    'partner_id', v_offer.partner_id,
    'qr_code', p_qr_code,
    'quantity', p_quantity,
    'total_price', p_total_price,
    'status', 'ACTIVE',
    'expires_at', p_expires_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION create_reservation_atomic(UUID, UUID, INTEGER, TEXT, NUMERIC, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION create_reservation_atomic(UUID, UUID, INTEGER, TEXT, NUMERIC, TIMESTAMPTZ) TO anon;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  'FUNCTION UPDATED ✅' as status,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%penalty_type IN (''1hour'', ''24hour'', ''permanent'')%' THEN '✅ CORRECT - Blocks suspensions, allows warnings'
    ELSE '❌ NOT FIXED - Still has wrong check'
  END as fix_status
FROM pg_proc
WHERE proname = 'create_reservation_atomic';

-- ============================================
-- RESULT
-- ============================================
-- Now warnings will NOT block reservations ✅
-- Only actual suspensions (1hour, 24hour, permanent) block ✅
-- ============================================
