-- Manually insert missing cancellation records for today's cancellations
-- This backfills what the trigger should have done automatically

INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
SELECT 
  customer_id,
  id,
  updated_at
FROM reservations
WHERE customer_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND status = 'CANCELLED'
  AND updated_at >= CURRENT_DATE
ON CONFLICT (reservation_id) DO NOTHING;

-- Verify the records were inserted
SELECT 
  id,
  user_id,
  reservation_id,
  cancelled_at,
  created_at
FROM user_cancellation_tracking
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND cancelled_at >= CURRENT_DATE
ORDER BY cancelled_at DESC;

-- Test the daily count function
SELECT * FROM get_user_daily_cancellation_count('ceb0217b-26f6-445a-a8b2-3807401deca9');
