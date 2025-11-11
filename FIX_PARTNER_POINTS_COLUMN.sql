-- =====================================================
-- FIX: partner_points table column name and trigger function
-- =====================================================
-- Error: column "user_id" of relation "partner_points" does not exist
-- Solution: Check current structure and fix it

-- STEP 1: Check current partner_points structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'partner_points'
ORDER BY ordinal_position;

-- STEP 2: Drop the problematic trigger and function
DROP TRIGGER IF EXISTS trg_partner_welcome_points ON public.partners;
DROP FUNCTION IF EXISTS public.grant_partner_welcome_points();

-- STEP 3: Check if partner_points has partner_id or user_id
DO $$
DECLARE
  has_user_id BOOLEAN;
  has_partner_id BOOLEAN;
BEGIN
  -- Check for user_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'partner_points' 
      AND column_name = 'user_id'
  ) INTO has_user_id;
  
  -- Check for partner_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'partner_points' 
      AND column_name = 'partner_id'
  ) INTO has_partner_id;
  
  RAISE NOTICE 'partner_points has user_id: %', has_user_id;
  RAISE NOTICE 'partner_points has partner_id: %', has_partner_id;
  
  -- If has partner_id but not user_id, rename it
  IF has_partner_id AND NOT has_user_id THEN
    RAISE NOTICE 'Renaming partner_id to user_id...';
    ALTER TABLE public.partner_points RENAME COLUMN partner_id TO user_id;
  END IF;
  
  -- If has neither, something is very wrong
  IF NOT has_user_id AND NOT has_partner_id THEN
    RAISE EXCEPTION 'partner_points table has neither user_id nor partner_id column!';
  END IF;
END $$;

-- STEP 4: Ensure partner_point_transactions uses partner_id (this is correct)
-- No changes needed here

-- STEP 5: Recreate the trigger function with correct column names
CREATE OR REPLACE FUNCTION public.grant_partner_welcome_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only grant points when partner is first approved
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status <> 'APPROVED') THEN
    
    -- Insert into partner_points (uses user_id)
    INSERT INTO public.partner_points (user_id, balance, offer_slots)
    VALUES (NEW.user_id, 1000, 4)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert into partner_point_transactions (uses partner_id)
    INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
    VALUES (
      NEW.user_id, 
      1000, 
      'WELCOME', 
      0, 
      1000, 
      jsonb_build_object(
        'partner_id', NEW.id, 
        'business_name', NEW.business_name,
        'approved_at', NOW()
      )
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Granted welcome points to partner: % (user_id: %)', NEW.business_name, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- STEP 6: Recreate the trigger
CREATE TRIGGER trg_partner_welcome_points
AFTER INSERT OR UPDATE OF status ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.grant_partner_welcome_points();

-- STEP 7: Verify the fix
SELECT 
  p.id,
  p.business_name,
  p.status,
  p.user_id,
  pp.balance as points_balance,
  pp.offer_slots
FROM public.partners p
LEFT JOIN public.partner_points pp ON pp.user_id = p.user_id
WHERE p.status = 'APPROVED'
ORDER BY p.created_at DESC
LIMIT 5;

-- STEP 8: Test with Night Owl Bakery (should not error now)
UPDATE partners 
SET status = 'APPROVED' 
WHERE business_name = 'Night Owl Bakery'
RETURNING id, business_name, status, user_id;
