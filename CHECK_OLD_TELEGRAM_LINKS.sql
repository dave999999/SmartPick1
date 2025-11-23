-- Check for any notification preferences that might have old data
SELECT 
  np.user_id,
  u.email,
  np.telegram_chat_id,
  np.telegram_username,
  np.enable_telegram,
  np.updated_at
FROM notification_preferences np
LEFT JOIN auth.users u ON u.id = np.user_id
WHERE np.telegram_chat_id IS NOT NULL
ORDER BY np.updated_at DESC;

-- Check if there are any partners with the specific email
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.status,
  np.telegram_chat_id,
  np.telegram_username,
  np.enable_telegram
FROM partners p
LEFT JOIN notification_preferences np ON np.user_id = p.user_id
WHERE p.email = 'batumashvili.davit@gmail.com';
