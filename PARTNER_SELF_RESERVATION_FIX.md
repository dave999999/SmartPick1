# 🔧 PARTNER SELF-RESERVATION FIX

## Problem Identified

**Scenario:** Partner creates offer → Partner reserves their own offer → Partner tries to mark as picked up → **FAILS**

**Root Cause:** When a partner user reserves their own offer:
- `customer_id` = partner's `user_id`
- Partner might not have a `user_stats` record (only partners table)
- Trigger tries to update non-existent `user_stats` record
- Transaction fails with error

---

## ✅ Fixes Applied

### **1. Edge Function - Added Warning Log**
**File:** `supabase/functions/mark-pickup/index.ts`

```typescript
// Detect when partner marks their own reservation
const isPartnerOwnReservation = reservation.customer_id === user.id
if (isPartnerOwnReservation) {
  console.warn('⚠️ Partner is marking their own reservation')
}
```

**Why:** Helps debug edge cases where partner = customer

---

### **2. Trigger - Auto-Create user_stats**
**File:** `20251111_make_achievements_non_blocking.sql`

```sql
-- Ensure user_stats record exists (create if missing)
INSERT INTO user_stats (user_id, last_activity_date)
VALUES (NEW.customer_id, v_pickup_date)
ON CONFLICT (user_id) DO NOTHING;

-- Then update stats...
UPDATE user_stats SET ...
```

**Why:** Creates `user_stats` record for partners who reserve their own offers

---

### **3. Backfill - Handle Partner Customers**
**File:** `20251111_backfill_user_stats.sql`

```sql
-- Ensure user_stats record exists (for both customers and partners)
INSERT INTO user_stats (user_id, last_activity_date)
VALUES (v_user.user_id, CURRENT_DATE)
ON CONFLICT (user_id) DO NOTHING;
```

**Why:** Backfill works for existing partner self-reservations

---

## 🧪 Test Scenario

### **Setup:**
1. Log in as partner account
2. Create an offer (e.g., "Test Pizza")
3. Go to homepage (customer view)
4. Reserve your own offer
5. Go back to partner dashboard
6. Try to mark as picked up

### **Expected Behavior (After Fix):**

**Before:**
```
❌ Failed to mark as picked up: Edge Function returned non-2xx status code
❌ Database trigger fails on UPDATE user_stats (record doesn't exist)
```

**After:**
```
✅ Pickup succeeds
✅ user_stats record auto-created for partner
✅ Stats updated (total_reservations, money_saved, etc.)
✅ Achievements checked (might unlock "First Pick" if partner's first time)
✅ Points awarded to partner as customer
⚠️ Console shows: "Partner is marking their own reservation"
```

---

## 🚨 Edge Cases to Consider

### **Case 1: Partner Reserves Own Offer**
- **Customer ID:** Partner's user_id
- **Partner ID:** Same partner
- **Fix:** Create user_stats on first pickup
- **Points:** Partner gets customer points + partner points (double reward!)

### **Case 2: Partner Has Multiple Roles**
```
User → is_partner: true
User → has partner_id in partners table
User → can create offers
User → can also be a customer
```
**Solution:** Treat them as both - they get gamification as customer

### **Case 3: Partner Stats vs Customer Stats**
- `user_stats` → tracks customer activity
- `partner_points` → tracks partner earnings
- Partner who reserves own offer → appears in BOTH tables

---

## 📊 Database State Check

### **Check if partner has user_stats:**
```sql
SELECT 
  u.id as user_id,
  u.name,
  u.is_partner,
  p.id as partner_id,
  us.total_reservations,
  us.total_money_saved
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
LEFT JOIN user_stats us ON us.user_id = u.id
WHERE u.is_partner = true;
```

**Expected:**
- Before fix: `us.total_reservations` might be NULL (no record)
- After fix: Record auto-created on first pickup

### **Check partner self-reservations:**
```sql
SELECT 
  r.id,
  r.customer_id,
  r.partner_id,
  u.name as customer_name,
  p.business_name
FROM reservations r
JOIN users u ON u.id = r.customer_id
JOIN partners p ON p.id = r.partner_id
WHERE r.customer_id = p.user_id  -- Partner reserved their own offer
  AND r.status = 'PICKED_UP';
```

**Shows:** All cases where partner picked up their own reservation

---

## 🔄 Migration Application Order

Since you're experiencing this issue NOW, apply migrations in this order:

### **1. IMMEDIATE FIX (Apply First):**
```sql
-- 20251111_make_achievements_non_blocking.sql (UPDATED VERSION)
-- Now includes: INSERT INTO user_stats ... ON CONFLICT DO NOTHING
```

**What it does:**
- Makes achievement checking non-blocking
- Auto-creates user_stats if missing
- Handles partner self-reservations gracefully

### **2. Then Apply Others:**
```sql
-- 20251111_fix_achievement_tracking.sql
-- 20251111_backfill_user_stats.sql (UPDATED VERSION)
-- 20251111_cleanup_achievements.sql
```

---

## 🎯 Expected Outcomes

### **For Regular Customers:**
- ✅ Everything works as before
- ✅ Stats update on pickup
- ✅ Achievements unlock
- ✅ Points awarded

### **For Partners Reserving Own Offers:**
- ✅ Pickup succeeds (no more errors!)
- ✅ user_stats auto-created if needed
- ✅ Stats updated correctly
- ✅ Can unlock achievements as customer
- ✅ Warning logged for debugging
- ✅ Gets customer points AND partner points

---

## 💡 Business Logic Consideration

**Question:** Should partners be allowed to reserve their own offers?

**Pros:**
- Testing their own offers
- Eating their own cooking
- Gamification participation

**Cons:**
- Could abuse system (create offers, reserve, mark picked up, get points)
- Inflates stats artificially
- Not real customer behavior

**Current Behavior:** **ALLOWED** - No restrictions

**Recommendation:** Add business rule if needed:
```typescript
// In reserve offer API:
if (user.is_partner && offer.partner_id === user.partner_id) {
  throw new Error('Partners cannot reserve their own offers')
}
```

---

## 📝 Summary

**Problem:** Partner reserving own offer → `user_stats` doesn't exist → pickup fails

**Solution:** 
1. Auto-create `user_stats` on first pickup
2. Add warning logs for debugging
3. Handle edge case gracefully

**Status:** ✅ FIXED - Apply updated `20251111_make_achievements_non_blocking.sql`

**Testing:** Try marking your own reservation as picked up - should work now!
