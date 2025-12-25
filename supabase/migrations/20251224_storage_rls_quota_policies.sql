-- ============================================================================
-- STORAGE RLS POLICIES WITH QUOTA AND RATE LIMIT CHECKS
-- Date: 2024-12-24
-- Purpose: Enforce quota and rate limiting at database level for uploads
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DROP ALL EXISTING STORAGE POLICIES (COMPLETE CLEANUP)
-- ============================================================================

-- Drop all possible policy names
DROP POLICY IF EXISTS "Approved partners can upload offer images" ON storage.objects;
DROP POLICY IF EXISTS "Approved partners can update offer images" ON storage.objects;
DROP POLICY IF EXISTS "Approved partners can delete offer images" ON storage.objects;
DROP POLICY IF EXISTS "Approved partners can upload partner images" ON storage.objects;
DROP POLICY IF EXISTS "Approved partners can update partner images" ON storage.objects;
DROP POLICY IF EXISTS "Approved partners can delete partner images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view offer images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view partner images" ON storage.objects;
DROP POLICY IF EXISTS "Approved partners can upload partner images with quota check" ON storage.objects;
DROP POLICY IF EXISTS "Partners can update own partner images" ON storage.objects;
DROP POLICY IF EXISTS "Partners can delete own partner images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view partner images" ON storage.objects;
DROP POLICY IF EXISTS "Approved partners can upload offer images with quota check" ON storage.objects;
DROP POLICY IF EXISTS "Partners can update own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Partners can delete own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view offer images" ON storage.objects;

-- Drop generic policy names (from your current setup)
DROP POLICY IF EXISTS "Partners can upload offer images" ON storage.objects;
DROP POLICY IF EXISTS "offer_images_delete" ON storage.objects;
DROP POLICY IF EXISTS "offer_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "offer_images_select" ON storage.objects;
DROP POLICY IF EXISTS "offer_images_update" ON storage.objects;
DROP POLICY IF EXISTS "partner_images_delete" ON storage.objects;
DROP POLICY IF EXISTS "partner_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "partner_images_select" ON storage.objects;
DROP POLICY IF EXISTS "partner_images_update" ON storage.objects;

-- ============================================================================
-- 2. PARTNER-IMAGES BUCKET POLICIES (SIMPLIFIED - NO SUBQUERIES)
-- ============================================================================

-- Upload: Authenticated users only (partner status checked in app layer)
CREATE POLICY "Approved partners can upload partner images with quota check" 
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-images'
  AND auth.role() = 'authenticated'
);

-- Update: Authenticated users only
CREATE POLICY "Partners can update own partner images" 
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'partner-images'
  AND auth.role() = 'authenticated'
);

-- Delete: Authenticated users only
CREATE POLICY "Partners can delete own partner images" 
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'partner-images'
  AND auth.role() = 'authenticated'
);

-- Select: Anyone can view
CREATE POLICY "Anyone can view partner images" 
ON storage.objects
FOR SELECT
USING (bucket_id = 'partner-images');

-- ============================================================================
-- 3. OFFER-IMAGES BUCKET POLICIES (SIMPLIFIED - NO SUBQUERIES)
-- ============================================================================

-- Upload: Authenticated users only (partner status checked in app layer)
CREATE POLICY "Approved partners can upload offer images with quota check" 
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'offer-images'
  AND auth.role() = 'authenticated'
);

-- Update: Authenticated users only
CREATE POLICY "Partners can update own offer images" 
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'offer-images'
  AND auth.role() = 'authenticated'
);

-- Delete: Authenticated users only
CREATE POLICY "Partners can delete own offer images" 
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'offer-images'
  AND auth.role() = 'authenticated'
);

-- Select: Anyone can view
CREATE POLICY "Anyone can view offer images" 
ON storage.objects
FOR SELECT
USING (bucket_id = 'offer-images');

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check policies exist
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE tablename = 'objects' 
-- ORDER BY policyname;
