-- Add user_id to partner object in create_reservation_atomic return
-- This is needed for Telegram notifications to partners

CREATE OR REPLACE FUNCTION public.create_reservation_atomic(
  p_offer_id UUID,
  p_quantity INTEGER,
  p_qr_code TEXT,
  p_total_price NUMERIC,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer RECORD;
  v_reservation_id UUID;
  v_result JSON;
  v_customer_id UUID;
  v_points_cost INT;
  v_current_balance INT;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Calculate points: 5 points per unit
  v_points_cost := GREATEST(1, p_quantity) * 5;

  -- Lock and check user balance (do not deduct here)
  SELECT balance INTO v_current_balance
  FROM public.user_points
  WHERE user_id = v_customer_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You need % points to reserve % unit(s). Current balance: %',
      v_points_cost, p_quantity, COALESCE(v_current_balance, 0);
  END IF;

  -- Lock the offer row FOR UPDATE to prevent concurrent modifications
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF v_offer.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Offer is not active';
  END IF;

  IF v_offer.expires_at < NOW() THEN
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  IF v_offer.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity available. Requested: %, Available: %',
      p_quantity, v_offer.quantity_available;
  END IF;

  -- Deduct quantity from offer
  UPDATE public.offers
  SET
    quantity_available = quantity_available - p_quantity,
    updated_at = NOW()
  WHERE id = p_offer_id;

  -- Insert reservation
  INSERT INTO public.reservations (
    offer_id,
    customer_id,
    partner_id,
    qr_code,
    quantity,
    total_price,
    status,
    expires_at,
    points_spent
  )
  VALUES (
    p_offer_id,
    v_customer_id,
    v_offer.partner_id,
    p_qr_code,
    p_quantity,
    p_total_price,
    'ACTIVE',
    p_expires_at,
    v_points_cost
  )
  RETURNING id INTO v_reservation_id;

  -- Deduct points from user balance
  UPDATE public.user_points
  SET
    balance = balance - v_points_cost,
    updated_at = NOW()
  WHERE user_id = v_customer_id;

  -- Build and return the complete reservation with all relations
  SELECT json_build_object(
    'id', r.id,
    'offer_id', r.offer_id,
    'customer_id', r.customer_id,
    'partner_id', r.partner_id,
    'qr_code', r.qr_code,
    'quantity', r.quantity,
    'total_price', r.total_price,
    'status', r.status,
    'expires_at', r.expires_at,
    'points_spent', r.points_spent,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'picked_up_at', r.picked_up_at,
    'offer', json_build_object(
      'id', o.id,
      'title', o.title,
      'description', o.description,
      'original_price', o.original_price,
      'smart_price', o.smart_price,
      'quantity_available', o.quantity_available,
      'quantity_total', o.quantity_total,
      'expires_at', o.expires_at,
      'status', o.status,
      'partner_id', o.partner_id,
      'images', o.images,
      'created_at', o.created_at,
      'updated_at', o.updated_at,
      'category', o.category,
      'pickup_start', o.pickup_start,
      'pickup_end', o.pickup_end
    ),
    'partner', json_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'business_name', p.business_name,
      'email', p.email,
      'phone', p.phone,
      'address', p.address,
      'city', p.city,
      'latitude', p.latitude,
      'longitude', p.longitude,
      'description', p.description,
      'business_type', p.business_type,
      'status', p.status,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'images', p.images,
      'business_hours', p.business_hours
    ),
    'customer', json_build_object(
      'id', u.id,
      'name', u.name,
      'email', u.email
    )
  ) INTO v_result
  FROM public.reservations r
  LEFT JOIN public.offers o ON o.id = r.offer_id
  LEFT JOIN public.partners p ON p.id = r.partner_id
  LEFT JOIN public.users u ON u.id = r.customer_id
  WHERE r.id = v_reservation_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.create_reservation_atomic(UUID, INTEGER, TEXT, NUMERIC, TIMESTAMPTZ) IS
'Atomically creates a reservation with quantity validation and returns full data with relations (offer, partner, customer) including partner user_id for notifications';
