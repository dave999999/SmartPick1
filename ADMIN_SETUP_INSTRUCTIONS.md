# 🚀 CRITICAL FIX: Admin Dashboard Setup Instructions

## ⚠️ IMPORTANT: Run These Steps IN ORDER

---

## Step 1: Run Database Migration (REQUIRED)

**Go to Supabase Dashboard → SQL Editor → New Query**

Copy and paste this SQL:

```sql
-- Add points_balance column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_points_balance ON users(points_balance);

-- Make your user an admin (REPLACE with your actual email!)
UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'YOUR_EMAIL_HERE@gmail.com';

-- Verify it worked
SELECT id, name, email, role, points_balance 
FROM users 
WHERE role = 'ADMIN';
```

**IMPORTANT:** Replace `YOUR_EMAIL_HERE@gmail.com` with your actual email!

Click "Run" button.

---

## Step 2: Verify Migration Worked

Run this query:

```sql
-- Check if everything is set up correctly
SELECT 
  'users.points_balance column' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'points_balance'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

SELECT 
  'Admin users' as check,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' admin(s) found'
    ELSE '❌ No admins'
  END as status
FROM users WHERE role = 'ADMIN';
```

You should see:
- ✅ EXISTS for points_balance column
- ✅ 1 admin(s) found

---

## Step 3: Deploy Code Changes

The code fixes are already committed. Now:

```bash
git pull origin main
```

Vercel will auto-deploy (or you can deploy manually).

---

## Step 4: Test Admin Dashboard

1. **Log out** of the app (if logged in)
2. **Log in** with the email you made admin
3. Go to `/admin` route
4. Check all tabs:
   - ✅ Dashboard Home (should show stats)
   - ✅ Users (should show users with points)
   - ✅ Offers (should show 67 offers)
   - ✅ Partners (should show 22 partners)
   - ✅ Reservations (will be 0 if no reservations)
   - ✅ Support Tickets
   - ✅ Analytics
   - ✅ Revenue
   - etc.

---

## Step 5: Test Points Management

1. Go to Users tab
2. Click actions (⋮) on any user
3. Click "Manage Points"
4. Grant 100 points
5. Check that user's points updated

---

## What Was Fixed?

### Database Issues:
- ❌ `points_balance` column didn't exist → ✅ Added
- ❌ No admin users → ✅ Created admin user
- ❌ RLS blocking queries → ✅ Fixed by adding admin role

### Code Issues:
- ❌ Querying wrong tables/columns → ✅ Fixed all hooks
- ❌ Non-existent RPC calls → ✅ Removed/replaced
- ❌ Status calculations wrong → ✅ Fixed to use actual DB status

---

## Troubleshooting

### "Still showing 0 points"
- Make sure you ran the ALTER TABLE migration
- Check column exists: `SELECT points_balance FROM users LIMIT 1;`
- If error "column doesn't exist", migration didn't run

### "Access denied" or "RLS blocks query"
- Check your user has role='ADMIN' (case-sensitive, uppercase!)
- Run: `SELECT id, email, role FROM users WHERE email = 'your@email.com';`
- If role is not 'ADMIN', run UPDATE query again

### "No data showing"
- Open browser console (F12)
- Check Network tab for errors
- Look for 403/401 errors (= RLS blocking)
- Check Application tab → Local Storage → Make sure logged in

---

## Success Criteria

After these steps, you should have:
- ✅ Can access /admin route
- ✅ All tabs load without errors
- ✅ Users show actual points (even if 0)
- ✅ Offers show 67 offers
- ✅ Partners show 22 partners
- ✅ Manage Points dialog works
- ✅ All stats calculate correctly

---

## Next Steps After This Works

1. Grant points to test users for testing
2. Create test reservations
3. Test all admin actions (ban, unban, edit offers, etc.)
4. Configure settings
5. Test notification system
