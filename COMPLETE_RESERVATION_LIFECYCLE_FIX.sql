-- ============================================
-- COMPLETE RESERVATION LIFECYCLE SYSTEM
-- ============================================
-- Requirements:
-- 1. User gets 3 warnings before penalty
-- 2. Forgive: returns quantity + removes penalty
-- 3. No-Show: applies penalty, no forgiveness
-- 4. Mark as Picked Up: hidden after expiration
-- 5. Fix price column inconsistencies
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Fix price column issue
-- ============================================
-- Check if we need to create smart_price alias
DO $$
BEGIN
  -- If discounted_price exists but smart_price doesn't, create alias
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'offers' 
    AND column_name = 'discounted_price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'offers' 
    AND column_name = 'smart_price'
  ) THEN
    -- Rename discounted_price to smart_price for consistency
    ALTER TABLE public.offers 
    RENAME COLUMN discounted_price TO smart_price;
    
    RAISE NOTICE '✅ Renamed discounted_price → smart_price';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'offers' 
    AND column_name = 'smart_price'
  ) THEN
    RAISE NOTICE '✅ smart_price column already exists';
  END IF;
END $$;

-- ============================================
-- STEP 2: Drop existing functions to allow signature changes
-- ============================================
DROP FUNCTION IF EXISTS public.auto_expire_failed_pickups() CASCADE;
DROP FUNCTION IF EXISTS public.partner_forgive_customer(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.partner_confirm_no_show(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_penalized(UUID) CASCADE;

-- ============================================
-- STEP 3: Ensure penalty_count tracks warnings
-- ============================================
-- penalty_count = 0-2: warnings only
-- penalty_count = 3+: actual penalties (restrictions apply)

-- Add helper function to check if user is penalized
CREATE OR REPLACE FUNCTION public.is_user_penalized(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(penalty_count, 0) >= 3
    FROM public.users
    WHERE id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_user_penalized IS 'Returns TRUE if user has 3+ penalties (restricted from reserving)';

-- ============================================
-- STEP 4: Auto-expire function with warnings
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_expire_failed_pickups()
RETURNS TABLE(
  reservation_id UUID, 
  customer_id UUID, 
  new_penalty_count INT,
  is_warning BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_rec RECORD;
  v_new_count INT;
BEGIN
  -- Find all expired ACTIVE reservations
  FOR v_rec IN 
    SELECT 
      r.id AS res_id, 
      r.customer_id AS cust_id, 
      r.quantity, 
      r.offer_id,
      COALESCE(u.penalty_count, 0) AS current_penalties
    FROM public.reservations r
    JOIN public.users u ON u.id = r.customer_id
    WHERE r.status = 'ACTIVE'
      AND r.expires_at < NOW()
    FOR UPDATE OF r
  LOOP
    -- Mark as FAILED_PICKUP
    UPDATE public.reservations 
    SET status = 'FAILED_PICKUP', updated_at = NOW() 
    WHERE id = v_rec.res_id;
    
    -- Increment penalty count
    UPDATE public.users 
    SET penalty_count = COALESCE(penalty_count, 0) + 1,
        updated_at = NOW()
    WHERE id = v_rec.cust_id 
    RETURNING penalty_count INTO v_new_count;
    
    -- Restore quantity to offer (capped at original_quantity)
    UPDATE public.offers 
    SET quantity_available = LEAST(
          quantity_available + v_rec.quantity,
          original_quantity
        ),
        updated_at = NOW()
    WHERE id = v_rec.offer_id;
    
    -- Return results
    reservation_id := v_rec.res_id;
    customer_id := v_rec.cust_id;
    new_penalty_count := v_new_count;
    is_warning := (v_new_count < 3);
    
    IF v_new_count < 3 THEN
      message := format('Warning %s/3: Failed to pick up reservation', v_new_count);
    ELSE
      message := format('PENALTY APPLIED: %s failed pickups. Account restricted.', v_new_count);
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.auto_expire_failed_pickups IS 
  'Expires ACTIVE reservations past expires_at. First 3 are warnings, 3+ are penalties with restrictions.';

GRANT EXECUTE ON FUNCTION public.auto_expire_failed_pickups TO service_role;

-- ============================================
-- STEP 5: Partner Forgive Customer
-- ============================================
CREATE OR REPLACE FUNCTION public.partner_forgive_customer(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_offer RECORD;
  v_old_penalty_count INT;
  v_new_penalty_count INT;
  v_quantity_restored BOOLEAN := FALSE;
  v_penalty_removed BOOLEAN := FALSE;
BEGIN
  -- Validate authentication
  IF v_partner_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Not authenticated'
    );
  END IF;

  -- Get reservation with lock
  SELECT r.*, u.penalty_count
  INTO v_reservation
  FROM public.reservations r
  JOIN public.partners p ON p.id = r.partner_id
  JOIN public.users u ON u.id = r.customer_id
  WHERE r.id = p_reservation_id
    AND p.user_id = v_partner_user_id
  FOR UPDATE OF r;

  IF v_reservation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Reservation not found or not owned by you'
    );
  END IF;

  -- Can only forgive ACTIVE, EXPIRED, or FAILED_PICKUP
  IF v_reservation.status NOT IN ('ACTIVE', 'EXPIRED', 'FAILED_PICKUP') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Cannot forgive reservation with status: ' || v_reservation.status
    );
  END IF;

  v_old_penalty_count := v_reservation.penalty_count;

  -- Remove penalty if user has any
  IF v_old_penalty_count > 0 THEN
    UPDATE public.users
    SET penalty_count = GREATEST(penalty_count - 1, 0),
        updated_at = NOW()
    WHERE id = v_reservation.customer_id
    RETURNING penalty_count INTO v_new_penalty_count;
    
    v_penalty_removed := TRUE;
  END IF;

  -- Restore quantity to offer (capped at original_quantity)
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = v_reservation.offer_id
  FOR UPDATE;

  IF v_offer IS NOT NULL THEN
    UPDATE public.offers
    SET quantity_available = LEAST(
          quantity_available + v_reservation.quantity,
          original_quantity
        ),
        updated_at = NOW()
    WHERE id = v_reservation.offer_id;
    
    v_quantity_restored := TRUE;
  END IF;

  -- Mark reservation as CANCELLED (forgiven)
  UPDATE public.reservations
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Customer forgiven',
    'quantity_restored', v_quantity_restored,
    'penalty_removed', v_penalty_removed,
    'old_penalty_count', v_old_penalty_count,
    'new_penalty_count', v_new_penalty_count
  );
END;
$$;

COMMENT ON FUNCTION public.partner_forgive_customer IS 
  'Partner forgives customer: removes 1 penalty point and restores quantity to offer';

GRANT EXECUTE ON FUNCTION public.partner_forgive_customer(UUID) TO authenticated;

-- ============================================
-- STEP 6: Partner Confirm No-Show
-- ============================================
CREATE OR REPLACE FUNCTION public.partner_confirm_no_show(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_new_penalty_count INT;
  v_is_warning BOOLEAN;
BEGIN
  -- Validate authentication
  IF v_partner_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Not authenticated'
    );
  END IF;

  -- Get reservation with lock
  SELECT r.*, COALESCE(u.penalty_count, 0) AS current_penalties
  INTO v_reservation
  FROM public.reservations r
  JOIN public.partners p ON p.id = r.partner_id
  JOIN public.users u ON u.id = r.customer_id
  WHERE r.id = p_reservation_id
    AND p.user_id = v_partner_user_id
  FOR UPDATE OF r;

  IF v_reservation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Reservation not found or not owned by you'
    );
  END IF;

  -- Can only confirm no-show for ACTIVE or EXPIRED
  IF v_reservation.status NOT IN ('ACTIVE', 'EXPIRED') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Cannot mark no-show for status: ' || v_reservation.status
    );
  END IF;

  -- Mark as FAILED_PICKUP
  UPDATE public.reservations
  SET status = 'FAILED_PICKUP',
      updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Add penalty point
  UPDATE public.users
  SET penalty_count = COALESCE(penalty_count, 0) + 1,
      updated_at = NOW()
  WHERE id = v_reservation.customer_id
  RETURNING penalty_count INTO v_new_penalty_count;

  v_is_warning := (v_new_penalty_count < 3);

  -- Restore quantity to offer (capped at original_quantity)
  UPDATE public.offers
  SET quantity_available = LEAST(
        quantity_available + v_reservation.quantity,
        original_quantity
      ),
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN v_is_warning THEN format('Warning %s/3 applied to customer', v_new_penalty_count)
      ELSE format('PENALTY applied: Customer has %s failed pickups and is now restricted', v_new_penalty_count)
    END,
    'penalty_count', v_new_penalty_count,
    'is_warning', v_is_warning,
    'is_restricted', NOT v_is_warning
  );
