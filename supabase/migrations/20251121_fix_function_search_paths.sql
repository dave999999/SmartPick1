-- Fix search_path for all analytics and helper functions
-- This prevents search_path manipulation attacks in SECURITY DEFINER functions

BEGIN;

-- Fix analytics functions
ALTER FUNCTION public.get_peak_hours() SET search_path = public;
ALTER FUNCTION public.get_day_of_week_stats() SET search_path = public;
ALTER FUNCTION public.get_month_over_month_growth() SET search_path = public;
ALTER FUNCTION public.get_partner_health_scores() SET search_path = public;
ALTER FUNCTION public.get_user_behavior_stats() SET search_path = public;
ALTER FUNCTION public.get_revenue_by_category_trends() SET search_path = public;
ALTER FUNCTION public.get_time_to_pickup_stats() SET search_path = public;
ALTER FUNCTION public.get_cancellation_stats() SET search_path = public;
ALTER FUNCTION public.get_top_growing_partners() SET search_path = public;
ALTER FUNCTION public.get_revenue_by_location() SET search_path = public;

-- Fix helper functions
ALTER FUNCTION public.add_user_points(UUID, INT, TEXT, JSONB) SET search_path = public;
ALTER FUNCTION public.get_user_growth_stats() SET search_path = public;
ALTER FUNCTION public.get_top_partners() SET search_path = public;
ALTER FUNCTION public.get_category_stats() SET search_path = public;
ALTER FUNCTION public.get_user_retention_stats() SET search_path = public;
ALTER FUNCTION public.get_peak_usage_times() SET search_path = public;
ALTER FUNCTION public.get_revenue_trends(DATE, DATE) SET search_path = public;
ALTER FUNCTION public.get_reservation_funnel() SET search_path = public;
ALTER FUNCTION public.get_business_metrics() SET search_path = public;

-- Fix trigger function (already has it in the function definition, but ensure it's set)
ALTER FUNCTION public._np_touch_updated_at() SET search_path = public;

COMMIT;

-- Verify the changes
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- SECURITY DEFINER functions
    AND NOT EXISTS (
      SELECT 1 FROM pg_proc_config WHERE prooid = p.oid AND setconfig @> ARRAY['search_path=public']
    );
  
  IF func_count > 0 THEN
    RAISE WARNING 'Still % SECURITY DEFINER functions without search_path set', func_count;
  ELSE
    RAISE NOTICE 'All SECURITY DEFINER functions now have search_path set correctly';
  END IF;
END $$;
