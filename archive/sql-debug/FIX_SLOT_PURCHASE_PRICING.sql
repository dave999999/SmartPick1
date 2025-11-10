-- ================================================
-- UPDATE SLOT PURCHASE PRICING: INCREMENTAL +50
-- ================================================
-- 5th slot = 50 points
-- 6th slot = 100 points  
-- 7th slot = 150 points
-- Formula: (current_slots - 3) * 50

BEGIN;

-- Drop old function if exists
DROP FUNCTION IF EXISTS public.purchase_partner_offer_slot();

-- Create new function with incremental pricing
CREATE OR REPLACE FUNCTION public.purchase_partner_offer_slot()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_id UUID;
  v_current_balance INTEGER;
  v_current_slots INTEGER;
  v_slot_cost INTEGER;
  v_new_balance INTEGER;
  v_new_slots INTEGER;
BEGIN
  -- Get partner_id from current user
  SELECT id INTO v_partner_id
  FROM public.partners
  WHERE user_id = auth.uid();

  IF v_partner_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User is not a partner'
    );
  END IF;

  -- Get current points and slots
  SELECT balance, offer_slots
  INTO v_current_balance, v_current_slots
  FROM public.partner_points
  WHERE partner_id = v_partner_id;

  IF v_current_slots IS NULL THEN
    -- Initialize if doesn't exist
    INSERT INTO public.partner_points (partner_id, balance, offer_slots)
    VALUES (v_partner_id, 1000, 4)
    RETURNING balance, offer_slots INTO v_current_balance, v_current_slots;
  END IF;

  -- Calculate slot cost: (current_slots - 3) * 50
  -- 4th slot (free), 5th = 50, 6th = 100, 7th = 150, etc.
  v_slot_cost := (v_current_slots - 3) * 50;

  -- Check if can afford
  IF v_current_balance < v_slot_cost THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient points. Need ' || v_slot_cost || ' points.',
      'cost', v_slot_cost,
      'balance', v_current_balance
    );
  END IF;

  -- Deduct points and add slot
  v_new_balance := v_current_balance - v_slot_cost;
  v_new_slots := v_current_slots + 1;

  UPDATE public.partner_points
  SET 
    balance = v_new_balance,
    offer_slots = v_new_slots,
    updated_at = NOW()
  WHERE partner_id = v_partner_id;

  -- Log transaction
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
    -v_slot_cost,
    'Purchased offer slot',
    v_current_balance,
    v_new_balance,
    jsonb_build_object(
      'slot_number', v_new_slots,
      'cost', v_slot_cost
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Offer slot purchased successfully',
    'new_slots', v_new_slots,
    'cost', v_slot_cost,
    'balance', v_new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.purchase_partner_offer_slot() TO authenticated;

COMMIT;

SELECT '✅ Slot purchase pricing updated: incremental +50 per slot' AS status;
SELECT '📊 5th slot = 50, 6th = 100, 7th = 150, etc.' AS formula;
