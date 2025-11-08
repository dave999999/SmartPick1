-- Proper fix: Make gamification trigger ONLY on user confirmation, not on partner scan
-- This way partner_mark_as_picked_up doesn't need to modify points at all

-- 1. Update the gamification trigger to only fire on user_confirmed_pickup, not on status change
DROP TRIGGER IF EXISTS update_stats_on_pickup ON reservations;

CREATE TRIGGER update_stats_on_pickup
  AFTER UPDATE ON reservations
  FOR EACH ROW
  WHEN (
    NEW.user_confirmed_pickup = true 
    AND OLD.user_confirmed_pickup = false
  )
  EXECUTE FUNCTION update_user_stats_on_pickup();

COMMENT ON TRIGGER update_stats_on_pickup ON reservations IS
  'Awards gamification points when USER confirms pickup, not when partner marks it';

-- 2. Recreate partner_mark_as_picked_up WITHOUT any point modification flags
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

  -- Update status to PICKED_UP
  UPDATE reservations
  SET 
    status = 'PICKED_UP',
    picked_up_at = NOW()
  WHERE reservations.id = p_reservation_id;

  -- Transfer points from escrow to partner immediately
  -- partner_points table uses user_id (auth.users id), not partner table id
  -- Add points to partner's wallet (points_spent was deducted from user on reservation)
  INSERT INTO partner_points (user_id, balance, updated_at)
  VALUES (v_current_user_id, v_reservation.points_spent, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = partner_points.balance + v_reservation.points_spent,
    updated_at = NOW();

  -- Log the partner point transaction
  INSERT INTO partner_point_transactions (
    partner_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata
  )
  SELECT
    v_current_user_id,
    v_reservation.points_spent,
    'reservation_pickup',
    COALESCE(pp.balance - v_reservation.points_spent, 0),
    COALESCE(pp.balance, v_reservation.points_spent),
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'offer_id', v_reservation.offer_id,
      'customer_id', v_reservation.customer_id,
      'quantity', v_reservation.quantity
    )
  FROM partner_points pp
  WHERE pp.user_id = v_current_user_id;

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
'Allows partner to mark reservation as picked up. Immediately transfers points from escrow to partner wallet. User gamification points are awarded separately when user confirms.';

-- 3. Verify the user_confirm_pickup function exists and awards points correctly
-- This should be the ONLY place where gamification is triggered
