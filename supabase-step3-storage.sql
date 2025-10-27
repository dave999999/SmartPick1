-- ============================================================================
-- SmartPick Database Setup - STEP 3: STORAGE BUCKETS
-- ============================================================================
-- Run this ONLY AFTER Steps 1 and 2 are complete
-- Go to: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql
-- ============================================================================

-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'offer-images',
  'offer-images',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for partner images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-images',
  'partner-images',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR OFFER-IMAGES BUCKET
-- ============================================================================

DROP POLICY IF EXISTS "Public can view offer images" ON storage.objects;
CREATE POLICY "Public can view offer images" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'offer-images');

DROP POLICY IF EXISTS "Authenticated users can upload offer images" ON storage.objects;
CREATE POLICY "Authenticated users can upload offer images" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'offer-images' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update offer images" ON storage.objects;
CREATE POLICY "Users can update offer images" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'offer-images' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can delete offer images" ON storage.objects;
CREATE POLICY "Users can delete offer images" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'offer-images' 
    AND auth.role() = 'authenticated'
  );

-- ============================================================================
-- STORAGE POLICIES FOR PARTNER-IMAGES BUCKET
-- ============================================================================

DROP POLICY IF EXISTS "Public can view partner images" ON storage.objects;
CREATE POLICY "Public can view partner images" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'partner-images');

DROP POLICY IF EXISTS "Authenticated users can upload partner images" ON storage.objects;
CREATE POLICY "Authenticated users can upload partner images" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'partner-images' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update partner images" ON storage.objects;
CREATE POLICY "Users can update partner images" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'partner-images' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can delete partner images" ON storage.objects;
CREATE POLICY "Users can delete partner images" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'partner-images' 
    AND auth.role() = 'authenticated'
  );

-- ============================================================================
-- STEP 3 COMPLETE! DATABASE SETUP FINISHED!
-- ============================================================================
-- Verify storage buckets by going to:
-- https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/storage/buckets
-- 
-- You should see:
-- - offer-images (public)
-- - partner-images (public)
-- 
-- ALL DONE! Your database is ready to use!
-- Now configure Google OAuth and test the application.
-- ============================================================================