# 📊 DETAILED REPORT: MISSED/EXPIRED RESERVATION SYSTEM
## User: batumashvili.davit@gmail.com
**Date**: December 26, 2025

---

## 🎯 EXECUTIVE SUMMARY

When a user **fails to pick up** their reserved offer within the designated time window (1 hour), the system automatically marks the reservation as **FAILED_PICKUP** and applies penalties. This system is designed to discourage no-shows and ensure fair access to offers.

---

## ⏰ RESERVATION TIMELINE

### 1️⃣ **RESERVATION CREATED** ✅
**File**: `src/lib/api/reservations.ts` (Line 154-155)

```typescript
// Set expiration to 1 hour from now
const expiresAt = new Date();
expiresAt.setMinutes(expiresAt.getMinutes() + RESERVATION_HOLD_MINUTES);
// RESERVATION_HOLD_MINUTES = 60 (1 hour)
```

**What happens:**
- User reserves an offer (pays 5 points per item)
- System generates unique QR code
- Reservation status = `ACTIVE`
- **expires_at** = Current time + 60 minutes
- Points are held in escrow (not spent yet)
- Offer quantity is decremented

**Database**: 
- Table: `reservations`
- Status: `ACTIVE`
- Field: `expires_at` (timestamp)

---

### 2️⃣ **USER HAS 1 HOUR TO PICK UP** ⏳

**Frontend Timer**: `src/components/reservation/ActiveReservationCard.tsx` (Line 108-137)

```typescript
function useCountdown(expiresAt: string | null) {
  // Updates every second
  // Shows: MM:SS format
  // Color coding:
  //   - Green: > 15 minutes remaining
  //   - Orange: 5-15 minutes remaining  
  //   - Red: < 5 minutes remaining
}
```

**What user sees:**
- Live countdown timer showing MM:SS
- Color changes as time runs out
- Warning messages at 15, 5 minutes
- Navigation button to partner location
- QR code to show partner

**Notifications**:
- 15-minute reminder (if enabled)
- 5-minute warning

---

### 3️⃣ **RESERVATION EXPIRES** ⚠️

**When**: `expires_at < NOW()` (1 hour has passed)

**Automatic Expiration Function**: `AUTO_EXPIRE_ON_DEMAND.sql`

```sql
CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS TABLE(expired_count INTEGER) AS $$
BEGIN
  -- Mark user's expired reservations as FAILED_PICKUP
  WITH expired AS (
    UPDATE reservations
    SET status = 'FAILED_PICKUP', updated_at = NOW()
    WHERE customer_id = p_user_id
      AND status = 'ACTIVE'
      AND expires_at < NOW()  -- KEY CHECK: Is time expired?
    RETURNING id, quantity, offer_id
  )
  -- Restore offer quantities
  UPDATE offers o
  SET quantity_available = quantity_available + e.quantity
  FROM expired e
  WHERE o.id = e.offer_id
  
  -- Increment penalty count
  UPDATE users 
  SET penalty_count = COALESCE(penalty_count, 0) + v_count
  WHERE id = p_user_id;
END;
```

**What happens automatically:**
1. ✅ Reservation status changes: `ACTIVE` → `FAILED_PICKUP`
2. ✅ Offer quantity restored (becomes available again)
3. ✅ User's `penalty_count` incremented (+1)
4. ❌ **Points are LOST** (not refunded)
5. ⚠️ User record updated with failed pickup

---

## 🚨 PENALTY SYSTEM FOR MISSED PICKUPS

### Database Structure

**Table**: `users`
- `penalty_count` (integer) - Total failed pickups
- `is_suspended` (boolean) - Is user currently banned?
- `suspended_until` (timestamp) - When suspension ends

**Status Types**:
- `ACTIVE` - Reservation is valid, timer running
- `PICKED_UP` - User successfully picked up (partner scanned QR)
- `FAILED_PICKUP` - User didn't pick up in time (EXPIRED)
- `CANCELLED` - User manually cancelled
- `EXPIRED` - Old status (now uses FAILED_PICKUP)

---

### Current Penalty Rules

Based on `IMPLEMENT_PENALTY_SYSTEM_COMPLETE.sql` and archive files:

