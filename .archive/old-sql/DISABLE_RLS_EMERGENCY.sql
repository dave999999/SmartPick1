-- EMERGENCY: Temporarily disable RLS on offers table
-- This will make offers visible immediately while we debug policies

ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;

-- You can re-enable it later with:
-- ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
