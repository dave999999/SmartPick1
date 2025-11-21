-- EMERGENCY: Fix relisted offers showing as expired
-- This will update ALL active offers to have 24-hour pickup windows

-- First, let's see what we have
SELECT 
  id,
  title,
  partner_id,
  status,
  created_at,
  pickup_start,
  pickup_end,
  NOW() as current_time,
  CASE 
    WHEN pickup_end <= NOW() THEN '❌ EXPIRED - NEEDS FIX'
    ELSE '✅ VALID'
  END as pickup_status,
  pickup_end - NOW() as time_remaining
FROM offers
WHERE status = 'ACTIVE'
ORDER BY created_at DESC;

-- Now fix ALL active offers to have 24-hour pickup windows
UPDATE offers
SET 
  pickup_start = GREATEST(pickup_start, NOW()), -- Don't go backwards in time
  pickup_end = NOW() + INTERVAL '24 hours',
  expires_at = NOW() + INTERVAL '24 hours',
  updated_at = NOW()
WHERE status = 'ACTIVE'
  AND pickup_end <= NOW(); -- Only update expired ones

-- Verify the fix
SELECT 
  COUNT(*) as total_active_offers,
  COUNT(CASE WHEN pickup_end > NOW() THEN 1 END) as valid_offers,
  COUNT(CASE WHEN pickup_end <= NOW() THEN 1 END) as expired_offers
FROM offers
WHERE status = 'ACTIVE';

-- Show updated offers
SELECT 
  id,
  title,
  pickup_start,
  pickup_end,
  pickup_end - NOW() as time_remaining,
  '✅ FIXED - Available for 24h' as status
FROM offers
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 10;
