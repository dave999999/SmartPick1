# 🔍 Achievement Tracking System - CRITICAL ISSUE FOUND

**Date:** November 11, 2025  
**Status:** 🔴 **BROKEN** - Achievements not tracking at all  
**Root Cause:** Database trigger using wrong column name

---

## 🚨 THE PROBLEM

### **Issue:**
Achievements show **0/48** (actually should be 0/15) because the gamification trigger is completely broken.

### **Root Cause:**
The database trigger `update_user_stats_on_pickup()` references `NEW.user_id`, but the **reservations table column is actually `customer_id`**!

```sql
-- CURRENT CODE (BROKEN):
UPDATE user_stats
SET total_reservations = total_reservations + 1
WHERE user_id = NEW.user_id;  -- ❌ NEW.user_id doesn't exist!

-- SHOULD BE:
WHERE user_id = NEW.customer_id;  -- ✅ Correct column name
```

### **Impact:**
1. ✅ Reservations work fine
2. ❌ user_stats NEVER updated
3. ❌ Achievements NEVER unlock
4. ❌ Streaks NEVER calculated
5. ❌ Total reservations stays at 0
6. ❌ Money saved stays at 0

---

## 📊 What Should Be Happening

### **Expected Flow:**
```
User picks up order
    ↓
Reservation status → PICKED_UP
    ↓
Trigger: update_user_stats_on_pickup()
    ↓
UPDATE user_stats SET
  total_reservations = total_reservations + 1,
  total_money_saved = total_money_saved + savings,
  last_activity_date = TODAY
WHERE user_id = customer_id
    ↓
CALL check_user_achievements(customer_id)
    ↓
Check all 15 achievements:
  - first_pick (1 reservation) → Unlock + 10 points
  - getting_started (5 reservations) → Unlock + 25 points
  - bargain_hunter (10 reservations) → Unlock + 50 points
  - etc...
```

### **Actual Flow (What's Happening):**
```
User picks up order
    ↓
Reservation status → PICKED_UP
    ↓
Trigger: update_user_stats_on_pickup()
    ↓
UPDATE user_stats SET ...
WHERE user_id = NEW.user_id  -- ❌ Column doesn't exist!
    ↓
PostgreSQL: "NEW.user_id" is NULL
    ↓
UPDATE WHERE user_id = NULL → Updates 0 rows
    ↓
user_stats never updated
    ↓
Achievements never checked
    ↓
User sees 0/15 achievements forever
```

---

## 🔧 THE FIX

### **Migration 1: Fix the trigger function**

```sql
-- File: 20251111_fix_achievement_tracking.sql

BEGIN;

-- Fix the trigger function to use correct column name
CREATE OR REPLACE FUNCTION update_user_stats_on_pickup()
RETURNS TRIGGER AS $$
DECLARE
  v_money_saved DECIMAL(10, 2);
  v_offer_category TEXT;
  v_partner_id UUID;
  v_pickup_date DATE;
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Use the actual pickup date
  v_pickup_date := COALESCE(NEW.picked_up_at::DATE, CURRENT_DATE);

  -- Get offer details
  SELECT
    (o.original_price - o.smart_price) * NEW.quantity,
    o.category,
    o.partner_id
  INTO v_money_saved, v_offer_category, v_partner_id
  FROM offers o
  WHERE o.id = NEW.offer_id;

  -- Update user stats (FIXED: use customer_id!)
  UPDATE user_stats
  SET
    total_reservations = total_reservations + 1,
    total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
    last_activity_date = v_pickup_date,
    
    -- Update category counts
    category_counts = jsonb_set(
      COALESCE(category_counts, '{}'::jsonb),
      ARRAY[v_offer_category],
      to_jsonb(COALESCE((category_counts->>v_offer_category)::INTEGER, 0) + 1)
    ),
    
    -- Update partner visit counts
    partner_visit_counts = jsonb_set(
      COALESCE(partner_visit_counts, '{}'::jsonb),
      ARRAY[v_partner_id::TEXT],
      to_jsonb(COALESCE((partner_visit_counts->>v_partner_id::TEXT)::INTEGER, 0) + 1)
    ),
    
    updated_at = now()
  WHERE user_id = NEW.customer_id; -- ✅ FIXED!

  -- Recalculate unique partners count
  UPDATE user_stats
  SET unique_partners_visited = (
    SELECT COUNT(DISTINCT key)
    FROM jsonb_object_keys(partner_visit_counts)
  )
  WHERE user_id = NEW.customer_id;

  -- Update streak (FIXED: use customer_id!)
  PERFORM update_user_streak_on_date(NEW.customer_id, v_pickup_date);

  -- Check for achievements (FIXED: use customer_id!)
  PERFORM check_user_achievements(NEW.customer_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate trigger
DROP TRIGGER IF EXISTS update_stats_on_pickup ON reservations;
CREATE TRIGGER update_stats_on_pickup
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  WHEN (NEW.status = 'PICKED_UP' AND OLD.status != 'PICKED_UP')
  EXECUTE FUNCTION update_user_stats_on_pickup();

COMMIT;
```

