-- ============================================
-- CLEAN UP DUPLICATE ACHIEVEMENTS
-- Date: 2025-11-11
-- ============================================
-- Removes any duplicate or inactive achievements
-- Ensures only the canonical 15 achievements exist

BEGIN;

RAISE NOTICE '🧹 Cleaning up achievement definitions...';

-- Check current count
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM achievement_definitions;
  RAISE NOTICE 'Current achievements in database: %', v_count;
END $$;

-- Remove any achievements not in the canonical list
DELETE FROM achievement_definitions
WHERE id NOT IN (
  'first_pick',
  'getting_started',
  'bargain_hunter',
  'smart_saver',
  'savvy_shopper',
  'early_bird',
  'night_owl',
  'sweet_tooth',
  'local_hero',
  'loyal_customer',
  'on_fire',
  'unstoppable',
  'legendary',
  'friend_magnet',
  'influencer'
);

-- Show what was deleted
DO $$
DECLARE
  v_deleted INT;
  v_remaining INT;
BEGIN
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  SELECT COUNT(*) INTO v_remaining FROM achievement_definitions;
  
  RAISE NOTICE 'Deleted % invalid achievements', v_deleted;
  RAISE NOTICE 'Remaining achievements: %', v_remaining;
END $$;

-- Ensure all canonical achievements exist with correct data
INSERT INTO achievement_definitions (id, name, description, icon, category, tier, requirement, reward_points, is_active) VALUES
  -- Milestone Achievements (Bronze to Platinum)
  ('first_pick', 'First Pick', 'Made your first reservation', '🎯', 'milestone', 'bronze', '{"type": "reservations", "count": 1}', 10, true),
  ('getting_started', 'Getting Started', 'Made 5 reservations', '🌟', 'milestone', 'silver', '{"type": "reservations", "count": 5}', 25, true),
  ('bargain_hunter', 'Bargain Hunter', 'Made 10 reservations', '🎖️', 'milestone', 'gold', '{"type": "reservations", "count": 10}', 50, true),
  ('savvy_shopper', 'Savvy Shopper', 'Made 25 reservations', '👑', 'milestone', 'platinum', '{"type": "reservations", "count": 25}', 100, true),

  -- Savings Achievements
  ('smart_saver', 'Smart Saver', 'Saved over ₾50 total', '💰', 'savings', 'gold', '{"type": "money_saved", "amount": 50}', 100, true),

  -- Category Achievements (Engagement)
  ('early_bird', 'Early Bird', 'Reserved 5 breakfast offers', '🌅', 'engagement', 'silver', '{"type": "category", "name": "breakfast", "count": 5}', 30, true),
  ('night_owl', 'Night Owl', 'Reserved 5 dinner offers', '🌙', 'engagement', 'silver', '{"type": "category", "name": "dinner", "count": 5}', 30, true),
  ('sweet_tooth', 'Sweet Tooth', 'Reserved 5 dessert offers', '🍰', 'engagement', 'silver', '{"type": "category", "name": "dessert", "count": 5}', 30, true),

  -- Partner Achievements (Engagement)
  ('local_hero', 'Local Hero', 'Tried 10 different partners', '🏪', 'engagement', 'gold', '{"type": "unique_partners", "count": 10}', 100, true),
  ('loyal_customer', 'Loyal Customer', 'Returned to same partner 5 times', '❤️', 'engagement', 'silver', '{"type": "partner_loyalty", "count": 5}', 50, true),

  -- Streak Achievements (Engagement)
  ('on_fire', 'On Fire', '3 day activity streak', '🔥', 'engagement', 'bronze', '{"type": "streak", "days": 3}', 20, true),
  ('unstoppable', 'Unstoppable', '7 day activity streak', '⚡', 'engagement', 'silver', '{"type": "streak", "days": 7}', 50, true),
  ('legendary', 'Legendary', '30 day activity streak', '🏆', 'engagement', 'platinum', '{"type": "streak", "days": 30}', 200, true),

  -- Social Achievements
  ('friend_magnet', 'Friend Magnet', 'Referred 5 friends', '👥', 'social', 'gold', '{"type": "referrals", "count": 5}', 100, true),
  ('influencer', 'Influencer', 'Referred 10 friends', '🌟', 'social', 'platinum', '{"type": "referrals", "count": 10}', 250, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  requirement = EXCLUDED.requirement,
  reward_points = EXCLUDED.reward_points,
  is_active = EXCLUDED.is_active;

-- Final verification
DO $$
DECLARE
  v_rec RECORD;
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM achievement_definitions WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Achievement cleanup complete!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Final Count: % active achievements', v_total;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Achievement List:';
  RAISE NOTICE '';
  RAISE NOTICE '   MILESTONE (4):';
  RAISE NOTICE '   🎯 First Pick (1 res, +10pts)';
  RAISE NOTICE '   🌟 Getting Started (5 res, +25pts)';
  RAISE NOTICE '   🎖️ Bargain Hunter (10 res, +50pts)';
  RAISE NOTICE '   👑 Savvy Shopper (25 res, +100pts)';
  RAISE NOTICE '';
  RAISE NOTICE '   SAVINGS (1):';
  RAISE NOTICE '   💰 Smart Saver (₾50 saved, +100pts)';
  RAISE NOTICE '';
  RAISE NOTICE '   ENGAGEMENT (8):';
  RAISE NOTICE '   🌅 Early Bird (5 breakfast, +30pts)';
  RAISE NOTICE '   🌙 Night Owl (5 dinner, +30pts)';
  RAISE NOTICE '   🍰 Sweet Tooth (5 dessert, +30pts)';
  RAISE NOTICE '   🏪 Local Hero (10 partners, +100pts)';
  RAISE NOTICE '   ❤️ Loyal Customer (5x same partner, +50pts)';
  RAISE NOTICE '   🔥 On Fire (3 day streak, +20pts)';
  RAISE NOTICE '   ⚡ Unstoppable (7 day streak, +50pts)';
  RAISE NOTICE '   🏆 Legendary (30 day streak, +200pts)';
  RAISE NOTICE '';
  RAISE NOTICE '   SOCIAL (2):';
  RAISE NOTICE '   👥 Friend Magnet (5 referrals, +100pts)';
  RAISE NOTICE '   🌟 Influencer (10 referrals, +250pts)';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Total points available: 1,155';
  RAISE NOTICE '';
END $$;

COMMIT;
