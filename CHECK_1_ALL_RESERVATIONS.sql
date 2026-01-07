-- Check 1: What reservations exist RIGHT NOW?
SELECT 
  '1️⃣ ALL RESERVATIONS' as check_step,
  r.id,
  r.status,
  r.user_id,
  r.expires_at,
  (r.expires_at < NOW()) as is_time_expired,
  (NOW() - r.expires_at) as time_since_expiry
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 20;
