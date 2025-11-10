# CRITICAL FIX: Gamification System Not Tracking Achievements

## 🐛 THE BUG
The gamification trigger was using `NEW.user_id` but the reservations table column is actually `NEW.customer_id`.

This meant:
- ❌ User stats were never updated
- ❌ Achievements were never checked
- ❌ Streaks were never counted
- ❌ The Achievements page showed "No achievements available yet"

## ✅ THE FIX
Run the SQL in `supabase/migrations/20251110_fix_gamification_customer_id.sql` in your Supabase SQL Editor.

This fixes 3 function calls in `update_user_stats_on_pickup()`:
1. ✅ `UPDATE user_stats WHERE user_id = NEW.customer_id` (was NEW.user_id)
2. ✅ `update_user_streak_on_date(NEW.customer_id, ...)` (was NEW.user_id)
3. ✅ `check_user_achievements(NEW.customer_id)` (was NEW.user_id)

## 📋 HOW TO APPLY

### Option 1: Supabase Dashboard (RECOMMENDED)
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the content of `supabase/migrations/20251110_fix_gamification_customer_id.sql`
5. Click "Run"
6. You should see "Success. No rows returned"

### Option 2: Supabase CLI
```bash
supabase db push --include-all
```

## 🧪 TESTING
After applying the fix:

1. **As Customer**: Make a reservation for an offer
2. **As Partner**: Scan the QR code to mark as picked up
3. **As Customer**: 
   - Go to Profile → Achievements tab
   - You should now see achievements being tracked!
   - Check "First Pickup" achievement should be unlocked
   - Stats should show 1 reservation completed

## 📊 VERIFY IT WORKED
Run this query in Supabase SQL Editor:

```sql
-- Check if user stats are being updated
SELECT 
  u.email,
  us.total_reservations,
  us.total_money_saved,
  us.current_streak_days,
  COUNT(ua.id) as achievement_count
FROM users u
LEFT JOIN user_stats us ON us.user_id = u.id
LEFT JOIN user_achievements ua ON ua.user_id = u.id
WHERE u.email = 'your-customer-email@example.com'
GROUP BY u.email, us.total_reservations, us.total_money_saved, us.current_streak_days;
```

If `total_reservations` > 0 after a pickup, the fix worked! 🎉

## 🎯 ROOT CAUSE
When we moved the points system to Edge Functions, the gamification trigger continued to work BUT it was calling the wrong column name. This was a silent failure - no errors, but achievements just never triggered.

The Edge Function `mark-pickup` correctly updates the reservation status to `PICKED_UP`, which triggers `update_user_stats_on_pickup()`, but that function was looking for `NEW.user_id` which doesn't exist (it's NULL), so all the updates failed silently.
