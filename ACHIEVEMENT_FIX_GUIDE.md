# ACHIEVEMENT SYSTEM FIX - APPLY NOW

## Problem
Achievements are not unlocking even when users meet the requirements (e.g., 23 reservations but "First Pick" still locked).

**Root Cause**: The `check_user_achievements` function only handles 4 out of 7 achievement types:
- ✅ Working: reservations, money_saved, streak, referrals
- ❌ Missing: category, unique_partners, partner_loyalty

## Solution
Apply the migration `20250106_fix_achievements_complete.sql` which:

1. ✅ Adds category tracking (`category_counts` JSONB)
2. ✅ Adds partner tracking (`unique_partners_visited`, `partner_visit_counts` JSONB)
3. ✅ Updates the reservation trigger to populate these fields
4. ✅ Fixes `check_user_achievements` to handle ALL 7 types
5. ✅ Backfills existing user data from past reservations
6. ✅ Auto-triggers achievement checks for all users

---

## How to Apply (2 Options)

### Option 1: Supabase SQL Editor (Recommended - 2 minutes)

1. **Go to**: Supabase Dashboard → SQL Editor
2. **Copy/Paste**: The entire contents of `supabase/migrations/20250106_fix_achievements_complete.sql`
3. **Click**: Run
4. **Wait**: ~10-30 seconds for backfill to complete
5. **Verify**: Check `user_achievements` table - should see new unlocks

### Option 2: Script (If you have service role key)

```bash
# Set environment variables
$env:VITE_SUPABASE_URL = "your_supabase_url"
$env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"

# Run script
node scripts/apply-achievement-fix.js
```

---

## What Happens After

### Immediate Effects:
- ✅ All 15 achievement definitions will unlock based on current stats
- ✅ "First Pick" (1 reservation) → Should unlock for users with 1+ reservations
- ✅ "Smart Saver" (₾50 saved) → Should unlock for users with ₾50+ saved
- ✅ Category achievements (breakfast, dinner, dessert) → Now trackable
- ✅ Partner achievements (10 unique, 5 loyal visits) → Now trackable
- ✅ Points automatically awarded for each unlock

### Frontend Changes:
- ✅ Progress bars now show real counts for ALL achievement types
- ✅ Category achievements show "3/5 breakfast" instead of "0/5"
- ✅ Partner achievements show "7/10 unique partners" instead of "0/10"

---

## Verification Steps

After applying, check these in Supabase:

### 1. Check user_stats columns
```sql
SELECT 
  user_id,
  total_reservations,
  category_counts,
  unique_partners_visited,
  partner_visit_counts
FROM user_stats
LIMIT 5;
```

**Expected**: Should see JSONB data like:
- `category_counts`: `{"breakfast": 3, "dinner": 5, "dessert": 2}`
- `partner_visit_counts`: `{"uuid-1": 3, "uuid-2": 5}`

### 2. Check unlocked achievements
```sql
SELECT 
  u.email,
  ad.name AS achievement,
  ad.reward_points,
  ua.unlocked_at
FROM user_achievements ua
JOIN achievement_definitions ad ON ad.id = ua.achievement_id
JOIN users u ON u.id = ua.user_id
ORDER BY ua.unlocked_at DESC;
```

**Expected**: Should see multiple achievements per user, recent unlock timestamps.

### 3. Check points awarded
```sql
SELECT 
  pt.user_id,
  pt.points,
  pt.transaction_type,
  pt.metadata->>'achievement_name' AS achievement
FROM point_transactions pt
WHERE pt.transaction_type = 'achievement'
ORDER BY pt.created_at DESC;
```

**Expected**: See point transactions with `achievement_name` in metadata.

---

## Troubleshooting

### "Achievement still not unlocking"
1. Check trigger is enabled:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'update_stats_on_reservation';
   ```
2. Manually trigger check:
   ```sql
   SELECT check_user_achievements('<user_id>');
   ```

### "Category counts empty"
Run backfill manually:
```sql
UPDATE user_stats us
SET category_counts = (
  SELECT jsonb_object_agg(category, count)
  FROM (
    SELECT o.category, COUNT(*)::INT as count
    FROM reservations r
    JOIN offers o ON o.id = r.offer_id
    WHERE r.user_id = us.user_id
    GROUP BY o.category
  ) category_stats
)
WHERE us.user_id = '<user_id>';
```

### "No points awarded"
Check `add_user_points` function exists:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'add_user_points';
```

---

## Expected Results

For a user with **23 reservations** and **₾1436 saved**:

| Achievement | Requirement | Status |
|-------------|-------------|--------|
| First Pick | 1 reservation | ✅ UNLOCKED (+10 pts) |
| Getting Started | 5 reservations | ✅ UNLOCKED (+25 pts) |
| Bargain Hunter | 10 reservations | ✅ UNLOCKED (+50 pts) |
| Smart Saver | ₾50 saved | ✅ UNLOCKED (+100 pts) |
| Savvy Shopper | 25 reservations | 🔒 Locked (23/25) |
| Early Bird | 5 breakfast | Depends on category data |
| Local Hero | 10 unique partners | Depends on partner data |

**Total Points from Achievements**: 185+ points

---

## Files Changed

### Backend (Database):
- `supabase/migrations/20250106_fix_achievements_complete.sql` (NEW)

### Frontend (React):
- `src/lib/gamification-api.ts` → Added `category_counts`, `unique_partners_visited`, `partner_visit_counts` to UserStats
- `src/components/gamification/AchievementsGrid.tsx` → Updated progress calculation for all 7 types

### Scripts:
- `scripts/apply-achievement-fix.js` (NEW - optional helper)

---

## Need Help?

If issues persist:
1. Export `user_achievements` table as CSV
2. Export `user_stats` for affected user
3. Share both + error message from SQL editor

**Ready to apply? Copy the SQL file contents and paste into Supabase SQL Editor!**
