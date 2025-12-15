-- ============================================================================
-- CORRECT FIX: Purchase slot function
-- ============================================================================
-- The confusion: partner_points.user_id stores auth.users.id (same as partners.user_id)
-- NOT partners.id
-- ============================================================================

DROP FUNCTION IF EXISTS public.purchase_partner_offer_slot();
DROP FUNCTION IF EXISTS public.purchase_partner_offer_slot(UUID);
DROP FUNCTION IF EXISTS public.purchase_partner_offer_slot(TEXT);

CREATE OR REPLACE FUNCTION public.purchase_partner_offer_slot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id UUID := auth.uid();
  v_partner_id UUID;
  v_current_slots INT;
  v_current_balance INT;
  v_cost INT;
  v_new_balance INT;
BEGIN
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get the partner.id for logging purposes
  SELECT id INTO v_partner_id
  FROM public.partners
  WHERE user_id = v_auth_user_id
  AND status = 'APPROVED';

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner not found or not approved');
  END IF;

  -- CORRECT: Lock and fetch partner points using auth user ID
  -- partner_points.user_id stores partners.user_id (which is auth.users.id)
  SELECT offer_slots, balance INTO v_current_slots, v_current_balance
  FROM public.partner_points
  WHERE user_id = v_auth_user_id  -- Use auth.uid(), NOT partners.id
  FOR UPDATE;

  IF v_current_slots IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner points not initialized');
  END IF;

  -- Check max slots
  IF v_current_slots >= 50 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum slots reached (50)');
  END IF;

  -- Calculate cost: 11th slot = 100, 12th = 200, 13th = 300, etc.
  -- Formula: (slot_number - 9) * 100
  v_cost := (v_current_slots - 9) * 100;

  -- Check balance
  IF v_current_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Insufficient points', 
      'balance', v_current_balance, 
      'cost', v_cost
    );
  END IF;

  -- Deduct points
  v_new_balance := v_current_balance - v_cost;
  
  -- CORRECT: Update partner_points using auth user ID
  UPDATE public.partner_points
  SET balance = v_new_balance,
      offer_slots = v_current_slots + 1,
      updated_at = NOW()
  WHERE user_id = v_auth_user_id;  -- Use auth.uid(), NOT partners.id

  -- Log transaction
  -- partner_point_transactions.partner_id stores partners.id (for historical tracking)
  INSERT INTO public.partner_point_transactions (
    partner_id, 
    change, 
    reason, 
    balance_before, 
    balance_after, 
    metadata
  )
  VALUES (
    v_partner_id,  -- This is partners.id for the transaction log
    -v_cost, 
    'SLOT_PURCHASE', 
    v_current_balance, 
    v_new_balance, 
    jsonb_build_object(
      'slot_number', v_current_slots + 1, 
      'cost', v_cost,
      'auth_user_id', v_auth_user_id
    )
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Slot purchased successfully',
    'new_slots', v_current_slots + 1,
    'cost', v_cost,
    'balance', v_new_balance
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_partner_offer_slot IS 
  'Purchase an additional offer slot - FIXED to use correct user_id (auth.users.id)';

GRANT EXECUTE ON FUNCTION public.purchase_partner_offer_slot() TO authenticated;

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================
-- SELECT purchase_partner_offer_slot();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show partner_points schema to confirm user_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'partner_points'
AND table_schema = 'public';

-- Show what's actually in partner_points
SELECT 
  pp.user_id as "partner_points.user_id (should be auth.users.id)",
  p.id as "partners.id",
  p.user_id as "partners.user_id (auth.users.id)",
  p.business_name,
  pp.balance,
  pp.offer_slots
FROM partner_points pp
INNER JOIN partners p ON pp.user_id = p.user_id
LIMIT 5;
