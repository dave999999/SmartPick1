# Penalty System Implementation - Complete Guide

## Overview

Complete 4-tier penalty system with:
- 1st offense: Warning (no suspension)
- 2nd offense: 1-hour ban (100 points to lift)
- 3rd offense: 24-hour ban (500 points to lift)
- 4th offense: Permanent ban (no lift option)

Partners can forgive missed pickups (request expires in 24 hours).
Banned users can still browse but cannot reserve.

---

## Step 1: Database Migration

### Run in Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of `supabase/migrations/20251127_penalty_system_complete.sql`
4. Click "Run" button

**What this creates:**
- `user_penalties` table - stores all penalties with forgiveness workflow
- `penalty_offense_history` table - tracks user offense counts and stats
- `penalty_point_transactions` table - audit log for point deductions
- `calculate_reliability_score()` function - computes user reliability (0-100%)
- `can_user_reserve()` function - checks if user is currently banned
- `get_active_penalty()` function - returns active penalty details
- RLS policies for users, partners, and admins

**Verify:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_penalties', 'penalty_offense_history', 'penalty_point_transactions');

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_reliability_score', 'can_user_reserve', 'get_active_penalty');
```

---

## Step 2: Frontend Integration (Already Complete)

### Files Created/Modified:

**API Layer:**
- ✅ `src/lib/api/penalty.ts` - Complete penalty API (~700 lines)
  - Functions: canUserReserve, getActivePenalty, applyPenalty, liftBanWithPoints, requestForgiveness, partnerDecideForgiveness, getPendingForgivenessRequests

**React Components:**
- ✅ `src/components/PenaltyModal.tsx` - Main modal with live countdown timer
- ✅ `src/components/ForgivenessRequestModal.tsx` - User forgiveness request form
- ✅ `src/components/PartnerForgivenessDecisionModal.tsx` - Partner decision interface
- ✅ `src/components/partner/PenaltyForgivenessTab.tsx` - Partner dashboard tab for requests

**Integration Points:**
- ✅ `src/lib/api/reservations.ts` - Added penalty checks before reservation creation
- ✅ `src/pages/ReserveOffer.tsx` - Shows penalty modal on reservation attempt
- ✅ `src/App.tsx` - Shows penalty modal on app load if active penalty exists
- ✅ `src/pages/PartnerDashboard.tsx` - Added PenaltyForgivenessTab to reservations view

---

## Step 3: Deploy Edge Function for Auto-Detection

### Deploy Cron Job

1. **Install Supabase CLI** (if not already):
   ```powershell
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```powershell
   supabase login
   ```

3. **Link to your project:**
   ```powershell
   supabase link --project-ref <your-project-ref>
   ```

4. **Deploy the Edge Function:**
   ```powershell
   supabase functions deploy detect-missed-pickups
   ```

5. **Set up Cron Trigger in Supabase:**
   - Go to Database → Extensions → Enable `pg_cron`
   - Go to SQL Editor and run:
   ```sql
   SELECT cron.schedule(
     'detect-missed-pickups',
     '*/5 * * * *', -- Every 5 minutes
     $$
     SELECT
       net.http_post(
         url:='<YOUR_SUPABASE_URL>/functions/v1/detect-missed-pickups',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb
       ) AS request_id;
     $$
   );
   ```

**What this does:**
- Runs every 5 minutes
- Finds reservations where `status = 'reserved'` and `pickup_end < now()`
- Marks reservation as `status = 'missed'`
- Applies penalty based on offense count
- Sends notification to user

**Verify:**
```sql
-- Check cron job exists
SELECT * FROM cron.job WHERE jobname = 'detect-missed-pickups';

-- Manually test (check logs in Supabase Functions dashboard)
SELECT
  net.http_post(
    url:='<YOUR_SUPABASE_URL>/functions/v1/detect-missed-pickups',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb
  );
```

---

## Step 4: Testing Flow

### Test Scenario 1: Warning (1st Offense)

1. **Create reservation:**
   - Login as test user
   - Reserve an offer
   - Note the `pickup_end` time

