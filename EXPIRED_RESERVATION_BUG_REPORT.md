# 🐛 Issue Report: Expired Reservation Showing as Active

## Problem Description
User **batumashvili.davit@gmail.com** has a reservation that:
- ✅ Was created with a 1-hour pickup window
- ✅ Has expired (more than 1 hour has passed)
- ❌ **Still shows in "My Picks > Active" tab**
- ❌ **Should show in "My Picks > History" tab instead**

---

## Root Cause Analysis

### How Reservation Expiration Works

1. **Reservation Creation** ([src/lib/api/reservations.ts:159](src/lib/api/reservations.ts#L159))
   ```typescript
   const expiresAt = new Date();
   expiresAt.setMinutes(expiresAt.getMinutes() + 60); // 1 hour
   ```
   - When user makes a reservation, `expires_at` is set to current time + 60 minutes
   - Initial status: `ACTIVE`

2. **Status Filtering** ([src/pages/MyPicks.tsx:408-409](src/pages/MyPicks.tsx#L408-L409))
   ```typescript
   const activeReservations = safeReservations.filter(r => r.status === 'ACTIVE');
   const historyReservations = safeReservations.filter(r => 
     ['PICKED_UP', 'EXPIRED', 'CANCELLED', 'FAILED_PICKUP'].includes(r.status)
   );
   ```
   - Active tab shows only reservations with `status = 'ACTIVE'`
   - History tab shows reservations with status in `['PICKED_UP', 'EXPIRED', 'CANCELLED', 'FAILED_PICKUP']`

3. **Auto-Expiration Function** ([AUTO_EXPIRE_ON_DEMAND.sql:5-37](AUTO_EXPIRE_ON_DEMAND.sql#L5-L37))
   ```sql
   CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
   RETURNS TABLE(expired_count INTEGER) AS $$
   BEGIN
     UPDATE reservations
     SET status = 'FAILED_PICKUP', updated_at = NOW()
     WHERE customer_id = p_user_id
       AND status = 'ACTIVE'
       AND expires_at < NOW()  -- 👈 Key condition
   END;
   $$
   ```
   - This function should automatically change `ACTIVE` → `FAILED_PICKUP` for expired reservations
   - Called when user opens My Picks page ([src/pages/MyPicks.tsx:150](src/pages/MyPicks.tsx#L150))

---

## Why The Bug Occurs

The reservation has:
- `expires_at` < current time ✅ (expired)
- `status` = 'ACTIVE' ❌ (should be 'FAILED_PICKUP')

**Possible causes:**

### Cause 1: Function Not Created in Database ⚠️ MOST LIKELY
The `expire_user_reservations()` function may not exist in the production database.

**How to verify:**
```sql
SELECT proname FROM pg_proc WHERE proname = 'expire_user_reservations';
```

**How to fix:**
Run [AUTO_EXPIRE_ON_DEMAND.sql](AUTO_EXPIRE_ON_DEMAND.sql) to create the function.

---

### Cause 2: Function Exists But Has Wrong Logic
The function exists but doesn't properly update status.

**How to verify:**
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'expire_user_reservations';
```
Should contain `SET status = 'FAILED_PICKUP'`

---

### Cause 3: Permission Issue
Function exists but isn't accessible to authenticated users.

**How to fix:**
```sql
GRANT EXECUTE ON FUNCTION expire_user_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION expire_user_reservations TO anon;
```

---

### Cause 4: Race Condition
Function runs but UI loads old/cached data before update completes.

**How to verify:**
Check if real-time subscription ([src/pages/MyPicks.tsx:56-70](src/pages/MyPicks.tsx#L56-L70)) is working.

---

## Immediate Fix (Manual)

To fix this specific user's reservation right now:

```sql
-- Run the diagnostic script first
-- File: FIX_EXPIRED_SHOWING_ACTIVE.sql

-- Then run manual fix if needed
UPDATE reservations
SET status = 'FAILED_PICKUP', updated_at = NOW()
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND status = 'ACTIVE'
  AND expires_at < NOW();
```

---

## Permanent Fix

### Step 1: Verify Function Exists
Run [DEBUG_BATUMASHVILI_RESERVATION.sql](DEBUG_BATUMASHVILI_RESERVATION.sql) to diagnose.

### Step 2: Create/Update Function
If missing or incorrect, run [AUTO_EXPIRE_ON_DEMAND.sql](AUTO_EXPIRE_ON_DEMAND.sql).

### Step 3: Grant Permissions
```sql
GRANT EXECUTE ON FUNCTION expire_user_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION expire_user_reservations TO anon;
```

### Step 4: Test
1. Have user refresh My Picks page
2. Old reservations should auto-expire
3. Verify they move from Active → History tab

---

## Files to Check

| File | Purpose | Line |
|------|---------|------|
| [src/pages/MyPicks.tsx](src/pages/MyPicks.tsx) | Calls expire function before loading | 150 |
| [src/pages/MyPicks.tsx](src/pages/MyPicks.tsx) | Filters active vs history | 408-409 |
| [src/lib/api/penalty.ts](src/lib/api/penalty.ts) | Frontend wrapper for expire RPC | 17-35 |
| [AUTO_EXPIRE_ON_DEMAND.sql](AUTO_EXPIRE_ON_DEMAND.sql) | Database function definition | 5-37 |
| [src/lib/api/reservations.ts](src/lib/api/reservations.ts) | Sets expires_at on creation | 159 |

---

## Expected Behavior After Fix

✅ User opens My Picks page  
✅ System automatically runs `expire_user_reservations()`  
✅ Expired reservations change from `ACTIVE` → `FAILED_PICKUP`  
✅ Frontend filters show them in History tab, not Active tab  
✅ Real-time updates notify user if status changes  

---

## Testing Checklist

- [ ] Run [DEBUG_BATUMASHVILI_RESERVATION.sql](DEBUG_BATUMASHVILI_RESERVATION.sql)
- [ ] Verify `expire_user_reservations` function exists
- [ ] Check function has correct logic (`FAILED_PICKUP` status)
- [ ] Verify permissions are granted
- [ ] Test with user's account
- [ ] Confirm expired reservations move to History
- [ ] Create new test reservation and verify it expires after 1 hour

---

## Summary

**The issue:** Reservation's `expires_at` timestamp is in the past, but `status` is still `'ACTIVE'`, so it shows in the wrong tab.

**The fix:** Ensure the `expire_user_reservations()` database function exists, has correct logic, and is being called when the user loads My Picks.

**Quick diagnosis:** Run [DEBUG_BATUMASHVILI_RESERVATION.sql](DEBUG_BATUMASHVILI_RESERVATION.sql)  
**Quick fix:** Run [FIX_EXPIRED_SHOWING_ACTIVE.sql](FIX_EXPIRED_SHOWING_ACTIVE.sql)
