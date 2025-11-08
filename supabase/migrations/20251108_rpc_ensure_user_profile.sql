-- Ensure user profile exists RPC
-- Date: 2025-11-08

BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS public.users AS $$
DECLARE
  uid uuid := auth.uid();
  v_user public.users;
  v_email text;
  v_name text;
  v_avatar text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  -- Return existing profile if present
  SELECT * INTO v_user FROM public.users WHERE id = uid;
  IF FOUND THEN
    RETURN v_user;
  END IF;

  -- Pull metadata from auth.users
  SELECT email,
         COALESCE(raw_user_meta_data->>'name', email) AS name,
         raw_user_meta_data->>'avatar_url' AS avatar
  INTO v_email, v_name, v_avatar
  FROM auth.users
  WHERE id = uid;

  -- Insert minimal profile row
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (uid, v_email, v_name, v_avatar)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
  RETURNING * INTO v_user;

  RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow authenticated clients to call this RPC
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

COMMIT;