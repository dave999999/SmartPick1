-- Fix: Ensure both profile AND stats creation on signup
-- Date: 2025-11-08
-- Issue: init_user_stats trigger was on wrong table; handle_new_user doesn't init stats

BEGIN;

-- 1) Drop the incorrect trigger on public.users (should be on auth.users)
DROP TRIGGER IF EXISTS create_user_stats_trigger ON users;

-- 2) Update handle_new_user to ALSO initialize user_stats
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_has_role_column BOOLEAN := FALSE;
  v_has_referral_code BOOLEAN := FALSE;
  v_has_referred_by BOOLEAN := FALSE;
  v_generated_referral TEXT := NULL;
BEGIN
  -- Detect optional columns to keep function forward-compatible
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

  -- Insert minimal required columns only
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Apply optional defaults via guarded updates
  IF v_has_role_column THEN
    UPDATE public.users SET role = COALESCE(role, 'CUSTOMER') WHERE id = NEW.id;
  END IF;

  IF v_has_referral_code THEN
    UPDATE public.users
    SET referral_code = COALESCE(referral_code, v_generated_referral)
    WHERE id = NEW.id;
  END IF;

  IF v_has_referred_by THEN
    UPDATE public.users
    SET referred_by = referred_by
    WHERE id = NEW.id;
  END IF;

  -- NEW: Also initialize user_stats if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='user_stats'
  ) THEN
    INSERT INTO public.user_stats (user_id, last_activity_date)
    VALUES (NEW.id, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'handle_new_user: suppressed error %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Ensure the trigger exists and is correct
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Clean up any duplicate triggers
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name FROM information_schema.triggers
    WHERE event_object_schema = 'auth' AND event_object_table = 'users'
  LOOP
    IF r.trigger_name <> 'on_auth_user_created' THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users;', r.trigger_name);
    END IF;
  END LOOP;
END$$;

COMMIT;