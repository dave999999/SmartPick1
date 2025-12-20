-- DIAGNOSTIC: Find and optionally fix expired offers
-- Run this in Supabase SQL Editor

-- PART 1: See the problem
SELECT 
  o.id,
  o.title,
  o.status,
  o.quantity_available,
  p.business_name as partner,
  o.pickup_end,
  o.expires_at,
  NOW() as current_time,
  CASE 
    WHEN o.pickup_end IS NOT NULL AND o.pickup_end <= NOW() THEN '❌ EXPIRED PICKUP'
    WHEN o.expires_at <= NOW() THEN '❌ EXPIRED OFFER'
    WHEN o.quantity_available <= 0 THEN '❌ SOLD OUT'
    ELSE '✅ VALID'
  END as diagnosis
FROM offers o
LEFT JOIN partners p ON o.partner_id = p.id
WHERE o.status = 'ACTIVE'
ORDER BY 
  CASE 
    WHEN o.pickup_end IS NOT NULL AND o.pickup_end <= NOW() THEN 1
    WHEN o.expires_at <= NOW() THEN 2
    ELSE 3
  END,
  o.pickup_end ASC NULLS LAST
LIMIT 50;

-- PART 2: Count the problem
SELECT 
  COUNT(*) as total_active_offers,
  COUNT(*) FILTER (WHERE pickup_end IS NOT NULL AND pickup_end <= NOW()) as expired_pickup_count,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_offer_count,
  COUNT(*) FILTER (WHERE quantity_available <= 0) as sold_out_count,
  COUNT(*) FILTER (
    WHERE pickup_end > NOW() 
    AND expires_at > NOW() 
    AND quantity_available > 0
  ) as actually_valid_count
FROM offers
WHERE status = 'ACTIVE';

-- PART 3: (OPTIONAL) Auto-expire offers with ended pickup windows
-- Uncomment the lines below to automatically mark them as EXPIRED

/*
UPDATE offers
SET 
  status = 'EXPIRED',
  updated_at = NOW()
WHERE status = 'ACTIVE'
  AND pickup_end IS NOT NULL 
  AND pickup_end <= NOW();

-- Show how many were updated
SELECT 
  'Expired ' || COUNT(*) || ' offers with ended pickup windows' as result
FROM offers
WHERE status = 'EXPIRED'
  AND updated_at > NOW() - INTERVAL '1 minute';
*/

-- PART 4: Verify the viewport function has the fix
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) LIKE '%pickup_end > NOW()%' as has_pickup_end_check,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%pickup_end > NOW()%' THEN '✅ Fixed'
    ELSE '❌ Not Fixed - Run APPLY_FIX_EXPIRED_OFFERS.sql'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_offers_in_viewport'
  AND n.nspname = 'public';
