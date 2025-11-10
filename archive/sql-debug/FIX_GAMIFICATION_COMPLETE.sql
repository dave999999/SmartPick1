-- ================================================
-- COMPLETE FIX: Gamification System + 50 Achievements
-- Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- ================================================
-- PART 1: Fix the trigger (customer_id bug)
-- ================================================

CREATE OR REPLACE FUNCTION update_user_stats_on_pickup()
RETURNS TRIGGER AS $$
DECLARE
  v_money_saved DECIMAL(10, 2);
  v_offer_category TEXT;
  v_pickup_date DATE;
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  v_pickup_date := COALESCE(NEW.picked_up_at::DATE, CURRENT_DATE);

  -- Calculate money saved
  SELECT (o.original_price - o.smart_price) * NEW.quantity, o.category
  INTO v_money_saved, v_offer_category
  FROM offers o WHERE o.id = NEW.offer_id;

  -- ✅ FIXED: Use customer_id instead of user_id
  UPDATE user_stats
  SET total_reservations = total_reservations + 1,
      total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
      last_activity_date = v_pickup_date,
      updated_at = now()
  WHERE user_id = NEW.customer_id;

  PERFORM update_user_streak_on_date(NEW.customer_id, v_pickup_date);
  PERFORM check_user_achievements(NEW.customer_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- PART 2: Create 50 Achievements
-- ================================================

-- Delete any existing achievements first
DELETE FROM public.achievement_definitions;

-- Insert 50 achievements (using correct 'requirement' JSONB column)
INSERT INTO public.achievement_definitions (id, name, description, icon, tier, category, requirement, reward_points, is_active) VALUES

-- MILESTONE ACHIEVEMENTS (Reservations)
('ach_first_reservation', 'First Pick! 🎉', 'Make your first SmartPick reservation', '🎯', 'bronze', 'milestone', '{"type": "reservations", "count": 1}'::jsonb, 10, true),
('ach_5_reservations', 'Getting Started', 'Complete 5 SmartPick reservations', '🌟', 'bronze', 'milestone', '{"type": "reservations", "count": 5}'::jsonb, 25, true),
('ach_10_reservations', 'Regular Picker', 'Complete 10 reservations', '⭐', 'silver', 'milestone', '{"type": "reservations", "count": 10}'::jsonb, 50, true),
('ach_25_reservations', 'SmartPick Enthusiast', 'Complete 25 reservations', '🌠', 'silver', 'milestone', '{"type": "reservations", "count": 25}'::jsonb, 100, true),
('ach_50_reservations', 'Half Century', 'Reach 50 reservations', '💎', 'gold', 'milestone', '{"type": "reservations", "count": 50}'::jsonb, 200, true),
('ach_100_reservations', 'Century Club', 'Complete 100 reservations!', '👑', 'gold', 'milestone', '{"type": "reservations", "count": 100}'::jsonb, 500, true),
('ach_250_reservations', 'Master Saver', 'Reach 250 reservations', '🏆', 'platinum', 'milestone', '{"type": "reservations", "count": 250}'::jsonb, 1000, true),
('ach_500_reservations', 'Legend Status', 'Complete 500 reservations', '🎖️', 'platinum', 'milestone', '{"type": "reservations", "count": 500}'::jsonb, 2500, true),

-- SAVINGS ACHIEVEMENTS
('ach_save_10_gel', 'Penny Saver', 'Save your first 10 GEL', '💰', 'bronze', 'savings', '{"type": "money_saved", "amount": 10}'::jsonb, 15, true),
('ach_save_50_gel', 'Budget Master', 'Save 50 GEL total', '💵', 'bronze', 'savings', '{"type": "money_saved", "amount": 50}'::jsonb, 50, true),
('ach_save_100_gel', 'Money Wise', 'Save 100 GEL with SmartPick', '💸', 'silver', 'savings', '{"type": "money_saved", "amount": 100}'::jsonb, 100, true),
('ach_save_250_gel', 'Savings Expert', 'Save 250 GEL total', '🏦', 'silver', 'savings', '{"type": "money_saved", "amount": 250}'::jsonb, 250, true),
('ach_save_500_gel', 'Financial Genius', 'Save 500 GEL!', '💎', 'gold', 'savings', '{"type": "money_saved", "amount": 500}'::jsonb, 500, true),
('ach_save_1000_gel', 'Millionaire Saver', 'Save 1000 GEL total', '🎰', 'gold', 'savings', '{"type": "money_saved", "amount": 1000}'::jsonb, 1000, true),
('ach_save_2500_gel', 'Savings Legend', 'Save 2500 GEL with SmartPick', '🏅', 'platinum', 'savings', '{"type": "money_saved", "amount": 2500}'::jsonb, 2500, true),

-- ENGAGEMENT ACHIEVEMENTS (Streaks)
('ach_streak_3', '3 Day Streak', 'Pick up orders 3 days in a row', '🔥', 'bronze', 'engagement', '{"type": "streak", "days": 3}'::jsonb, 20, true),
('ach_streak_7', 'Week Warrior', 'Maintain a 7-day streak', '⚡', 'silver', 'engagement', '{"type": "streak", "days": 7}'::jsonb, 50, true),
('ach_streak_14', 'Two Week Champion', '14-day pickup streak', '🌟', 'silver', 'engagement', '{"type": "streak", "days": 14}'::jsonb, 100, true),
('ach_streak_30', 'Monthly Master', '30-day streak achievement', '🏆', 'gold', 'engagement', '{"type": "streak", "days": 30}'::jsonb, 250, true),
('ach_streak_60', 'Unstoppable', '60-day streak!', '💫', 'platinum', 'engagement', '{"type": "streak", "days": 60}'::jsonb, 500, true),
('ach_streak_100', 'Legendary Streak', '100 days in a row', '👑', 'platinum', 'engagement', '{"type": "streak", "days": 100}'::jsonb, 1000, true),

-- SOCIAL ACHIEVEMENTS (Referrals)
('ach_first_referral', 'Friend Bringer', 'Refer your first friend', '👥', 'bronze', 'social', '{"type": "referrals", "count": 1}'::jsonb, 25, true),
('ach_3_referrals', 'Social Butterfly', 'Refer 3 friends', '🦋', 'silver', 'social', '{"type": "referrals", "count": 3}'::jsonb, 75, true),
('ach_5_referrals', 'Community Builder', 'Refer 5 friends', '🌍', 'silver', 'social', '{"type": "referrals", "count": 5}'::jsonb, 150, true),
('ach_10_referrals', 'Ambassador', 'Refer 10 friends to SmartPick', '🎖️', 'gold', 'social', '{"type": "referrals", "count": 10}'::jsonb, 300, true),
('ach_25_referrals', 'Influencer', 'Refer 25 friends!', '⭐', 'platinum', 'social', '{"type": "referrals", "count": 25}'::jsonb, 1000, true),

-- CATEGORY SPECIFIC ACHIEVEMENTS
('ach_bakery_lover', 'Bakery Lover 🥐', 'Order from bakery 10 times', '🥖', 'bronze', 'milestone', '{"type": "category", "name": "bakery", "count": 10}'::jsonb, 30, true),
('ach_cafe_regular', 'Café Regular ☕', 'Order from cafés 10 times', '☕', 'bronze', 'milestone', '{"type": "category", "name": "cafe", "count": 10}'::jsonb, 30, true),
('ach_restaurant_fan', 'Restaurant Fan 🍽️', 'Order from restaurants 10 times', '🍴', 'bronze', 'milestone', '{"type": "category", "name": "restaurant", "count": 10}'::jsonb, 30, true),
('ach_grocery_master', 'Grocery Master 🛒', 'Order groceries 10 times', '🛒', 'bronze', 'milestone', '{"type": "category", "name": "grocery", "count": 10}'::jsonb, 30, true),

-- TIME-BASED ACHIEVEMENTS
('ach_early_bird', 'Early Bird 🌅', 'Pick up before 9 AM (5 times)', '🌄', 'bronze', 'engagement', '{"type": "time", "before": "09:00", "count": 5}'::jsonb, 25, true),
('ach_night_owl', 'Night Owl 🦉', 'Pick up after 8 PM (5 times)', '🌙', 'bronze', 'engagement', '{"type": "time", "after": "20:00", "count": 5}'::jsonb, 25, true),
('ach_weekend_warrior', 'Weekend Warrior', 'Pick up 10 times on weekends', '🎉', 'silver', 'engagement', '{"type": "weekend", "count": 10}'::jsonb, 50, true),

-- SPECIAL ACHIEVEMENTS
('ach_first_week', 'First Week Complete', 'Be active for 7 days', '📅', 'bronze', 'milestone', '{"type": "active_days", "days": 7}'::jsonb, 50, true),
('ach_explorer', 'Explorer 🗺️', 'Try 5 different partners', '🧭', 'silver', 'engagement', '{"type": "unique_partners", "count": 5}'::jsonb, 75, true),
('ach_variety_seeker', 'Variety Seeker', 'Order from 3 different categories', '🎨', 'bronze', 'engagement', '{"type": "unique_categories", "count": 3}'::jsonb, 40, true),
('ach_loyal_customer', 'Loyal Customer', 'Order from same partner 10 times', '💚', 'silver', 'engagement', '{"type": "same_partner", "count": 10}'::jsonb, 100, true),
('ach_bargain_hunter', 'Bargain Hunter 🎯', 'Get 80%+ discount (5 times)', '🏷️', 'gold', 'savings', '{"type": "discount_percent", "min": 80, "count": 5}'::jsonb, 150, true),

-- MEGA ACHIEVEMENTS
('ach_complete_bronze', 'Bronze Complete', 'Unlock all bronze achievements', '🥉', 'silver', 'milestone', '{"type": "tier_complete", "tier": "bronze"}'::jsonb, 100, true),
('ach_complete_silver', 'Silver Complete', 'Unlock all silver achievements', '🥈', 'gold', 'milestone', '{"type": "tier_complete", "tier": "silver"}'::jsonb, 250, true),
('ach_complete_gold', 'Gold Complete', 'Unlock all gold achievements', '🥇', 'platinum', 'milestone', '{"type": "tier_complete", "tier": "gold"}'::jsonb, 500, true),
('ach_complete_all', 'Achievement Master', 'Unlock ALL achievements!', '🏅', 'platinum', 'milestone', '{"type": "all_achievements"}'::jsonb, 2000, true),

-- QUANTITY ACHIEVEMENTS
('ach_bulk_buyer', 'Bulk Buyer', 'Order 10+ items in single reservation', '📦', 'silver', 'milestone', '{"type": "single_order", "min_quantity": 10}'::jsonb, 75, true),
('ach_collector', 'Collector', 'Have 5 active reservations at once', '🗃️', 'gold', 'engagement', '{"type": "active_reservations", "count": 5}'::jsonb, 200, true),

-- ECO-FRIENDLY ACHIEVEMENTS
('ach_waste_warrior', 'Waste Warrior ♻️', 'Save 50 items from waste', '🌱', 'gold', 'engagement', '{"type": "items_saved", "count": 50}'::jsonb, 300, true),
('ach_eco_hero', 'Eco Hero 🌍', 'Save 100 items from waste', '🌍', 'platinum', 'engagement', '{"type": "items_saved", "count": 100}'::jsonb, 1000, true),

-- CONSISTENCY ACHIEVEMENTS
('ach_regular_user', 'Regular User', 'Active for 30 days', '📆', 'silver', 'engagement', '{"type": "active_days", "days": 30}'::jsonb, 150, true),
('ach_veteran', 'SmartPick Veteran', 'Member for 90 days', '🎖️', 'gold', 'milestone', '{"type": "active_days", "days": 90}'::jsonb, 400, true);

COMMIT;

-- ================================================
-- VERIFICATION QUERY
-- ================================================
-- Run this after to verify it worked:
SELECT 
  category,
  tier,
  COUNT(*) as count
FROM achievement_definitions
WHERE is_active = true
GROUP BY category, tier
ORDER BY category, tier;
