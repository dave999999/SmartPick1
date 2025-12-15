-- ============================================================================
-- FIX: Purchase slot function - get partner.id from auth.uid()
-- ============================================================================
-- Problem: Function uses auth.uid() but partner_points.user_id stores partners.id
-- Solution: Look up partners.id from partners.user_id = auth.uid()
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

  -- First, get the partner.id from partners.user_id = auth.uid()
  SELECT id INTO v_partner_id
  FROM public.partners
  WHERE user_id = v_auth_user_id
  AND status = 'APPROVED';

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner not found or not approved');
  END IF;

  -- Lock and fetch partner points using partner.id
  -- partner_points.user_id stores partners.id (confusing naming!)
  SELECT offer_slots, balance INTO v_current_slots, v_current_balance
  FROM public.partner_points
  WHERE user_id = v_partner_id
  FOR UPDATE;

  IF v_current_slots IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner points not initialized');
  END IF;

  -- Check max slots
  IF v_current_slots >= 50 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum slots reached (50)');
  END IF;

  -- Calculate cost: 5th slot = 50, 6th = 100, 7th = 150, etc.
  -- Formula: (slot_number - 4) * 50
  v_cost := (v_current_slots - 3) * 50;

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
  
  -- Update partner_points (uses user_id column = partners.id)
  UPDATE public.partner_points
  SET balance = v_new_balance,
      offer_slots = v_current_slots + 1,
      updated_at = NOW()
  WHERE user_id = v_partner_id;

  -- Log transaction
  -- partner_point_transactions uses partner_id column (also stores partners.id)
  INSERT INTO public.partner_point_transactions (
    partner_id, 
    change, 
    reason, 
    balance_before, 
    balance_after, 
    metadata
  )
  VALUES (
    v_partner_id, 
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

  RETURN jsonb_build_object(
    'success', true,
    'new_slots', v_current_slots + 1,
    'cost', v_cost,
    'balance', v_new_balance,
    'message', 'Offer slot purchased successfully'
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_partner_offer_slot IS 
'Purchase additional offer slot. Gets partner.id from auth.uid() via partners.user_id lookup.
Uses partner_points.user_id (stores partners.id) and partner_point_transactions.partner_id (also stores partners.id).';

-- Test the fix
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Fixed purchase_partner_offer_slot() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Key fix: Now looks up partners.id from auth.uid()';
  RAISE NOTICE '  1. Gets auth.uid() (partners.user_id)';
  RAISE NOTICE '  2. Looks up partners.id from partners table';
  RAISE NOTICE '  3. Uses partners.id to query partner_points.user_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Try purchasing a slot from partner dashboard now!';
  RAISE NOTICE '============================================================';
END $$;
