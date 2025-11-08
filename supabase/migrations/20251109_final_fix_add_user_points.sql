-- Final fix: Update the EXISTING add_user_points function to check for system operation flag
-- This must be applied AFTER the partner_mark_as_picked_up function that sets the flag

CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_caller_role TEXT;
  v_is_system_op TEXT;
BEGIN
  -- Check if this is a system operation (from partner_mark_as_picked_up or similar)
  BEGIN
    v_is_system_op := current_setting('app.is_system_operation', false);
  EXCEPTION
    WHEN OTHERS THEN
      v_is_system_op := 'false';
  END;
  
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
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + p_amount
    RETURNING balance INTO v_new_balance;

    v_current_balance := 0;
  ELSE
    -- Calculate and update
    v_new_balance := v_current_balance + p_amount;

    UPDATE user_points
    SET balance = v_new_balance
    WHERE user_id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (p_user_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'change', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_user_points IS
'Add points to a user. Requires service_role OR app.is_system_operation flag to be set. Used by gamification triggers.';

-- Also make sure the partner_mark_as_picked_up function exists with the flag
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
SECURITY DEFINER
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
  -- This allows add_user_points (called by triggers) to work
  PERFORM set_config('app.is_system_operation', 'true', true);

  -- Update the reservation status
  -- This will trigger update_stats_on_pickup which calls add_user_points
  UPDATE reservations
  SET 
    status = 'PICKED_UP',
    picked_up_at = NOW()
  WHERE reservations.id = p_reservation_id;

  -- Return the updated reservation
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

GRANT EXECUTE ON FUNCTION partner_mark_as_picked_up(UUID) TO authenticated;

COMMENT ON FUNCTION partner_mark_as_picked_up IS 
'Allows partner to mark reservation as picked up. Sets app.is_system_operation flag to allow gamification triggers to award points.';
