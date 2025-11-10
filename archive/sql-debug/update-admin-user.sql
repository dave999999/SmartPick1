-- Update existing user to ADMIN role
UPDATE users 
SET 
  role = 'ADMIN',
  name = 'Admin User',
  phone = '+995555000000',
  updated_at = NOW()
WHERE id = 'ca89c95b-53f2-4c3d-a8f1-158fbdc7ccac';

-- If the user doesn't exist, insert it
INSERT INTO users (id, email, name, phone, role, created_at, updated_at)
VALUES (
  'ca89c95b-53f2-4c3d-a8f1-158fbdc7ccac',
  'davitbatumashvili@gmail.com',
  'Admin User',
  '+995555000000',
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'ADMIN',
  name = 'Admin User',
  phone = '+995555000000',
  updated_at = NOW();