-- Diagnostic script to check refresh issue with offers

-- 1. Check what pickup_end values we have
SELECT 
  id,
  title,
  status,
  created_at,
  pickup_start,
  pickup_end,
  expires_at,
  NOW() as current_time,
  CASE 
    WHEN pickup_end <= NOW() THEN '❌ EXPIRED'
    ELSE '✅ VALID'
  END as pickup_status
FROM offers
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if there are any triggers on the offers table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'offers';

-- 3. Manually test the update to see if it works
-- First, let's see if we can update a specific offer
-- Replace 'YOUR_OFFER_ID' with an actual offer ID from above query

-- SELECT id FROM offers WHERE status = 'ACTIVE' LIMIT 1;

-- Then manually run this update (uncomment and replace the ID):
/*
UPDATE offers
SET 
  pickup_start = NOW(),
  pickup_end = NOW() + INTERVAL '24 hours',
  expires_at = NOW() + INTERVAL '24 hours',
  updated_at = NOW()
WHERE id = 'YOUR_OFFER_ID'
RETURNING id, pickup_start, pickup_end, expires_at;
*/

-- 4. Check RLS policies that might be blocking updates
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'offers';
