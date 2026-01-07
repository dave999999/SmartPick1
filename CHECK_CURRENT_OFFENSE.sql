-- CHECK_CURRENT_OFFENSE.sql
-- Quick check of what offense number and penalty type you currently have

SELECT
  p.offense_number,
  p.penalty_type,
  p.can_lift_with_points,
  p.points_required,
  p.suspended_until AT TIME ZONE 'Asia/Tbilisi' as suspended_until_local,
  p.is_active,
  p.acknowledged,
  CASE p.penalty_type
    WHEN 'warning' THEN '→ Shows MissedPickupPopup (hearts display)'
    WHEN '1hour' THEN '→ Shows SuspensionModal (1h countdown + 100pt lift button)'
    WHEN '24hour' THEN '→ Shows SuspensionModal (24h countdown + 500pt lift button)'
    WHEN 'permanent' THEN '→ Shows AdminReviewModal (requires admin)'
    ELSE 'Unknown'
  END as expected_modal
FROM user_penalties p
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND p.is_active = TRUE
ORDER BY p.created_at DESC
LIMIT 1;
