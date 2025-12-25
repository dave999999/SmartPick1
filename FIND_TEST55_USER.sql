-- Find the ACTUAL logged-in user (test55) and update their balance

-- 1. Find test55 user
SELECT 
  id,
  email,
  username,
  full_name
FROM users
WHERE username = 'test55' OR email LIKE '%test55%' OR full_name LIKE '%test55%'
LIMIT 5;

-- If that doesn't work, find by the partner business name
SELECT 
  u.id,
  u.email,
  u.username,
  p.business_name
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE p.business_name LIKE '%test55%' OR u.username = 'test55'
LIMIT 5;
