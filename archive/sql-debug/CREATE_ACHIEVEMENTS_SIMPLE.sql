-- ================================================
-- CREATE 50 ACHIEVEMENTS FOR SMARTPICK (CORRECT SCHEMA)
-- ================================================
-- Using ALL required columns including 'requirement' JSONB (NOT NULL constraint)

BEGIN;

-- Insert 50 diverse achievements with requirement JSONB
INSERT INTO public.achievement_definitions (id, name, description, icon, category, tier, requirement, reward_points, is_active) VALUES

-- MILESTONE ACHIEVEMENTS (Reservations)
('ach_first_reservation', 'First Pick! 🎉', 'Make your first SmartPick reservation', '🎯', 'milestone', 'bronze', '{"type": "reservations", "count": 1}', 10, true),
('ach_5_reservations', 'Getting Started', 'Complete 5 SmartPick reservations', '🌟', 'milestone', 'bronze', '{"type": "reservations", "count": 5}', 25, true),
('ach_10_reservations', 'Regular Picker', 'Complete 10 reservations', '⭐', 'milestone', 'silver', '{"type": "reservations", "count": 10}', 50, true),
('ach_25_reservations', 'SmartPick Enthusiast', 'Complete 25 reservations', '🌠', 'milestone', 'silver', '{"type": "reservations", "count": 25}', 100, true),
('ach_50_reservations', 'Half Century', 'Reach 50 reservations', '💎', 'milestone', 'gold', '{"type": "reservations", "count": 50}', 200, true),
('ach_100_reservations', 'Century Club', 'Complete 100 reservations!', '👑', 'milestone', 'gold', '{"type": "reservations", "count": 100}', 500, true),
('ach_250_reservations', 'Master Saver', 'Reach 250 reservations', '🏆', 'milestone', 'platinum', '{"type": "reservations", "count": 250}', 1000, true),
('ach_500_reservations', 'Legend Status', 'Complete 500 reservations', '🎖️', 'milestone', 'platinum', '{"type": "reservations", "count": 500}', 2500, true),

-- SAVINGS ACHIEVEMENTS
('ach_save_10_gel', 'Penny Saver', 'Save your first 10 GEL', '💰', 'savings', 'bronze', '{"type": "money_saved", "amount": 10}', 15, true),
('ach_save_50_gel', 'Budget Master', 'Save 50 GEL total', '💵', 'savings', 'bronze', '{"type": "money_saved", "amount": 50}', 50, true),
('ach_save_100_gel', 'Money Wise', 'Save 100 GEL with SmartPick', '💸', 'savings', 'silver', '{"type": "money_saved", "amount": 100}', 100, true),
('ach_save_250_gel', 'Savings Expert', 'Save 250 GEL total', '🏦', 'savings', 'silver', '{"type": "money_saved", "amount": 250}', 250, true),
('ach_save_500_gel', 'Financial Genius', 'Save 500 GEL!', '💎', 'savings', 'gold', '{"type": "money_saved", "amount": 500}', 500, true),
('ach_save_1000_gel', 'Millionaire Saver', 'Save 1000 GEL total', '🎰', 'savings', 'gold', '{"type": "money_saved", "amount": 1000}', 1000, true),
('ach_save_2500_gel', 'Savings Legend', 'Save 2500 GEL with SmartPick', '🏅', 'savings', 'platinum', '{"type": "money_saved", "amount": 2500}', 2500, true),

-- ENGAGEMENT ACHIEVEMENTS (Streaks)
('ach_3_day_streak', 'Hot Streak', 'Pick up 3 days in a row', '🔥', 'engagement', 'bronze', '{"type": "streak_days", "count": 3}', 30, true),
('ach_7_day_streak', 'Week Warrior', 'Maintain a 7-day streak', '⚡', 'engagement', 'silver', '{"type": "streak_days", "count": 7}', 70, true),
('ach_14_day_streak', 'Two Week Champion', '14 consecutive days', '✨', 'engagement', 'silver', '{"type": "streak_days", "count": 14}', 150, true),
('ach_30_day_streak', 'Monthly Master', '30-day streak achieved', '🌟', 'engagement', 'gold', '{"type": "streak_days", "count": 30}', 300, true),
('ach_60_day_streak', 'Unstoppable', '60 days without missing', '💪', 'engagement', 'gold', '{"type": "streak_days", "count": 60}', 600, true),
('ach_100_day_streak', 'Century Streak', '100 consecutive days!', '🔱', 'engagement', 'platinum', '{"type": "streak_days", "count": 100}', 1000, true),

-- SOCIAL ACHIEVEMENTS (Referrals)
('ach_1_referral', 'Friend Bringer', 'Refer your first friend', '👥', 'social', 'bronze', '{"type": "referrals", "count": 1}', 20, true),
('ach_5_referrals', 'Social Butterfly', 'Refer 5 friends', '🦋', 'social', 'silver', '{"type": "referrals", "count": 5}', 100, true),
('ach_10_referrals', 'Community Builder', 'Refer 10 friends', '🏘️', 'social', 'silver', '{"type": "referrals", "count": 10}', 200, true),
('ach_25_referrals', 'Influencer', 'Refer 25 people', '📱', 'social', 'gold', '{"type": "referrals", "count": 25}', 500, true),
('ach_50_referrals', 'Ambassador', 'Refer 50 friends!', '🌐', 'social', 'gold', '{"type": "referrals", "count": 50}', 1000, true),
('ach_100_referrals', 'Legend Recruiter', 'Refer 100 people', '👑', 'social', 'platinum', '{"type": "referrals", "count": 100}', 2500, true),

