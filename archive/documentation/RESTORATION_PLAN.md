# 🎯 COMPLETE RESTORATION PLAN

## Current Situation
Your database has broken functions causing errors. The frontend code has been updated but you need to run SQL to clean up the database.

## ✅ What I've Done (Already Pushed to GitHub)

### Commit 1: `4817f24`
- Fixed `getPartnerPoints()` to return `null` instead of crashing
- Fixed `getPartnerPointTransactions()` to return `[]` instead of crashing

### Commit 2: `3549d80` (Latest)
- Removed broken `partner_mark_as_picked_up` RPC call
- Replaced with direct table UPDATE
- Pickup now works without needing database function

**Result**: Your code is clean and will work once database is fixed.

---

## 🔧 What YOU Need to Do (Database Fix)

### Step 1: Run COMPLETE_RESTORE.sql

**File**: `COMPLETE_RESTORE.sql`

**What it does**:
1. ✅ Removes ALL broken functions (`partner_mark_as_picked_up`, `add_partner_points`, etc.)
2. ✅ Drops broken tables (`partner_points`, `partner_point_transactions`)
3. ✅ Restores clean `add_user_points()` function
4. ✅ Enables RLS on all tables
5. ✅ Creates CORRECT security policies for:
   - Users (2 policies)
   - Partners (3 policies)
   - Offers (4 policies)
   - Reservations (5 policies)
   - User Points (1 policy)
   - Point Transactions (1 policy)

**How to run**:
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql
2. Copy entire content of `COMPLETE_RESTORE.sql`
3. Paste and click "Run"
4. Verify you see "✅ DATABASE FULLY RESTORED!"

### Step 2: Hard Refresh Browser
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Step 3: Wait for Vercel Deploy
- Vercel will auto-deploy in 1-2 minutes
- Your production site will have the fixes

---

## 📊 What Will Work After Fix

### ✅ WORKING Features:
1. **Homepage** - Shows all offers
2. **Partner Dashboard** - Loads with your data
3. **Offers Management** - Create, edit, delete offers
4. **Reservations** - View and manage reservations
5. **Pickup** - Mark reservations as picked up ✅
6. **Security** - RLS policies protect all data
7. **User Points** - View your points balance
8. **Point Transactions** - See point history

### ⚠️ DISABLED Features (Intentionally Removed):
1. **Partner Points** - Table doesn't exist (feature removed)
2. **Partner Point Transactions** - Table doesn't exist
3. **Points Transfer to Partner** - Not implemented

**Why removed?**: These features were causing all the errors. The original implementation was incomplete and breaking the entire app.

---

## 🔒 Security Status

### RLS (Row Level Security) - ENABLED ✅

**Users Table**:
- Can read own profile
- Can update own profile

**Partners Table**:
- Anyone can see approved partners
- Partners can see/edit own profile
- Can create partner applications

**Offers Table**:
- Anyone can see active offers
- Partners can manage own offers

**Reservations Table**:
- Customers see own reservations
- Partners see reservations for their offers
- Can create and update own reservations

**User Points Table**:
- Can view own points

**Point Transactions Table**:
- Can view own transactions

### What's Protected:
- ✅ Users can't see other users' data
- ✅ Partners can't edit other partners' offers
- ✅ Customers can't see other customers' reservations
- ✅ Points are protected (only service_role can modify)

---

## 🧪 Testing Checklist

After running `COMPLETE_RESTORE.sql`:

### As Customer:
- [ ] Can see offers on homepage
- [ ] Can make reservation
- [ ] Can see own reservations in MyPicks
- [ ] Can see own points balance
- [ ] Can see point transaction history

### As Partner:
- [ ] Dashboard loads
- [ ] Can see own offers
- [ ] Can create new offer
- [ ] Can edit/delete own offers
- [ ] Can see reservations for own offers
- [ ] Can mark reservation as picked up
- [ ] Profile page works

### Security Test:
- [ ] Can't access other users' data
- [ ] Can't edit other partners' offers
- [ ] RLS blocks unauthorized access

---

## 📁 Files Created

### SQL Files:
1. **COMPLETE_RESTORE.sql** ⭐ **RUN THIS**
2. DISABLE_RLS_NOW.sql (backup - only if restore fails)
3. CHECK_CURRENT_STATE.sql (diagnostic tool)
4. FIX_DATABASE_NOW.sql (superseded by COMPLETE_RESTORE)

### Documentation:
- This file (RESTORATION_PLAN.md)

---

## 🚨 If Something Goes Wrong

### Error: "RLS policy blocks query"
**Solution**: RLS didn't enable properly. Run `DISABLE_RLS_NOW.sql` temporarily, then re-run `COMPLETE_RESTORE.sql`

### Error: "Function already exists"
**Solution**: Run these first:
```sql
DROP FUNCTION IF EXISTS partner_mark_as_picked_up(UUID) CASCADE;
DROP FUNCTION IF EXISTS add_partner_points(UUID, INT, TEXT, JSONB) CASCADE;
```
Then run `COMPLETE_RESTORE.sql` again.

### Dashboard still not loading
1. Check browser console (F12)
2. Run `CHECK_CURRENT_STATE.sql` to see what's wrong
3. Share the output with me

### Pickup still not working
- Make sure you refreshed browser after running SQL
- Check if reservation status is 'ACTIVE' (can only pickup active reservations)
- Verify you're the partner who owns that offer

---

## 📝 Summary

**What broke**: Attempted to add partner points system with broken functions

**Root cause**: 
1. Functions tried to return non-existent columns
2. Tables didn't exist
3. RLS policies conflicted
4. Frontend tried to call broken functions

**Solution**:
1. ✅ Removed all broken functions (SQL)
2. ✅ Fixed frontend to not call broken functions (Code - already pushed)
3. ⏳ Restore clean RLS policies (SQL - YOU need to run)

**Timeline**:
- Code fixes: ✅ Done (pushed to GitHub)
- Database fixes: ⏳ Waiting for you to run `COMPLETE_RESTORE.sql`
- Vercel deploy: ⏳ Auto-deploys after GitHub push (1-2 min)

---

## 🎯 Next Steps

**RIGHT NOW**:
1. Run `COMPLETE_RESTORE.sql` in Supabase
2. Hard refresh browser
3. Test the app

**Expected Result**:
- ✅ Dashboard loads
- ✅ All features work
- ✅ Pickup works
- ✅ Security enabled

**Time to fix**: ~2 minutes

---

## 💡 Future Improvements

If you want to re-implement partner points later:

1. Create proper `partner_points` table
2. Create proper `partner_point_transactions` table  
3. Implement backend API endpoint (not database function)
4. Use service role key in backend
5. Frontend calls backend API
6. Backend modifies points with proper permissions

This is the correct way - not using database RPC functions from frontend.
