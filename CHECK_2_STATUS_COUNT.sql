-- Check 2: Count by status
SELECT 
  '2️⃣ STATUS BREAKDOWN' as check_step,
  status,
  COUNT(*) as count
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
GROUP BY status
ORDER BY count DESC;
