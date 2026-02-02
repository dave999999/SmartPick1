-- Set davitbatumashvili@gmail.com as ADMIN
UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'davitbatumashvili@gmail.com';

-- Verify the update
SELECT id, email, name, role, created_at 
FROM users 
WHERE email = 'davitbatumashvili@gmail.com';
