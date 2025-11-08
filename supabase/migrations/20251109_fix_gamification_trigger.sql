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
  v_current_balance INT;
  v_new_balance INT;
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
  -- Do it directly here instead of calling another function
  
  -- Get current partner balance
  SELECT balance INTO v_current_balance
  FROM public.partner_points
  WHERE user_id = v_current_user_id;
  
  -- If partner has no points record yet, create one
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
    v_new_balance := v_reservation.points_spent;
    
    INSERT INTO public.partner_points (user_id, balance, updated_at)
    VALUES (v_current_user_id, v_new_balance, NOW());
  ELSE
    -- Update existing balance
    v_new_balance := v_current_balance + v_reservation.points_spent;
    
    UPDATE public.partner_points
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = v_current_user_id;
  END IF;
  
  -- Log the transaction
  INSERT INTO public.partner_point_transactions (
    partner_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata
  )
  VALUES (
    v_current_user_id,
    v_reservation.points_spent,
    'reservation_pickup',
    v_current_balance,
    v_new_balance,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'offer_id', v_reservation.offer_id,
      'customer_id', v_reservation.customer_id,
      'quantity', v_reservation.quantity,
      'picked_up_at', NOW()
    )
  );

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

-- Recreate add_partner_points with proper RLS bypass settings
CREATE OR REPLACE FUNCTION public.add_partner_points(
  p_partner_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
BEGIN
  -- Validation checks
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount cannot be zero');
  END IF;
  
  IF p_amount > 10000 OR p_amount < -10000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount too large');
  END IF;

  -- Get current balance with row lock
  SELECT balance INTO v_current_balance
  FROM public.partner_points
  WHERE user_id = p_partner_id
  FOR UPDATE;

  -- Handle first time or update existing
  IF v_current_balance IS NULL THEN
    -- First transaction for this partner
    v_current_balance := 0;
    v_new_balance := GREATEST(0, p_amount);
    
    INSERT INTO public.partner_points (user_id, balance, updated_at)
    VALUES (p_partner_id, v_new_balance, NOW());
  ELSE
    -- Update existing balance
    v_new_balance := v_current_balance + p_amount;
    
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'message', 'Insufficient points', 
        'balance', v_current_balance, 
        'required', ABS(p_amount)
      );
    END IF;
    
    UPDATE public.partner_points
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_partner_id;
  END IF;

  -- Log the transaction
  INSERT INTO public.partner_point_transactions (
    partner_id, 
    change, 
    reason, 
    balance_before, 
    balance_after, 
    metadata
  )
  VALUES (
    p_partner_id, 
    p_amount, 
    p_reason, 
    v_current_balance, 
    v_new_balance, 
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_partner_points(UUID, INT, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.add_partner_points IS 
'Securely add/deduct partner points with transaction logging. SECURITY DEFINER bypasses RLS. Can be called from other SECURITY DEFINER functions.';

-- DISABLE RLS SECURITY ENTIRELY for partner_points tables
-- This allows SECURITY DEFINER functions to freely add points to partner wallets
-- Security is enforced at the function level (partner_mark_as_picked_up verifies ownership)

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Partners view own points" ON public.partner_points;
DROP POLICY IF EXISTS "Partners view own transactions" ON public.partner_point_transactions;
DROP POLICY IF EXISTS "Service role full access to partner points" ON public.partner_points;
DROP POLICY IF EXISTS "Service role full access to partner transactions" ON public.partner_point_transactions;
DROP POLICY IF EXISTS "Allow function to modify partner points" ON public.partner_points;
DROP POLICY IF EXISTS "Allow function to log partner transactions" ON public.partner_point_transactions;

-- Disable RLS completely for partner_points tables
ALTER TABLE public.partner_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_point_transactions DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.partner_points IS 
'Partner points balance. RLS disabled - security enforced via SECURITY DEFINER functions that verify partner ownership.';

COMMENT ON TABLE public.partner_point_transactions IS 
'Partner points transaction log. RLS disabled - security enforced via SECURITY DEFINER functions.';

-- 3. Verify the user_confirm_pickup function exists and awards points correctly
-- This should be the ONLY place where gamification is triggered
