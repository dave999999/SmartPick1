-- MARK_LATEST_RESERVATION_EXPIRED.sql
-- Mark your most recent reservation as expired (missed pickup #3)

DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
  v_offense_number INTEGER;
  v_penalty_type TEXT;
  v_suspended_until TIMESTAMPTZ;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  -- Get the most recent ACTIVE reservation
  SELECT r.id, r.partner_id 
  INTO v_reservation_id, v_partner_id
  FROM reservations r
  WHERE r.customer_id = v_user_id
    AND r.status = 'ACTIVE'
  ORDER BY r.created_at DESC
  LIMIT 1;
  
  IF v_reservation_id IS NULL THEN
    RAISE EXCEPTION 'No active reservation found for this user';
  END IF;
  
  -- Mark reservation as expired with no-show
  UPDATE reservations
  SET 
    status = 'EXPIRED',
    no_show = TRUE,
    expires_at = NOW() - INTERVAL '1 hour',
    updated_at = NOW()
  WHERE id = v_reservation_id;
  
  -- Calculate offense number
  SELECT COALESCE(MAX(offense_number), 0) + 1
  INTO v_offense_number
  FROM user_penalties
  WHERE user_id = v_user_id;
  
  -- Determine penalty type
  -- Offenses 1-3: Warnings only (no suspension, no lift buttons)
  -- Offense 4: 1-hour suspension (100 points to lift)
  -- Offense 5: 24-hour suspension (500 points to lift)
  -- Offense 6+: Permanent ban (admin review required)
  CASE v_offense_number
    WHEN 1 THEN
      v_penalty_type := 'warning';
      v_suspended_until := NULL;
    WHEN 2 THEN
      v_penalty_type := 'warning';
      v_suspended_until := NULL;
    WHEN 3 THEN
      v_penalty_type := 'warning';
      v_suspended_until := NULL;
    WHEN 4 THEN
      v_penalty_type := '1hour';
      v_suspended_until := NOW() + INTERVAL '1 hour';
    WHEN 5 THEN
      v_penalty_type := '24hour';
      v_suspended_until := NOW() + INTERVAL '24 hours';
    ELSE
      v_penalty_type := 'permanent';
      v_suspended_until := NOW() + INTERVAL '100 years';
  END CASE;
  
  -- Create penalty
  INSERT INTO user_penalties (
    user_id,
    reservation_id,
    partner_id,
    offense_number,
    offense_type,
    penalty_type,
    suspended_until,
    is_active,
    acknowledged,
    can_lift_with_points,
    points_required
  ) VALUES (
    v_user_id,
    v_reservation_id,
    v_partner_id,
    v_offense_number,
    'missed_pickup',
    v_penalty_type,
    v_suspended_until,
    TRUE,
    FALSE,
    (v_offense_number >= 4 AND v_offense_number <= 5),  -- Can lift 4th and 5th offense
    CASE v_offense_number
      WHEN 4 THEN 100   -- 1-hour suspension
      WHEN 5 THEN 500   -- 24-hour suspension
      ELSE 0
    END
  );
  
  RAISE NOTICE '✓ Missed pickup penalty created!';
  RAISE NOTICE '  Offense: %', v_offense_number;
  RAISE NOTICE '  Type: %', v_penalty_type;
  RAISE NOTICE '  Suspended until: %', v_suspended_until;
END $$;

-- Verify penalty created
SELECT
  '✓ OFFENSE #3 CREATED' as status,
  offense_number,
  penalty_type,
  suspended_until,
  can_lift_with_points,
  points_required,
  CASE offense_number
    WHEN 3 THEN '→ MissedPickupPopup: 3 hearts filled (LAST CHANCE warning)'
    WHEN 4 THEN '→ SuspensionModal: 1h countdown + 100pt lift button'
    WHEN 5 THEN '→ SuspensionModal: 24h countdown + 500pt lift button'
    ELSE '→ AdminReviewModal: permanent ban'
  END as expected_modal
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND is_active = TRUE
ORDER BY created_at DESC
LIMIT 1;