**✅ GENEROUS 3-WARNING SYSTEM (User-Friendly):**

| Failed Pickups | Consequence | Suspension | Can Lift? | Lift Cost | Notes |
|---------------|-------------|------------|-----------|-----------|-------|
| 1st | ⚠️ **Warning only** | NO | N/A | 0 | First chance - stay careful! 💛 |
| 2nd | ⚠️ **Warning only** | NO | N/A | 0 | Second chance - be more careful! 🧡 |
| 3rd | ⚠️ **Warning only** | NO | N/A | 0 | **LAST WARNING** - Next time = suspension! 🔴 |
| 4th | 1-hour suspension | YES | ✅ Yes | 100 pts | Can wait or lift with points |
| 5th | 24-hour suspension | YES | ✅ Yes | 500 pts | More severe penalty |
| 6th+ | **PERMANENT BAN** | YES | ❌ No | N/A | Account status = `BANNED` |

**Key Benefits:**
- ✅ **Three free chances** before any punishment
- ✅ Users can make mistakes without fear
- ✅ Partner can **forgive** customers (removes penalty)
- ✅ Generous system encourages app usage
- ✅ Only repeat offenders get banned (6+ missed pickups)

**Penalty Tracking**:
```sql
-- Check user's failed pickups (last 30 days)
SELECT COUNT(*) as noshow_count
FROM reservations r
WHERE status = 'FAILED_PICKUP'
  AND customer_id = user_id
  AND updated_at > NOW() - INTERVAL '30 days'
```

---

## 🔄 HOW EXPIRATION IS TRIGGERED

### Method 1: **On-Demand (Current Implementation)** ✅

Called when user tries to make a new reservation:

```sql
-- File: AUTO_EXPIRE_ON_DEMAND.sql
-- Function: can_user_reserve()

BEGIN
  -- First, auto-expire any old reservations for this user
  PERFORM expire_user_reservations(p_user_id);
  
  -- Then check if user is allowed to reserve
  -- (checks penalties, cooldowns, active reservations)
END;
```

**Trigger Points:**
1. User tries to create new reservation
2. User loads "My Picks" page
3. Partner checks reservation status
4. Manual admin check

**Advantage**: No cron job needed, runs on-demand
**Disadvantage**: Expired reservations may sit for a while

---

### Method 2: **Scheduled Cron Job** (Optional)

```sql
-- File: supabase/migrations/20251113_failed_pickup_penalty_system.sql

CREATE OR REPLACE FUNCTION auto_expire_failed_pickups()
RETURNS TABLE(reservation_id UUID, user_id UUID, penalty_applied BOOLEAN) AS $$
BEGIN
  FOR v_rec IN 
    SELECT r.id, r.customer_id, r.quantity, r.offer_id
    FROM reservations r
    WHERE r.status = 'ACTIVE'
      AND r.expires_at < NOW()  -- Find all expired
  LOOP
    -- Mark as failed pickup
    UPDATE reservations 
    SET status = 'FAILED_PICKUP' 
    WHERE id = v_rec.res_id;
    
    -- Increment penalty counter
    UPDATE users 
    SET penalty_count = COALESCE(penalty_count, 0) + 1 
    WHERE id = v_rec.customer_id;
    
    -- Restore offer quantity
    UPDATE offers 
    SET quantity_available = quantity_available + v_rec.quantity
    WHERE id = v_rec.offer_id;
  END LOOP;
END;
```

**Scheduling** (if pg_cron extension enabled):
```sql
SELECT cron.schedule(
  'auto-expire-failed-pickups',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT * FROM auto_expire_failed_pickups()$$
);
```

---

## 💡 USER EXPERIENCE FLOW

### Scenario: User Doesn't Pick Up in Time

**Timeline:**