2. **Simulate missed pickup:**
   ```sql
   -- In Supabase SQL Editor
   UPDATE reservations 
   SET pickup_end = NOW() - INTERVAL '1 hour'
   WHERE user_id = '<test-user-id>' 
   AND status = 'reserved' 
   LIMIT 1;
   ```

3. **Trigger detection manually:**
   ```sql
   -- Call the Edge Function URL
   -- OR wait 5 minutes for cron
   ```

4. **Verify:**
   - Check `user_penalties` table for new row with `type = 'warning'`
   - Check `penalty_offense_history` shows `offense_count = 1`
   - Try to make new reservation → should show warning modal
   - Click "I Understand" → reservation should succeed

### Test Scenario 2: 1-Hour Ban (2nd Offense)

1. **Create another reservation** (after acknowledging warning)
2. **Let it expire** (same SQL as above)
3. **Trigger detection**
4. **Verify:**
   - New penalty with `type = 'suspension_1h'`
   - `offense_count = 2`
   - Try to reserve → blocked with modal showing countdown
   - Test "Lift with 100 Points" button (user must have ≥100 points)
   - After lifting or waiting 1 hour, reservation should work

### Test Scenario 3: Forgiveness Request

1. **From penalty modal:** Click "Request Partner Forgiveness"
2. **Fill form:** Enter message (20-500 chars)
3. **Submit**
4. **Partner Dashboard:**
   - Login as partner
   - Go to Reservations view
   - Scroll to "Penalty Forgiveness Requests" section
   - Click on the request
   - Choose "Grant Forgiveness" or "Deny"
   - Add optional message
   - Submit
5. **Verify:**
   - If granted: penalty removed, offense count decremented
   - If denied: penalty remains, user can still lift with points

### Test Scenario 4: 24-Hour Ban & Permanent Ban

- Repeat process for 3rd and 4th offenses
- 3rd = 24-hour ban, 500 points to lift
- 4th = permanent ban, no lift option, only admin can override

---

## Step 5: Admin Testing (Optional)

### Admin Override Penalty

```sql
-- In penalty.ts API, call adminOverridePenalty()
-- Or via SQL:
UPDATE user_penalties 
SET 
  is_active = false,
  admin_reviewed = true,
  admin_decision = 'unban',
  admin_notes = 'Special case: customer had emergency',
  reviewed_by = '<admin-user-id>',
  reviewed_at = NOW(),
  updated_at = NOW()
WHERE id = '<penalty-id>';

-- Also decrement offense count if desired
UPDATE penalty_offense_history 
SET offense_count = GREATEST(0, offense_count - 1)
WHERE user_id = '<user-id>';
```

---

## Step 6: Monitor & Maintain

### Key Metrics to Track

```sql
-- Total penalties by type
SELECT type, COUNT(*) as count 
FROM user_penalties 
GROUP BY type 
ORDER BY count DESC;

-- Active penalties
SELECT COUNT(*) as active_penalties 
FROM user_penalties 
WHERE is_active = true;

-- Forgiveness requests pending
SELECT COUNT(*) as pending_forgiveness 
FROM user_penalties 
WHERE forgiveness_status = 'pending';

-- Users with multiple offenses
SELECT u.name, u.email, poh.offense_count, poh.total_penalties_received
FROM penalty_offense_history poh
JOIN users u ON u.id = poh.user_id
WHERE poh.offense_count >= 2
ORDER BY poh.offense_count DESC;

-- Reliability scores
SELECT 
  CASE 
    WHEN reliability_score >= 90 THEN 'Excellent (90-100%)'
    WHEN reliability_score >= 70 THEN 'Good (70-89%)'
    WHEN reliability_score >= 50 THEN 'Fair (50-69%)'
    ELSE 'Poor (<50%)'
  END as score_range,
  COUNT(*) as user_count
FROM users
GROUP BY score_range;
```

### Automated Cleanup (Optional)

```sql
-- Expire forgiveness requests after 24 hours
UPDATE user_penalties 
SET 
  forgiveness_status = 'expired',
  updated_at = NOW()
WHERE 
  forgiveness_status = 'pending' 
  AND forgiveness_expires_at < NOW();

-- Archive old penalties (after 6 months)
-- Only if you want to move them to a separate table
-- (Not implemented, but recommended for large scale)
```