END;
$$;

COMMENT ON FUNCTION public.partner_confirm_no_show IS 
  'Partner confirms no-show: adds penalty point (3+ restricts user), restores quantity';

GRANT EXECUTE ON FUNCTION public.partner_confirm_no_show(UUID) TO authenticated;

-- ============================================
-- STEP 7: Update get_partner_dashboard_data
-- ============================================
CREATE OR REPLACE FUNCTION get_partner_dashboard_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_result JSON;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE user_id = p_user_id;
  
  IF v_partner IS NULL THEN
    RAISE EXCEPTION 'Partner not found for user %', p_user_id;
  END IF;
  
  SELECT json_build_object(
    'partner', row_to_json(v_partner),
    
    'offers', (
      SELECT COALESCE(json_agg(row_to_json(o) ORDER BY created_at DESC), '[]'::json)
      FROM offers o 
      WHERE o.partner_id = v_partner.id
    ),
    
    'activeReservations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', r.id,
          'status', r.status,
          'quantity', r.quantity,
          'created_at', r.created_at,
          'expires_at', r.expires_at,
          'customer_id', r.customer_id,
          'offer_id', r.offer_id,
          'qr_code', r.qr_code,
          'total_price', o.smart_price * r.quantity,
          'offer', (
            SELECT json_build_object(
              'id', o.id,
              'title', o.title,
              'original_price', o.original_price,
              'smart_price', o.smart_price,
              'image_url', o.images
            )
            FROM offers o WHERE o.id = r.offer_id
          ),
          'customer', (
            SELECT json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'phone', u.phone,
              'penalty_count', COALESCE(u.penalty_count, 0)
            )
            FROM users u WHERE u.id = r.customer_id
          )
        ) ORDER BY r.created_at DESC
      ), '[]'::json)
      FROM reservations r
      JOIN offers o ON o.id = r.offer_id
      WHERE r.partner_id = v_partner.id 
      AND r.status = 'ACTIVE'
      AND r.expires_at > NOW() -- Only show non-expired reservations
    ),
    
    'stats', (
      SELECT json_build_object(
        'activeOffers', COUNT(*) FILTER (WHERE status = 'ACTIVE'),
        'totalOffers', COUNT(*),
        'reservationsToday', (
          SELECT COUNT(*) 
          FROM reservations 
          WHERE partner_id = v_partner.id 
          AND created_at >= CURRENT_DATE
        ),
        'itemsPickedUp', (
          SELECT COUNT(*) 
          FROM reservations 
          WHERE partner_id = v_partner.id 
          AND status = 'PICKED_UP'
        ),
        'totalRevenue', COALESCE((
          SELECT SUM(o.smart_price * r.quantity)
          FROM reservations r
          JOIN offers o ON o.id = r.offer_id
          WHERE r.partner_id = v_partner.id 
          AND r.status = 'PICKED_UP'
        ), 0)
      )
      FROM offers 
      WHERE partner_id = v_partner.id
    ),
    
    'points', (
      SELECT row_to_json(p) 
      FROM partner_points p 
      WHERE p.user_id = v_partner.user_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_partner_dashboard_data TO authenticated;

COMMENT ON FUNCTION get_partner_dashboard_data IS 
  'Unified partner dashboard data - includes only non-expired ACTIVE reservations with total_price calculated';

-- ============================================
-- STEP 8: Setup automatic expiration (optional)
-- ============================================
-- To enable automatic expiration every 5 minutes:
-- 1. Go to Supabase Dashboard > Database > Extensions
-- 2. Enable "pg_cron" extension
-- 3. Run this:
--
-- SELECT cron.schedule(
--   'auto-expire-failed-pickups',
--   '*/5 * * * *',
--   $$SELECT * FROM auto_expire_failed_pickups()$$
-- );

-- ============================================
-- STEP 9: VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RESERVATION LIFECYCLE SYSTEM UPDATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '  ✅ Fixed price column (smart_price)';
  RAISE NOTICE '  ✅ Warning system: 0-2 = warnings, 3+ = restricted';
  RAISE NOTICE '  ✅ Forgive: restores quantity + removes penalty';
  RAISE NOTICE '  ✅ No-Show: adds penalty + restores quantity';
  RAISE NOTICE '  ✅ Mark as Picked Up: hidden after expiration';
  RAISE NOTICE '  ✅ Dashboard shows only non-expired reservations';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Functions updated:';
  RAISE NOTICE '  • is_user_penalized(user_id)';
  RAISE NOTICE '  • auto_expire_failed_pickups()';
  RAISE NOTICE '  • partner_forgive_customer(reservation_id)';
  RAISE NOTICE '  • partner_confirm_no_show(reservation_id)';
  RAISE NOTICE '  • get_partner_dashboard_data(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ Optional: Setup pg_cron for auto-expiration';
  RAISE NOTICE '   See Step 8 in this file';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