```
00:00 - User reserves offer
        └─ Status: ACTIVE
        └─ Timer: 60:00
        └─ Points: -5 (held in escrow)

00:45 - 15 minutes remaining
        └─ Notification: "Don't forget to pick up!"
        └─ Timer color: Orange

00:55 - 5 minutes remaining  
        └─ Timer color: Red
        └─ Warning: "Hurry! Time running out"

01:00 - TIME EXPIRED ⚠️
        └─ Status: ACTIVE → FAILED_PICKUP
        └─ Points: LOST (not refunded)
        └─ Penalty: +1 to penalty_count
        └─ Offer quantity: Restored

01:01 - User tries to make new reservation
        └─ System calls: expire_user_reservations()
        └─ Checks: penalty_count, is_suspended
        └─ Decision: Allow or Block
```

**Frontend Detection**: `src/components/reservation/ActiveReservationCard.tsx` (Line 570-576)

```typescript
// Auto-expire handler
useEffect(() => {
  if (isExpired && reservation) {
    onExpired();  // Triggers refresh and shows toast
  }
}, [isExpired, reservation, onExpired]);
```

---

## 📋 CHECK CURRENT SYSTEM STATUS

### SQL Queries to Monitor

**1. Check All Failed Pickups (Last 30 Days)**:
```sql
SELECT 
  u.email,
  u.penalty_count,
  u.is_suspended,
  u.suspended_until,
  COUNT(r.id) as failed_pickups_30d,
  MAX(r.updated_at) as last_failed_pickup
FROM users u
LEFT JOIN reservations r ON r.customer_id = u.id 
  AND r.status = 'FAILED_PICKUP'
  AND r.updated_at > NOW() - INTERVAL '30 days'
WHERE u.email = 'batumashvili.davit@gmail.com'
GROUP BY u.id, u.email, u.penalty_count, u.is_suspended, u.suspended_until;
```

**2. Check Currently Expired But Not Marked**:
```sql
SELECT 
  r.id,
  r.status,
  r.created_at,
  r.expires_at,
  EXTRACT(EPOCH FROM (NOW() - r.expires_at))/60 as minutes_since_expired,
  o.title as offer_title
FROM reservations r
JOIN offers o ON o.id = r.offer_id
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND r.status = 'ACTIVE'
  AND r.expires_at < NOW();
```

**3. Run Manual Expiration**:
```sql
-- Force expire all old reservations for this user
SELECT expire_user_reservations(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);
```

---

## 🔍 KEY FILES & LOCATIONS

### Backend (Database)
1. **Auto Expiration**: `AUTO_EXPIRE_ON_DEMAND.sql`
   - Function: `expire_user_reservations()`
   - Function: `can_user_reserve()`

2. **Penalty System**: `supabase/migrations/20251113_failed_pickup_penalty_system.sql`
   - Function: `auto_expire_failed_pickups()`
   - Enum: `FAILED_PICKUP` status

3. **Penalty Checking**: `CHECK_EXPIRED_RESERVATIONS.sql`
   - Diagnostic queries
   - Manual expiration triggers

### Frontend (TypeScript/React)
1. **Countdown Timer**: `src/components/reservation/ActiveReservationCard.tsx`
   - Hook: `useCountdown()` (Line 108-137)
   - Auto-expire detection (Line 570-576)

2. **Reservation API**: `src/lib/api/reservations.ts`
   - Expiration time calculation (Line 154-155)
   - Status checking (Line 92-119)

3. **History Display**: `src/pages/ReservationHistory.tsx`
   - Shows `FAILED_PICKUP` status (Line 186-192)
   - Status icon: Red alert with "Failed" label

4. **Partner View**: `src/components/partner/EnhancedActiveReservations.tsx`
   - Shows expired reservations
   - "No-Show" action button (Line 167-178)

---

## 🛡️ SECURITY & ANTI-ABUSE MEASURES

### 1. **Cooldown System** (For Cancellations)
**File**: `UPDATE_COOLDOWN_TO_1_HOUR.sql`

```sql
-- If user cancels 3 times in 30 minutes
-- → BLOCKED from making reservations for 1 HOUR
```

**Not the same as FAILED_PICKUP, but related:**
- Cancellations: User actively cancels
- Failed Pickups: User passively doesn't show up
- Both tracked separately

### 2. **Automatic Points Loss**
- **Cancellations**: All points lost (penalty)
- **Failed Pickups**: All points lost (penalty)
- **Successful Pickup**: Points refunded + bonus