---

## Troubleshooting

### Issue: Penalty not detected automatically

**Check:**
1. Cron job is running: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'detect-missed-pickups') ORDER BY start_time DESC LIMIT 5;`
2. Edge Function logs in Supabase Functions dashboard
3. Manually trigger: `SELECT net.http_post(...)`

### Issue: User can still reserve despite penalty

**Check:**
1. Penalty is active: `SELECT * FROM user_penalties WHERE user_id = '<user-id>' AND is_active = true;`
2. RLS policy is enabled: `SELECT * FROM pg_policies WHERE tablename = 'user_penalties';`
3. Frontend calling `canUserReserve()` before reservation

### Issue: Forgiveness not working

**Check:**
1. Partner ID matches: `SELECT partner_id FROM user_penalties WHERE id = '<penalty-id>';`
2. Forgiveness not expired: `SELECT forgiveness_expires_at FROM user_penalties WHERE id = '<penalty-id>';`
3. Partner has permission: Check RLS policies

### Issue: Points not deducted when lifting ban

**Check:**
1. User has enough points: `SELECT points FROM users WHERE id = '<user-id>';`
2. Transaction logged: `SELECT * FROM penalty_point_transactions WHERE user_id = '<user-id>' ORDER BY created_at DESC;`
3. Penalty marked as lifted: `SELECT lifted_with_points, points_spent FROM user_penalties WHERE id = '<penalty-id>';`

---

## Configuration

### Adjust Penalty Durations

Edit in `src/lib/api/penalty.ts`:

```typescript
export const PENALTY_CONFIG: Record<number, PenaltyConfig> = {
  1: { type: 'warning', duration: null, canLift: false, pointCost: 0 },
  2: { type: '1hour', duration: 3600, canLift: true, pointCost: 100 }, // Change 3600 (1 hour)
  3: { type: '24hour', duration: 86400, canLift: true, pointCost: 500 }, // Change 86400 (24 hours)
  4: { type: 'permanent', duration: null, canLift: false, pointCost: 0 }
};
```

### Adjust Point Costs

Same file, change `pointCost` values.

### Adjust Forgiveness Expiration

In `src/lib/api/penalty.ts` → `requestForgiveness()` function:

```typescript
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Change 24 hours
```

### Adjust Cron Frequency

In cron job SQL:

```sql
'*/5 * * * *' -- Every 5 minutes
'*/15 * * * *' -- Every 15 minutes
'0 * * * *' -- Every hour
```

---

## Rollback Plan

If you need to rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS penalty_point_transactions CASCADE;
DROP TABLE IF EXISTS penalty_offense_history CASCADE;
DROP TABLE IF EXISTS user_penalties CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_reliability_score(UUID);
DROP FUNCTION IF EXISTS can_user_reserve(UUID);
DROP FUNCTION IF EXISTS get_active_penalty(UUID);

-- Remove cron job
SELECT cron.unschedule('detect-missed-pickups');

-- Remove Edge Function
-- supabase functions delete detect-missed-pickups
```

Frontend code won't break if backend is missing - errors are caught and logged.

---

## Summary Checklist

- [ ] Database migration applied in Supabase SQL Editor
- [ ] Edge Function deployed (`supabase functions deploy detect-missed-pickups`)
- [ ] Cron job scheduled (every 5 minutes)
- [ ] Test warning (1st offense) flow
- [ ] Test 1-hour ban (2nd offense) flow
- [ ] Test point-based ban lifting
- [ ] Test forgiveness request (user side)
- [ ] Test forgiveness decision (partner side)
- [ ] Verify RLS policies working
- [ ] Monitor penalty metrics
- [ ] Document any custom configurations

---

## Next Steps

1. **Deploy to staging** first and test thoroughly
2. **Monitor logs** for first 24 hours after production deploy
3. **Adjust point costs** based on user feedback
4. **Consider email notifications** for penalties (integrate with existing email system)
5. **Add admin panel** for bulk penalty management (future enhancement)

---

**Implementation Status:** ✅ Complete  
**Estimated Setup Time:** 30 minutes (database + deployment)  
**Testing Time:** 1-2 hours (all scenarios)

Good luck! 🚀
