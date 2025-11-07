-- Add business hours columns to partners table
-- These replace the old business_hours JSONB field with simpler columns

-- Add opening_time column (time in HH:MM format)
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS opening_time VARCHAR(5);

-- Add closing_time column (time in HH:MM format)
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS closing_time VARCHAR(5);

-- Add open_24h boolean flag
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS open_24h BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.partners.opening_time IS 'Business opening time in HH:MM format (24-hour)';
COMMENT ON COLUMN public.partners.closing_time IS 'Business closing time in HH:MM format (24-hour)';
COMMENT ON COLUMN public.partners.open_24h IS 'Flag indicating if business operates 24/7';

-- Migrate existing business_hours JSONB data if any exists
UPDATE public.partners
SET
  opening_time = (business_hours->>'open')::VARCHAR(5),
  closing_time = (business_hours->>'close')::VARCHAR(5)
WHERE business_hours IS NOT NULL
  AND business_hours->>'open' IS NOT NULL
  AND business_hours->>'close' IS NOT NULL;

-- We'll keep business_hours column for backward compatibility but it's no longer used
