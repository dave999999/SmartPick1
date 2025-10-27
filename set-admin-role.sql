-- Set admin@smartpick.ge as ADMIN
UPDATE users 
SET 
  role = 'ADMIN',
  updated_at = NOW()
WHERE email = 'admin@smartpick.ge';

-- Verify the update
SELECT id, email, name, role, created_at 
FROM users 
WHERE email = 'admin@smartpick.ge';