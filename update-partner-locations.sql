-- ============================================================================
-- Update Partner Locations for SmartPick
-- ============================================================================
-- This script updates all partner accounts with realistic Tbilisi coordinates
-- Run this in Supabase SQL Editor after creating dummy accounts
-- ============================================================================

-- Update partners with Tbilisi neighborhood coordinates
-- Each partner gets a unique location across the city

UPDATE public.partners
SET 
  latitude = CASE business_type
    -- BAKERY partners (3 locations)
    WHEN 'BAKERY' THEN 
      CASE 
        WHEN business_name LIKE '%1%' THEN 41.6919  -- Old Tbilisi
        WHEN business_name LIKE '%2%' THEN 41.7225  -- Saburtalo
        WHEN business_name LIKE '%3%' THEN 41.6938  -- Vake
        ELSE 41.6919
      END
    -- RESTAURANT partners (3 locations)
    WHEN 'RESTAURANT' THEN
      CASE
        WHEN business_name LIKE '%4%' THEN 41.6941  -- Rustaveli Avenue
        WHEN business_name LIKE '%5%' THEN 41.7151  -- Vera
        WHEN business_name LIKE '%6%' THEN 41.6868  -- Isani
        ELSE 41.6941
      END
    -- CAFE partners (2 locations)
    WHEN 'CAFE' THEN
      CASE
        WHEN business_name LIKE '%7%' THEN 41.6938  -- Mtatsminda
        WHEN business_name LIKE '%8%' THEN 41.7225  -- Saburtalo
        ELSE 41.6938
      END
    -- GROCERY partners (2 locations)
    WHEN 'GROCERY' THEN
      CASE
        WHEN business_name LIKE '%9%' THEN 41.7580   -- Gldani
        WHEN business_name LIKE '%10%' THEN 41.6919  -- Old Tbilisi
        ELSE 41.7580
      END
    ELSE 41.7151  -- Default: Tbilisi center
  END,
  longitude = CASE business_type
    -- BAKERY partners
    WHEN 'BAKERY' THEN 
      CASE 
        WHEN business_name LIKE '%1%' THEN 44.8015  -- Old Tbilisi
        WHEN business_name LIKE '%2%' THEN 44.7514  -- Saburtalo
        WHEN business_name LIKE '%3%' THEN 44.7866  -- Vake
        ELSE 44.8015
      END
    -- RESTAURANT partners
    WHEN 'RESTAURANT' THEN
      CASE
        WHEN business_name LIKE '%4%' THEN 44.8337  -- Rustaveli Avenue
        WHEN business_name LIKE '%5%' THEN 44.7736  -- Vera
        WHEN business_name LIKE '%6%' THEN 44.8337  -- Isani
        ELSE 44.8337
      END
    -- CAFE partners
    WHEN 'CAFE' THEN
      CASE
        WHEN business_name LIKE '%7%' THEN 44.7929  -- Mtatsminda
        WHEN business_name LIKE '%8%' THEN 44.7514  -- Saburtalo
        ELSE 44.7929
      END
    -- GROCERY partners
    WHEN 'GROCERY' THEN
      CASE
        WHEN business_name LIKE '%9%' THEN 44.8015   -- Gldani
        WHEN business_name LIKE '%10%' THEN 44.8015  -- Old Tbilisi
        ELSE 44.8015
      END
    ELSE 44.8271  -- Default: Tbilisi center
  END,
  address = CASE business_type
    WHEN 'BAKERY' THEN 
      CASE 
        WHEN business_name LIKE '%1%' THEN 'Shardeni Street 12, Old Tbilisi'
        WHEN business_name LIKE '%2%' THEN 'Vazha-Pshavela Ave 45, Saburtalo'
        WHEN business_name LIKE '%3%' THEN 'Chavchavadze Ave 62, Vake'
        ELSE 'Shardeni Street 12, Old Tbilisi'
      END
    WHEN 'RESTAURANT' THEN
      CASE
        WHEN business_name LIKE '%4%' THEN 'Rustaveli Ave 23, Rustaveli'
        WHEN business_name LIKE '%5%' THEN 'Pekini Ave 18, Vera'
        WHEN business_name LIKE '%6%' THEN 'Kakheti Highway 5, Isani'
        ELSE 'Rustaveli Ave 23, Rustaveli'
      END
    WHEN 'CAFE' THEN
      CASE
        WHEN business_name LIKE '%7%' THEN 'Mtatsminda Park, Mtatsminda'
        WHEN business_name LIKE '%8%' THEN 'University Street 8, Saburtalo'
        ELSE 'Mtatsminda Park, Mtatsminda'
      END
    WHEN 'GROCERY' THEN
      CASE
        WHEN business_name LIKE '%9%' THEN 'Gldani Metro Station, Gldani'
        WHEN business_name LIKE '%10%' THEN 'Meidan Square 3, Old Tbilisi'
        ELSE 'Gldani Metro Station, Gldani'
      END
    ELSE 'Tbilisi, Georgia'
  END,
  city = 'Tbilisi'
WHERE latitude = 0 OR longitude = 0 OR latitude IS NULL OR longitude IS NULL;

-- Verify the update
SELECT 
  business_name,
  business_type,
  address,
  latitude,
  longitude,
  status
FROM public.partners
ORDER BY business_type, business_name;