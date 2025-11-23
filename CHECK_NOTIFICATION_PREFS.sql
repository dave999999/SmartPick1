-- Check notification_preferences for this specific partner
SELECT 
  np.user_id,
  p.email,
  np.telegram_chat_id,
  np.telegram_username,
  np.enable_telegram,
  np.updated_at,
  CASE 
    WHEN np.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ Valid UUID'
    ELSE '❌ Invalid'
  END as user_id_status
FROM notification_preferences np
LEFT JOIN partners p ON p.user_id = np.user_id
WHERE p.email = 'batumashvili.davit@gmail.com';

-- Also check if there's a orphaned notification_preferences record
SELECT *
FROM notification_preferences
WHERE user_id::text LIKE '%@%'
   OR user_id::text NOT LIKE '%-%-%-%-%';
