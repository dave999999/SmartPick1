-- Update Partner Slots System
-- 1. Change default starting slots from 4 to 10
-- 2. Update slot pricing to progressive: 100, 200, 300, 400, etc.
-- 3. Update all existing partners to have 10 slots minimum
-- 4. Update the purchase function with new pricing logic

BEGIN;

-- ============================================
-- STEP 1: Update partner_points table default
-- ============================================

-- Update the check constraint to allow minimum of 10 slots
ALTER TABLE public.partner_points 
  DROP CONSTRAINT IF EXISTS partner_points_offer_slots_check;

ALTER TABLE public.partner_points 
  ADD CONSTRAINT partner_points_offer_slots_check 
  CHECK (offer_slots >= 10 AND offer_slots <= 50);

-- Update the default value for offer_slots column
ALTER TABLE public.partner_points 
  ALTER COLUMN offer_slots SET DEFAULT 10;

-- ============================================
-- STEP 2: Update existing partners to have 10 slots minimum
-- ============================================

UPDATE public.partner_points
SET offer_slots = 10, updated_at = NOW()
WHERE offer_slots < 10;

-- ============================================
-- STEP 3: Update the welcome points trigger to use 10 slots
-- ============================================

CREATE OR REPLACE FUNCTION public.grant_partner_welcome_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger when status changes to APPROVED
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status <> 'APPROVED') THEN
    -- Initialize partner_points with 1000 welcome bonus and 10 slots
    INSERT INTO public.partner_points (user_id, balance, offer_slots)
    VALUES (NEW.user_id, 1000, 10)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log the welcome bonus
    INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
    VALUES (NEW.user_id, 1000, 'WELCOME', 0, 1000, jsonb_build_object('partner_id', NEW.id, 'business_name', NEW.business_name))
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Update purchase slot function with new pricing
-- ============================================

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

  -- Calculate cost with NEW PROGRESSIVE PRICING:
  -- 11th slot = 100 (slot_number - 10) * 100
  -- 12th slot = 200
  -- 13th slot = 300
  -- 14th slot = 400, etc.
  -- Formula: (slot_number - 10) * 100
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
  WHERE user_id = v_partner_id;

  -- Log transaction
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

-- ============================================
-- STEP 5: Update the offer slot validation trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.check_partner_offer_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_partner_id UUID;
  v_max_slots INT;
  v_current_count INT;
BEGIN
  -- Get partner user_id from the offer
  SELECT user_id INTO v_partner_id
  FROM public.partners
  WHERE id = NEW.partner_id;

  -- Get max allowed slots
  SELECT offer_slots INTO v_max_slots
  FROM public.partner_points
  WHERE user_id = v_partner_id;

  -- Default to 10 if not found (updated from 4)
  v_max_slots := COALESCE(v_max_slots, 10);

  -- Count current active/scheduled offers (excluding the one being inserted/updated)
  SELECT COUNT(*) INTO v_current_count
  FROM public.offers
  WHERE partner_id = NEW.partner_id
    AND status IN ('ACTIVE', 'SCHEDULED')
    AND id <> NEW.id; -- Exclude current row for updates

  -- Check limit
  IF v_current_count >= v_max_slots THEN
    RAISE EXCEPTION 'Offer slot limit reached. You have % slots. Purchase more slots to add offers.', v_max_slots;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;

-- ============================================
-- Summary of Changes
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Partner slots system updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Changes applied:';
  RAISE NOTICE '  • Default starting slots: 4 → 10';
  RAISE NOTICE '  • All existing partners upgraded to 10 slots minimum';
  RAISE NOTICE '  • New pricing formula: (slot_number - 9) × 100';
  RAISE NOTICE '  • 11th slot: 100 points';
  RAISE NOTICE '  • 12th slot: 200 points';
  RAISE NOTICE '  • 13th slot: 300 points';
  RAISE NOTICE '  • 14th slot: 400 points';
  RAISE NOTICE '  • And so on...';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Frontend code also needs updating!';
END $$;
