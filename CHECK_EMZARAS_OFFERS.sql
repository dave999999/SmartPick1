-- Deep analysis of ემზარას საცხობი offers
-- This will help us understand why only 1 offer appears instead of 2

-- 1. Get partner details
SELECT 
  id,
  business_name,
  status,
  open_24h,
  user_id
FROM partners 
WHERE business_name LIKE '%ემზარას საცხობი%';

-- 2. Get ALL offers for this partner (no filters)
SELECT 
  id,
  title,
  status,
  quantity_available,
  quantity_total,
  created_at,
  updated_at,
  pickup_start,
  pickup_end,
  expires_at,
  -- Calculate effective status
  CASE 
    WHEN expires_at < NOW() THEN '❌ EXPIRED (expires_at < NOW)'
    WHEN pickup_end < NOW() THEN '❌ EXPIRED (pickup_end < NOW)'
    WHEN quantity_available <= 0 THEN '🚫 SOLD_OUT'
    WHEN status != 'ACTIVE' THEN '⏸️ ' || status
    ELSE '✅ ACTIVE'
  END as effective_display_status,
  -- Time calculations
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_until_expiry,
  EXTRACT(EPOCH FROM (pickup_end - NOW())) / 3600 as hours_until_pickup_end,
  -- Check if it should appear on map
  CASE 
    WHEN status = 'ACTIVE' 
         AND quantity_available > 0 
         AND expires_at > NOW() 
         AND pickup_end > NOW() 
    THEN '✅ YES - Will appear on map'
    ELSE '❌ NO - Filtered out'
  END as will_appear_on_map,
  -- Why it won't appear
  CASE 
    WHEN status != 'ACTIVE' THEN 'Status is ' || status
    WHEN quantity_available <= 0 THEN 'No quantity available'
    WHEN expires_at <= NOW() THEN 'Expired (expires_at in past)'
    WHEN pickup_end <= NOW() THEN 'Pickup window ended'
    ELSE 'OK'
  END as reason_hidden
FROM offers
WHERE partner_id = (SELECT id FROM partners WHERE business_name LIKE '%ემზარას საცხობი%')
ORDER BY created_at DESC;

-- 3. Count offers by effective status
SELECT 
  CASE 
    WHEN status = 'ACTIVE' 
         AND quantity_available > 0 
         AND expires_at > NOW() 
         AND pickup_end > NOW() 
    THEN 'Visible (Active & Valid)'
    WHEN expires_at <= NOW() THEN 'Hidden (Expired - expires_at)'
    WHEN pickup_end <= NOW() THEN 'Hidden (Expired - pickup_end)'
    WHEN quantity_available <= 0 THEN 'Hidden (Sold Out)'
    WHEN status != 'ACTIVE' THEN 'Hidden (Status: ' || status || ')'
    ELSE 'Hidden (Other)'
  END as category,
  COUNT(*) as count
FROM offers
WHERE partner_id = (SELECT id FROM partners WHERE business_name LIKE '%ემზარას საცხობი%')
GROUP BY category
ORDER BY count DESC;
