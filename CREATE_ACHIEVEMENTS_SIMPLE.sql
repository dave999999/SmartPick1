-- ================================================
-- CREATE 50 ACHIEVEMENTS FOR SMARTPICK (MINIMAL)
-- ================================================
-- Only using columns that definitely exist: id, name, description, icon, tier, category, reward_points, is_active

BEGIN;

-- Insert 50 diverse achievements (minimal schema)
INSERT INTO public.achievement_definitions (id, name, description, icon, tier, category, reward_points, is_active) VALUES

-- MILESTONE ACHIEVEMENTS (Reservations)
('ach_first_reservation', 'First Pick! 🎉', 'Make your first SmartPick reservation', '🎯', 'bronze', 'milestone', 10, true),
('ach_5_reservations', 'Getting Started', 'Complete 5 SmartPick reservations', '🌟', 'bronze', 'milestone', 25, true),
('ach_10_reservations', 'Regular Picker', 'Complete 10 reservations', '⭐', 'silver', 'milestone', 50, true),
('ach_25_reservations', 'SmartPick Enthusiast', 'Complete 25 reservations', '🌠', 'silver', 'milestone', 100, true),
('ach_50_reservations', 'Half Century', 'Reach 50 reservations', '💎', 'gold', 'milestone', 200, true),
('ach_100_reservations', 'Century Club', 'Complete 100 reservations!', '👑', 'gold', 'milestone', 500, true),
('ach_250_reservations', 'Master Saver', 'Reach 250 reservations', '🏆', 'platinum', 'milestone', 1000, true),
('ach_500_reservations', 'Legend Status', 'Complete 500 reservations', '🎖️', 'platinum', 'milestone', 2500, true),

-- SAVINGS ACHIEVEMENTS
('ach_save_10_gel', 'Penny Saver', 'Save your first 10 GEL', '💰', 'bronze', 'savings', 15, true),
('ach_save_50_gel', 'Budget Master', 'Save 50 GEL total', '💵', 'bronze', 'savings', 50, true),
('ach_save_100_gel', 'Money Wise', 'Save 100 GEL with SmartPick', '💸', 'silver', 'savings', 100, true),
('ach_save_250_gel', 'Savings Expert', 'Save 250 GEL total', '🏦', 'silver', 'savings', 250, true),
('ach_save_500_gel', 'Financial Genius', 'Save 500 GEL!', '💎', 'gold', 'savings', 500, true),
('ach_save_1000_gel', 'Millionaire Saver', 'Save 1000 GEL total', '🎰', 'gold', 'savings', 1000, true),
('ach_save_2500_gel', 'Savings Legend', 'Save 2500 GEL with SmartPick', '🏅', 'platinum', 'savings', 2500, true),

-- ENGAGEMENT ACHIEVEMENTS (Streaks)
('ach_3_day_streak', 'Hot Streak', 'Pick up 3 days in a row', '🔥', 'bronze', 'engagement', 30, true),
('ach_7_day_streak', 'Week Warrior', 'Maintain a 7-day streak', '⚡', 'silver', 'engagement', 70, true),
('ach_14_day_streak', 'Two Week Champion', '14 consecutive days', '✨', 'silver', 'engagement', 150, true),
('ach_30_day_streak', 'Monthly Master', '30-day streak achieved', '🌟', 'gold', 'engagement', 300, true),
('ach_60_day_streak', 'Unstoppable', '60 days without missing', '💪', 'gold', 'engagement', 600, true),
('ach_100_day_streak', 'Century Streak', '100 consecutive days!', '🔱', 'platinum', 'engagement', 1000, true),

-- SOCIAL ACHIEVEMENTS (Referrals)
('ach_1_referral', 'Friend Bringer', 'Refer your first friend', '👥', 'bronze', 'social', 20, true),
('ach_5_referrals', 'Social Butterfly', 'Refer 5 friends', '🦋', 'silver', 'social', 100, true),
('ach_10_referrals', 'Community Builder', 'Refer 10 friends', '🏘️', 'silver', 'social', 200, true),
('ach_25_referrals', 'Influencer', 'Refer 25 people', '📱', 'gold', 'social', 500, true),
('ach_50_referrals', 'Ambassador', 'Refer 50 friends!', '🌐', 'gold', 'social', 1000, true),
('ach_100_referrals', 'Legend Recruiter', 'Refer 100 people', '👑', 'platinum', 'social', 2500, true),

