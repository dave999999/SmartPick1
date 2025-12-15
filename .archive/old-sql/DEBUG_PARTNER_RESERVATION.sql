-- Debug: Why can't a partner user read their own reservation?
-- Run this while authenticated as the partner user

-- 1. Check who you are
SELECT 
  auth.uid() as my_user_id,
  auth.jwt() ->> 'email' as my_email;

-- 2. Check if you have a partner record
SELECT id, business_name, user_id, status
FROM partners
WHERE user_id = auth.uid();

-- 3. Try to find your most recent reservation
SELECT 
  r.id,
  r.customer_id,
  r.partner_id,
  r.status,
  r.created_at,
  (r.customer_id = auth.uid()) as "I am the customer",
  EXISTS(
    SELECT 1 FROM partners p 
    WHERE p.id = r.partner_id 
    AND p.user_id = auth.uid()
  ) as "I own this partner"
FROM reservations r
WHERE r.customer_id = auth.uid()
   OR EXISTS(
     SELECT 1 FROM partners p 
     WHERE p.id = r.partner_id 
     AND p.user_id = auth.uid()
   )
ORDER BY r.created_at DESC
LIMIT 5;

-- 4. Check RLS policies on reservations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'reservations'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 5. Test: Can you see ALL your reservations as a customer?
SELECT COUNT(*) as my_customer_reservations
FROM reservations
WHERE customer_id = auth.uid();

-- 6. Test: Can you see reservations for your partner's offers?
SELECT COUNT(*) as my_partner_reservations
FROM reservations r
WHERE EXISTS(
  SELECT 1 FROM partners p 
  WHERE p.id = r.partner_id 
  AND p.user_id = auth.uid()
);
