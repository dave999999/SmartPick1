# Penalty System - Quick Reference

## System Overview

**4-Tier Progressive Penalty System:**
- 1st offense → Warning (no ban)
- 2nd offense → 1-hour ban (100 pts to lift)
- 3rd offense → 24-hour ban (500 pts to lift)  
- 4th+ offense → Permanent ban (admin only)

**Key Features:**
✅ Automatic detection via cron job (every 5 minutes)  
✅ Point-based ban lifting  
✅ Partner forgiveness system (24-hour window)  
✅ Live countdown timers  
✅ Reliability score tracking (0-100%)  
✅ Admin override capability  

---

## Files Created

### Database
- `supabase/migrations/20251127_penalty_system_complete.sql` (500+ lines)
  - 3 tables: user_penalties, penalty_offense_history, penalty_point_transactions
  - 3 functions: calculate_reliability_score, can_user_reserve, get_active_penalty
  - RLS policies for security

### Backend/API
- `src/lib/api/penalty.ts` (~700 lines)
  - 15+ exported functions for all penalty operations

### Frontend Components
- `src/components/PenaltyModal.tsx` - Main modal with countdown
- `src/components/ForgivenessRequestModal.tsx` - User forgiveness form
- `src/components/PartnerForgivenessDecisionModal.tsx` - Partner decision UI
- `src/components/partner/PenaltyForgivenessTab.tsx` - Partner dashboard integration

### Integration
- `src/lib/api/reservations.ts` - Added penalty check before reservation
- `src/pages/ReserveOffer.tsx` - Shows modal on reservation attempt
- `src/App.tsx` - Shows modal on app load
- `src/pages/PartnerDashboard.tsx` - Added forgiveness tab

### Edge Functions
- `supabase/functions/detect-missed-pickups/index.ts` - Cron job for auto-detection

### Documentation
- `PENALTY_SYSTEM_DEPLOYMENT_GUIDE.md` - Complete setup guide
- `PENALTY_SYSTEM_QUICK_REFERENCE.md` - This file

---

## Quick Deploy Steps

1. **Database:**
   ```
   Supabase Dashboard → SQL Editor → Paste migration SQL → Run
   ```

2. **Edge Function:**
   ```powershell
   supabase functions deploy detect-missed-pickups
   ```

3. **Cron Job:**
   ```sql
   SELECT cron.schedule(
     'detect-missed-pickups',
     '*/5 * * * *',
     $$ SELECT net.http_post(...) $$
   );
   ```

4. **Frontend:**
   - Already integrated ✅
   - Just deploy/build as normal

---

## User Flow

### When User Misses Pickup:

1. **Cron detects** missed pickup (reservation past `pickup_end`)
2. **System applies** penalty based on offense count
3. **User receives** notification
4. **Next reservation attempt:** Penalty modal appears
   - Warning: Acknowledge → Continue
   - Suspension: Wait or pay points to lift
   - Permanent: Cannot reserve (contact admin)

### Forgiveness Flow:

1. **User clicks** "Request Forgiveness" in penalty modal
2. **Fills form** with message (20-500 chars)
3. **Partner sees** request in dashboard "Reservations" tab
4. **Partner decides:**
   - Grant → Penalty removed, offense count decremented
   - Deny → Penalty remains, user can still lift with points
5. **Request expires** in 24 hours if not decided

---

## Partner Dashboard

**Location:** Reservations View → Scroll down

**New Section:** "Penalty Forgiveness Requests"
- Shows all pending requests from their customers
- Click request → Decision modal opens
- View customer reliability score and message
- Grant or deny with optional response message

---

## API Functions (penalty.ts)

### User Functions
- `canUserReserve(userId)` - Check if user can reserve
- `getActivePenalty()` - Get current user's active penalty
- `getPenaltyDetails(penaltyId)` - Full penalty info
- `liftBanWithPoints(penaltyId)` - Spend points to lift ban
- `requestForgiveness(penaltyId, message)` - Request partner forgiveness
- `acknowledgePenalty(penaltyId)` - Mark warning as seen

### Partner Functions
- `getPendingForgivenessRequests(partnerId)` - Get requests for partner
- `partnerDecideForgiveness(penaltyId, partnerId, decision, message)` - Grant/deny

### Admin Functions
- `adminOverridePenalty(penaltyId, adminUserId, decision, notes)` - Override penalty
- `getAllPenalties(filters)` - Get all penalties with filters

### System Functions
- `applyPenalty(userId, reservationId, partnerId, offerId, offenseType)` - Create penalty
- `detectMissedPickups()` - Find and penalize missed pickups (used by cron)

---

## Database Schema

### user_penalties
**Purpose:** Main penalty records  
**Key Fields:**
- `type`: warning | suspension_1h | suspension_24h | permanent_ban
- `offense_number`: 1, 2, 3, 4+
- `is_active`: Currently enforced?
- `ends_at`: When suspension expires (null for warning/permanent)
- `forgiveness_status`: pending | granted | denied | expired
- `lifted_with_points`: true if user paid to lift

### penalty_offense_history
**Purpose:** Track user's total offense count  
**Key Fields:**
- `offense_count`: Current offense level (determines next penalty)
- `total_penalties_received`: Lifetime penalty count
- `last_offense_at`: Most recent penalty date

