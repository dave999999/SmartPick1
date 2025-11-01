-- Add auto_expire_in with a 6-hour default and backfill existing rows
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS auto_expire_in TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'utc' + interval '6 hours');

UPDATE public.offers
SET auto_expire_in = (now() AT TIME ZONE 'utc' + interval '6 hours')
WHERE auto_expire_in IS NULL;

