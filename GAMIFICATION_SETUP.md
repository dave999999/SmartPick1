# 🎮 SmartPick Gamification System - Setup Guide

## 🎉 What's New

Your user profile has been completely transformed into an engaging, game-like experience! Users will now have:

### ✨ Key Features

#### 🏆 **Achievement System**
- **15+ Unlockable Achievements** across 4 categories:
  - 🎯 **Milestones**: First Pick, Getting Started, Bargain Hunter, Savvy Shopper
  - 💰 **Savings**: Smart Saver (save ₾50+)
  - 🔥 **Engagement**: Early Bird, Night Owl, Streak achievements
  - 👥 **Social**: Friend Magnet, Influencer (referral achievements)
- **4 Tier Levels**: Bronze → Silver → Gold → Platinum
- **Automatic Point Rewards**: Earn SmartPoints for unlocking achievements
- **Beautiful Animated Badges** with "NEW!" indicators

#### 📊 **User Stats Dashboard**
- Total reservations counter
- Money saved tracker (₾)
- Current streak days
- Friends referred count
- Colorful stat cards with gradient backgrounds

#### 🔥 **Streak Tracking**
- Daily activity streak counter
- 7-day calendar visualization (shows which days you were active)
- Personal best tracking
- Milestone rewards:
  - 3 days → +20 points 🔥
  - 7 days → +50 points ⚡
  - 30 days → +200 points 🏆

#### ⭐ **User Level System**
- **5 Progressive Tiers**:
  1. 🌱 **Newcomer** (0-4 reservations) - Welcome benefits
  2. 🔍 **Explorer** (5-14 reservations) - Priority notifications
  3. ⭐ **Regular** (15-29 reservations) - 2% bonus savings
  4. 👑 **VIP** (30-49 reservations) - 5% bonus savings + VIP support
  5. 🏆 **Legend** (50+ reservations) - 10% bonus savings + lifetime perks
- Visual progress bars showing advancement
- Next level preview cards

#### 👥 **Referral Program**
- Unique referral code for each user
- Share via native share API or copy link
- **+50 SmartPoints** for both referrer and friend
- Track total referrals in stats
- Beautiful gradient cards

#### 💰 **SmartPoints Wallet**
- Integrated into dedicated "Wallet" tab
- Full balance and transaction history
- Easy point purchases

#### 🎨 **New Profile Layout**
- **4 Tabs**:
  - **Overview**: Stats, level, streak, referral
  - **Achievements**: Browse and unlock badges
  - **Wallet**: SmartPoints management
  - **Settings**: Edit profile info
- Smooth animations with framer-motion
- Mobile-responsive design
- Professional gradient cards

---

## 🗄️ Step 1: Database Setup

### Run the SQL Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250106_create_gamification_tables.sql`
4. Execute the migration

### What the Migration Creates:

#### Tables:
- ✅ `user_stats` - Stores user statistics (reservations, money saved, streaks, referrals)
- ✅ `achievement_definitions` - Pre-seeded with 15 achievements
- ✅ `user_achievements` - Tracks which achievements users have unlocked
- ✅ Adds `referral_code` and `referred_by` fields to `users` table

#### Functions:
- ✅ `init_user_stats()` - Auto-creates stats row for new users
- ✅ `update_user_stats_on_reservation()` - Updates stats when reservation is made
- ✅ `update_user_streak()` - Calculates and updates activity streaks
- ✅ `check_user_achievements()` - Checks if user qualifies for new achievements
- ✅ `generate_referral_code()` - Creates unique 6-character referral codes

#### Triggers:
- ✅ Auto-create user_stats on user registration
- ✅ Auto-update stats on new reservation
- ✅ Auto-check achievements after stat updates

#### Security:
- ✅ Row Level Security (RLS) policies
- ✅ Users can only view their own data
- ✅ Service role required for modifications

---

## 🚀 Step 2: What Happens Automatically

Once you run the migration, the system will automatically:

### For Existing Users:
1. **Create user_stats rows** for all existing users (you may want to run a script to backfill stats from existing reservations)
2. **Generate referral codes** when they first visit their profile
3. **Calculate streaks** based on recent activity

### For New Users:
1. **100 SmartPoints** (already existing from SmartPoints system)
2. **Empty user_stats row** with 0 reservations, 0 streak
3. **Unique referral code** generated on first profile visit

### When Users Make Reservations:
1. **Update stats**: total_reservations +1, money_saved updated
2. **Update streak**: Check if today continues streak or resets it
3. **Check achievements**: Automatically unlock achievements if qualified
4. **Award points**: Grant SmartPoints for achievement unlocks

---

## 🎮 Step 3: How It Works for Users

### First Time Experience:
1. User signs up → Gets 100 SmartPoints (existing system)
2. User makes first reservation → Unlocks "First Pick" achievement 🎯 → Gets +10 points!
3. User visits profile → Sees beautiful new gamified interface
4. User explores tabs:
   - **Overview**: See stats, level (Newcomer), streak (1 day), referral code
   - **Achievements**: See locked/unlocked badges
   - **Wallet**: Manage SmartPoints
   - **Settings**: Edit profile

### Progression Example:
```
Day 1: Make 1st reservation
  → Unlock "First Pick" achievement (+10 points)
  → Start 1-day streak 🔥

Day 2: Make 2nd reservation
  → Streak now 2 days

Day 3: Make 3rd reservation
  → Streak now 3 days
  → Unlock "On Fire" achievement (+20 points) 🔥

Day 5: Make 5th reservation
  → Unlock "Getting Started" achievement (+25 points)
  → Level up to "Explorer" 🔍

Day 15: Make 15th reservation
  → Level up to "Regular" ⭐
  → Unlock 2% bonus savings perk

Day 30: Make 30th reservation (with 7-day streak)
  → Unlock "Unstoppable" achievement (+50 points) ⚡
  → Level up to "VIP" 👑
  → Unlock 5% bonus savings + VIP support
```

