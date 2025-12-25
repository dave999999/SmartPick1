-- Add cover image functionality to partners
-- Partners can set one of their gallery images as their cover photo

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_cover_image ON partners(cover_image_url) WHERE cover_image_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN partners.cover_image_url IS 'URL of the partner''s cover image displayed on map cards and profile headers';
