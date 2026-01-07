-- Fix purchase_partner_offer_slot function
-- Problem: Function uses auth.uid() (user_id) directly as partner_id
-- but partner_point_transactions expects partner.id which references partners table
-- Solution: Look up the actual partner_id from the partners table

CREATE OR REPLACE FUNCTION public.purchase_partner_offer_slot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_partner_id UUID;
  v_current_slots INT;
  v_current_balance INT;
  v_cost INT;
  v_new_balance INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get the partner_id from the partners table
  SELECT id INTO v_partner_id
  FROM public.partners
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner not found');
  END IF;

  -- Lock and fetch partner points using user_id (partner_points table uses user_id)
  SELECT offer_slots, balance INTO v_current_slots, v_current_balance
  FROM public.partner_points
  WHERE user_id = v_user_id
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
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points', 'balance', v_current_balance, 'cost', v_cost);
  END IF;

  -- Deduct points (partner_points uses user_id)
  v_new_balance := v_current_balance - v_cost;
  
  UPDATE public.partner_points
  SET balance = v_new_balance,
      offer_slots = v_current_slots + 1,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Log transaction using actual partner_id from partners table
  INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
  VALUES (v_partner_id, -v_cost, 'SLOT_PURCHASE', v_current_balance, v_new_balance, jsonb_build_object('slot_number', v_current_slots + 1, 'cost', v_cost));

  RETURN jsonb_build_object(
    'success', true,
    'new_slots', v_current_slots + 1,
    'cost', v_cost,
    'balance', v_new_balance
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_partner_offer_slot IS 'Purchase an additional offer slot with escalating cost - uses correct partner_id from partners table';
