-- Migration: Add approved_for_upload column to partners table
-- Date: 2025-11-01
-- Description: Adds a boolean column to control which partners can upload custom images

-- Add approved_for_upload column with default false
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS approved_for_upload BOOLEAN DEFAULT FALSE;

-- Add comment to document the column
COMMENT ON COLUMN public.partners.approved_for_upload IS
'Controls whether the partner can upload custom product images. Default is false - partners can only select from the image library. Set to true by admin to allow custom uploads.';

-- Create index for faster queries when filtering by upload permission
CREATE INDEX IF NOT EXISTS idx_partners_approved_for_upload
ON public.partners(approved_for_upload);

-- Optional: Set existing approved partners to have upload permission
-- Uncomment the following line if you want to automatically approve upload for existing approved partners
-- UPDATE public.partners SET approved_for_upload = TRUE WHERE status = 'APPROVED';
