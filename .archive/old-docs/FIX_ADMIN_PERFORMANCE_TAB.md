# FIX: Admin Dashboard Performance Tab 404 Error

## Problem
Admin Dashboard Performance tab shows error:
```
POST https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/rpc/get_offers_in_viewport 404 (Not Found)
```

## Root Cause
The `get_offers_in_viewport` RPC function doesn't exist in production database.
The Performance Monitoring Panel calls this function to check database health.

## Solution
Apply the missing database function.

---

## STEP 1: Run SQL Script in Supabase

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm
   - Navigate to: **SQL Editor**

2. **Copy and paste this SQL:**

```sql
-- =====================================================
-- CREATE get_offers_in_viewport RPC Function
-- =====================================================

-- Ensure PostGIS extension is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create the viewport function
CREATE OR REPLACE FUNCTION get_offers_in_viewport(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title varchar(255),
  description varchar(1000),
  original_price numeric,
  discounted_price numeric,
  discount_percentage numeric,
  quantity_available integer,
  category varchar(100),
  tags text[],
  status varchar(50),
  pickup_start timestamptz,
  pickup_end timestamptz,
  partner_id uuid,
  partner_name varchar(255),
  partner_address varchar(500),
  partner_phone varchar(50),
  partner_business_type varchar(100),
  partner_location geometry
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.title,
    o.description,
    o.original_price,
    o.discounted_price,
    o.discount_percentage,
    o.quantity_available,
    o.category,
    o.tags,
    o.status,
    o.pickup_start,
    o.pickup_end,
    o.partner_id,
    p.name as partner_name,
    p.address as partner_address,
    p.phone as partner_phone,
    p.business_type as partner_business_type,
    CASE 
      WHEN p.location IS NOT NULL THEN p.location::geometry
      WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN 
        ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geometry
      ELSE NULL
    END as partner_location
  FROM offers o
  INNER JOIN partners p ON o.partner_id = p.id
  WHERE o.status = 'ACTIVE'
    AND o.quantity_available > 0
    AND o.expires_at > NOW()
    AND (
      -- Use spatial index if location column exists
      (p.location IS NOT NULL AND ST_Intersects(
        p.location::geometry,
        ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
      ))
      OR
      -- Fallback to lat/lng columns
      (p.location IS NULL AND 
       p.latitude BETWEEN p_min_lat AND p_max_lat AND
       p.longitude BETWEEN p_min_lng AND p_max_lng)
    )
    AND (p_category IS NULL OR o.category = p_category)
  ORDER BY o.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO anon;

-- Test the function
SELECT COUNT(*) as offer_count
FROM get_offers_in_viewport(40.0, 43.0, 42.0, 45.0, NULL, 100);
```

3. **Click "Run"**

4. **Verify Success**
   - You should see a result showing the offer count
   - No errors should appear

---

## STEP 2: Verify Fix

1. **Reload Admin Dashboard**
   - Go to Admin Dashboard
   - Click on **Performance** tab
   - Wait a few seconds

2. **Expected Result**
   - ✅ No 404 errors in console
   - ✅ Performance metrics display
   - ✅ Database health check shows "Healthy"
   - ✅ Response time metrics appear

---

## What This Function Does

- **Purpose:** Returns active offers within a geographic viewport (bounding box)
- **Used by:** 
  - Performance Monitoring Panel (health checks)
  - Map-based offer filtering
  - Admin dashboard analytics
- **Performance:** Uses spatial indexing for fast geographic queries

---

## Files Involved

- `src/lib/monitoring/performance.ts` - Calls this function for health checks
- `src/components/admin/PerformanceMonitoringPanel.tsx` - Displays the metrics
- `src/lib/api/offers.ts` - Uses this for map viewport filtering

---

## Alternative: Disable Performance Tab (Not Recommended)

If you don't want to apply the SQL, you can temporarily comment out the performance tab, but you'll lose monitoring capabilities.
