# 🧪 Testing Guide: Cancellation Cooldown System

## Overview
After fixing the cancellation cooldown blocking bug, follow this guide to verify the system works correctly.

## Prerequisites
- Have an active reservation
- Access to Supabase dashboard (to manually check cooldown status if needed)
- Test user account

## Test Scenarios

### ✅ Scenario 1: First 3 Cancellations (Warnings Only)

**Steps:**
1. Make a reservation
2. Click "Cancel" button
3. Observe warning dialog
4. Confirm cancellation
5. Repeat 2 more times (total 3 cancellations)

**Expected Results:**
- **1st cancellation (count=0):** Info message - standard warning
- **2nd cancellation (count=1):** ⚠️ Warning message
- **3rd cancellation (count=2):** 🚨 Critical warning message
- All 3 cancellations should be **allowed**
- No cooldown triggered yet

---

### ✅ Scenario 2: 4th Cancellation (Final Allowed Cancel)

**Steps:**
1. After 3 cancellations, make another reservation
2. Click "Cancel" button
3. Observe dialog with count=3 message
4. Confirm cancellation

**Expected Results:**
- Dialog shows: **"😰 მე-4 გაუქმება"** (4th cancellation warning)
- Message explains this will trigger cooldown
- Cancellation is **still allowed** (this is the last one before cooldown)
- After confirming, **cooldown starts** for 1 hour

---

### 🚫 Scenario 3: 5th+ Cancellation (BLOCKED - In Cooldown)

**Steps:**
1. After 4th cancellation, cooldown should be active
2. Try to make a new reservation
3. Try to click "Cancel" button on the reservation

**Expected Results:**
- ❌ **Cancel dialog does NOT appear**
- ✅ Alert message appears instead:
  ```
  🚫 თქვენ გაქვთ შეზღუდვა [TIME]-მდე.
  
  გაუქმების ლიმიტი ამოიწურა დღეს. შეგიძლიათ დაელოდოთ შეზღუდვის მოხსნას, 
  ან გამოიყენოთ 100 ქულა შეზღუდვის დაუყოვნებლივ მოსახსნელად.
  ```
- ✅ Shows actual cooldown end time
- ✅ **Cannot proceed with cancellation**

---

### ⏰ Scenario 4: Cooldown Expires

**Steps:**
1. Wait for 1 hour after 4th cancellation
2. Cooldown should expire automatically
3. Try to make and cancel a new reservation

**Expected Results:**
- ✅ After 1 hour, cooldown status changes to `is_in_cooldown = FALSE`
- ✅ Can cancel reservations again
- ✅ Cancellation count should reset (new day in Georgia timezone)

---

### 💎 Scenario 5: Lift Cooldown with Points

**Steps:**
1. While in cooldown (after 4th cancel)
2. Go to profile/settings
3. Find "Lift Cooldown" option
4. Spend 100 points to lift cooldown

**Expected Results:**
- ✅ Cooldown is lifted immediately
- ✅ Can cancel reservations again (within daily limit)
- ✅ 100 points deducted from account

---

## Debug Verification

### Check Cooldown Status Manually

Run this query in Supabase SQL Editor:

```sql
-- Replace USER_ID with actual user UUID
SELECT * FROM is_user_in_cooldown('USER_ID');
```

**Expected Output:**
```
| is_in_cooldown | cooldown_end_time        | cancellation_count |
|----------------|--------------------------|-------------------|
| true/false     | 2024-01-15 14:30:00+04  | 4                |
```

### Check Cancellation Count

```sql
SELECT 
  user_id,
  COUNT(*) as cancel_count,
  MAX(cancelled_at) as last_cancel
FROM user_cancellation_tracking
WHERE user_id = 'USER_ID'
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = CURRENT_DATE AT TIME ZONE 'Asia/Tbilisi'
GROUP BY user_id;
```

---

## Browser Console Logs

When testing, open browser console and look for:

### When clicking Cancel button:
```
[ActiveReservationCard] Fetching cancellation count for user
[ActiveReservationCard] Cancellation warning: { cancellationCount: 3, warningLevel: 'final', ... }
[ActiveReservationCard] Cooldown check result: [{ is_in_cooldown: false, cooldown_end_time: null, cancellation_count: 3 }]
```

### When blocked (in cooldown):
```
[ActiveReservationCard] Cooldown check result: [{ is_in_cooldown: true, cooldown_end_time: '2024-01-15T14:30:00+04:00', cancellation_count: 4 }]
```

---

## Edge Cases to Test

### 🕐 Edge Case 1: Timezone Boundary
- Make 4 cancellations near midnight Georgia time (23:59)
- Verify cooldown respects Georgia timezone, not user's local time

### 🔄 Edge Case 2: Multiple Tabs
- Open app in 2 browser tabs
- Reach cooldown in tab 1
- Try to cancel in tab 2
- Should be blocked in both tabs

### 📱 Edge Case 3: App Restart
- Reach cooldown
- Close and reopen app
- Verify cooldown status persists
- Should still be blocked

### ⚡ Edge Case 4: Rapid Clicks
- Try clicking Cancel button multiple times rapidly
- Should not create race condition
- Dialog should appear only once or show error

---

## Success Criteria

✅ All 3 cancellations (1st, 2nd, 3rd) show progressive warnings  
✅ 4th cancellation is allowed but triggers cooldown  
✅ 5th+ cancellation attempts are blocked with error message  
✅ Cooldown end time is accurate (Georgia timezone)  
✅ Error message is clear and actionable  
✅ Cannot bypass blocking via rapid clicks or multiple tabs  
✅ Cooldown expires after 1 hour  
✅ Points-based cooldown lift works correctly  

---

## Troubleshooting

### Issue: Dialog still appears when in cooldown
**Solution:** Clear browser cache and reload app

### Issue: Cooldown time shows wrong timezone
**Solution:** Verify `Asia/Tbilisi` timezone is used in all date calculations

### Issue: Can still cancel after 4th cancellation
**Solution:** Check browser console for errors in `is_user_in_cooldown` RPC call

### Issue: Count resets during same day
**Solution:** Verify date comparison uses Georgia timezone, not UTC

---

## Report Template

After testing, document results:

```
Date Tested: [DATE]
Tester: [NAME]
User ID: [UUID]

Scenario 1 (First 3 cancels): ✅ PASS / ❌ FAIL
Scenario 2 (4th cancel): ✅ PASS / ❌ FAIL  
Scenario 3 (Blocked): ✅ PASS / ❌ FAIL
Scenario 4 (Cooldown expires): ✅ PASS / ❌ FAIL
Scenario 5 (Lift with points): ✅ PASS / ❌ FAIL

Notes:
[Any issues or observations]
```

---

## Next Steps After Testing

If all tests pass:
1. ✅ Deploy to production
2. ✅ Monitor Sentry/logs for errors
3. ✅ Watch for user complaints about blocking
4. ✅ Verify backend API also validates cooldown (recommended)

If tests fail:
1. ❌ Document failing scenario
2. ❌ Check browser console for errors
3. ❌ Verify database function `is_user_in_cooldown` returns correct data
4. ❌ Fix and re-test
