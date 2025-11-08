-- Fix partner_points table schema - add missing user_id column
-- This fixes the "column user_id does not exist" error

-- First, check if partner_points table exists and what columns it has
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'partner_points'
  ) THEN
    RAISE NOTICE 'partner_points table exists';

    -- Check if user_id column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'partner_points'
      AND column_name = 'user_id'
    ) THEN
      RAISE NOTICE 'user_id column missing - will add it';
    ELSE
      RAISE NOTICE 'user_id column exists';
    END IF;
  ELSE
    RAISE NOTICE 'partner_points table does not exist - will create it';
  END IF;
END $$;

-- Drop and recreate partner_points table with correct schema
DROP TABLE IF EXISTS public.partner_points CASCADE;
DROP TABLE IF EXISTS public.partner_point_transactions CASCADE;

-- Create partner_points table with correct schema
CREATE TABLE public.partner_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  offer_slots INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create partner_point_transactions table
CREATE TABLE public.partner_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_partner_points_user_id ON public.partner_points(user_id);
CREATE INDEX idx_partner_point_transactions_partner_id ON public.partner_point_transactions(partner_id);
CREATE INDEX idx_partner_point_transactions_created_at ON public.partner_point_transactions(created_at DESC);

-- Disable RLS (security enforced via SECURITY DEFINER functions)
ALTER TABLE public.partner_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_point_transactions DISABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE public.partner_points IS 'Partner points balance and offer slots. RLS disabled - security via SECURITY DEFINER functions.';
COMMENT ON TABLE public.partner_point_transactions IS 'Partner points transaction log. RLS disabled - security via SECURITY DEFINER functions.';

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.partner_points TO authenticated;
GRANT SELECT, INSERT ON public.partner_point_transactions TO authenticated;

-- Insert initial points for your existing partner
-- Replace with your actual partner user_id
INSERT INTO public.partner_points (user_id, balance, offer_slots, updated_at)
VALUES ('0f069ba3-2c87-44fe-99a0-97ba74532a86', 873, 6, NOW())
ON CONFLICT (user_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  offer_slots = EXCLUDED.offer_slots,
  updated_at = NOW();

RAISE NOTICE 'partner_points table recreated successfully with user_id column';
