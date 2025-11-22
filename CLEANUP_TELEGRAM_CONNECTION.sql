-- Clean up Telegram connection for user ed0d1c67-07b7-4901-852d-7130dd5368ab
-- Run this in Supabase SQL Editor

-- First, check current status
SELECT 
  user_id,
  enable_telegram,
  telegram_chat_id,
  telegram_username,
  created_at,
  updated_at
FROM notification_preferences
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- If you see old data, reset it completely
UPDATE notification_preferences
SET 
  enable_telegram = false,
  telegram_chat_id = NULL,
  telegram_username = NULL,
  updated_at = NOW()
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- Also check if your Telegram chat_id is connected to any OTHER user
-- Replace YOUR_TELEGRAM_CHAT_ID with the actual number from Telegram
-- SELECT * FROM notification_preferences WHERE telegram_chat_id = 'YOUR_TELEGRAM_CHAT_ID';

-- If you find it connected to a deleted user, clean it up:
-- DELETE FROM notification_preferences WHERE telegram_chat_id = 'YOUR_TELEGRAM_CHAT_ID' AND user_id != 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- Verify cleanup
SELECT * FROM notification_preferences WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';
