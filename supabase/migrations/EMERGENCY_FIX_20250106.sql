-- ============================================
-- EMERGENCY FIX: Disable broken trigger, fix tables, re-enable
-- ============================================

-- STEP 1: Disable the trigger that's breaking signup
DROP TRIGGER IF EXISTS create_user_stats_trigger ON users;
DROP TRIGGER IF EXISTS update_stats_on_reservation ON reservations;

-- STEP 2: Ensure all tables exist properly
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_reservations INT DEFAULT 0 CHECK (total_reservations >= 0),
  total_money_saved DECIMAL(10, 2) DEFAULT 0.00 CHECK (total_money_saved >= 0),
  favorite_category TEXT,
  most_visited_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  current_streak_days INT DEFAULT 0 CHECK (current_streak_days >= 0),
  longest_streak_days INT DEFAULT 0 CHECK (longest_streak_days >= 0),
  last_activity_date DATE,
  total_referrals INT DEFAULT 0 CHECK (total_referrals >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'bronze',
  requirement JSONB NOT NULL,
  reward_points INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT REFERENCES achievement_definitions(id) NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  is_new BOOLEAN DEFAULT true,
  viewed_at TIMESTAMPTZ,
  UNIQUE(user_id, achievement_id)
);

-- STEP 3: Add referral fields if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
    ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
    ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- STEP 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_streak ON user_stats(current_streak_days DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- STEP 5: Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- STEP 6: Drop old policies and create new ones
DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;
DROP POLICY IF EXISTS "Service role can modify stats" ON user_stats;
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievement_definitions;
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Service role can modify achievements" ON user_achievements;

CREATE POLICY "Users can view their own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can modify stats"
  ON user_stats FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view achievements"
  ON achievement_definitions FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can modify achievements"
  ON user_achievements FOR ALL
  USING (auth.role() = 'service_role');

-- STEP 7: Seed achievements (only if not already seeded)
INSERT INTO achievement_definitions (id, name, description, icon, category, tier, requirement, reward_points) VALUES
  ('first_pick', 'First Pick', 'Made your first reservation', '🎯', 'milestone', 'bronze', '{"type": "reservations", "count": 1}', 10),
  ('getting_started', 'Getting Started', 'Made 5 reservations', '🌟', 'milestone', 'silver', '{"type": "reservations", "count": 5}', 25),
  ('bargain_hunter', 'Bargain Hunter', 'Made 10 reservations', '🎖️', 'milestone', 'gold', '{"type": "reservations", "count": 10}', 50),
  ('smart_saver', 'Smart Saver', 'Saved over ₾50 total', '💰', 'savings', 'gold', '{"type": "money_saved", "amount": 50}', 100),
  ('savvy_shopper', 'Savvy Shopper', 'Made 25 reservations', '👑', 'milestone', 'platinum', '{"type": "reservations", "count": 25}', 100),
  ('early_bird', 'Early Bird', 'Reserved 5 breakfast offers', '🌅', 'engagement', 'silver', '{"type": "category", "name": "breakfast", "count": 5}', 30),
  ('night_owl', 'Night Owl', 'Reserved 5 dinner offers', '🌙', 'engagement', 'silver', '{"type": "category", "name": "dinner", "count": 5}', 30),
  ('sweet_tooth', 'Sweet Tooth', 'Reserved 5 dessert offers', '🍰', 'engagement', 'silver', '{"type": "category", "name": "dessert", "count": 5}', 30),
  ('local_hero', 'Local Hero', 'Tried 10 different partners', '🏪', 'engagement', 'gold', '{"type": "unique_partners", "count": 10}', 100),
  ('loyal_customer', 'Loyal Customer', 'Returned to same partner 5 times', '❤️', 'engagement', 'silver', '{"type": "partner_loyalty", "count": 5}', 50),
  ('on_fire', 'On Fire', '3 day activity streak', '🔥', 'engagement', 'bronze', '{"type": "streak", "days": 3}', 20),
  ('unstoppable', 'Unstoppable', '7 day activity streak', '⚡', 'engagement', 'silver', '{"type": "streak", "days": 7}', 50),
  ('legendary', 'Legendary', '30 day activity streak', '🏆', 'engagement', 'platinum', '{"type": "streak", "days": 30}', 200),
  ('friend_magnet', 'Friend Magnet', 'Referred 5 friends', '👥', 'social', 'gold', '{"type": "referrals", "count": 5}', 100),
  ('influencer', 'Influencer', 'Referred 10 friends', '🌟', 'social', 'platinum', '{"type": "referrals", "count": 10}', 250)
ON CONFLICT (id) DO NOTHING;

-- STEP 8: Create or replace all functions
CREATE OR REPLACE FUNCTION init_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, last_activity_date)
  VALUES (NEW.id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_stats_on_reservation()
RETURNS TRIGGER AS $$
DECLARE
  v_money_saved DECIMAL(10, 2);
  v_offer_category TEXT;
BEGIN
  SELECT
    (o.original_price - o.smart_price) * NEW.quantity,
    o.category
  INTO v_money_saved, v_offer_category
  FROM offers o
  WHERE o.id = NEW.offer_id;

  UPDATE user_stats
  SET
    total_reservations = total_reservations + 1,
    total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
    last_activity_date = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  PERFORM update_user_streak(NEW.user_id);
  PERFORM check_user_achievements(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INT;
  v_longest_streak INT;
BEGIN
  SELECT last_activity_date, current_streak_days, longest_streak_days
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_stats
  WHERE user_id = p_user_id;

  IF v_last_activity = CURRENT_DATE THEN
    RETURN;
  END IF;

  IF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_activity < CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := 1;
  ELSE
    v_current_streak := 1;
  END IF;

  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  UPDATE user_stats
  SET
    current_streak_days = v_current_streak,
    longest_streak_days = v_longest_streak,
    last_activity_date = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_already_has BOOLEAN;
BEGIN
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;

  FOR v_achievement IN
    SELECT * FROM achievement_definitions WHERE is_active = true
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;

    IF v_already_has THEN
      CONTINUE;
    END IF;

    IF v_achievement.requirement->>'type' = 'reservations' THEN
      IF v_stats.total_reservations >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    ELSIF v_achievement.requirement->>'type' = 'money_saved' THEN
      IF v_stats.total_money_saved >= (v_achievement.requirement->>'amount')::DECIMAL THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    ELSIF v_achievement.requirement->>'type' = 'streak' THEN
      IF v_stats.current_streak_days >= (v_achievement.requirement->>'days')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    ELSIF v_achievement.requirement->>'type' = 'referrals' THEN
      IF v_stats.total_referrals >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 9: Grant permissions
GRANT EXECUTE ON FUNCTION init_user_stats TO service_role;
GRANT EXECUTE ON FUNCTION generate_referral_code TO service_role;
GRANT EXECUTE ON FUNCTION update_user_stats_on_reservation TO service_role;
GRANT EXECUTE ON FUNCTION update_user_streak TO service_role;
GRANT EXECUTE ON FUNCTION check_user_achievements TO service_role;

-- STEP 10: Re-enable triggers LAST (after everything else is ready)
CREATE TRIGGER create_user_stats_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION init_user_stats();

CREATE TRIGGER update_stats_on_reservation
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_reservation();

-- DONE! New signups should work now