### **Migration 2: Backfill existing reservations**

```sql
-- File: 20251111_backfill_user_stats.sql

BEGIN;

-- Backfill user stats from existing PICKED_UP reservations
DO $$
DECLARE
  v_user RECORD;
  v_reservation RECORD;
BEGIN
  RAISE NOTICE 'Starting backfill of user stats...';

  -- Loop through all users with picked up reservations
  FOR v_user IN 
    SELECT DISTINCT r.customer_id as user_id
    FROM reservations r
    WHERE r.status = 'PICKED_UP'
  LOOP
    RAISE NOTICE 'Processing user: %', v_user.user_id;

    -- Reset stats for this user
    UPDATE user_stats
    SET 
      total_reservations = 0,
      total_money_saved = 0,
      category_counts = '{}'::jsonb,
      partner_visit_counts = '{}'::jsonb,
      unique_partners_visited = 0
    WHERE user_id = v_user.user_id;

    -- Recalculate from reservations
    UPDATE user_stats us
    SET 
      total_reservations = COALESCE((
        SELECT COUNT(*)
        FROM reservations r
        WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
      ), 0),
      
      total_money_saved = COALESCE((
        SELECT SUM((o.original_price - o.smart_price) * r.quantity)
        FROM reservations r
        JOIN offers o ON o.id = r.offer_id
        WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
      ), 0),
      
      category_counts = COALESCE((
        SELECT jsonb_object_agg(category, count)
        FROM (
          SELECT o.category, COUNT(*)::INT as count
          FROM reservations r
          JOIN offers o ON o.id = r.offer_id
          WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
          GROUP BY o.category
        ) category_stats
      ), '{}'::jsonb),
      
      partner_visit_counts = COALESCE((
        SELECT jsonb_object_agg(partner_id::TEXT, count)
        FROM (
          SELECT o.partner_id, COUNT(*)::INT as count
          FROM reservations r
          JOIN offers o ON o.id = r.offer_id
          WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
          GROUP BY o.partner_id
        ) partner_stats
      ), '{}'::jsonb),
      
      unique_partners_visited = COALESCE((
        SELECT COUNT(DISTINCT o.partner_id)
        FROM reservations r
        JOIN offers o ON o.id = r.offer_id
        WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
      ), 0),
      
      last_activity_date = COALESCE((
        SELECT MAX(r.picked_up_at::DATE)
        FROM reservations r
        WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
      ), CURRENT_DATE)
    WHERE us.user_id = v_user.user_id;

    -- Trigger achievement checks
    PERFORM check_user_achievements(v_user.user_id);

    RAISE NOTICE 'Completed user: % (% reservations)', 
      v_user.user_id, 
      (SELECT total_reservations FROM user_stats WHERE user_id = v_user.user_id);
  END LOOP;

  RAISE NOTICE 'Backfill complete!';
END $$;

COMMIT;
```

