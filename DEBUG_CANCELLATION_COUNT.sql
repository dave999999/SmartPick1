-- Debug: Check what's actually happening with the cancellation count

-- 1. Check current date/time in database
SELECT 
  CURRENT_DATE as current_date,
  NOW() as now,
  NOW() AT TIME ZONE 'UTC' as now_utc;

-- 2. Check cancellation records for this user
SELECT 
  id,
  cancelled_at,
  cancelled_at >= CURRENT_DATE as counts_as_today,
  EXTRACT(EPOCH FROM (NOW() - cancelled_at))/3600 as hours_ago,
  reset_count
FROM user_cancellation_tracking
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
ORDER BY cancelled_at DESC
LIMIT 10;

-- 3. Check what is_user_in_cooldown returns
SELECT * FROM is_user_in_cooldown('ceb0217b-26f6-445a-a8b2-3807401deca9');

-- 4. Count today's cancellations
SELECT COUNT(*) as todays_cancellation_count
FROM user_cancellation_tracking
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND cancelled_at >= CURRENT_DATE;
