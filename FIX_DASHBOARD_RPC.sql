-- Fix get_partner_dashboard_data function to use smart_price instead of discounted_price
-- This fixes the "column o.discounted_price does not exist" error

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
              'phone', u.phone
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_partner_dashboard_data TO authenticated;

COMMENT ON FUNCTION get_partner_dashboard_data IS 'Unified partner dashboard data - FIXED: uses smart_price instead of discounted_price';
