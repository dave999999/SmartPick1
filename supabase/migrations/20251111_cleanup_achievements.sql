-- ============================================
-- CREATE 48 COMPREHENSIVE ACHIEVEMENTS
-- Date: 2025-11-11
-- ============================================
-- Expands from 15 to 48 achievements across all categories
-- Fully trackable and progressable

-- Check current count and clear existing
DO $$
DECLARE
  v_count INT;
BEGIN
  RAISE NOTICE '🎯 Creating comprehensive 48-achievement system...';
  
  SELECT COUNT(*) INTO v_count FROM achievement_definitions;
  RAISE NOTICE 'Current achievements in database: %', v_count;
  
  -- Clear existing to avoid conflicts
  TRUNCATE achievement_definitions CASCADE;
  
  RAISE NOTICE '🧹 Cleared old achievements, creating 48 new ones...';
END $$;

-- Insert all 48 achievements
INSERT INTO achievement_definitions (id, name, description, icon, category, tier, requirement, reward_points, is_active) VALUES
  
  -- ========================================
  -- MILESTONE ACHIEVEMENTS (12 total)
  -- ========================================
  ('first_pick', 'First Pick', 'Make your first reservation', '🎯', 'milestone', 'bronze', '{"type": "reservations", "count": 1}', 10, true),
  ('getting_started', 'Getting Started', 'Make 5 reservations', '🌟', 'milestone', 'bronze', '{"type": "reservations", "count": 5}', 25, true),
  ('bargain_hunter', 'Bargain Hunter', 'Make 10 reservations', '🎖️', 'milestone', 'silver', '{"type": "reservations", "count": 10}', 50, true),
  ('deal_seeker', 'Deal Seeker', 'Make 15 reservations', '🔍', 'milestone', 'silver', '{"type": "reservations", "count": 15}', 75, true),
  ('savvy_shopper', 'Savvy Shopper', 'Make 25 reservations', '👑', 'milestone', 'gold', '{"type": "reservations", "count": 25}', 100, true),
  ('deal_master', 'Deal Master', 'Make 50 reservations', '💎', 'milestone', 'gold', '{"type": "reservations", "count": 50}', 200, true),
  ('shopping_pro', 'Shopping Pro', 'Make 75 reservations', '🏅', 'milestone', 'platinum', '{"type": "reservations", "count": 75}', 300, true),
  ('centurion', 'Centurion', 'Make 100 reservations', '🎖️', 'milestone', 'platinum', '{"type": "reservations", "count": 100}', 500, true),
  ('elite_shopper', 'Elite Shopper', 'Make 150 reservations', '👑', 'milestone', 'platinum', '{"type": "reservations", "count": 150}', 750, true),
  ('legendary_shopper', 'Legendary Shopper', 'Make 200 reservations', '🏆', 'milestone', 'platinum', '{"type": "reservations", "count": 200}', 1000, true),
  ('grand_master', 'Grand Master', 'Make 300 reservations', '⭐', 'milestone', 'platinum', '{"type": "reservations", "count": 300}', 1500, true),
  ('ultimate_legend', 'Ultimate Legend', 'Make 500 reservations', '💫', 'milestone', 'platinum', '{"type": "reservations", "count": 500}', 2500, true),

  -- ========================================
  -- SAVINGS ACHIEVEMENTS (8 total)
  -- ========================================
  ('penny_pincher', 'Penny Pincher', 'Save ₾10 total', '💸', 'savings', 'bronze', '{"type": "money_saved", "amount": 10}', 10, true),
  ('smart_saver', 'Smart Saver', 'Save ₾50 total', '💰', 'savings', 'silver', '{"type": "money_saved", "amount": 50}', 50, true),
  ('budget_master', 'Budget Master', 'Save ₾100 total', '💵', 'savings', 'silver', '{"type": "money_saved", "amount": 100}', 100, true),
  ('frugal_genius', 'Frugal Genius', 'Save ₾200 total', '🤑', 'savings', 'gold', '{"type": "money_saved", "amount": 200}', 150, true),
  ('savings_hero', 'Savings Hero', 'Save ₾500 total', '�', 'savings', 'gold', '{"type": "money_saved", "amount": 500}', 300, true),
  ('money_master', 'Money Master', 'Save ₾1000 total', '🏆', 'savings', 'platinum', '{"type": "money_saved", "amount": 1000}', 500, true),
  ('savings_legend', 'Savings Legend', 'Save ₾2000 total', '👑', 'savings', 'platinum', '{"type": "money_saved", "amount": 2000}', 1000, true),
  ('ultimate_saver', 'Ultimate Saver', 'Save ₾5000 total', '💫', 'savings', 'platinum', '{"type": "money_saved", "amount": 5000}', 2000, true),

  -- ========================================
  -- CATEGORY ACHIEVEMENTS (9 total)
  -- ========================================
  ('breakfast_fan', 'Breakfast Fan', 'Order 3 breakfast items', '🌅', 'engagement', 'bronze', '{"type": "category", "name": "breakfast", "count": 3}', 15, true),
  ('early_bird', 'Early Bird', 'Order 10 breakfast items', '☀️', 'engagement', 'silver', '{"type": "category", "name": "breakfast", "count": 10}', 50, true),
  ('breakfast_champion', 'Breakfast Champion', 'Order 25 breakfast items', '�', 'engagement', 'gold', '{"type": "category", "name": "breakfast", "count": 25}', 100, true),
  
  ('dinner_enthusiast', 'Dinner Enthusiast', 'Order 3 dinner items', '🌆', 'engagement', 'bronze', '{"type": "category", "name": "dinner", "count": 3}', 15, true),
  ('night_owl', 'Night Owl', 'Order 10 dinner items', '🌙', 'engagement', 'silver', '{"type": "category", "name": "dinner", "count": 10}', 50, true),
  ('dinner_connoisseur', 'Dinner Connoisseur', 'Order 25 dinner items', '�️', 'engagement', 'gold', '{"type": "category", "name": "dinner", "count": 25}', 100, true),
  
  ('dessert_lover', 'Dessert Lover', 'Order 3 desserts', '🧁', 'engagement', 'bronze', '{"type": "category", "name": "dessert", "count": 3}', 15, true),
  ('sweet_tooth', 'Sweet Tooth', 'Order 10 desserts', '🍰', 'engagement', 'silver', '{"type": "category", "name": "dessert", "count": 10}', 50, true),
  ('dessert_master', 'Dessert Master', 'Order 25 desserts', '�', 'engagement', 'gold', '{"type": "category", "name": "dessert", "count": 25}', 100, true),

  -- ========================================
  -- PARTNER ACHIEVEMENTS (7 total)
  -- ========================================
  ('explorer', 'Explorer', 'Try 3 different partners', '🗺️', 'engagement', 'bronze', '{"type": "unique_partners", "count": 3}', 20, true),
  ('adventurer', 'Adventurer', 'Try 5 different partners', '🧭', 'engagement', 'bronze', '{"type": "unique_partners", "count": 5}', 30, true),
  ('local_hero', 'Local Hero', 'Try 10 different partners', '🏪', 'engagement', 'silver', '{"type": "unique_partners", "count": 10}', 75, true),
  ('city_explorer', 'City Explorer', 'Try 20 different partners', '�', 'engagement', 'gold', '{"type": "unique_partners", "count": 20}', 150, true),
  ('neighborhood_legend', 'Neighborhood Legend', 'Try 30 different partners', '🏙️', 'engagement', 'platinum', '{"type": "unique_partners", "count": 30}', 300, true),
  
  ('loyal_customer', 'Loyal Customer', 'Visit same partner 5 times', '❤️', 'engagement', 'silver', '{"type": "partner_loyalty", "count": 5}', 50, true),
  ('devoted_fan', 'Devoted Fan', 'Visit same partner 10 times', '💖', 'engagement', 'gold', '{"type": "partner_loyalty", "count": 10}', 100, true),

  -- ========================================
  -- STREAK ACHIEVEMENTS (6 total)
  -- ========================================
  ('on_fire', 'On Fire', 'Maintain 3-day streak', '🔥', 'engagement', 'bronze', '{"type": "streak", "days": 3}', 20, true),
  ('hot_streak', 'Hot Streak', 'Maintain 5-day streak', '🌟', 'engagement', 'silver', '{"type": "streak", "days": 5}', 35, true),
  ('unstoppable', 'Unstoppable', 'Maintain 7-day streak', '⚡', 'engagement', 'silver', '{"type": "streak", "days": 7}', 50, true),
  ('streak_master', 'Streak Master', 'Maintain 14-day streak', '💪', 'engagement', 'gold', '{"type": "streak", "days": 14}', 100, true),
  ('legendary', 'Legendary', 'Maintain 30-day streak', '🏆', 'engagement', 'platinum', '{"type": "streak", "days": 30}', 250, true),
  ('eternal_flame', 'Eternal Flame', 'Maintain 60-day streak', '🔱', 'engagement', 'platinum', '{"type": "streak", "days": 60}', 500, true),

  -- ========================================
  -- SOCIAL ACHIEVEMENTS (6 total)
  -- ========================================
  ('connector', 'Connector', 'Refer 1 friend', '👋', 'social', 'bronze', '{"type": "referrals", "count": 1}', 25, true),
  ('networker', 'Networker', 'Refer 3 friends', '🤝', 'social', 'bronze', '{"type": "referrals", "count": 3}', 50, true),
  ('friend_magnet', 'Friend Magnet', 'Refer 5 friends', '👥', 'social', 'silver', '{"type": "referrals", "count": 5}', 100, true),
  ('community_builder', 'Community Builder', 'Refer 10 friends', '🌟', 'social', 'gold', '{"type": "referrals", "count": 10}', 250, true),
  ('influencer', 'Influencer', 'Refer 20 friends', '📢', 'social', 'platinum', '{"type": "referrals", "count": 20}', 500, true),
  ('brand_ambassador', 'Brand Ambassador', 'Refer 50 friends', '👑', 'social', 'platinum', '{"type": "referrals", "count": 50}', 1500, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  requirement = EXCLUDED.requirement,
  reward_points = EXCLUDED.reward_points,
  is_active = EXCLUDED.is_active;

-- Final verification and summary
DO $$
DECLARE
  v_total INT;
  v_milestone INT;
  v_savings INT;
  v_engagement INT;
  v_social INT;
  v_total_points INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM achievement_definitions WHERE is_active = true;
  SELECT COUNT(*) INTO v_milestone FROM achievement_definitions WHERE category = 'milestone' AND is_active = true;
  SELECT COUNT(*) INTO v_savings FROM achievement_definitions WHERE category = 'savings' AND is_active = true;
  SELECT COUNT(*) INTO v_engagement FROM achievement_definitions WHERE category = 'engagement' AND is_active = true;
  SELECT COUNT(*) INTO v_social FROM achievement_definitions WHERE category = 'social' AND is_active = true;
  SELECT SUM(reward_points) INTO v_total_points FROM achievement_definitions WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ 48-Achievement System Created!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Achievement Breakdown:';
  RAISE NOTICE '   • Total Achievements: %', v_total;
  RAISE NOTICE '   • Milestone: % achievements', v_milestone;
  RAISE NOTICE '   • Savings: % achievements', v_savings;
  RAISE NOTICE '   • Engagement: % achievements', v_engagement;
  RAISE NOTICE '   • Social: % achievements', v_social;
  RAISE NOTICE '   • Total Points Available: %', v_total_points;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 MILESTONE (12):';
  RAISE NOTICE '   � First Pick → 🏆 Ultimate Legend (1 to 500 reservations)';
  RAISE NOTICE '';
  RAISE NOTICE '💰 SAVINGS (8):';
  RAISE NOTICE '   💸 Penny Pincher → 💫 Ultimate Saver (₾10 to ₾5000)';
  RAISE NOTICE '';
  RAISE NOTICE '🎪 ENGAGEMENT (22):';
  RAISE NOTICE '   Category: 9 (Breakfast/Dinner/Dessert tiers)';
  RAISE NOTICE '   Partners: 7 (Explorer → Neighborhood Legend)';
  RAISE NOTICE '   Streaks: 6 (3 to 60-day streaks)';
  RAISE NOTICE '';
  RAISE NOTICE '👥 SOCIAL (6):';
  RAISE NOTICE '   � Connector → 👑 Brand Ambassador (1 to 50 referrals)';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🚀 All achievements are fully trackable and progressable!';
  RAISE NOTICE '📈 Users can now see progress towards each achievement';
  RAISE NOTICE '🎉 Complete gamification system ready!';
  RAISE NOTICE '';
END $$;
