-- Diagnostic helper to debug pickup flow for a specific reservation
-- Usage: SELECT * FROM debug_pickup_state('reservation-uuid-here');

CREATE OR REPLACE FUNCTION public.debug_pickup_state(p_reservation_id UUID)
RETURNS TABLE (
  section TEXT,
  key TEXT,
  value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_partner RECORD;
  v_escrow RECORD;
  v_partner_points RECORD;
  v_tx_count INT;
BEGIN
  -- Reservation details
  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id;
  
  IF v_res IS NULL THEN
    RETURN QUERY SELECT 'ERROR'::TEXT, 'reservation'::TEXT, 'NOT FOUND'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 'RESERVATION'::TEXT, 'id'::TEXT, v_res.id::TEXT;
  RETURN QUERY SELECT 'RESERVATION'::TEXT, 'status'::TEXT, v_res.status::TEXT;
  RETURN QUERY SELECT 'RESERVATION'::TEXT, 'partner_id'::TEXT, v_res.partner_id::TEXT;
  RETURN QUERY SELECT 'RESERVATION'::TEXT, 'customer_id'::TEXT, v_res.customer_id::TEXT;
  RETURN QUERY SELECT 'RESERVATION'::TEXT, 'offer_id'::TEXT, v_res.offer_id::TEXT;
  RETURN QUERY SELECT 'RESERVATION'::TEXT, 'points_spent'::TEXT, COALESCE(v_res.points_spent::TEXT, 'NULL');
  RETURN QUERY SELECT 'RESERVATION'::TEXT, 'picked_up_at'::TEXT, COALESCE(v_res.picked_up_at::TEXT, 'NULL');
  
  -- Partner details
  SELECT p.id, p.user_id, p.business_name INTO v_partner
  FROM public.partners p
  JOIN public.offers o ON o.partner_id = p.id
  WHERE o.id = v_res.offer_id;
  
  IF v_partner IS NOT NULL THEN
    RETURN QUERY SELECT 'PARTNER'::TEXT, 'partner_id'::TEXT, v_partner.id::TEXT;
    RETURN QUERY SELECT 'PARTNER'::TEXT, 'user_id'::TEXT, v_partner.user_id::TEXT;
    RETURN QUERY SELECT 'PARTNER'::TEXT, 'business_name'::TEXT, v_partner.business_name::TEXT;
  ELSE
    RETURN QUERY SELECT 'PARTNER'::TEXT, 'status'::TEXT, 'NOT FOUND'::TEXT;
  END IF;
  
  -- Escrow details
  FOR v_escrow IN
    SELECT * FROM public.escrow_points WHERE reservation_id = p_reservation_id
  LOOP
    RETURN QUERY SELECT 'ESCROW'::TEXT, 'id'::TEXT, v_escrow.id::TEXT;
    RETURN QUERY SELECT 'ESCROW'::TEXT, 'amount_held'::TEXT, v_escrow.amount_held::TEXT;
    RETURN QUERY SELECT 'ESCROW'::TEXT, 'status'::TEXT, v_escrow.status::TEXT;
    RETURN QUERY SELECT 'ESCROW'::TEXT, 'released_at'::TEXT, COALESCE(v_escrow.released_at::TEXT, 'NULL');
    RETURN QUERY SELECT 'ESCROW'::TEXT, 'released_reason'::TEXT, COALESCE(v_escrow.released_reason::TEXT, 'NULL');
  END LOOP;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'ESCROW'::TEXT, 'status'::TEXT, 'NO ROWS'::TEXT;
  END IF;
  
  -- Partner wallet
  IF v_partner IS NOT NULL THEN
    SELECT * INTO v_partner_points
    FROM public.partner_points
    WHERE user_id = v_partner.user_id;
    
    IF v_partner_points IS NOT NULL THEN
      RETURN QUERY SELECT 'WALLET'::TEXT, 'balance'::TEXT, v_partner_points.balance::TEXT;
      RETURN QUERY SELECT 'WALLET'::TEXT, 'offer_slots'::TEXT, v_partner_points.offer_slots::TEXT;
    ELSE
      RETURN QUERY SELECT 'WALLET'::TEXT, 'status'::TEXT, 'NO RECORD'::TEXT;
    END IF;
    
    -- Transaction count for this reservation
    SELECT COUNT(*) INTO v_tx_count
    FROM public.partner_point_transactions
    WHERE partner_id = v_partner.user_id
      AND (metadata ->> 'reservation_id' = p_reservation_id::TEXT);
    
    RETURN QUERY SELECT 'TRANSACTIONS'::TEXT, 'count'::TEXT, v_tx_count::TEXT;
  END IF;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.debug_pickup_state IS 'Debug helper: shows reservation, partner, escrow, wallet state for a reservation_id';
GRANT EXECUTE ON FUNCTION public.debug_pickup_state(UUID) TO service_role;
