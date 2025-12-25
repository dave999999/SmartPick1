# 🚀 Quick Setup Guide - Image Upload Security System

## Step 1: Apply Database Migrations

Run these migrations in order in your Supabase SQL editor:

### Migration 1: Security System Setup
```bash
# File: supabase/migrations/20251224_partner_image_security.sql
```

This creates:
- `image_quota_used` and `image_quota_max` columns on partners table
- `partner_upload_log` table for audit trail
- `security_alerts` table for monitoring
- Helper functions for quota management and rate limiting
- Automated security monitoring triggers
- Updates storage bucket limits to 2MB

### Migration 2: Storage RLS Policies
```bash
# File: supabase/migrations/20251224_storage_rls_quota_policies.sql
```

This creates:
- Enhanced RLS policies with quota checks
- Rate limiting at database level
- Owner-only upload/delete permissions
- Public read access for offer images

## Step 2: Verify Setup

Run these verification queries in Supabase SQL editor:

```sql
-- 1. Check partner quota columns
SELECT id, business_name, image_quota_used, image_quota_max 
FROM partners 
LIMIT 5;

-- 2. Check functions exist
SELECT proname FROM pg_proc 
WHERE proname LIKE '%quota%' OR proname LIKE '%upload%'
ORDER BY proname;

-- 3. Check storage bucket limits
SELECT id, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('offer-images', 'partner-images');

-- 4. Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
ORDER BY policyname;

-- 5. Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('partner_upload_log', 'security_alerts');
```

Expected results:
- ✅ All partners have `image_quota_used = 0` and `image_quota_max = 15`
- ✅ 6+ functions with names like `check_upload_quota`, `increment_image_quota`, etc.
- ✅ Both buckets show `file_size_limit = 2097152` (2MB)
- ✅ Storage policies include "with quota check" in names
- ✅ Both new tables exist

## Step 3: Test Upload Flow

### As a Partner:
1. Login to partner dashboard
2. Navigate to "Images" or "Gallery" section
3. Click "Upload" button
4. Select an image (< 2MB, JPEG/PNG/WebP)
5. Upload should succeed
6. Check quota display shows "1/15 images"
7. Delete the image
8. Check quota returns to "0/15 images"

### Test Security Features:
```typescript
// Test 1: File too large
// Upload a 3MB image → Should show error: "File too large. Maximum 2MB allowed."

// Test 2: Wrong file type
// Try uploading a .txt file → Should show error: "Invalid file type"

// Test 3: Quota limit
// Upload 15 images → 16th should fail with quota error

// Test 4: Rate limiting
// Upload 11 images rapidly → Should hit rate limit after 10th
```

## Step 4: Admin Monitoring

### View Upload Activity:
```sql
-- Recent uploads
SELECT 
  p.business_name,
  ul.file_name,
  ul.file_size,
  ul.success,
  ul.error_message,
  ul.uploaded_at
FROM partner_upload_log ul
JOIN partners p ON p.id = ul.partner_id
ORDER BY ul.uploaded_at DESC
LIMIT 20;
```

### View Security Alerts:
```sql
-- Active security alerts
SELECT 
  p.business_name,
  sa.alert_type,
  sa.description,
  sa.severity,
  sa.created_at
FROM security_alerts sa
LEFT JOIN partners p ON p.id = sa.partner_id
WHERE sa.resolved = false
ORDER BY sa.created_at DESC;
```

### Partner Upload Statistics:
```sql
-- Partner upload stats
SELECT 
  p.business_name,
  p.image_quota_used,
  p.image_quota_max,
  COUNT(ul.id) as total_uploads,
  SUM(CASE WHEN ul.success THEN 1 ELSE 0 END) as successful_uploads,
  SUM(CASE WHEN NOT ul.success THEN 1 ELSE 0 END) as failed_uploads
FROM partners p
LEFT JOIN partner_upload_log ul ON ul.partner_id = p.id
WHERE p.status = 'APPROVED'
GROUP BY p.id, p.business_name, p.image_quota_used, p.image_quota_max
ORDER BY total_uploads DESC;
```

## Step 5: Admin Operations

### Increase Partner Quota (Premium Partners):
```sql
-- Give specific partner 50 images
UPDATE partners 
SET image_quota_max = 50 
WHERE business_name = 'Premium Restaurant';

-- Or by partner ID
UPDATE partners 
SET image_quota_max = 50 
WHERE id = 'partner-uuid-here';
```

### Reset Partner Quota (If needed):
```sql
-- Reset quota to 0 (delete their images first!)
UPDATE partners 
SET image_quota_used = 0 
WHERE id = 'partner-uuid-here';
```

### Clear Old Logs (Maintenance):
```sql
-- Delete logs older than 90 days
DELETE FROM partner_upload_log 
WHERE uploaded_at < now() - interval '90 days';

-- Delete resolved alerts older than 30 days
DELETE FROM security_alerts 
WHERE resolved = true 
AND resolved_at < now() - interval '30 days';
```

## Troubleshooting

### Issue: Migration fails with "column already exists"
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners' 
AND column_name IN ('image_quota_used', 'image_quota_max');

-- If they exist, skip that part of the migration
```

### Issue: Function already exists
```sql
-- Drop and recreate
DROP FUNCTION IF EXISTS check_upload_rate_limit(uuid);
-- Then run the CREATE FUNCTION statement
```

### Issue: Upload fails with "permission denied"
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Check partner status
SELECT id, business_name, status, image_quota_used, image_quota_max 
FROM partners 
WHERE user_id = 'user-uuid-here';
```

### Issue: Quota not incrementing
```sql
-- Manually check and fix
SELECT id, business_name, image_quota_used 
FROM partners 
WHERE id = 'partner-uuid';

-- Manual increment (if needed)
UPDATE partners 
SET image_quota_used = image_quota_used + 1 
WHERE id = 'partner-uuid';
```

## Configuration Constants

Located in `src/lib/constants.ts`:

```typescript
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;  // 2MB
export const MAX_FILE_SIZE_MB = 2;
export const MAX_PARTNER_IMAGES = 15;
export const MAX_UPLOADS_PER_HOUR = 10;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
];
```

To change limits, update these constants and re-deploy.

## Need Help?

1. Check [IMAGE_UPLOAD_SECURITY.md](./IMAGE_UPLOAD_SECURITY.md) for full documentation
2. Review security alerts table for automated warnings
3. Check partner_upload_log for detailed error messages
4. Verify partner status is 'APPROVED'
5. Ensure Supabase storage buckets are configured correctly

---

✅ **Setup Complete!** Your image upload system is now secure with:
- 2MB file size limit
- 15 images per partner quota
- Magic number validation
- Rate limiting (10/hour)
- Comprehensive logging
- Security monitoring
