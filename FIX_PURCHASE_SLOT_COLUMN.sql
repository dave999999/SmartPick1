-- ============================================================================
-- FIX: Purchase offer slot function uses wrong column name
-- ============================================================================
-- Problem: purchase_partner_offer_slot() function tries to insert into
-- partner_point_transactions using partner_id column, but table uses user_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purchase_partner_offer_slot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_id UUID := auth.uid();
  v_current_slots INT;
  v_current_balance INT;
  v_cost INT;
  v_new_balance INT;
BEGIN
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Lock and fetch partner points
  -- IMPORTANT: partner_points table uses user_id column (stores partners.id / auth.uid())
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
  
  -- Update partner_points (uses user_id column)
  UPDATE public.partner_points
  SET balance = v_new_balance,
      offer_slots = v_current_slots + 1,
      updated_at = NOW()
  WHERE user_id = v_partner_id;

  -- Log transaction
  -- FIXED: partner_point_transactions uses partner_id column (stores auth.uid() / partners.id)
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
      'cost', v_cost
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
'Purchase an additional offer slot with escalating cost. 
Uses partner_points.user_id and partner_point_transactions.partner_id columns.';

-- ============================================================================
-- TEST: Verify the fix works
-- ============================================================================

DO $$
DECLARE
  v_test_result JSONB;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Function purchase_partner_offer_slot() has been updated';
  RAISE NOTICE 'Fixed column names:';
  RAISE NOTICE '  - partner_points query: uses user_id ✅';
  RAISE NOTICE '  - partner_points update: uses user_id ✅';
  RAISE NOTICE '  - partner_point_transactions insert: uses partner_id ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Try purchasing a slot from the partner dashboard now!';
  RAISE NOTICE '============================================================';
END $$;
