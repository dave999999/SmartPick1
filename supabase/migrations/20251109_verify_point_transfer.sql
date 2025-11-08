-- Verify and fix partner point transfer system
-- Run this in Supabase SQL Editor to debug the issue

-- 1. Check if partner_points table exists and has data
SELECT 'Partner Points Table Check' as check_name;
SELECT * FROM partner_points LIMIT 10;

-- 2. Check if partner_point_transactions table exists and has data
SELECT 'Partner Point Transactions Check' as check_name;
SELECT * FROM partner_point_transactions ORDER BY created_at DESC LIMIT 10;

-- 2b. Check for duplicate pickup transactions (should be none due to unique index)
SELECT 'Duplicate reservation_pickup transactions (should be zero)' as check_name;
SELECT metadata->>'reservation_id' AS reservation_id, partner_id, COUNT(*) AS cnt
FROM partner_point_transactions
WHERE reason = 'reservation_pickup'
GROUP BY metadata->>'reservation_id', partner_id
HAVING COUNT(*) > 1;

-- 3. Check reservations with points_spent
SELECT 'Reservations with Points' as check_name;
SELECT
  id,
  customer_id,
  partner_id,
  status,
  points_spent,
  picked_up_at,
  created_at
FROM reservations
WHERE points_spent > 0
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verify the function exists
SELECT 'Function Check' as check_name;
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'partner_mark_as_picked_up'
  AND routine_schema = 'public';

-- 5. Test query: Calculate total points that SHOULD be in partner wallets
SELECT 'Expected Partner Points (from picked up reservations)' as calculation;
SELECT
  r.partner_id,
  p.business_name,
  p.user_id as partner_user_id,
  SUM(r.points_spent) as total_points_from_pickups,
  COUNT(*) as pickup_count
FROM reservations r
JOIN partners p ON p.id = r.partner_id
WHERE r.status = 'PICKED_UP'
  AND r.points_spent > 0
GROUP BY r.partner_id, p.business_name, p.user_id;

-- 6. Compare with actual partner_points balance
SELECT 'Actual Partner Points (current balance)' as calculation;
SELECT
  pp.user_id,
  p.business_name,
  pp.balance as current_balance,
  pp.offer_slots,
  pp.updated_at
FROM partner_points pp
JOIN partners p ON p.user_id = pp.user_id;

-- 8. Index presence
SELECT 'Index Presence' as check_name;
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN (
  'idx_reservations_customer_id',
  'idx_reservations_partner_status',
  'idx_reservations_expires_at',
  'uniq_reservations_qr_code',
  'uniq_ppt_pickup_per_reservation'
);

-- 7. OPTIONAL: Manual point transfer for existing PICKED_UP reservations
-- UNCOMMENT AND RUN THIS IF POINTS ARE MISSING:

-- DO $$
-- DECLARE
--   v_reservation RECORD;
--   v_partner_user_id UUID;
--   v_current_balance INT;
-- BEGIN
--   -- Loop through all PICKED_UP reservations that have points_spent
--   FOR v_reservation IN
--     SELECT r.*, p.user_id as partner_user_id
--     FROM reservations r
--     JOIN partners p ON p.id = r.partner_id
--     WHERE r.status = 'PICKED_UP'
--       AND r.points_spent > 0
--       AND r.picked_up_at IS NOT NULL
--   LOOP
--     -- Get partner's user_id
--     v_partner_user_id := v_reservation.partner_user_id;
--
--     -- Check if points already transferred (check if transaction exists)
--     IF NOT EXISTS (
--       SELECT 1 FROM partner_point_transactions
--       WHERE metadata->>'reservation_id' = v_reservation.id::text
--         AND reason = 'reservation_pickup'
--     ) THEN
--       -- Points not yet transferred, add them now
--
--       -- Get current balance
--       SELECT balance INTO v_current_balance
--       FROM partner_points
--       WHERE user_id = v_partner_user_id;
--
--       -- If no partner_points record exists, create one
--       IF v_current_balance IS NULL THEN
--         INSERT INTO partner_points (user_id, balance, offer_slots, updated_at)
--         VALUES (v_partner_user_id, v_reservation.points_spent, 3, NOW());
--
--         v_current_balance := 0;
--       ELSE
--         -- Update existing balance
--         UPDATE partner_points
--         SET balance = balance + v_reservation.points_spent,
--             updated_at = NOW()
--         WHERE user_id = v_partner_user_id;
--       END IF;
--
--       -- Log the transaction
--       INSERT INTO partner_point_transactions (
--         partner_id,
--         change,
--         reason,
--         balance_before,
--         balance_after,
--         metadata,
--         created_at
--       )
--       VALUES (
--         v_partner_user_id,
--         v_reservation.points_spent,
--         'reservation_pickup',
--         COALESCE(v_current_balance, 0),
--         COALESCE(v_current_balance, 0) + v_reservation.points_spent,
--         jsonb_build_object(
--           'reservation_id', v_reservation.id,
--           'offer_id', v_reservation.offer_id,
--           'customer_id', v_reservation.customer_id,
--           'quantity', v_reservation.quantity,
--           'picked_up_at', v_reservation.picked_up_at,
--           'backfilled', true
--         ),
--         v_reservation.picked_up_at
--       );
--
--       RAISE NOTICE 'Added % points to partner % for reservation %',
--         v_reservation.points_spent, v_partner_user_id, v_reservation.id;
--     END IF;
--   END LOOP;
-- END $$;
