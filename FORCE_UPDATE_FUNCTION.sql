-- Drop and recreate the function to ensure it's updated
DROP FUNCTION IF EXISTS create_reservation_atomic(UUID, UUID, INTEGER, INTEGER);

-- Create the new version
CREATE FUNCTION create_reservation_atomic(
  p_offer_id UUID,
  p_user_id UUID,
  p_quantity INTEGER,
  p_points_cost INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_reservation_id UUID;
  v_is_partner BOOLEAN;
  v_points_table TEXT;
BEGIN
  -- Check if user is an approved partner
  SELECT EXISTS (
    SELECT 1 FROM partners 
    WHERE user_id = p_user_id 
    AND status = 'APPROVED'
  ) INTO v_is_partner;

  RAISE NOTICE 'User % is_partner: %', p_user_id, v_is_partner;

  -- Get current balance from the appropriate table
  IF v_is_partner THEN
    v_points_table := 'partner_points';
    SELECT balance INTO v_current_balance
    FROM partner_points
    WHERE user_id = p_user_id
    FOR UPDATE;
    RAISE NOTICE 'Partner balance: %', v_current_balance;
  ELSE
    v_points_table := 'user_points';
    SELECT balance INTO v_current_balance
    FROM user_points
    WHERE user_id = p_user_id
    FOR UPDATE;
    RAISE NOTICE 'User balance: %', v_current_balance;
  END IF;

  -- Check if user has enough points
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User points record not found in table: %', v_points_table;
  END IF;

  IF v_current_balance < p_points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You need % points to reserve % unit(s). Current balance: %', 
      p_points_cost, p_quantity, v_current_balance;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_points_cost;

  -- Update balance in the appropriate table
  IF v_is_partner THEN
    UPDATE partner_points
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_points
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Create reservation
  INSERT INTO reservations (
    offer_id,
    user_id,
    quantity,
    status,
    points_held,
    created_at,
    updated_at
  ) VALUES (
    p_offer_id,
    p_user_id,
    p_quantity,
    'PENDING',
    p_points_cost,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_reservation_id;

  -- Record transaction
  INSERT INTO point_transactions (
    user_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    -p_points_cost,
    'Points held for reservation',
    v_current_balance,
    v_new_balance,
    jsonb_build_object(
      'reservation_id', v_reservation_id,
      'offer_id', p_offer_id,
      'quantity', p_quantity,
      'is_partner', v_is_partner,
      'table_used', v_points_table
    ),
    NOW()
  );

  -- Return success
  RETURN json_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'new_balance', v_new_balance,
    'is_partner', v_is_partner,
    'table_used', v_points_table
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

SELECT 'Function dropped and recreated successfully!' as status;
