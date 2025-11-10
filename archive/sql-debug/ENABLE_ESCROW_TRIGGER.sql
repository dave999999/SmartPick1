-- COMPLETE WORKING ESCROW SYSTEM
-- Step 1: Enable trigger to hold points on reservation
-- Step 2: Test with a new reservation

BEGIN;

-- Re-enable the trigger that holds points when reservation is created
CREATE OR REPLACE FUNCTION public.hold_points_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_to_hold INT;
  v_customer_balance INT;
  v_partner_user_id UUID;
BEGIN
  -- Only process if reservation is ACTIVE
  IF NEW.status != 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  -- Calculate points to hold (total_price rounded)
  v_points_to_hold := ROUND(NEW.total_price)::INT;

  -- Skip if no points to hold
  IF v_points_to_hold <= 0 THEN
    RETURN NEW;
  END IF;

  -- Get customer's current balance
  SELECT COALESCE(balance, 0) INTO v_customer_balance
  FROM public.user_points
  WHERE user_id = NEW.customer_id;

  -- Get partner's user_id
  SELECT user_id INTO v_partner_user_id
  FROM public.partners
  WHERE id = NEW.partner_id;

  IF v_partner_user_id IS NULL THEN
    -- Partner not found, skip escrow but allow reservation
    RETURN NEW;
  END IF;

  -- Deduct points from customer's balance
  UPDATE public.user_points
  SET balance = GREATEST(0, balance - v_points_to_hold),
      updated_at = NOW()
  WHERE user_id = NEW.customer_id;

  -- Create escrow record
  INSERT INTO public.escrow_points (
    reservation_id,
    customer_id,
    partner_id,
    amount_held,
    status
  ) VALUES (
    NEW.id,
    NEW.customer_id,
    v_partner_user_id,
    v_points_to_hold,
    'HELD'
  )
  ON CONFLICT (reservation_id) DO NOTHING;

  -- Log transaction (ignore errors)
  BEGIN
    INSERT INTO public.point_transactions (
      user_id,
      change,
      reason,
      balance_before,
      balance_after,
      metadata
    ) VALUES (
      NEW.customer_id,
      -v_points_to_hold,
      'RESERVATION_HOLD',
      v_customer_balance,
      GREATEST(0, v_customer_balance - v_points_to_hold),
      json_build_object('reservation_id', NEW.id, 'offer_id', NEW.offer_id)::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Attach trigger to reservations table
DROP TRIGGER IF EXISTS trg_hold_points_on_reservation ON public.reservations;
CREATE TRIGGER trg_hold_points_on_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.hold_points_on_reservation();

COMMIT;

SELECT 'Escrow trigger enabled - make a NEW reservation to test' as status;
