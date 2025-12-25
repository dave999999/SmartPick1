-- Test cancellation count for current user
SELECT * FROM get_user_consecutive_cancellations('de2cd1af-be7f-4b32-8e59-ea3b00c0c72a');

-- Check user_cancellation_tracking
SELECT * FROM user_cancellation_tracking 
WHERE user_id = 'de2cd1af-be7f-4b32-8e59-ea3b00c0c72a'
ORDER BY cancelled_at DESC;

-- Count recent cancellations manually
SELECT COUNT(*) as manual_count
FROM user_cancellation_tracking
WHERE user_id = 'de2cd1af-be7f-4b32-8e59-ea3b00c0c72a'
  AND cancelled_at > NOW() - INTERVAL '45 minutes';
