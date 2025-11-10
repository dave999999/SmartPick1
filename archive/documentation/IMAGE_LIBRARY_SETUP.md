# Image Library System - Setup Instructions

## Overview
The image library system allows partners to select product images from a curated library or upload custom images (if approved by admin).

## 1. Database Migration

Apply the migration to add the `approved_for_upload` column to the partners table:

### Option A: Using Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql/new
2. Open `supabase/migrations/20251101_add_approved_for_upload.sql`
3. Copy the SQL content
4. Paste into SQL Editor
5. Click **Run**

### Option B: Using Supabase CLI
```bash
supabase link --project-ref ***REMOVED_PROJECT_ID***
supabase db push
```

## 2. Add Images to Library

Add product images to the appropriate category folders in `/public/library/`:

```
public/library/
├── BAKERY/          # Bakery products
├── RESTAURANT/      # Restaurant dishes
├── CAFE/            # Cafe items
├── GROCERY/         # Grocery items
├── ALCOHOL/         # Alcoholic beverages
└── FAST_FOOD/       # Fast food items
```

See `/public/library/README.md` for image guidelines.

## 3. Configure Supabase Storage

Ensure the `offer-images` bucket exists in Supabase Storage with public access:

1. Go to Storage in Supabase Dashboard
2. Verify `offer-images` bucket exists
3. Set bucket to **Public** for read access

## 4. Enable Custom Uploads for Partners

To allow specific partners to upload custom images:

1. Login as admin
2. Navigate to Admin Dashboard → Partners Management
3. Click **Edit** on the partner
4. Toggle **Allow Custom Image Uploads**
5. Save changes

## Features Implemented

### For Partners
- **Image Library**: Select from pre-curated product images organized by business type
- **Custom Upload**: Upload custom images (if approved by admin)
- **Smart Selection**: Images automatically filtered by partner's business category

### For Admins
- **Upload Approval**: Toggle custom upload permission per partner
- **Library Management**: Add images to `/public/library/{category}/` folders
- **Centralized Control**: Maintain quality and consistency of product images

### Technical Details
- **API Endpoint**: `/api/library?category={CATEGORY}` - Fetches images for a category
- **Storage Path**: Custom uploads stored in `/partners/{partner_id}/uploads/`
- **Image Processing**: Handles both library URLs and custom File objects
- **Validation**: File type, size, and format validation

## Testing

1. **Library Loading**:
   - Create offer as partner
   - Verify images load from library for your business type

2. **Custom Upload** (if approved):
   - Upload custom image
   - Verify upload succeeds and image displays

3. **Admin Toggle**:
   - Login as admin
   - Edit partner and toggle upload permission
   - Verify partner sees/doesn't see upload option

## Troubleshooting

### Images Not Loading
- Check `/public/library/{CATEGORY}/` folders exist
- Verify images are valid formats (JPG, PNG, WEBP, SVG)
- Check browser console for API errors

### Upload Failed
- Verify `approved_for_upload = true` in database
- Check Supabase Storage bucket permissions
- Ensure file is under 5MB

### API Errors
- For Vercel: Ensure `/api/library.ts` is deployed
- For local dev: Restart dev server
- Check network tab for 404/500 errors
