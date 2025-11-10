-- Run this in Supabase SQL Editor to debug the accounts

-- 1. Check all users
SELECT id, email, role FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 2. Check partners table
SELECT id, user_id, business_name FROM partners;

-- 3. Check reservations with their partner info
SELECT 
  r.id,
  r.status,
  r.partner_id,
  p.business_name as partner_name,
  p.user_id as partner_user_id,
  u.email as customer_email
FROM reservations r
LEFT JOIN partners p ON r.partner_id = p.id
LEFT JOIN auth.users u ON r.customer_id = u.id
WHERE r.status = 'ACTIVE'
ORDER BY r.created_at DESC
LIMIT 5;

-- This will show you:
-- - Which email is the partner
-- - Which partner_id owns the reservation
-- - Make sure they match
