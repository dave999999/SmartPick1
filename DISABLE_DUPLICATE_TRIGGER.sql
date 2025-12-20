-- Disable the duplicate points holding trigger
-- The create_reservation_atomic function already handles points deduction
DROP TRIGGER IF EXISTS trg_hold_points_on_reservation ON reservations;

-- Verify it's gone
SELECT 
  'Trigger dropped!' as status,
  COUNT(*) as remaining_triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'reservations'
AND t.tgname = 'trg_hold_points_on_reservation';
