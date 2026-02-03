# ADMIN DASHBOARD - COMPREHENSIVE AUDIT & FIX PLAN

## METHODOLOGY
1. Check each admin tab systematically
2. Test actual database queries
3. Identify what works vs broken
4. Apply targeted fixes

## AUDIT RESULTS

### ✅ WORKING MODULES

#### 1. Dashboard Home (/)
- **Status**: ✅ WORKING
- **Data displayed**: Real KPIs from database
- **Issues**: None reported

#### 2. Partners (/admin/partners)
- **Status**: ✅ WORKING  
- **Queries**: Successfully fetch partners
- **Actions**: Approve/reject functional
- **Issues**: None reported

#### 3. Offers (/admin/offers)
- **Status**: ⚠️ PARTIALLY WORKING
- **What works**:
  - Offers query fetches data
  - Status badges show correctly (after fix)
  - Pause/Resume buttons work
  - Delete works
  - Edit dialog created
- **What's BROKEN**:
  - Stats cards show all 0s (checking non-existent fields)
  - Need to verify Edit actually saves

#### 4. Live Activity (/admin/live)
- **Status**: ✅ LIKELY WORKING
- **Features**: Real-time event monitoring
- **Issues**: Not tested by user yet

#### 5. System Health (/admin/health)  
- **Status**: ✅ LIKELY WORKING
- **Features**: Performance monitoring
- **Issues**: Not tested by user yet

---

### ❌ BROKEN MODULES

#### 1. Users (/admin/users) - CRITICAL
**Problem**: Shows 0 points for all users

**Root Cause Analysis**:
```typescript
// Current query in useUsers.ts:
.select('*')  // Fetches all columns including points_balance

// Then maps:
points_balance: user.points_balance || 0
```

**Possible Issues**:
1. **RLS Policy**: Admin user doesn't have permission to read points_balance
2. **Column doesn't exist**: Maybe column is named differently
3. **Data is actually 0**: Users really have 0 points
4. **Display issue**: Data fetches but doesn't render

**TESTS NEEDED**:
- [ ] Check actual database schema for points_balance column
- [ ] Check RLS policies on users table for admin role
- [ ] Check if data exists: `SELECT id, name, points_balance FROM users LIMIT 5`
- [ ] Check browser console for actual API response
- [ ] Verify UserManagement.tsx displays the field correctly

**Manage Points Dialog**:
- ✅ Dialog created
- ✅ useAdjustPoints hook exists
- ❓ Not tested if it actually updates database
- ❓ RLS policy might block admin from updating points_balance

#### 2. Reservations (/admin/reservations) - CRITICAL
**Problem**: Shows nothing / 0 reservations

**Current Query**:
```typescript
// useReservations.ts
.from('reservations')
.select(`
  *,
  offer:offers!inner(...),
  customer:users!reservations_customer_id_fkey(...),
  partner:partners!reservations_partner_id_fkey(...)
`)
```

**Possible Issues**:
1. **Foreign key names wrong**: Maybe fkey name doesn't match
2. **RLS blocks admin**: Can't read reservations
3. **No data**: No reservations in database
4. **Status filter issue**: Filtering out all results

**TESTS NEEDED**:
- [ ] Check if reservations exist: `SELECT COUNT(*) FROM reservations`
- [ ] Check foreign key names in schema
- [ ] Test query without joins
- [ ] Check RLS policies on reservations table
- [ ] Check what useReservationStats returns

#### 3. Support Tickets (/admin/support) - HIGH
**Problem**: Table likely doesn't exist

**Root Cause**:
- Migration created: `20260203000000_support_tickets_system.sql`
- ❌ **NEVER DEPLOYED** to Supabase

**Fix Required**:
1. Run migration in Supabase SQL Editor
2. Test support_tickets table exists
3. Test queries work

#### 4. Analytics (/admin/analytics) - HIGH
**Problem**: Uses wrong business model

**Issues**:
1. Calculates 15% commission revenue (WRONG)
2. Should calculate POINTS SOLD revenue
3. Queries might fail due to missing data

**Fix Required**:
- Rewrite revenue calculations for points-based model
- Add point_purchases tracking if doesn't exist

#### 5. Revenue (/admin/revenue) - HIGH  
**Problem**: Completely wrong business model

**Current**: Tracks partner commission (15% of GMV)
**Reality**: User buys POINTS, spends points on offers

**Fix Required**:
- Complete rewrite to track point purchases
- May need new table: point_purchases or point_transactions

#### 6. Moderation, Notifications, Messages, Settings, Audit
**Status**: ❌ PLACEHOLDER UI ONLY
**Fix Required**: Full implementation later

---

## CRITICAL FIXES NEEDED (IN ORDER)

### Priority 1: USERS - Show actual points
**Impact**: HIGH - Admin can't see user balances
**Steps**:
1. Check actual database to see if points_balance column exists
2. Check RLS policies - admin needs SELECT on users.points_balance
3. Verify API response contains points_balance
4. Fix display if data exists but not showing
5. Test Manage Points actually updates database

### Priority 2: RESERVATIONS - Show actual data
**Impact**: HIGH - Admin can't monitor reservations
**Steps**:
1. Verify reservations exist in database
2. Fix foreign key join names if wrong
3. Check/fix RLS policies for admin access
4. Remove any filters blocking data
5. Test stats calculations

### Priority 3: OFFERS - Fix stats cards
**Impact**: MEDIUM - Can see offers but stats wrong
**Steps**:
1. Already fixed status badges ✅
2. Fix stats cards (still checking non-existent fields)
3. Test Edit dialog actually saves
4. Verify all CRUD operations work

### Priority 4: DEPLOY SUPPORT TICKETS
**Impact**: MEDIUM - Feature doesn't exist
**Steps**:
1. Copy migration SQL to Supabase SQL Editor
2. Run migration
3. Test table exists
4. Test queries work

### Priority 5: REVENUE & ANALYTICS
**Impact**: LOW - Wrong model but not blocking
**Steps**:
1. Design proper points-based revenue tracking
2. Create point_purchases table if needed
3. Rewrite all revenue calculations
4. Remove commission-based code

---

## IMMEDIATE ACTION PLAN

1. **Test actual database** - See what data exists
2. **Check RLS policies** - Admin permissions  
3. **Fix Users display** - Most critical
4. **Fix Reservations query** - Second most critical
5. **Verify Offers completely** - Nearly done
6. **Test all actions** - Make sure mutations work

---

## RLS POLICY CHECK NEEDED

Admin dashboard likely fails because RLS policies don't allow admin role to:
- SELECT users.points_balance
- UPDATE users.points_balance  
- SELECT reservations.*
- SELECT support_tickets.*

**Fix**: Add admin bypass policies for all admin dashboard queries
