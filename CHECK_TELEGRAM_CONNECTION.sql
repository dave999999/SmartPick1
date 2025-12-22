-- Quick check: Did the Telegram connection save successfully?

-- 1. Check if connection exists
SELECT 
  '✅ Connection Status' as check,
  np.user_id,
  np.telegram_chat_id,
  np.telegram_username,
  np.enable_telegram,
  np.created_at,
  np.updated_at,
  p.business_name,
  p.email
FROM notification_preferences np
JOIN partners p ON p.user_id = np.user_id
WHERE np.telegram_chat_id = '1647005461'  -- Your Telegram chat ID
   OR p.id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- 2. If no connection found, check why
SELECT 
  '🔍 Troubleshooting' as info,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM notification_preferences WHERE telegram_chat_id = '1647005461')
    THEN '❌ No connection found - webhook might have failed silently'
    
    WHEN EXISTS (SELECT 1 FROM notification_preferences WHERE telegram_chat_id = '1647005461' AND enable_telegram = false)
    THEN '⚠️ Connection exists but enable_telegram is FALSE'
    
    ELSE '✅ Connection exists and is enabled'
  END as diagnosis;

-- 3. Show what the partner dashboard will see
SELECT 
  'What Partner Dashboard Sees' as info,
  p.id as partner_id,
  p.user_id,
  CASE 
    WHEN p.user_id IS NULL THEN '❌ user_id is NULL - dashboard will fail'
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id) THEN '❌ user_id invalid'
    WHEN NOT EXISTS (SELECT 1 FROM notification_preferences WHERE user_id = p.user_id) THEN '⚠️ No Telegram connection yet'
    WHEN EXISTS (SELECT 1 FROM notification_preferences WHERE user_id = p.user_id AND telegram_chat_id IS NOT NULL) THEN '✅ Telegram connected!'
    ELSE '⚠️ Connection exists but no chat_id'
  END as telegram_status
FROM partners p
WHERE p.id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';
