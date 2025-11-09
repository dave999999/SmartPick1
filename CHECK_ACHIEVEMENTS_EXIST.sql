-- Quick check: Do achievements exist in database?
SELECT COUNT(*) as total_achievements FROM public.achievement_definitions;

-- Show first 5 achievements
SELECT id, name, category, tier FROM public.achievement_definitions LIMIT 5;
