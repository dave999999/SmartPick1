-- Fix the hidden offer by refreshing with ORIGINAL DURATION preserved
-- This will make "qwsdasdas" offer visible again on the map

-- First, let's check the original duration
-- Original: Created 12/25, Expires 12/31 = approximately 6 days
-- We'll restore it to the intended 6-day duration

UPDATE offers 
SET 
  status = 'ACTIVE',
  quantity_available = quantity_total,
  created_at = NOW(),
  updated_at = NOW(),
  pickup_start = NOW(),
  pickup_end = NOW() + INTERVAL '6 days',      -- Restore original 6-day duration
  expires_at = NOW() + INTERVAL '6 days'        -- Restore original 6-day duration
WHERE id = '97345e30-d79a-4309-ab78-9e300f998729';

-- Verify the fix
SELECT 
  id,
  title,
  status,
  pickup_start,
  pickup_end,
  expires_at,
  EXTRACT(EPOCH FROM (pickup_end - NOW())) / 3600 as hours_until_pickup_end,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_until_expiry,
  CASE 
    WHEN status = 'ACTIVE' 
         AND quantity_available > 0 
         AND expires_at > NOW() 
         AND pickup_end > NOW() 
    THEN '✅ Will appear on map'
    ELSE '❌ Still hidden'
  END as visibility_status
FROM offers
WHERE partner_id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
ORDER BY created_at DESC;
