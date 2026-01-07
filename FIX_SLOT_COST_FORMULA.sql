-- Fix purchase_partner_offer_slot cost calculation
-- Current backend: (slots - 3) * 50 which gives 5th=100, 6th=150, 7th=200
-- Current frontend: (slots - 9) * 100 which gives 10th=100, 11th=200, 12th=300
-- Correct pricing: 5th=100, 6th=200, 7th=300, 8th=400 (increments of 100)
-- Formula should be: (slots - 4) * 100

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

  -- Lock and fetch partner points using user_id
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

  -- Calculate cost: 11th slot = 100, 12th = 200, 13th = 300, etc.
  -- Cost is for the NEXT slot being purchased
  -- Formula: (next_slot - 10) * 100 = (current_slots + 1 - 10) * 100 = (current_slots - 9) * 100
  v_cost := (v_current_slots - 9) * 100;

  -- Check balance
  IF v_current_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points', 'balance', v_current_balance, 'cost', v_cost);
  END IF;

  -- Deduct points
  v_new_balance := v_current_balance - v_cost;
  
  UPDATE public.partner_points
  SET balance = v_new_balance,
      offer_slots = v_current_slots + 1,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Log transaction using actual partner_id
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

COMMENT ON FUNCTION public.purchase_partner_offer_slot IS 'Purchase offer slot: 10 default slots, 11th=100pts, 12th=200pts, 13th=300pts, etc. Formula: (current_slots - 10) * 100';
