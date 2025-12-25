-- Check ემზარას საცხობი partner settings
SELECT 
  id,
  business_name,
  open_24h,
  business_hours,
  business_hours->>'is_24_7' as is_24_7_from_json,
  business_hours->>'open' as open_time,
  business_hours->>'close' as close_time
FROM partners 
WHERE business_name LIKE '%ემზარას საცხობი%';

-- ✅ FIX: Set partner to 24-hour business
UPDATE partners 
SET 
  open_24h = true,
  business_hours = jsonb_build_object(
    'is_24_7', true,
    'open', '00:00',
    'close', '23:59'
  )
WHERE business_name LIKE '%ემზარას საცხობი%'
RETURNING 
  business_name, 
  open_24h, 
  business_hours;

-- ✅ Delete old test offers (they have wrong expiration timestamps)
DELETE FROM offers 
WHERE partner_id = (SELECT id FROM partners WHERE business_name LIKE '%ემზარას საცხობი%')
AND created_at > NOW() - INTERVAL '2 hours'
RETURNING id, title, expires_at;

-- Now create a NEW offer and it should show correct duration!
