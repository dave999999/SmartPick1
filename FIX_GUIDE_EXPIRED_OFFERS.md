# 🔧 FIX EXPIRED OFFERS ISSUE - STEP BY STEP GUIDE

## Problem
- Expired offers are showing in the list
- Clicking on them shows "Pickup window has ended" error
- Users can't reserve them

## Root Cause
The database function `get_offers_in_viewport` only checks `expires_at` but not `pickup_end`, so offers with expired pickup windows are still returned.

## ✅ SOLUTION (3 Steps)

### Step 1: Apply Database Fix (REQUIRED)
You MUST apply this to your Supabase database:

1. Go to https://supabase.com/dashboard
2. Select your project: `ggzhtpaxnhwcilomswtm`
3. Click **SQL Editor** in the left menu
4. Click **New Query**
5. Copy and paste the entire contents of `APPLY_FIX_EXPIRED_OFFERS.sql`
6. Click **Run** (or press Ctrl+Enter)

**Expected Result:**
```
Success. No rows returned
```

If you see any errors, send them to me.

### Step 2: Verify the Fix
Run this query in the SQL Editor to check:

```sql
SELECT 
  id,
  title,
  pickup_end,
  CASE 
    WHEN pickup_end IS NULL THEN '24/7'
    WHEN pickup_end > NOW() THEN 'Valid'
    ELSE '⚠️ EXPIRED'
  END as status
FROM offers
WHERE status = 'ACTIVE'
ORDER BY pickup_end ASC NULLS LAST
LIMIT 10;
```

You should see which offers have expired pickup windows.

### Step 3: Clear Frontend Cache
After applying the database fix:

1. **Hard refresh your browser:** 
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Or clear the site data:**
   - Press F12 (DevTools)
   - Go to Application tab
   - Click "Clear site data"
   - Refresh page

## 🎯 What Was Fixed

### Frontend (Already Applied ✅)
1. **src/lib/api/offers.ts** - `getOfferById` now validates:
   - `expires_at > NOW()`
   - `pickup_end > NOW()` 
   - `status = 'ACTIVE'`
   - `quantity_available > 0`

2. **src/hooks/useOffers.ts** - Offers list now filters by `pickup_end`

3. **src/pages/ReserveOffer.tsx** - Better error messages for expired offers

### Database (NEEDS TO BE APPLIED ⚠️)
1. **get_offers_in_viewport()** function updated to filter:
   - `AND (o.pickup_end IS NULL OR o.pickup_end > NOW())`

## 📊 Testing

After applying the fix:

1. The map should only show active offers with valid pickup windows
2. Clicking an offer should load successfully
3. If you somehow access an expired offer directly (old link), you'll see a clear error message

## ❓ Troubleshooting

**Still seeing expired offers?**
- Make sure you applied the SQL in Step 1
- Hard refresh your browser (Ctrl+Shift+R)
- Check browser console for errors (F12)

**"Function does not exist" error?**
- The SQL wasn't applied correctly
- Try running it again in SQL Editor

**Need help?**
Send me:
1. Screenshot of SQL Editor after running the fix
2. Any error messages
3. Browser console output (F12 → Console tab)
