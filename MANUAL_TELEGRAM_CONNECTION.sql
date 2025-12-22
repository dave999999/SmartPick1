-- MANUAL FIX: Bypass Telegram webhook and directly save connection

-- 1. Delete any existing connection for this user
DELETE FROM notification_preferences 
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9';

-- 2. Insert fresh connection with correct data
INSERT INTO notification_preferences (
  user_id, 
  telegram_chat_id, 
  telegram_username, 
  enable_telegram,
  created_at,
  updated_at
)
VALUES (
  'ceb0217b-26f6-445a-a8b2-3807401deca9',  -- Correct user_id
  '1647005461',                             -- Your Telegram chat ID
  'McWootson',                              -- Your Telegram username
  true,
  NOW(),
  NOW()
);

-- 3. Verify the connection
SELECT 
  '✅ MANUALLY CONNECTED!' as status,
  np.user_id,
  np.telegram_chat_id,
  np.telegram_username,
  np.enable_telegram,
  p.business_name,
  p.email,
  'Connection is now active in database!' as message
FROM notification_preferences np
JOIN partners p ON p.user_id = np.user_id
WHERE np.user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9';

-- 4. Test notification (simulate what would be sent)
SELECT 
  '📱 Test Notification' as test,
  'User: ' || p.business_name as recipient,
  'Chat ID: ' || np.telegram_chat_id as target,
  'Status: ' || CASE WHEN np.enable_telegram THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as notification_status
FROM notification_preferences np
JOIN partners p ON p.user_id = np.user_id
WHERE np.user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9';
