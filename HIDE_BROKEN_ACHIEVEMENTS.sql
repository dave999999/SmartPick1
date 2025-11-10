-- ================================================
-- OPTION: Hide Non-Working Achievements
-- Run this to temporarily disable achievements we can't track
-- ================================================

-- Mark non-working achievements as inactive (hide from UI)
UPDATE achievement_definitions
SET is_active = false
WHERE requirement->>'type' IN (
  'streak',           -- No streak tracking
  'referrals',        -- No referral system
  'category',         -- No category tracking
  'unique_partners',  -- No unique partner tracking
  'partner_loyalty',  -- No partner visit counts
  'time',             -- No time-based tracking
  'weekend',          -- No weekend tracking
  'active_days',      -- No activity tracking
  'same_partner',     -- No partner loyalty tracking
  'discount_percent', -- No discount tracking
  'tier_complete',    -- Can't check tier completion
  'all_achievements', -- Can't check all achievements
  'single_order',     -- No quantity tracking
  'active_reservations', -- No active count tracking
  'items_saved',      -- No items tracking
  'unique_categories' -- No category diversity tracking
);

-- Keep only working achievements active
UPDATE achievement_definitions
SET is_active = true
WHERE requirement->>'type' IN ('reservations', 'money_saved');

-- Verify what's left
SELECT 
  requirement->>'type' as type,
  tier,
  COUNT(*) as count
FROM achievement_definitions
WHERE is_active = true
GROUP BY requirement->>'type', tier
ORDER BY requirement->>'type', tier;

SELECT 'Non-working achievements hidden. Only 15 working achievements will show.' as status;
