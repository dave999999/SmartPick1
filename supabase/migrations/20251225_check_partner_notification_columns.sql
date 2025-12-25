-- Check if notification_preferences and busy_mode columns exist in partners table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners' 
  AND table_schema = 'public'
  AND column_name IN ('notification_preferences', 'busy_mode')
ORDER BY column_name;
