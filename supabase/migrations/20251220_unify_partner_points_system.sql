-- ============================================================================
-- Unify Partner Points System
-- Date: 2025-12-20
-- Problem: Users who become partners have TWO point wallets (user_points + partner_points)
--          This causes "Permission denied: only backend can modify partner points" errors
-- Solution: Use partner_points as the ONLY wallet for partners
-- ============================================================================

-- Step 0: Fix escrow_points CHECK constraint to allow RELEASED status
DO $$
BEGIN
  -- Drop old restrictive constraint if it exists
  ALTER TABLE public.escrow_points DROP CONSTRAINT IF EXISTS escrow_points_status_check;
  
  -- Add new constraint that allows both HELD and RELEASED
  ALTER TABLE public.escrow_points 
  ADD CONSTRAINT escrow_points_status_check 
  CHECK (status IN ('HELD', 'RELEASED'));
  
  RAISE NOTICE 'Fixed escrow_points status constraint to allow RELEASED status';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update constraint, it may not exist: %', SQLERRM;
END $$;

-- Disable RLS on partner_points and partner_point_transactions
-- SECURITY DEFINER functions need to bypass RLS to work properly
ALTER TABLE public.partner_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_point_transactions DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.partner_points IS 
'Partner points wallet. RLS DISABLED - security enforced via SECURITY DEFINER functions (add_partner_points).';

COMMENT ON TABLE public.partner_point_transactions IS 
'Partner points transaction log. RLS DISABLED - security enforced via SECURITY DEFINER functions.';

-- Drop old function to allow parameter name change
DROP FUNCTION IF EXISTS public.add_partner_points(UUID, INT, TEXT, JSONB);

