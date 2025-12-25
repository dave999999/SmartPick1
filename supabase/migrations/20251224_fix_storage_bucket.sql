-- Fix storage bucket configuration
-- The issue is that files are being stored with wrong MIME type despite correct upload

-- 1. Update bucket to be fully public with correct settings
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 2097152,  -- 2MB
  allowed_mime_types = NULL  -- Remove restrictions, we validate in app
WHERE id = 'partner-images';

-- 2. Verify bucket settings
SELECT id, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'partner-images';
