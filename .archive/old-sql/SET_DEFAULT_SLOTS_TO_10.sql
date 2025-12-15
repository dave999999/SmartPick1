-- Update Partner Slots System - Set Default to 10 Slots
-- This updates both new partner signups and all existing partners

BEGIN;

-- ============================================
-- STEP 1: Update existing partners to 10 slots
-- ============================================

UPDATE partner_points
SET 
  offer_slots = 10,
  updated_at = NOW();

-- ============================================
-- STEP 2: Update default value for new records
-- ============================================

ALTER TABLE partner_points 
  ALTER COLUMN offer_slots SET DEFAULT 10;

-- ============================================
-- STEP 3: Update the welcome points trigger for new partners
-- ============================================

CREATE OR REPLACE FUNCTION public.grant_partner_welcome_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger when status changes to APPROVED
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status <> 'APPROVED') THEN
    -- Initialize partner_points with 1000 welcome bonus and 10 slots (changed from 4)
    INSERT INTO public.partner_points (user_id, balance, offer_slots)
    VALUES (NEW.user_id, 1000, 10)
    ON CONFLICT (user_id) DO UPDATE SET
      offer_slots = GREATEST(partner_points.offer_slots, 10),
      updated_at = NOW();
    
    -- Log the welcome bonus (only if new record)
    INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
    VALUES (NEW.user_id, 1000, 'WELCOME', 0, 1000, jsonb_build_object('partner_id', NEW.id, 'business_name', NEW.business_name))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Update the validation trigger default fallback
-- ============================================

CREATE OR REPLACE FUNCTION public.check_partner_offer_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_slots INT;
  v_current_count INT;
BEGIN
  -- Get max allowed slots for this partner
  SELECT offer_slots INTO v_max_slots
  FROM public.partner_points
  WHERE user_id = NEW.partner_id;

  -- Default to 10 if partner doesn't have a partner_points record yet (changed from 4)
  IF v_max_slots IS NULL THEN
    v_max_slots := 10;
  END IF;

  -- Only enforce limits for ACTIVE or SCHEDULED offers
  IF NEW.status NOT IN ('ACTIVE', 'SCHEDULED') THEN
    RETURN NEW;
  END IF;

  -- Count current active/scheduled offers for this partner
  -- Exclude the current row if it's an UPDATE (not a new INSERT)
  SELECT COUNT(*) INTO v_current_count
  FROM public.offers
  WHERE partner_id = NEW.partner_id
    AND status IN ('ACTIVE', 'SCHEDULED')
    AND (NEW.id IS NULL OR id != NEW.id);

  -- Check if limit would be exceeded
  IF v_current_count >= v_max_slots THEN
    RAISE EXCEPTION 'Offer slot limit reached. You have % of % slots used. Purchase more slots or deactivate an existing offer.', v_current_count, v_max_slots;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;

-- ============================================
-- Verify the changes
-- ============================================

SELECT 
  p.business_name,
  p.user_id,
  pp.balance as points,
  pp.offer_slots as max_slots,
  COUNT(o.id) FILTER (WHERE o.status = 'ACTIVE') as active_offers
FROM partners p
LEFT JOIN partner_points pp ON pp.user_id = p.user_id
LEFT JOIN offers o ON o.partner_id = p.id
WHERE p.status = 'APPROVED'
GROUP BY p.id, p.business_name, p.user_id, pp.balance, pp.offer_slots
ORDER BY p.business_name;