---

## 🎯 Achievement Definitions (All 15)

### **Milestone Achievements:**
1. **First Pick** 🎯 - 1 reservation → +10 points
2. **Getting Started** 🌟 - 5 reservations → +25 points
3. **Bargain Hunter** 🎖️ - 10 reservations → +50 points
4. **Savvy Shopper** 👑 - 25 reservations → +100 points

### **Savings Achievements:**
5. **Smart Saver** 💰 - Saved ₾50+ → +100 points

### **Engagement Achievements:**
6. **Early Bird** 🌅 - 5 breakfast offers → +30 points
7. **Night Owl** 🌙 - 5 dinner offers → +30 points
8. **Sweet Tooth** 🍰 - 5 dessert offers → +30 points
9. **Local Hero** 🏪 - 10 different partners → +100 points
10. **Loyal Customer** ❤️ - Same partner 5x → +50 points

### **Streak Achievements:**
11. **On Fire** 🔥 - 3 day streak → +20 points
12. **Unstoppable** ⚡ - 7 day streak → +50 points
13. **Legendary** 🏆 - 30 day streak → +200 points

### **Social Achievements:**
14. **Friend Magnet** 👥 - 5 referrals → +100 points
15. **Influencer** 🌟 - 10 referrals → +250 points

**Total:** 15 achievements (NOT 48!)

---

## 🔍 Why It Shows 0/48

The UI is showing **0/48** instead of **0/15** because:

1. ✅ The frontend loads achievement definitions from database
2. ✅ The database has 15 achievement_definitions
3. ❌ But `allAchievements.length` might be getting 48 from somewhere else
4. 🤔 Possible causes:
   - Duplicate achievement definitions in database?
   - Multiple achievement tables?
   - Frontend counting something else?

Let me check the actual database query...

---

## 📋 Immediate Action Items

### **URGENT - Apply These Fixes:**

1. ✅ **Create migration:** `20251111_fix_achievement_tracking.sql`
2. ✅ **Create backfill:** `20251111_backfill_user_stats.sql`
3. ✅ **Apply to Supabase database**
4. ✅ **Test:** Pick up a reservation → Check if achievement unlocks
5. ✅ **Verify:** User profile shows correct stats

### **After Fix Applied:**

- Users who picked up orders will get **instant achievements**
- Progress bars will show correct percentages
- Streaks will calculate properly
- Referrals will track correctly
- Money saved will accumulate

---

## 🧪 Testing Checklist

### **Before Fix:**
- [ ] Check user_stats table → total_reservations = 0
- [ ] Check user_achievements table → Empty
- [ ] Check achievement UI → Shows 0/15 (or 0/48?)

### **After Fix:**
- [ ] Pick up 1 reservation
- [ ] Check user_stats → total_reservations = 1
- [ ] Check user_achievements → "First Pick" unlocked
- [ ] Check UI → Shows 1/15 with progress bar
- [ ] Check points → +10 points awarded
- [ ] Pick up 4 more reservations (total 5)
- [ ] Check achievements → "Getting Started" unlocked
- [ ] Check UI → Shows 2/15
- [ ] Check points → +25 more points

---

## 📊 Expected Results After Backfill

For users with existing picked up orders:

| Reservations | Achievements Unlocked | Points Awarded |
|--------------|----------------------|----------------|
| 1 | First Pick | +10 |
| 5 | +Getting Started | +25 |
| 10 | +Bargain Hunter | +50 |
| 25 | +Savvy Shopper | +100 |

Plus category-specific, streak, partner, and savings achievements based on actual data!

---

**END OF ANALYSIS**

**Status:** Ready to deploy fix  
**Impact:** HIGH - Unlocks entire gamification system  
**Risk:** LOW - Just fixing column name reference
