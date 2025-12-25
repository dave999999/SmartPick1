-- Reset today's cancellation count to 0
DELETE FROM user_cancellation_tracking
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND cancelled_at >= CURRENT_DATE;

-- Verify it's cleared
SELECT COUNT(*) as todays_cancellations
FROM user_cancellation_tracking
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND cancelled_at >= CURRENT_DATE;

-- Test the function shows 0
SELECT * FROM get_user_daily_cancellation_count('ceb0217b-26f6-445a-a8b2-3807401deca9');
