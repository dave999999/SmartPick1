-- ============================================
-- FIX: Restore get_partner_dashboard_data with correct signature
-- The frontend calls it with p_user_id, not p_partner_id
-- ============================================

DROP FUNCTION IF EXISTS public.get_partner_dashboard_data(uuid);

CREATE OR REPLACE FUNCTION public.get_partner_dashboard_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_partner_id UUID;
  v_result JSON;
BEGIN
  -- Get partner_id from user_id
  SELECT id INTO v_partner_id
  FROM partners
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN json_build_object(
      'partner_id', NULL,
      'business_name', NULL,
      'active_offers', 0,
      'total_reservations', 0,
      'pending_reservations', 0,
      'total_revenue', 0,
      'total_customers', 0,
      'offers', '[]'::json,
      'recent_reservations', '[]'::json
    );
  END IF;

  -- Build comprehensive dashboard data
  SELECT json_build_object(
    'partner_id', p.id,
    'business_name', p.business_name,
    'active_offers', (
      SELECT COUNT(*)
      FROM offers
      WHERE partner_id = v_partner_id
        AND status = 'ACTIVE'
        AND (expires_at IS NULL OR expires_at > NOW())
    ),
    'total_reservations', (
      SELECT COUNT(*)
      FROM reservations r
      WHERE r.partner_id = v_partner_id
    ),
    'pending_reservations', (
      SELECT COUNT(*)
      FROM reservations r
      WHERE r.partner_id = v_partner_id
        AND r.status = 'PENDING'
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(r.total_price), 0)
      FROM reservations r
      WHERE r.partner_id = v_partner_id
        AND r.status = 'COMPLETED'
    ),
    'total_customers', (
      SELECT COUNT(DISTINCT r.customer_id)
      FROM reservations r
      WHERE r.partner_id = v_partner_id
    ),
    'offers', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', o.id,
        'title', o.title,
        'description', o.description,
        'original_price', o.original_price,
        'smart_price', o.smart_price,
        'discount_percentage', ROUND(((o.original_price - o.smart_price) / o.original_price * 100)::numeric, 0),
        'quantity_available', o.quantity_available,
        'quantity_total', o.quantity_total,
        'status', o.status,
        'expires_at', o.expires_at,
        'created_at', o.created_at,
        'category', o.category,
        'sub_category', o.sub_category,
        'images', o.images,
        'pickup_start', o.pickup_start,
        'pickup_end', o.pickup_end
      ) ORDER BY o.created_at DESC), '[]'::json)
      FROM offers o
      WHERE o.partner_id = v_partner_id
        AND o.status = 'ACTIVE'
    ),
    'recent_reservations', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', r.id,
        'offer_title', COALESCE(o.title, 'Deleted Offer'),
        'customer_name', u.name,
        'quantity', r.quantity,
        'total_price', r.total_price,
        'status', r.status,
        'created_at', r.created_at,
        'picked_up_at', r.picked_up_at,
        'expires_at', r.expires_at
      ) ORDER BY r.created_at DESC), '[]'::json)
      FROM reservations r
      LEFT JOIN offers o ON o.id = r.offer_id
      JOIN users u ON u.id = r.customer_id
      WHERE r.partner_id = v_partner_id
      LIMIT 10
    )
  )
  INTO v_result
  FROM partners p
  WHERE p.id = v_partner_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_dashboard_data TO authenticated;

COMMENT ON FUNCTION public.get_partner_dashboard_data IS 
  'Unified partner dashboard data with proper offer filtering and user_id lookup';