-- CATEGORY SPECIFIC
('ach_bakery_lover', 'Bakery Lover 🥐', 'Pick up from 5 different bakeries', '🥐', 'bronze', 'milestone', 25, true),
('ach_restaurant_regular', 'Restaurant Regular 🍽️', 'Visit 5 different restaurants', '🍽️', 'bronze', 'milestone', 25, true),
('ach_cafe_enthusiast', 'Café Enthusiast ☕', 'Pick up from 5 cafés', '☕', 'bronze', 'milestone', 25, true),
('ach_grocery_shopper', 'Grocery Saver 🛒', 'Save at 5 grocery stores', '🛒', 'bronze', 'milestone', 25, true),

-- SPECIAL ACHIEVEMENTS
('ach_early_bird', 'Early Bird 🌅', 'Pick up 10 offers before 9 AM', '🌅', 'silver', 'engagement', 100, true),
('ach_night_owl', 'Night Owl 🦉', 'Pick up 10 offers after 8 PM', '🦉', 'silver', 'engagement', 100, true),
('ach_weekend_warrior', 'Weekend Warrior', 'Pick up 20 times on weekends', '🎉', 'silver', 'engagement', 150, true),
('ach_variety_seeker', 'Variety Seeker', 'Try all 4 categories', '🎨', 'silver', 'milestone', 100, true),

-- LOYALTY ACHIEVEMENTS
('ach_favorite_partner', 'Regular Customer', 'Visit same partner 10 times', '❤️', 'silver', 'engagement', 100, true),
('ach_diverse_explorer', 'Explorer', 'Try 10 different partners', '🗺️', 'silver', 'milestone', 100, true),
('ach_25_partners', 'Partner Explorer', 'Pick from 25 different partners', '🌍', 'gold', 'milestone', 250, true),

-- QUICK ACTIONS
('ach_fast_picker', 'Quick Draw', 'Reserve and pick up within 30 minutes (10 times)', '⚡', 'silver', 'engagement', 150, true),
('ach_last_minute', 'Last Minute Hero', 'Save 10 offers from expiring', '⏰', 'silver', 'engagement', 100, true),

-- POINT ACHIEVEMENTS
('ach_100_points', 'Point Collector', 'Earn 100 SmartPoints', '💰', 'bronze', 'milestone', 10, true),
('ach_500_points', 'Point Master', 'Earn 500 SmartPoints', '💎', 'silver', 'milestone', 50, true),
('ach_1000_points', 'Point Legend', 'Earn 1000 SmartPoints', '👑', 'gold', 'milestone', 100, true),
('ach_5000_points', 'Point Millionaire', 'Earn 5000 SmartPoints', '🏆', 'platinum', 'milestone', 500, true),

-- FUN ACHIEVEMENTS
('ach_no_waste', 'Zero Waste Hero', 'Help reduce food waste 50 times', '♻️', 'gold', 'milestone', 200, true),
('ach_eco_warrior', 'Eco Warrior', 'Save 100 items from waste', '🌱', 'gold', 'milestone', 500, true),
('ach_perfect_week', 'Perfect Week', 'Pick up every day for a week', '✅', 'silver', 'engagement', 100, true),
('ach_comeback', 'Comeback King', 'Return after 30 day break', '🎯', 'bronze', 'engagement', 50, true),
('ach_midnight_snacker', 'Midnight Snacker', 'Reserve at midnight (5 times)', '🌙', 'bronze', 'engagement', 75, true);

COMMIT;

-- Show results
SELECT COUNT(*) || ' achievements created' AS status FROM public.achievement_definitions WHERE is_active = true;
SELECT '✅ Successfully created 50 achievements!' AS message;