### penalty_point_transactions
**Purpose:** Audit log for point deductions  
**Key Fields:**
- `points_spent`: Amount deducted
- `transaction_type`: lift_1h_ban | lift_24h_ban
- `balance_after`: User's points after deduction

---

## Key Configuration

### Point Costs
```typescript
// In penalty.ts
export const PENALTY_CONFIG = {
  1: { pointCost: 0 },    // Warning
  2: { pointCost: 100 },  // 1-hour ban
  3: { pointCost: 500 },  // 24-hour ban
  4: { pointCost: 0 }     // Permanent (can't lift)
};
```

### Durations
```typescript
2: { duration: 3600 },   // 1 hour (in seconds)
3: { duration: 86400 },  // 24 hours
```

### Forgiveness Expiration
```typescript
// In requestForgiveness()
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
```

---

## Testing Queries

### Check Active Penalties
```sql
SELECT u.name, u.email, p.type, p.offense_number, p.ends_at
FROM user_penalties p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true;
```

### Check User Offense Count
```sql
SELECT u.name, poh.offense_count, poh.total_penalties_received
FROM penalty_offense_history poh
JOIN users u ON u.id = poh.user_id
WHERE poh.offense_count > 0;
```

### Manually Apply Penalty (Testing)
```sql
-- Simulate missed pickup
UPDATE reservations 
SET pickup_end = NOW() - INTERVAL '1 hour', status = 'reserved'
WHERE user_id = '<test-user-id>' LIMIT 1;

-- Then wait for cron or manually call Edge Function
```

### Reset User Penalties (Testing)
```sql
DELETE FROM user_penalties WHERE user_id = '<test-user-id>';
DELETE FROM penalty_offense_history WHERE user_id = '<test-user-id>';
DELETE FROM penalty_point_transactions WHERE user_id = '<test-user-id>';
```

---

## Monitoring

### Daily Metrics
```sql
-- Penalties applied today
SELECT type, COUNT(*) 
FROM user_penalties 
WHERE created_at::date = CURRENT_DATE 
GROUP BY type;

-- Forgiveness requests pending
SELECT COUNT(*) FROM user_penalties WHERE forgiveness_status = 'pending';

-- Points spent today
SELECT SUM(points_spent) FROM penalty_point_transactions 
WHERE created_at::date = CURRENT_DATE;
```

### Health Checks
```sql
-- Cron job running?
SELECT * FROM cron.job WHERE jobname = 'detect-missed-pickups';

-- Recent cron runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'detect-missed-pickups')
ORDER BY start_time DESC LIMIT 10;
```

---

## Common Issues

### User says they can't reserve but no penalty visible
**Check:**
1. `SELECT * FROM user_penalties WHERE user_id = '<id>' AND is_active = true;`
2. Clear browser cache
3. Check `ends_at` hasn't passed yet

### Forgiveness request not showing in partner dashboard
**Check:**
1. Partner ID matches: `SELECT partner_id FROM user_penalties WHERE id = '<penalty-id>';`
2. Status is 'pending': `SELECT forgiveness_status FROM user_penalties WHERE id = '<penalty-id>';`
3. Not expired: `SELECT forgiveness_expires_at FROM user_penalties WHERE id = '<penalty-id>';`

### Cron not detecting missed pickups
**Check:**
1. Edge Function deployed: `supabase functions list`
2. Cron job exists: `SELECT * FROM cron.job WHERE jobname = 'detect-missed-pickups';`
3. Check logs: Supabase Functions Dashboard

---

## Point System Integration

**Users earn points by:**
- Completing pickups (+10 pts)
- Daily check-ins (+5 pts)
- Referrals (+20 pts)

**Users spend points on:**
- Lifting 1-hour ban (-100 pts)
- Lifting 24-hour ban (-500 pts)

**Balance check:**
```sql
SELECT points FROM users WHERE id = '<user-id>';
```

**Transaction history:**
```sql
SELECT * FROM penalty_point_transactions 
WHERE user_id = '<user-id>' 
ORDER BY created_at DESC;
```

---

## Security Notes

✅ **RLS Policies Applied:**
- Users can only see/modify their own penalties
- Partners can only see penalties for their offers
- Admins can see all penalties
- Point deductions require user ownership verification

✅ **Input Validation:**
- Forgiveness messages: 20-500 characters
- Decision messages: Optional, max 500 chars
- All user inputs sanitized

✅ **Rate Limiting:**
- Forgiveness requests: 1 per penalty
- Decision changes: Not allowed after first decision
- Point lifts: 1 per penalty

---

## Support Contacts

**Database Issues:** Check Supabase logs → Contact Supabase support  
**Edge Function Issues:** Check Function logs → Redeploy if needed  
**Frontend Issues:** Check browser console → Review penalty.ts API calls  
**Business Logic:** Review PENALTY_CONFIG in penalty.ts  

---

## Changelog

**v1.0.0 (2024-01-27)**
- Initial implementation
- 4-tier system
- Forgiveness workflow
- Auto-detection cron
- Point-based lifting

---

**Status:** ✅ Ready for Production  
**Last Updated:** 2024-01-27  
**Maintainer:** Development Team