---

## 📱 Step 4: Testing the System

### Test Achievements:
1. Make reservations to trigger achievement unlocks
2. Check profile → Achievements tab
3. Verify points were awarded in Wallet tab

### Test Streaks:
1. Make a reservation today
2. Come back tomorrow and make another
3. Check Overview tab → Streak should be 2 days
4. Skip a day → Streak should reset to 1 on next activity

### Test Levels:
1. Make multiple reservations
2. Watch level progress bar fill up
3. Check when you level up (5, 15, 30, 50 reservations)

### Test Referrals:
1. Go to Overview tab → Copy referral code
2. Have a friend sign up with the code
3. Both should get +50 points
4. Your referral counter should increment

### SQL Test Queries:
```sql
-- Check user stats
SELECT * FROM user_stats WHERE user_id = 'YOUR_USER_ID';

-- View all achievements
SELECT * FROM achievement_definitions;

-- Check unlocked achievements
SELECT ua.*, ad.name, ad.icon
FROM user_achievements ua
JOIN achievement_definitions ad ON ua.achievement_id = ad.id
WHERE ua.user_id = 'YOUR_USER_ID';

-- Check referral setup
SELECT referral_code, referred_by FROM users WHERE id = 'YOUR_USER_ID';
```

---

## 🎨 Step 5: Customization Options

### Add More Achievements:
Edit the migration or add new rows to `achievement_definitions`:
```sql
INSERT INTO achievement_definitions (id, name, description, icon, category, tier, requirement, reward_points)
VALUES (
  'weekend_warrior',
  'Weekend Warrior',
  'Made 10 weekend reservations',
  '🎉',
  'engagement',
  'silver',
  '{"type": "weekend_reservations", "count": 10}',
  40
);
```

### Adjust Level Thresholds:
Edit `src/lib/gamification-api.ts` → `USER_LEVELS` array to change requirements or benefits.

### Change Point Rewards:
Update `reward_points` in `achievement_definitions` table.

### Modify Streak Rewards:
Edit `StreakTracker.tsx` component to show different milestone rewards.

---

## 🐛 Troubleshooting

### Issue: Stats not updating
**Solution**: Check if the trigger is enabled:
```sql
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgname = 'update_stats_on_reservation';
```

If not enabled:
```sql
ALTER TABLE reservations ENABLE TRIGGER update_stats_on_reservation;
```

### Issue: Achievements not unlocking
**Solution**: Manually trigger achievement check:
```sql
SELECT check_user_achievements('USER_ID'::uuid);
```

### Issue: Profile shows loading forever
**Solution**: Check browser console for errors. Ensure:
- User_stats row exists for the user
- Supabase RLS policies are correct
- API keys are valid

### Issue: Referral code not generating
**Solution**: Grant execute permission:
```sql
GRANT EXECUTE ON FUNCTION generate_referral_code TO service_role;
```

---

## 📊 Analytics Queries

### Most Active Users:
```sql
SELECT u.name, u.email, us.total_reservations, us.current_streak_days
FROM users u
JOIN user_stats us ON u.id = us.user_id
ORDER BY us.total_reservations DESC
LIMIT 10;
```

### Achievement Completion Rate:
```sql
SELECT
  ad.name,
  COUNT(ua.id) as unlocked_count,
  (COUNT(ua.id)::float / (SELECT COUNT(*) FROM users) * 100) as completion_rate
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id
GROUP BY ad.id, ad.name
ORDER BY completion_rate DESC;
```

### Top Streaks:
```sql
SELECT u.name, us.current_streak_days, us.longest_streak_days
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE us.current_streak_days > 0
ORDER BY us.current_streak_days DESC
LIMIT 10;
```

### Referral Leaderboard:
```sql
SELECT u.name, us.total_referrals
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE us.total_referrals > 0
ORDER BY us.total_referrals DESC;
```

---

## 🚀 Deployment Checklist

Before pushing to production:

- [ ] Run SQL migration on production Supabase
- [ ] Test user registration creates user_stats
- [ ] Test reservation triggers stat update
- [ ] Test achievement unlocking
- [ ] Test streak calculation
- [ ] Test referral code generation
- [ ] Test level progression
- [ ] Verify RLS policies work correctly
- [ ] Test on mobile devices
- [ ] Check all animations work smoothly
- [ ] Monitor error logs

---

## 🎯 Future Enhancement Ideas

- **Seasonal Events**: Limited-time achievements during holidays
- **Leaderboards**: Public rankings for top savers, longest streaks
- **Team Challenges**: Group achievements with friends
- **Daily Quests**: "Reserve 3 breakfast items today" (+bonus points)
- **Achievement Showcases**: Display top 3 achievements on profile header
- **Badges on Comments**: Show achievement badges next to usernames
- **Push Notifications**: Alert when close to unlocking an achievement
- **Milestone Celebrations**: Confetti animation when leveling up
- **Custom Avatars**: Unlock profile pictures through achievements

---

## 📞 Support

For issues or questions:
1. Check browser console for JavaScript errors
2. Check Supabase logs: Dashboard → Logs → Functions
3. Query `point_transactions` table for audit trail
4. Review this documentation
5. Check database triggers are enabled

---

**🎮 Your users are going to LOVE this! 🎉**

Built with ❤️ for SmartPick by Claude Code
