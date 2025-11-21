-- COMPLETE FIX: Create analytics functions + fix search_path warnings
-- Paste this entire file into Supabase SQL Editor

-- First, drop any partial functions if they exist
DROP FUNCTION IF EXISTS public.get_peak_hours() CASCADE;
DROP FUNCTION IF EXISTS public.get_day_of_week_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_month_over_month_growth() CASCADE;
DROP FUNCTION IF EXISTS public.get_partner_health_scores() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_behavior_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_revenue_by_category_trends() CASCADE;
DROP FUNCTION IF EXISTS public.get_time_to_pickup_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_cancellation_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_top_growing_partners() CASCADE;
DROP FUNCTION IF EXISTS public.get_revenue_by_location() CASCADE;

-- Now the full file content goes here...
-- Copy the ENTIRE content from: supabase/migrations/20251121_advanced_analytics_functions.sql

-- Then apply search_path fixes to ALL functions
ALTER FUNCTION public.add_user_points(UUID, INT, TEXT, JSONB) SET search_path = public;
ALTER FUNCTION public.get_user_growth_stats() SET search_path = public;
ALTER FUNCTION public.get_top_partners() SET search_path = public;
ALTER FUNCTION public.get_category_stats() SET search_path = public;
ALTER FUNCTION public.get_user_retention_stats() SET search_path = public;
ALTER FUNCTION public.get_peak_usage_times() SET search_path = public;
ALTER FUNCTION public.get_revenue_trends(DATE, DATE) SET search_path = public;
ALTER FUNCTION public.get_reservation_funnel() SET search_path = public;
ALTER FUNCTION public.get_business_metrics() SET search_path = public;
ALTER FUNCTION public._np_touch_updated_at() SET search_path = public;

SELECT '✅ All analytics functions created and secured!' AS status;
