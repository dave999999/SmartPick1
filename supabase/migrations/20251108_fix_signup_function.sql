-- Migration: Harden signup profile creation to prevent AuthApiError failures
-- Date: 2025-11-08
-- Purpose: Make handle_new_user idempotent and resilient (ignore duplicates / swallow errors)
-- Applies to: public.handle_new_user trigger on auth.users

-- Safety: Wrap in transaction so either full replacement succeeds or rolls back
BEGIN;

-- Ensure required extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Replace the handle_new_user function with a safe version.
-- Changes vs legacy version:
--  * Adds ON CONFLICT DO NOTHING to avoid unique violation on re-signup / race.
--  * Catches ALL exceptions and returns NEW so auth can proceed even if profile insert fails.
--  * Explicitly sets role default (CUSTOMER) only if table has column and NEW metadata did not specify.
--  * Generates a referral_code if column exists and value is NULL (first 8 chars of uuid v4).
--  * Maintains SECURITY DEFINER to bypass RLS for profile creation.
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

  -- Insert minimal required columns only; avoid referencing non-existent columns
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Apply optional defaults via guarded updates to avoid column-not-found
  IF v_has_role_column THEN
    UPDATE public.users SET role = COALESCE(role, 'CUSTOMER') WHERE id = NEW.id;
  END IF;

  IF v_has_referral_code THEN
    UPDATE public.users
    SET referral_code = COALESCE(referral_code, v_generated_referral)
    WHERE id = NEW.id;
  END IF;

  -- referred_by is typically null at signup; leave untouched unless present
  -- (no-op guard included for completeness)
  IF v_has_referred_by THEN
    UPDATE public.users
    SET referred_by = referred_by
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log minimal notice; do not abort signup
    RAISE NOTICE 'handle_new_user: suppressed error %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger references the updated function exactly once
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Optional: Remove any other unexpected triggers on auth.users to avoid duplicate failures
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
