-- ========================================
-- Fix Admin Ban Functions (Case-Insensitive Roles + Super Admin)
-- Date: 2026-02-06
-- ========================================

BEGIN;

-- Recreate ban_user with case-insensitive role check
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_ban_type VARCHAR DEFAULT 'PERMANENT',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ban_id UUID;
  v_admin_id UUID;
  v_admin_role TEXT;
BEGIN
  v_admin_id := auth.uid();
  SELECT role INTO v_admin_role FROM public.users WHERE id = v_admin_id;

  IF v_admin_role IS NULL OR upper(v_admin_role) NOT IN ('ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = p_user_id AND is_active = TRUE) THEN
    RAISE EXCEPTION 'User is already banned';
  END IF;

  INSERT INTO public.user_bans (user_id, banned_by, reason, ban_type, expires_at, internal_notes)
  VALUES (p_user_id, v_admin_id, p_reason, p_ban_type, p_expires_at, p_internal_notes)
  RETURNING id INTO v_ban_id;

  UPDATE public.users SET is_banned = TRUE WHERE id = p_user_id;

  RETURN v_ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate unban_user with case-insensitive role check
CREATE OR REPLACE FUNCTION unban_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();

  IF v_admin_role IS NULL OR upper(v_admin_role) NOT IN ('ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only admins can unban users';
  END IF;

  UPDATE public.user_bans 
  SET is_active = FALSE, updated_at = NOW()
  WHERE user_id = p_user_id AND is_active = TRUE;

  UPDATE public.users SET is_banned = FALSE WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION ban_user(UUID, TEXT, VARCHAR, TIMESTAMPTZ, TEXT) SET search_path = public;
ALTER FUNCTION unban_user(UUID) SET search_path = public;

GRANT EXECUTE ON FUNCTION ban_user(UUID, TEXT, VARCHAR, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unban_user(UUID) TO authenticated;

COMMIT;
