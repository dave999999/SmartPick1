-- ============================================
-- FORCE DROP AND RECREATE FUNCTION
-- ============================================
-- Purpose: Drop the old function completely and recreate with fix
-- ============================================

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS create_reservation_atomic(UUID, UUID, INTEGER, TEXT, NUMERIC, TIMESTAMPTZ);

-- Step 2: Recreate with the fix
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

  -- ✅✅✅ CRITICAL: Only check for SUSPENSION penalties, NOT warnings ✅✅✅
  SELECT EXISTS(
    SELECT 1 FROM user_penalties
    WHERE user_id = v_customer_id 
    AND is_active = true
    AND penalty_type = 'suspension'
    FOR UPDATE
  ) INTO v_has_suspension;

  IF v_has_suspension THEN
    RAISE EXCEPTION 'Account suspended - please wait for suspension to expire';
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

  UPDATE user_points
  SET balance = balance - v_points_cost
  WHERE user_id = v_customer_id;

  INSERT INTO point_transactions (user_id, points, transaction_type, description)
  VALUES (v_customer_id, -v_points_cost, 'RESERVATION', 'Reserved ' || p_quantity || ' unit(s)');

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

-- Step 3: Verify
SELECT 
  '✅ FUNCTION RECREATED' as status,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%penalty_type = ''suspension''%' THEN '✅ Suspension filter present'
    ELSE '❌ Still broken'
  END as check_result
FROM pg_proc 
WHERE proname = 'create_reservation_atomic';
