-- Refresh ALL 63 offers - Make them all live now
-- This preserves each offer's original duration

-- Update all offers with preserved durations
UPDATE offers
SET 
  status = 'ACTIVE',
  quantity_available = quantity_total,
  created_at = NOW(),
  updated_at = NOW(),
  pickup_start = NOW(),
  -- Calculate new pickup_end by preserving original duration
  pickup_end = NOW() + (
    COALESCE(pickup_end, expires_at) - COALESCE(pickup_start, created_at)
  ),
  -- Calculate new expires_at by preserving original duration
  expires_at = NOW() + (
    COALESCE(pickup_end, expires_at) - COALESCE(pickup_start, created_at)
  )
WHERE 
  status IN ('ACTIVE', 'PAUSED', 'EXPIRED')  -- Only active/paused/expired offers
  AND quantity_total > 0;                     -- Only offers with inventory

-- Verify the update
SELECT 
  COUNT(*) as total_refreshed,
  COUNT(CASE WHEN pickup_end > NOW() THEN 1 END) as now_visible,
  COUNT(CASE WHEN pickup_end <= NOW() THEN 1 END) as still_expired
FROM offers
WHERE status = 'ACTIVE';

-- Show sample of refreshed offers
SELECT 
  p.business_name,
  o.title,
  o.status,
  EXTRACT(EPOCH FROM (o.pickup_end - o.pickup_start)) / 86400 as duration_days,
  EXTRACT(EPOCH FROM (o.pickup_end - NOW())) / 3600 as hours_left,
  CASE 
    WHEN o.pickup_end > NOW() AND o.expires_at > NOW() AND o.status = 'ACTIVE' 
    THEN '✅ VISIBLE' 
    ELSE '❌ HIDDEN' 
  END as visibility
FROM offers o
JOIN partners p ON p.id = o.partner_id
WHERE o.status = 'ACTIVE'
ORDER BY o.created_at DESC
LIMIT 20;
