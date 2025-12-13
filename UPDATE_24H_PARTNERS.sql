-- Update partners that operate 24/7 to have open_24h flag set to true
-- This fixes the pickup window display showing "11:38 PM - 11:38 PM" instead of "OPEN 24/7"

-- Update Drive & Dine (operates 24/7 based on business_hours)
UPDATE partners
SET 
  open_24h = true,
  opening_time = NULL,  -- Clear these since it's 24/7
  closing_time = NULL
WHERE business_name = 'Drive & Dine';

-- Update any other partners with 24/7 hours in business_hours JSONB
-- (business_hours contains "00:00-23:59" for all days)
UPDATE partners
SET 
  open_24h = true,
  opening_time = NULL,
  closing_time = NULL
WHERE business_hours IS NOT NULL
  AND business_hours::text LIKE '%00:00-23:59%'
  AND open_24h IS NOT TRUE;

-- Verify the update
SELECT 
  id,
  business_name,
  open_24h,
  opening_time,
  closing_time,
  business_hours
FROM partners
WHERE open_24h = true;
