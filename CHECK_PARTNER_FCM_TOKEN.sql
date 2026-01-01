-- Check if partner has FCM token registered
-- Run this to see if the partner's device has registered for push notifications

SELECT 
  p.id as partner_id,
  p.business_name,
  p.user_id as partner_user_id,
  u.email as partner_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM fcm_tokens ft WHERE ft.user_id = p.user_id
    ) THEN '✅ HAS FCM TOKEN'
    ELSE '❌ NO FCM TOKEN'
  END as fcm_status
FROM partners p
JOIN auth.users u ON u.id = p.user_id
WHERE p.status = 'approved'
ORDER BY p.created_at DESC
LIMIT 5;
