// Test script to check FCM tokens in Firebase
// Run this in Firebase Console > Firestore > Run Query

// 1. Check if partner has FCM token:
//    Collection: fcm_tokens
//    Document ID: <partner_user_id>

// 2. Check recent reservations to verify partner_id:
SELECT 
  r.id,
  r.partner_id,
  r.customer_id,
  r.status,
  r.created_at,
  p.user_id as partner_user_id,
  p.business_name
FROM reservations r
JOIN partners p ON p.id = r.partner_id
WHERE r.status = 'ACTIVE'
ORDER BY r.created_at DESC
LIMIT 5;

// 3. Then check Firestore for FCM token using partner_user_id above
