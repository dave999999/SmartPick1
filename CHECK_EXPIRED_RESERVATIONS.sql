-- Check expired reservations for davitbatumashvili@gmail.com

-- 1. Find the user
SELECT id, email, penalty_count
FROM users
WHERE email = 'davitbatumashvili@gmail.com';

-- 2. Check their active reservations
SELECT 
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  CASE
    WHEN r.expires_at < NOW() THEN 'EXPIRED (needs update)'
    ELSE 'STILL VALID'
  END as actual_status,
  EXTRACT(EPOCH FROM (NOW() - r.expires_at))/60 as minutes_since_expired,
  o.title as offer_title,
  p.business_name as partner_name
FROM reservations r
JOIN offers o ON o.id = r.offer_id
JOIN partners p ON p.id = o.partner_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC;

-- 3. Check ALL reservations for this user
SELECT 
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  CASE
    WHEN r.status = 'ACTIVE' AND r.expires_at < NOW() THEN '⚠️ SHOULD BE EXPIRED'
    ELSE '✅ OK'
  END as status_check,
  o.title as offer_title
FROM reservations r
JOIN offers o ON o.id = r.offer_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
ORDER BY r.created_at DESC
LIMIT 20;

-- 4. Run auto-expire function manually to fix any stuck reservations
SELECT * FROM auto_expire_failed_pickups();

-- 5. Verify the reservations were updated
SELECT 
  r.id,
  r.status,
  r.expires_at,
  CASE
    WHEN r.expires_at < NOW() THEN 'EXPIRED'
    ELSE 'VALID'
  END as time_status
FROM reservations r
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND r.status = 'ACTIVE';