-- CATEGORY SPECIFIC
('ach_bakery_lover', 'Bakery Lover 🥐', 'Pick up from 5 different bakeries', '🥐', 'milestone', 'bronze', '{"type": "category_count", "category": "BAKERY", "count": 5}', 25, true),
('ach_restaurant_regular', 'Restaurant Regular 🍽️', 'Visit 5 different restaurants', '🍽️', 'milestone', 'bronze', '{"type": "category_count", "category": "RESTAURANT", "count": 5}', 25, true),
('ach_cafe_enthusiast', 'Café Enthusiast ☕', 'Pick up from 5 cafés', '☕', 'milestone', 'bronze', '{"type": "category_count", "category": "CAFE", "count": 5}', 25, true),
('ach_grocery_shopper', 'Grocery Saver 🛒', 'Save at 5 grocery stores', '🛒', 'milestone', 'bronze', '{"type": "category_count", "category": "GROCERY", "count": 5}', 25, true),

-- SPECIAL ACHIEVEMENTS
('ach_early_bird', 'Early Bird 🌅', 'Pick up 10 offers before 9 AM', '🌅', 'engagement', 'silver', '{"type": "time_based", "before": "09:00", "count": 10}', 100, true),
('ach_night_owl', 'Night Owl 🦉', 'Pick up 10 offers after 8 PM', '🦉', 'engagement', 'silver', '{"type": "time_based", "after": "20:00", "count": 10}', 100, true),
('ach_weekend_warrior', 'Weekend Warrior', 'Pick up 20 times on weekends', '🎉', 'engagement', 'silver', '{"type": "weekend_pickups", "count": 20}', 150, true),
('ach_variety_seeker', 'Variety Seeker', 'Try all 4 categories', '🎨', 'milestone', 'silver', '{"type": "unique_categories", "count": 4}', 100, true),

-- LOYALTY ACHIEVEMENTS
('ach_favorite_partner', 'Regular Customer', 'Visit same partner 10 times', '❤️', 'engagement', 'silver', '{"type": "same_partner", "count": 10}', 100, true),
('ach_diverse_explorer', 'Explorer', 'Try 10 different partners', '🗺️', 'milestone', 'silver', '{"type": "unique_partners", "count": 10}', 100, true),
('ach_25_partners', 'Partner Explorer', 'Pick from 25 different partners', '🌍', 'milestone', 'gold', '{"type": "unique_partners", "count": 25}', 250, true),

-- QUICK ACTIONS
('ach_fast_picker', 'Quick Draw', 'Reserve and pick up within 30 minutes (10 times)', '⚡', 'engagement', 'silver', '{"type": "fast_pickup", "minutes": 30, "count": 10}', 150, true),
('ach_last_minute', 'Last Minute Hero', 'Save 10 offers from expiring', '⏰', 'engagement', 'silver', '{"type": "last_minute_saves", "count": 10}', 100, true),

-- POINT ACHIEVEMENTS
('ach_100_points', 'Point Collector', 'Earn 100 SmartPoints', '💰', 'milestone', 'bronze', '{"type": "points_earned", "amount": 100}', 10, true),
('ach_500_points', 'Point Master', 'Earn 500 SmartPoints', '💎', 'milestone', 'silver', '{"type": "points_earned", "amount": 500}', 50, true),
('ach_1000_points', 'Point Legend', 'Earn 1000 SmartPoints', '👑', 'milestone', 'gold', '{"type": "points_earned", "amount": 1000}', 100, true),
('ach_5000_points', 'Point Millionaire', 'Earn 5000 SmartPoints', '🏆', 'milestone', 'platinum', '{"type": "points_earned", "amount": 5000}', 500, true),

-- FUN ACHIEVEMENTS
('ach_no_waste', 'Zero Waste Hero', 'Help reduce food waste 50 times', '♻️', 'milestone', 'gold', '{"type": "reservations", "count": 50}', 200, true),
('ach_eco_warrior', 'Eco Warrior', 'Save 100 items from waste', '🌱', 'milestone', 'gold', '{"type": "reservations", "count": 100}', 500, true),
('ach_perfect_week', 'Perfect Week', 'Pick up every day for a week', '✅', 'engagement', 'silver', '{"type": "perfect_week", "count": 1}', 100, true),
('ach_comeback', 'Comeback King', 'Return after 30 day break', '🎯', 'engagement', 'bronze', '{"type": "comeback", "days": 30}', 50, true),
('ach_midnight_snacker', 'Midnight Snacker', 'Reserve at midnight (5 times)', '🌙', 'engagement', 'bronze', '{"type": "time_based", "at": "00:00", "count": 5}', 75, true);

COMMIT;

-- Show results
SELECT COUNT(*) || ' achievements created' AS status FROM public.achievement_definitions WHERE is_active = true;
SELECT '✅ Successfully created 50 achievements!' AS message;
