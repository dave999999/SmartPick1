-- Create announcements table for Communication Panel
CREATE TABLE IF NOT EXISTS public.announcements (
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

-- Only admins can create announcements
CREATE POLICY "Only admins can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Allow authenticated users to view announcements
CREATE POLICY "Authenticated can view announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_target ON public.announcements(target_audience);

-- Grant permissions
GRANT ALL ON public.announcements TO authenticated;

SELECT 'Announcements table created successfully' AS result;
