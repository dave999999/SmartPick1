-- Fix can_user_reserve function search_path warning
-- Add SET search_path = public to fix security warning

DROP FUNCTION IF EXISTS can_user_reserve(UUID);

CREATE OR REPLACE FUNCTION public.can_user_reserve(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- is_user_in_cooldown returns a table, so we need to extract the in_cooldown column
  RETURN NOT COALESCE((SELECT in_cooldown FROM is_user_in_cooldown(p_user_id)), FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_reserve TO authenticated;

-- Verify
SELECT 'can_user_reserve fixed!' as status;
