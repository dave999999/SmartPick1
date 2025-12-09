-- ============================================================================
-- UNIFIED DASHBOARD RPC FUNCTIONS - Phase 2 Optimization
-- Purpose: Combine multiple queries into single RPC calls
-- Impact: Reduces 7 queries to 2 queries per dashboard load (70% reduction)
-- Safe to run: YES (adds new functions, doesn't modify existing)
-- ============================================================================

-- ============================================================================
-- PARTNER DASHBOARD: Combine 5 queries into 1
-- ============================================================================

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
              'discounted_price', o.discounted_price,
              'image_url', o.image_url
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
          SELECT SUM(o.discounted_price * r.quantity)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_partner_dashboard_data TO authenticated;

COMMENT ON FUNCTION get_partner_dashboard_data IS 'Unified partner dashboard data - replaces 5 separate queries with 1 RPC call';

-- ============================================================================
-- CUSTOMER DASHBOARD: Combine 2 queries into 1
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customer_dashboard_data(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'user', (
      SELECT row_to_json(u) 
      FROM users u 
      WHERE id = p_user_id
    ),
    
    'reservations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', r.id,
          'status', r.status,
          'quantity', r.quantity,
          'created_at', r.created_at,
          'expires_at', r.expires_at,
          'picked_up_at', r.picked_up_at,
          'rating', r.rating,
          'offer_id', r.offer_id,
          'partner_id', r.partner_id,
          'offer', (
            SELECT json_build_object(
              'id', o.id,
              'title', o.title,
              'description', o.description,
              'original_price', o.original_price,
              'discounted_price', o.discounted_price,
              'image_url', o.image_url,
              'category', o.category,
              'subcategory', o.subcategory
            )
            FROM offers o WHERE o.id = r.offer_id
          ),
          'partner', (
            SELECT json_build_object(
              'id', p.id,
              'name', p.name,
              'address', p.address,
              'latitude', p.latitude,
              'longitude', p.longitude,
              'phone', p.phone,
              'email', p.email
            )
            FROM partners p WHERE p.id = r.partner_id
          )
        ) ORDER BY r.created_at DESC
      ), '[]'::json)
      FROM reservations r 
      WHERE r.customer_id = p_user_id
    ),
    
    'points', (
      SELECT row_to_json(p) 
      FROM user_points p 
      WHERE p.user_id = p_user_id
    ),
    
    'stats', (
      SELECT json_build_object(
        'totalReservations', COUNT(*),
        'activeReservations', COUNT(*) FILTER (WHERE status = 'ACTIVE'),
        'completedReservations', COUNT(*) FILTER (WHERE status = 'PICKED_UP'),
        'cancelledReservations', COUNT(*) FILTER (WHERE status = 'CANCELLED'),
        'totalSaved', COALESCE(SUM(
          (o.original_price - o.discounted_price) * r.quantity
        ) FILTER (WHERE r.status = 'PICKED_UP'), 0)
      )
      FROM reservations r
      LEFT JOIN offers o ON o.id = r.offer_id
      WHERE r.customer_id = p_user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_customer_dashboard_data TO authenticated;

COMMENT ON FUNCTION get_customer_dashboard_data IS 'Unified customer dashboard data - replaces 2 separate queries with 1 RPC call';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test partner dashboard function (replace with real user_id)
-- SELECT get_partner_dashboard_data('your-user-id-here');

-- Test customer dashboard function (replace with real user_id)
-- SELECT get_customer_dashboard_data('your-user-id-here');

-- ============================================================================
-- EXPECTED IMPACT
-- ============================================================================

/*
Partner Dashboard:
  Before: 5 queries (partner, offers, reservations, stats, points)
  After: 1 query (unified RPC)
  Savings: 80% reduction
  
Customer Dashboard:
  Before: 2 queries (user + reservations, reservations + details)
  After: 1 query (unified RPC)
  Savings: 50% reduction
  
Total Impact:
  11 partners × 10 visits/day × 4 queries saved = 440 queries/day
  4 customers × 20 visits/day × 1 query saved = 80 queries/day
  TOTAL: ~520 queries/day saved
*/