### 3. **Progressive Bans**
- Prevents repeat offenders
- Temporary suspensions before permanent ban
- Auto-lifts expired suspensions

---

## 📊 CURRENT STATUS FOR batumashvili.davit@gmail.com

Based on your query results:

**Points Balance:**
- User Points: 1,000
- Partner Points: 420
- Partner Status: APPROVED

**Recent Activity:**
- 10 reservations created (all -5 points each)
- All on December 25, 2025
- Latest: 20:36:46 UTC

**To Check Missed Pickups:**
Run the query I created: `CHECK_BATUMASHVILI_POINTS.sql`

Look for:
- Any reservations with status = `FAILED_PICKUP`
- Current `penalty_count` value
- `is_suspended` status

---

## 🎯 RECOMMENDATIONS

### For Users:
1. ✅ Always arrive within the 1-hour window
2. ✅ Enable push notifications for reminders
3. ✅ Cancel early if you can't make it (still lose points, but less penalty)
4. ⚠️ Avoid multiple failed pickups (leads to suspension)

### For Partners:
1. Can mark reservations as "No-Show" after expiration
2. This helps clean up the system
3. Can **"forgive"** customers (removes penalty entirely!)
   - Found in partner dashboard
   - Decrements user's penalty count
   - Customer can make reservations immediately
   - Shows goodwill and builds loyalty

### For System:
1. ✅ **Already generous**: 3 free warnings before any penalty
2. Consider grace period (5-10 minutes) after 1 hour
3. Send more aggressive reminders at 10, 5, 2 minutes
4. Implement SMS alerts for critical users
5. Add "running late" feature (extend timer once)

---

## 🔧 TESTING & DEBUGGING

### Manually Test Expiration:
```sql
-- 1. Create a test reservation with past expiry
UPDATE reservations
SET expires_at = NOW() - INTERVAL '5 minutes'
WHERE id = 'YOUR_RESERVATION_ID';

-- 2. Run expiration function
SELECT expire_user_reservations('USER_ID');

-- 3. Check result
SELECT status, penalty_count FROM reservations r
JOIN users u ON u.id = r.customer_id
WHERE r.id = 'YOUR_RESERVATION_ID';
```

### Check System Health:
```sql
-- Run: TEST_PENALTY_SYSTEM.sql
-- Shows comprehensive system status including:
-- - Failed pickups (30 days)
-- - Banned users
-- - Suspended users
-- - Penalty distribution
```

---

## 📝 TERMINOLOGY CLARIFICATION

| Term | Status | Meaning |
|------|--------|---------|
| **Expired** | `FAILED_PICKUP` | Time ran out, user didn't show |
| **Cancelled** | `CANCELLED` | User manually cancelled |
| **Picked Up** | `PICKED_UP` | Success! Partner scanned QR |
| **No-Show** | `FAILED_PICKUP` | Same as expired (old term) |
| **Missed Pickup** | `FAILED_PICKUP` | Same as expired (used in docs) |

**Database officially uses**: `FAILED_PICKUP`
**User-facing terms**: "Expired" or "Missed"

---

## 🚀 SUMMARY

**Current System:**
- ✅ Reservations expire after 1 hour
- ✅ Automatic marking as `FAILED_PICKUP`
- ✅ **GENEROUS: 3 free warnings** before any penalty (user-friendly!)
- ✅ 4th miss = 1-hour suspension (can lift with 100 points)
- ✅ 5th miss = 24-hour suspension (can lift with 500 points)
- ✅ 6th+ miss = permanent ban
- ✅ Points are lost (not refunded)
- ✅ Offer quantity restored
- ✅ On-demand expiration (no cron needed)
- ✅ **Partner can forgive customers** (removes penalties)
- ✅ Forgiveness system encourages goodwill

**User batumashvili.davit@gmail.com:**
- Has made 10 recent reservations
- All deducted 5 points each
- Current balance: 1,000 user points, 420 partner points
- Need to check for any FAILED_PICKUP records

---

**Generated**: December 26, 2025
**System Version**: Current production
**Confidence**: ✅ High (based on actual codebase analysis)