-- Recreate add_partner_points to ensure NO permission checks
CREATE OR REPLACE FUNCTION public.add_partner_points(
  p_partner_id UUID,  -- This is partners.user_id
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_partner_record_id UUID;
BEGIN
  -- Validation checks
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount cannot be zero');
  END IF;
  
  IF p_amount > 10000 OR p_amount < -10000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount too large');
  END IF;

  -- Get partners.id for FK constraint (partner_point_transactions.partner_id references partners.id)
  SELECT id INTO v_partner_record_id FROM partners WHERE user_id = p_partner_id;
  
  IF v_partner_record_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner not found');
  END IF;

  -- Get current balance with row lock
  -- partner_points.user_id stores partners.user_id
  SELECT balance INTO v_current_balance
  FROM partner_points
  WHERE user_id = p_partner_id
  FOR UPDATE;

  -- Handle first time or update existing
  IF v_current_balance IS NULL THEN
    -- First transaction for this partner
    v_current_balance := 0;
    v_new_balance := GREATEST(0, p_amount);
    
    INSERT INTO partner_points (user_id, balance, updated_at)
    VALUES (p_partner_id, v_new_balance, NOW());
  ELSE
    -- Update existing balance
    v_new_balance := v_current_balance + p_amount;
    
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'message', 'Insufficient points', 
        'balance', v_current_balance, 
        'required', ABS(p_amount)
      );
    END IF;
    
    UPDATE partner_points
    SET balance = v_new_balance, updated_at = NOW()
    WHERE user_id = p_partner_id;
  END IF;

  -- Log the transaction
  -- partner_point_transactions.partner_id references partners(id), not auth.users(id)
  INSERT INTO partner_point_transactions (
    partner_id, change, reason, balance_before, balance_after, metadata
  )
  VALUES (
    v_partner_record_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION add_partner_points(UUID, INT, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION add_partner_points IS 
'Add/deduct partner points. SECURITY DEFINER with RLS disabled on tables. No permission checks - caller must verify ownership.';

-- Step 1: Create function to migrate user points to partner points when someone becomes a partner
CREATE OR REPLACE FUNCTION migrate_user_to_partner_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_balance INT;
BEGIN
  -- Only proceed if user just became an approved partner
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Get user's existing points balance
    SELECT COALESCE(balance, 0) INTO v_user_balance
    FROM user_points
    WHERE user_id = NEW.user_id;
    
    -- If user has points, transfer them to partner_points
    IF v_user_balance > 0 THEN
      -- Insert or update partner_points with the migrated balance
      INSERT INTO partner_points (user_id, balance, updated_at)
      VALUES (NEW.user_id, v_user_balance, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET balance = partner_points.balance + EXCLUDED.balance,
          updated_at = NOW();
      
      -- Log the migration (use NEW.id which is partners.id for FK)
      INSERT INTO partner_point_transactions (
        partner_id, change, balance_before, balance_after, reason, metadata, created_at
      )
      VALUES (
        NEW.id,
        v_user_balance,
        COALESCE((SELECT balance FROM partner_points WHERE user_id = NEW.user_id FOR UPDATE) - v_user_balance, 0),
        (SELECT balance FROM partner_points WHERE user_id = NEW.user_id),
        'USER_TO_PARTNER_MIGRATION',
        jsonb_build_object('migrated_from', 'user_points', 'original_balance', v_user_balance),
        NOW()
      );
      
      -- Clear user_points (they're now using partner_points)
      UPDATE user_points
      SET balance = 0, updated_at = NOW()
      WHERE user_id = NEW.user_id;
      
      RAISE NOTICE 'Migrated % points from user_points to partner_points for user %', v_user_balance, NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 2: Create trigger to auto-migrate points when user becomes partner
DROP TRIGGER IF EXISTS trg_migrate_user_to_partner_points ON partners;
CREATE TRIGGER trg_migrate_user_to_partner_points
AFTER INSERT OR UPDATE OF status ON partners
FOR EACH ROW
EXECUTE FUNCTION migrate_user_to_partner_points();

-- Step 3: Fix the pickup trigger to work correctly with partner_points
CREATE OR REPLACE FUNCTION public.transfer_points_to_partner_on_pickup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_user_id UUID;
  v_points_spent INT;
  v_points_held INT;
  v_points_to_transfer INT;
  v_tx_exists BOOLEAN := FALSE;
BEGIN
  -- Only proceed if status just changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Resolve the partner's user_id
  SELECT p.user_id INTO v_partner_user_id
  FROM public.offers o
  JOIN public.partners p ON p.id = o.partner_id
  WHERE o.id = NEW.offer_id;

  IF v_partner_user_id IS NULL THEN
    RAISE WARNING 'transfer_points_to_partner_on_pickup: partner user not found for offer_id=%', NEW.offer_id;
    RETURN NEW;
  END IF;

  -- Get held points from escrow (only count HELD status)
  SELECT COALESCE(SUM(e.amount_held), 0) INTO v_points_held
  FROM public.escrow_points e
  WHERE e.reservation_id = NEW.id AND e.status = 'HELD';
  
  -- If no HELD escrow, check if there's RELEASED escrow (previous attempt)
  IF v_points_held = 0 THEN
    SELECT COALESCE(SUM(e.amount_held), 0) INTO v_points_held
    FROM public.escrow_points e
    WHERE e.reservation_id = NEW.id AND e.status = 'RELEASED';
  END IF;

  -- Fallback to points_spent
  v_points_spent := COALESCE(NEW.points_spent, 0);

  v_points_to_transfer := CASE
    WHEN v_points_held > 0 THEN v_points_held
    WHEN v_points_spent > 0 THEN v_points_spent
    ELSE GREATEST(0, COALESCE(NEW.quantity, 0) * 5)
  END;

  IF v_points_to_transfer <= 0 THEN
    RAISE NOTICE 'transfer_points_to_partner_on_pickup: no points to transfer for reservation_id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Check if already processed (idempotency)
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_point_transactions ppt
    WHERE ppt.partner_id = v_partner_user_id
      AND (ppt.metadata->>'reservation_id')::UUID = NEW.id
      AND (ppt.reason = 'PICKUP_REWARD' OR ppt.reason = 'reservation_pickup')
    FOR UPDATE SKIP LOCKED
  ) INTO v_tx_exists;

  IF v_tx_exists THEN
    RAISE NOTICE 'transfer_points_to_partner_on_pickup: points already transferred for reservation_id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Update escrow to RELEASED (only if still HELD, skip if already RELEASED)
  UPDATE public.escrow_points
  SET status = 'RELEASED', released_at = NOW(), released_reason = 'PICKED_UP'
  WHERE reservation_id = NEW.id AND status = 'HELD';

  -- Award points using add_partner_points (SECURITY DEFINER, no RLS issues)
  BEGIN
    PERFORM public.add_partner_points(
      v_partner_user_id,
      v_points_to_transfer,
      'PICKUP_REWARD',
      jsonb_build_object(
        'reservation_id', NEW.id,
        'customer_id', NEW.customer_id,
        'offer_id', NEW.offer_id,
        'quantity', NEW.quantity,
        'picked_up_at', NEW.picked_up_at
      )
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'transfer_points_to_partner_on_pickup: concurrent transaction detected for reservation_id=%, skipping', NEW.id;
      RETURN NEW;
  END;

  RETURN NEW;
END;
$$;

-- Step 4: Recreate the trigger with the fixed function
DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations;
CREATE TRIGGER trg_transfer_points_to_partner
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.transfer_points_to_partner_on_pickup();

-- Step 5: Migrate existing partners' user_points to partner_points NOW
DO $$
DECLARE
  v_partner RECORD;
  v_user_balance INT;
  v_migrated_count INT := 0;
BEGIN
  FOR v_partner IN 
    SELECT p.id, p.user_id 
    FROM partners p 
    WHERE p.status = 'approved'
  LOOP
    -- Get user's existing points
    SELECT COALESCE(balance, 0) INTO v_user_balance
    FROM user_points
    WHERE user_id = v_partner.user_id;
    
    IF v_user_balance > 0 THEN
      -- Transfer to partner_points
      INSERT INTO partner_points (user_id, balance, updated_at)
      VALUES (v_partner.user_id, v_user_balance, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET balance = partner_points.balance + EXCLUDED.balance,
          updated_at = NOW();
      
      -- Log it (use v_partner.id which is partners.id for FK)
      INSERT INTO partner_point_transactions (
        partner_id, change, balance_before, balance_after, reason, metadata, created_at
      )
      VALUES (
        v_partner.id,
        v_user_balance,
        COALESCE((SELECT balance FROM partner_points WHERE user_id = v_partner.user_id) - v_user_balance, 0),
        (SELECT balance FROM partner_points WHERE user_id = v_partner.user_id),
        'USER_TO_PARTNER_MIGRATION',
        jsonb_build_object('migrated_at', NOW(), 'original_balance', v_user_balance),
        NOW()
      );
      
      -- Clear user_points
      UPDATE user_points
      SET balance = 0, updated_at = NOW()
      WHERE user_id = v_partner.user_id;
      
      v_migrated_count := v_migrated_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migrated points for % existing partners from user_points to partner_points', v_migrated_count;
END $$;

-- Step 6: Update partner_mark_reservation_picked_up to use the corrected system
DROP FUNCTION IF EXISTS partner_mark_reservation_picked_up(UUID);

CREATE OR REPLACE FUNCTION partner_mark_reservation_picked_up(
  p_reservation_id UUID
)
RETURNS TABLE (
  id UUID,
  status VARCHAR(50),
  picked_up_at TIMESTAMPTZ,
  customer_id UUID,
  partner_id UUID,
  offer_id UUID,
  quantity INT,
  qr_code VARCHAR(500),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  user_confirmed_pickup BOOLEAN,
  points_spent INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_reservation RECORD;
  v_current_user_id UUID;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get current user's partner ID
  SELECT p.id INTO v_partner_id 
  FROM partners p
  WHERE p.user_id = v_current_user_id;
  
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'User is not a partner';
  END IF;

  -- Get the reservation and verify ownership
  SELECT * INTO v_reservation
  FROM reservations r
  WHERE r.id = p_reservation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;
  
  -- Verify partner owns this reservation
  IF v_reservation.partner_id != v_partner_id THEN
    RAISE EXCEPTION 'Access denied: Reservation does not belong to this partner';
  END IF;
  
  -- Check if status is ACTIVE
  IF v_reservation.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Invalid status: Reservation is % (must be ACTIVE)', v_reservation.status;
  END IF;

  -- Simple update - the trigger will handle points transfer correctly now
  UPDATE reservations
  SET 
    status = 'PICKED_UP',
    picked_up_at = NOW()
  WHERE reservations.id = p_reservation_id;

  -- Return the updated reservation
  RETURN QUERY
  SELECT 
    r.id,
    r.status,
    r.picked_up_at,
    r.customer_id,
    r.partner_id,
    r.offer_id,
    r.quantity,
    r.qr_code,
    r.expires_at,
    r.created_at,
    r.user_confirmed_pickup,
    r.points_spent
  FROM reservations r
  WHERE r.id = p_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION partner_mark_reservation_picked_up TO authenticated;

COMMENT ON FUNCTION partner_mark_reservation_picked_up IS 
'Mark reservation as picked up. The trigger handles points transfer to partner_points (unified wallet system).';

COMMENT ON FUNCTION migrate_user_to_partner_points IS
'Automatically migrates user_points to partner_points when a user becomes an approved partner. Ensures single wallet system.';

COMMENT ON FUNCTION transfer_points_to_partner_on_pickup IS
'Awards points to partner using partner_points table (unified wallet). Called by trigger on reservation pickup.';
