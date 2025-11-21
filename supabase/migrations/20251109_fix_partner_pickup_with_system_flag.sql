-- Fix: Make partner_mark_as_picked_up work by setting a transaction-level flag
-- that the security check can recognize as a valid system operation

DROP FUNCTION IF EXISTS partner_mark_as_picked_up(UUID);

CREATE OR REPLACE FUNCTION partner_mark_as_picked_up(p_reservation_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  picked_up_at TIMESTAMPTZ,
  customer_id UUID,
  partner_id UUID,
  offer_id UUID,
  quantity INT,
  qr_code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  user_confirmed_pickup BOOLEAN,
  points_spent INT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with function owner's privileges (bypasses RLS)
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_reservation RECORD;
  v_current_user_id UUID;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Get current user's partner ID
  SELECT p.id INTO v_partner_id 
  FROM partners p
  WHERE p.user_id = v_current_user_id;
  
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'User % is not a partner', v_current_user_id;
  END IF;

  -- Get the reservation and verify ownership
  SELECT * INTO v_reservation
  FROM reservations r
  WHERE r.id = p_reservation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation % not found', p_reservation_id;
  END IF;
  
  -- Check if partner owns this reservation
  IF v_reservation.partner_id != v_partner_id THEN
    RAISE EXCEPTION 'Reservation % is not owned by partner % (actual owner: %)', 
      p_reservation_id, v_partner_id, v_reservation.partner_id;
  END IF;
  
  -- Check if status is ACTIVE
  IF v_reservation.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Reservation % status is % (must be ACTIVE)', 
      p_reservation_id, v_reservation.status;
  END IF;

  -- Set a transaction-level variable to indicate this is a system operation
  -- This allows add_user_points to work even though we're not service_role
  PERFORM set_config('app.is_system_operation', 'true', true);

  -- Simple UPDATE - SECURITY DEFINER means this runs as function owner, bypassing RLS
  UPDATE reservations
  SET 
    status = 'PICKED_UP',
    picked_up_at = NOW()
  WHERE reservations.id = p_reservation_id;

  -- Return the updated reservation as a table row
  RETURN QUERY
  SELECT 
    r.id,
    r.status,
    r.picked_up_at,
    r.customer_id,
    r.partner_id,
    r.offer_id,
    r.quantity,
    r.qr_code,
    r.expires_at,
    r.created_at,
    r.user_confirmed_pickup,
    r.points_spent
  FROM reservations r
  WHERE r.id = p_reservation_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION partner_mark_as_picked_up(UUID) TO authenticated;

-- Now update add_user_points to check for the system operation flag
CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_transaction_type TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_caller_role TEXT;
  v_is_system_op TEXT;
BEGIN
  -- Check if this is a system operation (from partner_mark_as_picked_up or similar)
  v_is_system_op := current_setting('app.is_system_operation', true);
  
  -- SECURITY: Only allow service_role OR system operations to modify points
  SELECT current_setting('request.jwt.claims', true)::json->>'role' INTO v_caller_role;

  IF v_caller_role != 'service_role' AND COALESCE(v_is_system_op, 'false') != 'true' THEN
    RAISE EXCEPTION 'Permission denied: only backend can modify points';
  END IF;

  -- Lock the row to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    -- Create if doesn't exist
    v_current_balance := 0; -- Set to 0 for new users
    INSERT INTO user_points (user_id, balance, penalty)
    VALUES (p_user_id, p_amount, 0)
    RETURNING balance INTO v_new_balance;
  ELSE
    -- Update existing
    v_new_balance := v_current_balance + p_amount;
    UPDATE user_points
    SET balance = v_new_balance, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Create transaction record
  INSERT INTO point_transactions (
    user_id,
    change,
    balance_before,
    balance_after,
    reason,
    metadata,
    created_at
  )
  VALUES (
    p_user_id,
    p_amount,
    v_current_balance,
    v_new_balance,
    p_transaction_type,
    p_metadata,
    now()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

COMMENT ON FUNCTION partner_mark_as_picked_up IS 
'Allows partner to mark their reservation as picked up. Sets system operation flag to allow point modifications from triggers.';

COMMENT ON FUNCTION add_user_points IS
'Add points to a user. Requires service_role OR app.is_system_operation flag to be set.';
