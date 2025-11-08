-- Signup debug logging to trace profile creation trigger
-- Date: 2025-11-08

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_signup_log (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id uuid,
  email text,
  step text,
  details jsonb,
  created_at timestamptz default now()
);

-- Grant minimal select to authenticated so we can inspect from client (optional)
GRANT SELECT ON public.user_signup_log TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_has_role_column BOOLEAN := FALSE;
  v_has_referral_code BOOLEAN := FALSE;
  v_has_referred_by BOOLEAN := FALSE;
  v_generated_referral TEXT := NULL;
  v_stats_exists BOOLEAN := FALSE;
BEGIN
  INSERT INTO public.user_signup_log(auth_user_id,email,step,details)
  VALUES (NEW.id, NEW.email, 'start', NULL);

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='role'
  ) INTO v_has_role_column;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='referral_code'
  ) INTO v_has_referral_code;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='referred_by'
  ) INTO v_has_referred_by;

  IF v_has_referral_code THEN
    v_generated_referral := left(gen_random_uuid()::text, 8);
  END IF;

  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_signup_log(auth_user_id,email,step,details)
  VALUES (NEW.id, NEW.email, 'profile_insert_attempt', jsonb_build_object('referral_generated', v_generated_referral));

  IF v_has_role_column THEN
    UPDATE public.users SET role = COALESCE(role, 'CUSTOMER') WHERE id = NEW.id;
  END IF;
  IF v_has_referral_code THEN
    UPDATE public.users SET referral_code = COALESCE(referral_code, v_generated_referral) WHERE id = NEW.id;
  END IF;
  IF v_has_referred_by THEN
    UPDATE public.users SET referred_by = referred_by WHERE id = NEW.id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='user_stats'
  ) INTO v_stats_exists;

  IF v_stats_exists THEN
    INSERT INTO public.user_stats (user_id, last_activity_date)
    VALUES (NEW.id, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_signup_log(auth_user_id,email,step,details)
    VALUES (NEW.id, NEW.email, 'stats_initialized', NULL);
  END IF;

  INSERT INTO public.user_signup_log(auth_user_id,email,step,details)
  VALUES (NEW.id, NEW.email, 'end', NULL);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.user_signup_log(auth_user_id,email,step,details)
    VALUES (NEW.id, NEW.email, 'exception', jsonb_build_object('error', SQLERRM));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;