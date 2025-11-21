-- Check Telegram connection status for user
SELECT 
  user_id,
  enable_telegram,
  telegram_chat_id,
  telegram_username,
  created_at,
  updated_at
FROM notification_preferences
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- If you see:
-- enable_telegram: true
-- telegram_chat_id: (some number)
-- telegram_username: (your username)
-- Then the connection is working!

-- Test sending a notification
SELECT * FROM public.notification_preferences 
WHERE enable_telegram = true 
AND telegram_chat_id IS NOT NULL;
