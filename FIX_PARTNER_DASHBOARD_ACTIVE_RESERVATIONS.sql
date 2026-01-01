-- Fix partner dashboard to show active reservations with proper customer data
-- Issue: Active reservations not showing in partner dashboard

DROP FUNCTION IF EXISTS get_partner_dashboard_data(uuid);

CREATE OR REPLACE FUNCTION get_partner_dashboard_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_result JSON;
BEGIN
  -- Get partner record
  SELECT * INTO v_partner FROM partners WHERE user_id = p_user_id;
  
  IF v_partner IS NULL THEN
    RAISE EXCEPTION 'Partner not found for user %', p_user_id;
  END IF;
  
  -- Build comprehensive dashboard data in ONE query
  SELECT json_build_object(
    'partner', row_to_json(v_partner),
    
    'offers', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', o.id,
          'title', o.title,
          'description', o.description,
          'category', o.category,
          'images', o.images,
          'original_price', o.original_price,
          'smart_price', o.smart_price,
          'quantity_available', o.quantity_available,
          'quantity_total', o.quantity_total,
          'pickup_start', o.pickup_start,
          'pickup_end', o.pickup_end,
          'expires_at', o.expires_at,
          'status', o.status,
          'created_at', o.created_at,
          'partner_id', o.partner_id
        ) ORDER BY o.created_at DESC
      ), '[]'::json)
      FROM offers o 
      WHERE o.partner_id = v_partner.id
    ),
    
    -- ✅ FIX: Get customer data from users table (not auth.users)
    'activeReservations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', r.id,
          'status', r.status,
          'quantity', r.quantity,
          'qr_code', r.qr_code,
          'total_price', r.total_price,
          'created_at', r.created_at,
          'expires_at', r.expires_at,
          'customer_id', r.customer_id,
          'offer_id', r.offer_id,
          'offer', (
            SELECT json_build_object(
              'id', o.id,
              'title', o.title,
              'original_price', o.original_price,
              'smart_price', o.smart_price,
              'images', o.images
            )
            FROM offers o WHERE o.id = r.offer_id
          ),
          'customer', (
            SELECT json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'phone', u.phone,
              'penalty_count', COALESCE((
                SELECT COUNT(*)
                FROM user_penalties up
                WHERE up.user_id = u.id
                  AND up.acknowledged = true
              ), 0)
            )
            FROM users u WHERE u.id = r.customer_id
          )
        ) ORDER BY r.created_at DESC
      ), '[]'::json)
      FROM reservations r 
      WHERE r.partner_id = v_partner.id 
      AND r.status = 'ACTIVE'
    ),
    
    'stats', (
      SELECT json_build_object(
        'activeOffers', COUNT(*) FILTER (
          WHERE status = 'ACTIVE' 
          AND (expires_at IS NULL OR expires_at > NOW())
          AND quantity_available > 0
        ),
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
      WHERE p.user_id = p_user_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_partner_dashboard_data TO authenticated;

COMMENT ON FUNCTION get_partner_dashboard_data IS 'Unified partner dashboard data with active reservations and customer info';
