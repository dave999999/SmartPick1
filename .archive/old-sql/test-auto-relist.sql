// Test Auto-Relist Edge Function
// Run this in Supabase SQL Editor to verify the function works

-- First, let's check if we have any offers with auto_relist enabled
SELECT 
  o.id,
  o.title,
  o.auto_relist_enabled,
  o.last_relisted_at,
  o.status,
  o.created_at,
  o.pickup_end,
  p.business_name,
  p.business_hours,
  p.open_24h
FROM offers o
JOIN partners p ON p.id = o.partner_id
WHERE o.auto_relist_enabled = true
ORDER BY o.created_at DESC;

-- Check if any offers need relisting (not relisted today)
SELECT 
  o.id,
  o.title,
  o.auto_relist_enabled,
  o.last_relisted_at,
  CASE 
    WHEN o.last_relisted_at IS NULL THEN 'Never relisted'
    WHEN o.last_relisted_at::date < CURRENT_DATE THEN 'Needs relist'
    ELSE 'Already relisted today'
  END as relist_status,
  p.business_name
FROM offers o
JOIN partners p ON p.id = o.partner_id
WHERE o.auto_relist_enabled = true
AND o.status = 'ACTIVE'
ORDER BY o.last_relisted_at DESC NULLS FIRST;

-- Manually trigger a relist for testing (simulates what Edge Function does)
-- This updates ONE offer as a test
DO $$
DECLARE
  test_offer_id UUID;
  test_offer_title TEXT;
BEGIN
  -- Get first offer with auto_relist enabled
  SELECT id, title INTO test_offer_id, test_offer_title
  FROM offers
  WHERE auto_relist_enabled = true
  AND status = 'ACTIVE'
  LIMIT 1;
  
  IF test_offer_id IS NOT NULL THEN
    -- Update the offer (same logic as Edge Function)
    UPDATE offers
    SET
      last_relisted_at = NOW(),
      created_at = NOW(),
      updated_at = NOW(),
      pickup_start = NOW(),
      pickup_end = NOW() + INTERVAL '24 hours',
      expires_at = NOW() + INTERVAL '24 hours',
      status = 'ACTIVE'
    WHERE id = test_offer_id;
    
    RAISE NOTICE 'Test relist successful for: % (ID: %)', test_offer_title, test_offer_id;
    RAISE NOTICE 'New created_at: %', (SELECT created_at FROM offers WHERE id = test_offer_id);
    RAISE NOTICE 'New pickup_end: %', (SELECT pickup_end FROM offers WHERE id = test_offer_id);
  ELSE
    RAISE NOTICE 'No offers found with auto_relist enabled';
  END IF;
END $$;

-- Verify the update worked
SELECT 
  id,
  title,
  created_at as new_created_at,
  pickup_end as new_pickup_end,
  last_relisted_at,
  status
FROM offers
WHERE auto_relist_enabled = true
ORDER BY last_relisted_at DESC NULLS LAST
LIMIT 5;
