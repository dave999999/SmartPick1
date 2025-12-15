-- FIX: Enable Telegram for users who have chat_id but enable_telegram is false
-- This fixes the bug where webhook saved chat_id but enable_telegram stayed false

UPDATE notification_preferences
SET 
  enable_telegram = true,
  updated_at = NOW()
WHERE 
  telegram_chat_id IS NOT NULL 
  AND telegram_chat_id != ''
  AND enable_telegram = false;

-- Verify the fix
SELECT 
  user_id,
  enable_telegram,
  telegram_chat_id,
  telegram_username,
  updated_at
FROM notification_preferences
WHERE telegram_chat_id IS NOT NULL
ORDER BY updated_at DESC;

-- Expected result: All rows with telegram_chat_id should now have enable_telegram = true
