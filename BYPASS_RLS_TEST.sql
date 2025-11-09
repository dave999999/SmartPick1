-- ================================================
-- BYPASS TEST: Create offer using service_role
-- ================================================
-- This bypasses RLS to prove the database schema works
-- Run this in SQL Editor (uses service_role by default)

BEGIN;

-- Create a test offer for the first partner
INSERT INTO public.offers (
  partner_id,
  title,
  description,
  category,
  images,
  original_price,
  smart_price,
  quantity_available,
  quantity_total,
  pickup_start,
  pickup_end,
  status,
  expires_at
)
SELECT 
  id,
  'BYPASS TEST - Created by SQL Editor',
  'This was created using service_role to bypass RLS',
  business_type,
  ARRAY[]::TEXT[],
  10.00,
  5.00,
  5,
  5,
  NOW(),
  NOW() + INTERVAL '2 hours',
  'ACTIVE',
  NOW() + INTERVAL '2 hours'
FROM public.partners
WHERE status = 'APPROVED'
LIMIT 1
RETURNING 
  id,
  title,
  partner_id,
  status,
  '✅ OFFER CREATED SUCCESSFULLY - Database schema is fine!' as result;

COMMIT;

-- Explanation of results:
-- If this works: RLS is the problem (frontend auth issue)
-- If this fails: Database schema problem (wrong columns, etc.)
