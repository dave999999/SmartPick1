-- =====================================================
-- FIX: Add 1000 points to USER wallet when becoming partner
-- =====================================================
-- Problem: Partner welcome points go to partner_points (separate wallet)
-- Solution: Add 1000 points to user_points (unified wallet) when user becomes partner
-- =====================================================

-- Update the trigger function to add points to user_points instead
CREATE OR REPLACE FUNCTION public.grant_user_points_on_partner_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Only grant points when partner is approved for the first time
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    
    -- Set system flag so add_user_points works
    PERFORM set_config('app.is_system_operation', 'true', true);
    
    -- Add 1000 points to user's unified wallet
    PERFORM add_user_points(
      NEW.user_id,
      1000,
      'partner_welcome',
      jsonb_build_object(
        'partner_id', NEW.id,
        'business_name', NEW.business_name,
        'message', 'Welcome to SmartPick Partner Program!'
      )
    );
    
    -- Also update user record to mark as partner
    UPDATE public.users
    SET is_partner = true
    WHERE id = NEW.user_id;
    
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_partner_welcome_points ON public.partners;
DROP TRIGGER IF EXISTS trg_user_points_on_partner_approval ON public.partners;

-- Create new trigger
CREATE TRIGGER trg_user_points_on_partner_approval
  AFTER INSERT OR UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_user_points_on_partner_approval();

COMMENT ON FUNCTION public.grant_user_points_on_partner_approval IS 
'Adds 1000 welcome points to user wallet when they become an approved partner. Uses unified user_points table.';

SELECT '✅ Partner approval now grants 1000 points to unified user wallet' as status;
