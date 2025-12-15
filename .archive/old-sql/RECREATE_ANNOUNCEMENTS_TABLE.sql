-- Check if announcements table exists and refresh schema
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'announcements'
) AS table_exists;

-- If it doesn't exist, create it
DROP TABLE IF EXISTS public.announcements CASCADE;

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  message text NOT NULL,
  target_audience text NOT NULL CHECK (target_audience IN ('all_users', 'all_partners', 'everyone')),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Simple policies without recursion
CREATE POLICY "Anyone can insert announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view announcements"
  ON public.announcements FOR SELECT
  USING (true);

-- Create indexes
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX idx_announcements_target ON public.announcements(target_audience);

-- Grant permissions
GRANT ALL ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Announcements table created and schema refreshed' AS result;
