# Fix Live Stats - Complete Guide

## Problem
The Live tab in admin dashboard shows errors (400/404) when refreshing because:
1. RPC functions may not be deployed to Supabase
2. Active user tracking was incorrect (counting new users, not active users)
3. No `last_seen` column in users table to track real activity

## Solution Applied

### 1. Database Changes (FIX_LIVE_STATS_REALTIME.sql)
- ✅ Added `last_seen` column to users table
- ✅ Fixed `admin_get_realtime_stats()` function to count actual active users (last 15 min)
- ✅ Fixed `admin_get_live_activity()` function with better activity feed
- ✅ Added `update_user_last_seen()` function for client-side tracking
- ✅ Handles missing tables gracefully (no more console errors)

### 2. Client-Side Tracking (useActivityTracking.ts)
- ✅ Created hook to update user's last_seen timestamp
- ✅ Updates every 5 minutes while user is active
- ✅ Updates when browser tab becomes visible
- ✅ Silent fail if function doesn't exist yet

### 3. App Integration (App.tsx)
- ✅ Added activity tracking hook to main app
- ✅ Tracks all logged-in users automatically

## Deployment Steps

### Step 1: Run SQL Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy and run **FIX_LIVE_STATS_REALTIME.sql**
3. Verify no errors in output

### Step 2: Deploy Code
```bash
pnpm build
git add -A
git commit -m "Fix: Real-time activity tracking for admin live stats"
git push origin main
```

### Step 3: Verify It Works
1. Log in as a regular user (customer or partner)
2. Browse around for a few seconds
3. Open admin dashboard → Live tab
4. You should see:
   - **Active Users Now**: 1 (or more if multiple users logged in)
   - **No console errors** (400/404 fixed)
   - **Live Activity Feed**: Recent reservations

## What Changed

### Before:
```sql
-- Old logic (WRONG)
SELECT COUNT(*) FROM users
WHERE role = 'CUSTOMER'
AND created_at > NOW() - INTERVAL '24 hours';
-- This counted NEW users, not ACTIVE users!
```

### After:
```sql
-- New logic (CORRECT)
SELECT COUNT(*) FROM users
WHERE role = 'CUSTOMER'
AND last_seen > NOW() - INTERVAL '15 minutes';
-- This counts actually ACTIVE users!
```

## Testing Checklist

- [ ] Run FIX_LIVE_STATS_REALTIME.sql in Supabase
- [ ] Deploy code to Vercel
- [ ] Log in as regular user
- [ ] Wait 10 seconds (activity hook updates)
- [ ] Open admin dashboard → Live tab
- [ ] Click "Refresh Now"
- [ ] Verify "Active Users Now" shows 1+
- [ ] Verify no console errors
- [ ] Verify Live Activity Feed shows recent activity

## Technical Details

### Active User Definition
- **Active** = Seen in last 15 minutes
- Updated when:
  - User logs in
  - Every 5 minutes while browsing
  - When user switches back to tab

### Activity Feed
Shows last 50 events:
- New reservations
- Completed pickups
- Cancelled reservations
- Expired reservations

### Error Handling
- Functions fail silently if tables don't exist
- No more 400/404 console spam
- Empty data returned instead of errors

## Files Modified

1. **FIX_LIVE_STATS_REALTIME.sql** - Database migration
2. **src/hooks/useActivityTracking.ts** - Activity tracking hook
3. **src/App.tsx** - Integrated tracking hook

## Next Steps

After running the SQL file:
1. Active user count will be accurate
2. Live activity feed will show real events
3. No more console errors on refresh
4. Stats update every 10 seconds automatically

---

**Status**: Ready to deploy
**Impact**: Fixes Live tab completely, removes console errors
**Breaking Changes**: None (backwards compatible)
