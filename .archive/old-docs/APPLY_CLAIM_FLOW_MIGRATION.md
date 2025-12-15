# Quick Fix: Apply Achievement Claim Flow Migration

## Run this migration in Supabase SQL Editor:

**File:** `supabase/migrations/20251111_update_check_achievements_for_claim_flow.sql`

## What it does:
✅ Updates `check_user_achievements()` to support manual claim flow  
✅ Achievements unlock with `reward_claimed=false` (no auto-points)  
✅ Users must click "Claim Reward" button to get points  
✅ Adds unique constraint to prevent duplicate achievements

## Expected output:
```
NOTICE: ✅ check_user_achievements() updated for manual claim flow
NOTICE: ✅ Achievements unlock with reward_claimed=false
NOTICE: ✅ Users must click "Claim Reward" to get points
```

## After applying:
1. **Badges will be colored** when unlocked (not gray)
2. **"Claim Reward" button** appears on unlocked achievements
3. **Notification badge** shows count of unclaimed on Achievements tab
4. **Points only awarded** when user clicks "Claim Reward"

## Test it:
1. Make a pickup to unlock an achievement
2. Go to Profile → Achievements tab
3. Look for colored badge with "Claim Reward" button
4. Click "Claim Reward"
5. Verify toast shows "+X SmartPoints added!"
6. Button changes to "Reward claimed"

---

**That's it!** All UI code is already updated, just need this migration.
