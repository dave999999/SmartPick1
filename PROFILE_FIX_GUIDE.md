# 🔧 Profile Page Fix Guide

## 🔍 Issue Identified

Your profile page gamification features are not working because the **database tables have not been created yet** in Supabase.

The profile page code is **correct and working** - it's designed to gracefully handle missing gamification tables by showing a "Coming Soon" message. However, to enable the full gamification features, you need to run the database migration.

## ✅ What's Working

- ✅ Profile page loads successfully
- ✅ User information displays correctly
- ✅ Profile editing works (name, phone)
- ✅ Settings tab works
- ✅ Code is properly structured with graceful degradation

## ❌ What's Missing

- ❌ Database tables: `user_stats`, `achievement_definitions`, `user_achievements`
- ❌ Database functions and triggers for automatic stats tracking
- ❌ Referral code columns in `users` table
- ❌ User stats, achievements, streaks, and levels

## 🚀 How to Fix (5 minutes)

### Step 1: Verify Current State

1. Open your **Supabase Dashboard** → SQL Editor
2. Copy and paste the contents of `scripts/verify-gamification-db.sql`
3. Run the script
4. Check the results:
   - If all checks show `exists = false` → You need to run the migration
   - If all checks show `exists = true` → The migration is already done

### Step 2: Run the Migration

1. In Supabase Dashboard → SQL Editor
2. Open the file `supabase/migrations/20250106_create_gamification_tables.sql`
3. Copy the **entire contents** of that file
4. Paste into SQL Editor
5. Click **Run**
6. Wait for "Success" message

**What this creates:**
- ✅ `user_stats` table with triggers
- ✅ `achievement_definitions` table with 15 pre-seeded achievements
- ✅ `user_achievements` table
- ✅ `referral_code` and `referred_by` columns in `users` table
- ✅ 5 database functions for automatic stats tracking
- ✅ 2 triggers that auto-update stats on reservations

### Step 3: Backfill Existing User Data (Optional but Recommended)

If you have existing users with reservations, run this to populate their stats:

1. Open `scripts/backfill-user-stats.sql`
2. Copy and paste into Supabase SQL Editor
3. Run the script
4. This will:
   - Create `user_stats` rows for all existing users
   - Calculate total reservations from existing data
   - Calculate money saved from existing reservations
   - Award achievements based on current stats

### Step 4: Test the Profile Page

1. Go to your deployed site: https://smartpick.ge
2. Sign in
3. Navigate to your profile
4. You should now see:
   - ✨ **Overview Tab**: Stats cards, user level, streak tracker, referral card
   - 🏆 **Achievements Tab**: Grid of unlockable achievements
   - 💰 **Wallet Tab**: SmartPoints balance and transactions
   - ⚙️ **Settings Tab**: Edit profile (this was already working)

## 🎮 Features You'll Get

### Overview Tab
- **User Stats Cards**: Total reservations, money saved, streak, referrals
- **Level System**: 5 progressive levels (Newcomer → Explorer → Regular → VIP → Legend)
- **Streak Tracker**: 7-day activity calendar with milestone rewards
- **Referral Card**: Share your unique code, earn points

### Achievements Tab
- **15+ Achievements** across 4 categories:
  - 🎯 Milestones (First Pick, Getting Started, Bargain Hunter, etc.)
  - 💰 Savings (Smart Saver)
  - 🔥 Engagement (Early Bird, Night Owl, Streaks)
  - 👥 Social (Friend Magnet, Influencer)
- **4 Tiers**: Bronze → Silver → Gold → Platinum
- **Point Rewards**: Earn SmartPoints for each unlock
- **"NEW!" Badges**: See which achievements you just unlocked

### Automatic Features
- ✅ Stats auto-update when users make reservations
- ✅ Achievements auto-unlock when requirements are met
- ✅ Streaks auto-calculate based on daily activity
- ✅ Points auto-awarded for achievements
- ✅ New users automatically get `user_stats` row

## 🧪 Quick Test Checklist

After running the migration:

- [ ] Profile page loads without errors
- [ ] Overview tab shows stats cards
- [ ] Can see current level (probably "Newcomer")
- [ ] Achievements tab shows locked achievements
- [ ] Can copy referral code
- [ ] Make a test reservation → Check if stats update
- [ ] Check if "First Pick" achievement unlocks after first reservation

## 🐛 Troubleshooting

### "Loading forever" on profile page
**Solution**: Check browser console for errors. Likely the migration wasn't run completely.

### Stats show all zeros
**Solution**: Run the backfill script to populate stats from existing reservations.

### Achievements not unlocking
**Solution**:
```sql
-- Manually trigger achievement check in Supabase:
SELECT check_user_achievements('YOUR_USER_ID'::uuid);
```

### Referral code not generating
**Solution**: Check permissions:
```sql
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated, service_role;
```

### Profile updates not saving
**Issue**: Different from gamification - this is a separate API issue.
**Solution**: Check browser console for errors, verify RLS policies on `users` table.

## 📊 Monitoring

After setup, you can run analytics queries in Supabase:

```sql
-- Most active users
SELECT u.name, us.total_reservations, us.total_money_saved
FROM users u
JOIN user_stats us ON u.id = us.user_id
ORDER BY us.total_reservations DESC
LIMIT 10;

-- Achievement completion rates
SELECT ad.name, COUNT(ua.id) as unlocks
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id
GROUP BY ad.id, ad.name
ORDER BY unlocks DESC;

-- Current streaks
SELECT u.name, us.current_streak_days
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE us.current_streak_days > 0
ORDER BY us.current_streak_days DESC;
```

## 🎯 Next Steps

1. **Run the migration** (required)
2. **Backfill user data** (recommended if you have existing users)
3. **Test the profile page** (verify everything works)
4. **Make a test reservation** (see stats update in real-time)
5. **Share referral code** (test the referral system)

## 📝 Files Referenced

- Migration: `supabase/migrations/20250106_create_gamification_tables.sql`
- Verification: `scripts/verify-gamification-db.sql`
- Backfill: `scripts/backfill-user-stats.sql`
- Setup Guide: `GAMIFICATION_SETUP.md`
- Profile Code: `src/pages/UserProfile.tsx`
- API: `src/lib/gamification-api.ts`

---

**🎮 Once setup is complete, your users will have an amazing gamified profile experience!**

Need help? Check the browser console for specific errors and reference the troubleshooting section above.
