-- ================================================
-- CREATE 50 ACHIEVEMENTS FOR SMARTPICK
-- ================================================

BEGIN;

-- Clear existing achievements (optional - remove if you want to keep existing)
-- TRUNCATE TABLE public.achievement_definitions CASCADE;

-- Insert 50 diverse achievements
INSERT INTO public.achievement_definitions (id, name, description, icon, tier, category, trigger_type, trigger_value, reward_points, is_active) VALUES

-- MILESTONE ACHIEVEMENTS (Reservations)
('ach_first_reservation', 'First Pick! 🎉', 'Make your first SmartPick reservation', '🎯', 'bronze', 'milestone', 'total_reservations', 1, 10, true),
('ach_5_reservations', 'Getting Started', 'Complete 5 SmartPick reservations', '🌟', 'bronze', 'milestone', 'total_reservations', 5, 25, true),
('ach_10_reservations', 'Regular Picker', 'Complete 10 reservations', '⭐', 'silver', 'milestone', 'total_reservations', 10, 50, true),
('ach_25_reservations', 'SmartPick Enthusiast', 'Complete 25 reservations', '🌠', 'silver', 'milestone', 'total_reservations', 25, 100, true),
('ach_50_reservations', 'Half Century', 'Reach 50 reservations', '💎', 'gold', 'milestone', 'total_reservations', 50, 200, true),
('ach_100_reservations', 'Century Club', 'Complete 100 reservations!', '👑', 'gold', 'milestone', 'total_reservations', 100, 500, true),
('ach_250_reservations', 'Master Saver', 'Reach 250 reservations', '🏆', 'platinum', 'milestone', 'total_reservations', 250, 1000, true),
('ach_500_reservations', 'Legend Status', 'Complete 500 reservations', '🎖️', 'platinum', 'milestone', 'total_reservations', 500, 2500, true),

-- SAVINGS ACHIEVEMENTS
('ach_save_10_gel', 'Penny Saver', 'Save your first 10 GEL', '💰', 'bronze', 'savings', 'total_money_saved', 10, 15, true),
('ach_save_50_gel', 'Budget Master', 'Save 50 GEL total', '💵', 'bronze', 'savings', 'total_money_saved', 50, 50, true),
('ach_save_100_gel', 'Money Wise', 'Save 100 GEL with SmartPick', '💸', 'silver', 'savings', 'total_money_saved', 100, 100, true),
('ach_save_250_gel', 'Savings Expert', 'Save 250 GEL total', '🏦', 'silver', 'savings', 'total_money_saved', 250, 250, true),
('ach_save_500_gel', 'Financial Genius', 'Save 500 GEL!', '💎', 'gold', 'savings', 'total_money_saved', 500, 500, true),
('ach_save_1000_gel', 'Millionaire Saver', 'Save 1000 GEL total', '🎰', 'gold', 'savings', 'total_money_saved', 1000, 1000, true),
('ach_save_2500_gel', 'Savings Legend', 'Save 2500 GEL with SmartPick', '🏅', 'platinum', 'savings', 'total_money_saved', 2500, 2500, true),

-- ENGAGEMENT ACHIEVEMENTS (Streaks)
('ach_3_day_streak', 'Hot Streak', 'Pick up 3 days in a row', '🔥', 'bronze', 'engagement', 'current_streak_days', 3, 30, true),
('ach_7_day_streak', 'Week Warrior', 'Maintain a 7-day streak', '⚡', 'silver', 'engagement', 'current_streak_days', 7, 70, true),
('ach_14_day_streak', 'Two Week Champion', '14 consecutive days', '✨', 'silver', 'engagement', 'current_streak_days', 14, 150, true),
('ach_30_day_streak', 'Monthly Master', '30-day streak achieved', '🌟', 'gold', 'engagement', 'current_streak_days', 30, 300, true),
('ach_60_day_streak', 'Unstoppable', '60 days without missing', '💪', 'gold', 'engagement', 'current_streak_days', 60, 600, true),
('ach_100_day_streak', 'Century Streak', '100 consecutive days!', '🔱', 'platinum', 'engagement', 'current_streak_days', 100, 1000, true),

-- SOCIAL ACHIEVEMENTS (Referrals)
('ach_1_referral', 'Friend Bringer', 'Refer your first friend', '👥', 'bronze', 'social', 'total_referrals', 1, 20, true),
('ach_5_referrals', 'Social Butterfly', 'Refer 5 friends', '🦋', 'silver', 'social', 'total_referrals', 5, 100, true),
('ach_10_referrals', 'Community Builder', 'Refer 10 friends', '🏘️', 'silver', 'social', 'total_referrals', 10, 200, true),
('ach_25_referrals', 'Influencer', 'Refer 25 people', '📱', 'gold', 'social', 'total_referrals', 25, 500, true),
('ach_50_referrals', 'Ambassador', 'Refer 50 friends!', '🌐', 'gold', 'social', 'total_referrals', 50, 1000, true),
('ach_100_referrals', 'Legend Recruiter', 'Refer 100 people', '👑', 'platinum', 'social', 'total_referrals', 100, 2500, true),

