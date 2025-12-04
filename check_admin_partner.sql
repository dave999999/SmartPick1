-- Query to check partner status for davitbatumashvili@gmail.com
SELECT p.id, p.business_name, p.status, p.user_id, u.email, u.role
FROM partners p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'davitbatumashvili@gmail.com'
ORDER BY p.created_at DESC;
