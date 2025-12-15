-- =====================================================
-- FIX: Correct the grant_partner_welcome_points trigger
-- =====================================================

-- Drop and recreate the function with the correct partner_id
CREATE OR REPLACE FUNCTION public.grant_partner_welcome_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    -- Insert or update partner_points using user_id (correct)
    INSERT INTO public.partner_points (user_id, balance, offer_slots)
    VALUES (NEW.user_id, 1000, 10)
    ON CONFLICT (user_id) DO UPDATE SET
      offer_slots = GREATEST(partner_points.offer_slots, 10),
      updated_at = NOW();
    
    -- Insert transaction using NEW.id (partner record ID) not NEW.user_id
    -- This is the FIX: changed from NEW.user_id to NEW.id
    INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
    VALUES (NEW.id, 1000, 'WELCOME', 0, 1000, jsonb_build_object('partner_id', NEW.id, 'business_name', NEW.business_name))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Test: Now try approving the partner again
-- UPDATE partners 
-- SET status = 'APPROVED', updated_at = NOW()
-- WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
-- RETURNING id, business_name, status;