-- CATEGORY SPECIFIC
('ach_bakery_lover', 'Bakery Lover 🥐', 'Pick up from 5 different bakeries', '🥐', 'bronze', 'milestone', 'category_bakery', 5, 25, true),
('ach_restaurant_regular', 'Restaurant Regular 🍽️', 'Visit 5 different restaurants', '🍽️', 'bronze', 'milestone', 'category_restaurant', 5, 25, true),
('ach_cafe_enthusiast', 'Café Enthusiast ☕', 'Pick up from 5 cafés', '☕', 'bronze', 'milestone', 'category_cafe', 5, 25, true),
('ach_grocery_shopper', 'Grocery Saver 🛒', 'Save at 5 grocery stores', '🛒', 'bronze', 'milestone', 'category_grocery', 5, 25, true),

-- SPECIAL ACHIEVEMENTS
('ach_early_bird', 'Early Bird 🌅', 'Pick up 10 offers before 9 AM', '🌅', 'silver', 'engagement', 'early_pickups', 10, 100, true),
('ach_night_owl', 'Night Owl 🦉', 'Pick up 10 offers after 8 PM', '🦉', 'silver', 'engagement', 'late_pickups', 10, 100, true),
('ach_weekend_warrior', 'Weekend Warrior', 'Pick up 20 times on weekends', '🎉', 'silver', 'engagement', 'weekend_pickups', 20, 150, true),
('ach_variety_seeker', 'Variety Seeker', 'Try all 4 categories', '🎨', 'silver', 'milestone', 'unique_categories', 4, 100, true),

-- LOYALTY ACHIEVEMENTS
('ach_favorite_partner', 'Regular Customer', 'Visit same partner 10 times', '❤️', 'silver', 'engagement', 'same_partner_visits', 10, 100, true),
('ach_diverse_explorer', 'Explorer', 'Try 10 different partners', '🗺️', 'silver', 'milestone', 'unique_partners', 10, 100, true),
('ach_25_partners', 'Partner Explorer', 'Pick from 25 different partners', '🌍', 'gold', 'milestone', 'unique_partners', 25, 250, true),

-- QUICK ACTIONS
('ach_fast_picker', 'Quick Draw', 'Reserve and pick up within 30 minutes (10 times)', '⚡', 'silver', 'engagement', 'quick_pickups', 10, 150, true),
('ach_last_minute', 'Last Minute Hero', 'Save 10 offers from expiring', '⏰', 'silver', 'engagement', 'rescued_offers', 10, 100, true),

-- POINT ACHIEVEMENTS
('ach_100_points', 'Point Collector', 'Earn 100 SmartPoints', '💰', 'bronze', 'milestone', 'points_earned', 100, 10, true),
('ach_500_points', 'Point Master', 'Earn 500 SmartPoints', '💎', 'silver', 'milestone', 'points_earned', 500, 50, true),
('ach_1000_points', 'Point Legend', 'Earn 1000 SmartPoints', '👑', 'gold', 'milestone', 'points_earned', 1000, 100, true),
('ach_5000_points', 'Point Millionaire', 'Earn 5000 SmartPoints', '🏆', 'platinum', 'milestone', 'points_earned', 5000, 500, true),

-- FUN ACHIEVEMENTS
('ach_no_waste', 'Zero Waste Hero', 'Help reduce food waste 50 times', '♻️', 'gold', 'milestone', 'total_reservations', 50, 200, true),
('ach_eco_warrior', 'Eco Warrior', 'Save 100 items from waste', '🌱', 'gold', 'milestone', 'total_reservations', 100, 500, true),
('ach_perfect_week', 'Perfect Week', 'Pick up every day for a week', '✅', 'silver', 'engagement', 'current_streak_days', 7, 100, true),
('ach_comeback', 'Comeback King', 'Return after 30 day break', '🎯', 'bronze', 'engagement', 'comeback', 1, 50, true),
('ach_midnight_snacker', 'Midnight Snacker', 'Reserve at midnight (5 times)', '🌙', 'bronze', 'engagement', 'midnight_reserves', 5, 75, true);

COMMIT;

-- Show results
SELECT 
  tier,
  category,
  COUNT(*) as count
FROM public.achievement_definitions
WHERE is_active = true
GROUP BY tier, category
ORDER BY 
  CASE tier
    WHEN 'bronze' THEN 1
    WHEN 'silver' THEN 2
    WHEN 'gold' THEN 3
    WHEN 'platinum' THEN 4
  END,
  category;

SELECT '✅ Successfully created 50 achievements!' AS status;
SELECT COUNT(*) || ' total active achievements' AS total FROM public.achievement_definitions WHERE is_active = true;
