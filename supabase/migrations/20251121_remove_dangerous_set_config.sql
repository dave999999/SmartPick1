-- CRITICAL SECURITY FIX: Remove any lingering dangerous set_config usage
-- 
-- Issue: Some old migrations (v4, v5, v6) used set_config to escalate to service_role
-- This allowed ANY authenticated user to bypass RLS by calling these functions
--
-- Vulnerability Pattern:
--   PERFORM set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
--
-- This was fixed in 20251109_partner_mark_picked_up_no_service_role.sql
-- This migration ensures the fix is applied and documents the security issue

-- Drop any old versions of the function that might still exist
DROP FUNCTION IF EXISTS partner_mark_as_picked_up(UUID);

-- Recreate the secure version (from 20251109_partner_mark_picked_up_no_service_role.sql)
-- This version uses SECURITY DEFINER properly WITHOUT set_config escalation
CREATE OR REPLACE FUNCTION partner_mark_as_picked_up(p_reservation_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  picked_up_at TIMESTAMPTZ,
  customer_id UUID,
  partner_id UUID,
  offer_id UUID,
  quantity INT,
  qr_code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  user_confirmed_pickup BOOLEAN,
  points_spent INT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with function owner's privileges (bypasses RLS)
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
    RAISE EXCEPTION 'User % is not a partner', v_current_user_id;
  END IF;

  -- Get the reservation and verify ownership
  SELECT * INTO v_reservation
  FROM reservations r
  WHERE r.id = p_reservation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation % not found', p_reservation_id;
  END IF;
  
  -- CRITICAL SECURITY CHECK: Verify partner owns this reservation
  IF v_reservation.partner_id != v_partner_id THEN
    RAISE EXCEPTION 'Access denied: Reservation % is not owned by partner %', 
      p_reservation_id, v_partner_id;
  END IF;
  
  -- Check if status is ACTIVE
  IF v_reservation.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Invalid status: Reservation % is % (must be ACTIVE)', 
      p_reservation_id, v_reservation.status;
  END IF;

  -- Update the reservation status
  -- SECURITY DEFINER allows this to bypass RLS, but only after ownership verification
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

-- Add security comment
COMMENT ON FUNCTION partner_mark_as_picked_up(UUID) IS 
'Allows partner to mark their reservation as picked up. 
Uses SECURITY DEFINER to bypass RLS, but includes strict ownership verification.
SECURITY: Never use set_config to escalate privileges - SECURITY DEFINER is sufficient.';

-- Grant execute permission only to authenticated users
REVOKE ALL ON FUNCTION partner_mark_as_picked_up(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION partner_mark_as_picked_up(UUID) TO authenticated;

-- Log the security fix
DO $$ 
BEGIN
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  CRITICAL SECURITY FIX APPLIED                               ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Issue: Privilege escalation via set_config bypass';
  RAISE NOTICE 'Vulnerable pattern removed: set_config(''request.jwt.claims'', ...)';
  RAISE NOTICE '';
  RAISE NOTICE 'Function partner_mark_as_picked_up now uses SECURITY DEFINER';
  RAISE NOTICE 'safely with proper ownership verification.';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Old vulnerable versions dropped';
  RAISE NOTICE '✓ Secure version recreated';
  RAISE NOTICE '✓ Permissions restricted to authenticated users only';
  RAISE NOTICE '';
END $$;
