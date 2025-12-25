-- Check which cancellation tracking system is active

-- Check if user_cancellation_tracking table exists and has data
SELECT 'user_cancellation_tracking table' AS check_name, 
       COUNT(*) AS record_count,
       MAX(cancelled_at) AS last_cancellation
FROM user_cancellation_tracking;

-- Check if user_reliability table exists and has data
SELECT 'user_reliability table' AS check_name, 
       COUNT(*) AS record_count,
       MAX(updated_at) AS last_update,
       SUM(consecutive_cancels) AS total_cancels
FROM user_reliability;

-- Check if track_reservation_cancellation trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND event_object_table = 'reservations'
  AND trigger_name LIKE '%cancel%';

-- Check get_user_consecutive_cancellations function signature
SELECT routine_name, 
       data_type AS return_type,
       routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%consecutive_cancel%';

-- Test: Get cancellation count for test user
SELECT get_user_consecutive_cancellations('de2cd1af-be7f-4b32-8e59-ea3b00c0c72a');
