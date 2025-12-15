# NEW PENALTY SYSTEM - COMPLETE TESTING GUIDE

## Prerequisites
1. Run `SETUP_PENALTY_SYSTEM_FOR_TESTING.sql` in Supabase SQL Editor
2. Confirm Edge Function cron job is running (check Supabase Edge Functions logs)
3. Verify database is clean (no active penalties)

## Test Scenario 1: First Warning (Offense #1)
**Expected: Warning modal only, no suspension**

### Steps:
1. Create a reservation for an offer
2. Wait for pickup window to end (or manually set `pickup_end` to past in database)
3. Wait for cron job to run (every 5 minutes) OR manually run:
   ```sql
   -- Simulate missed pickup
   UPDATE reservations 
   SET status = 'FAILED_PICKUP'
   WHERE id = 'YOUR_RESERVATION_ID';
   
   -- Apply penalty manually
   INSERT INTO user_penalties (
     user_id, reservation_id, partner_id,
     offense_number, offense_type, penalty_type,
     is_active, acknowledged, can_lift_with_points, points_required
   ) VALUES (
     'YOUR_USER_ID',
     'YOUR_RESERVATION_ID',
     'PARTNER_ID',
     1, -- First offense
     'missed_pickup',
     'warning',
     true,
     false,
     false,
     0
   );
   ```

### Expected Results:
- ✅ Modal shows "⚠️ Missed Reservation Warning"
- ✅ Message: "This is your FIRST warning"
- ✅ "No penalty applied this time"
- ✅ Warning: "Next missed pickup will result in 1 hour suspension"
- ✅ "I Understand" button closes modal
- ✅ Can still make new reservations

---

## Test Scenario 2: 1-Hour Suspension (Offense #2)
**Expected: 1-hour ban with point lift option**

### Steps:
1. Create and miss another reservation
2. Wait for cron OR apply manually:
   ```sql
   INSERT INTO user_penalties (
     user_id, reservation_id, partner_id,
     offense_number, offense_type, penalty_type,
     suspended_until, is_active, acknowledged,
     can_lift_with_points, points_required
   ) VALUES (
     'YOUR_USER_ID',
     'YOUR_RESERVATION_ID',
     'PARTNER_ID',
     2, -- Second offense
     'missed_pickup',
     '1hour',
     NOW() + INTERVAL '1 hour',
     true,
     false,
     true,
     100
   );
   
   UPDATE users SET
     is_suspended = true,
     suspended_until = NOW() + INTERVAL '1 hour',
     current_penalty_level = 2
   WHERE id = 'YOUR_USER_ID';
   ```

### Expected Results:
- ✅ Modal shows "🚫 Account Suspended - Cannot Reserve"
- ✅ Live countdown timer showing time remaining
- ✅ "1 hour suspension (100 pts to lift)"
- ✅ **Option 1**: Pay 100 SmartPoints button (if user has enough points)
- ✅ **Option 2**: Request Partner Forgiveness button
- ✅ **Option 3**: Wait it out
- ✅ Cannot create new reservations until lifted/expired
- ✅ Trying to reserve shows penalty modal

---

## Test Scenario 3: Lift with Points
**Expected: Instant unban when paying points**

### Steps:
1. While under 1-hour suspension
2. Click "Pay 100 Points to Lift Ban"

### Expected Results:
- ✅ Points deducted from balance
- ✅ Penalty deactivated (`is_active = false`)
- ✅ `users.is_suspended = false`
- ✅ Transaction recorded in `penalty_point_transactions`
- ✅ Modal closes
- ✅ Can immediately make new reservations
- ✅ Toast: "✅ Ban lifted! New balance: X SmartPoints"

---

## Test Scenario 4: Partner Forgiveness Request
**Expected: User requests forgiveness, partner can grant/deny**

### User Steps:
1. While under suspension
2. Click "Request Partner Forgiveness"
3. Enter reason (20-500 chars): "I'm sorry, had emergency"
4. Submit

### Expected Results:
- ✅ `user_penalties.forgiveness_requested = true`
- ✅ `forgiveness_status = 'pending'`
- ✅ Modal shows "⏳ Forgiveness request pending"
- ✅ Still suspended while pending

### Partner Steps:
1. Go to Partner Dashboard → "Forgiveness Requests" tab
2. See pending request with user info and reason
3. Click "Grant" or "Deny"

### Expected Results (Grant):
- ✅ Penalty deactivated
- ✅ User unsuspended immediately
- ✅ `forgiveness_status = 'granted'`
- ✅ User gets notification
- ✅ Reliability score bonus

