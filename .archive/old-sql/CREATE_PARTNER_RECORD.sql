-- =====================================================
-- Create Partner Record Directly for User
-- =====================================================
-- This creates a partner record and approves it immediately
-- Run this in your Supabase SQL Editor

-- Create partner record for the user
INSERT INTO partners (
  user_id,
  business_name,
  business_type,
  status,
  address,
  phone,
  created_at,
  updated_at
)
SELECT 
  id,
  'Dave Business',  -- Change this to actual business name
  'RESTAURANT',     -- Change: BAKERY, CAFE, RESTAURANT, FAST_FOOD, GROCERY, ALCOHOL
  'APPROVED',
  'Tbilisi, Georgia',  -- Change to actual address
  '+995555123456',     -- Change to actual phone
  NOW(),
  NOW()
FROM users 
WHERE email = 'batumashvili.davit@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM partners WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- Verify the partner was created
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role as user_role,
  p.id as partner_id,
  p.business_name,
  p.status as partner_status,
  p.business_type
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';

-- Expected result: partner_id should have a value, partner_status = 'APPROVED'