### Expected Results (Deny):
- ✅ `forgiveness_status = 'denied'`
- ✅ User remains suspended
- ✅ Must wait or use points

---

## Test Scenario 5: 24-Hour Suspension (Offense #3)
**Expected: Longer ban, higher point cost**

### Steps:
1. Miss third reservation
2. Apply penalty:
   ```sql
   INSERT INTO user_penalties (
     user_id, reservation_id, partner_id,
     offense_number, penalty_type,
     suspended_until, can_lift_with_points, points_required
   ) VALUES (
     'YOUR_USER_ID',
     'YOUR_RESERVATION_ID',
     'PARTNER_ID',
     3, '24hour',
     NOW() + INTERVAL '24 hours',
     true, 500
   );
   ```

### Expected Results:
- ✅ Modal shows 24-hour countdown
- ✅ "24 hour suspension (500 pts to lift)"
- ✅ Same lift/forgiveness options
- ✅ Warning: "🔴 Next offense: PERMANENT BAN"

---

## Test Scenario 6: Permanent Ban (Offense #4)
**Expected: Permanent ban requiring admin review**

### Steps:
1. Miss fourth reservation
2. Apply penalty:
   ```sql
   INSERT INTO user_penalties (
     user_id, reservation_id, partner_id,
     offense_number, penalty_type,
     can_lift_with_points
   ) VALUES (
     'YOUR_USER_ID',
     'YOUR_RESERVATION_ID',
     'PARTNER_ID',
     4, 'permanent', false
   );
   
   UPDATE users SET is_suspended = true, suspended_until = NULL;
   ```

### Expected Results:
- ✅ Modal shows "🔒 Permanent Ban"
- ✅ "Account permanently banned due to repeated missed reservations"
- ✅ "Contact support at support@smartpick.ge to appeal"
- ✅ NO point lift option
- ✅ NO forgiveness option (only admin can lift)
- ✅ Cannot make any reservations

---

## Test Scenario 7: Auto-Expiration
**Expected: Suspension auto-lifts when time expires**

### Steps:
1. Under 1-hour suspension
2. Wait for `suspended_until` time to pass
3. Try to make reservation OR app checks on load

### Expected Results:
- ✅ `can_user_reserve()` auto-detects expired suspension
- ✅ Sets `is_active = false`, `is_suspended = false`
- ✅ User can reserve immediately
- ✅ No manual action needed

---

## Test Scenario 8: Edge Function Auto-Detection
**Expected: Cron automatically detects missed pickups**

### Steps:
1. Create reservation
2. Don't pick up
3. Wait until after `pickup_end` time
4. Wait for cron (runs every 5 minutes)

### Expected Results:
- ✅ Cron detects ACTIVE reservation with pickup_end < NOW()
- ✅ Changes status to FAILED_PICKUP
- ✅ Creates penalty based on offense count
- ✅ Sends Telegram notification (if enabled)
- ✅ User sees modal on next app visit

---

## Verification Queries

```sql
-- Check user's current penalty status
SELECT 
  u.email,
  u.is_suspended,
  u.suspended_until,
  u.current_penalty_level,
  u.reliability_score,
  COUNT(up.id) as total_penalties,
  COUNT(CASE WHEN up.is_active THEN 1 END) as active_penalties
FROM users u
LEFT JOIN user_penalties up ON up.user_id = u.id
WHERE u.email = 'YOUR_EMAIL@gmail.com'
GROUP BY u.id;

-- Check offense history
SELECT * FROM penalty_offense_history
WHERE user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@gmail.com');

-- Check all penalties for user
SELECT 
  offense_number,
  penalty_type,
  is_active,
  acknowledged,
  suspended_until,
  can_lift_with_points,
  points_required,
  forgiveness_status,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@gmail.com')
ORDER BY created_at DESC;

-- Check point transactions
SELECT 
  points_spent,
  previous_balance,
  new_balance,
  created_at
FROM penalty_point_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@gmail.com')
ORDER BY created_at DESC;
```

---

## Success Criteria

✅ All 8 test scenarios pass
✅ Modal displays correct information for each offense level
✅ Point lifting works and deducts correctly
✅ Forgiveness workflow functions for both user and partner
✅ Auto-expiration works without manual intervention
✅ Edge Function cron detects missed pickups automatically
✅ Database maintains correct offense counts and history
✅ Reliability scores update appropriately
✅ No crashes or console errors
✅ Users can resume normal activity after penalty lifted
