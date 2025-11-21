# 🔧 Maintenance Mode Feature - Quick Guide

## ✅ What Changed

### Removed
- ❌ **"Home" button** from Admin Dashboard header
- ❌ **"Sign Out" button** from Admin Dashboard header

### Added
- ✅ **Maintenance Mode Toggle** in Admin Dashboard header
- ✅ **Confirmation Dialog** with detailed explanation
- ✅ **Admin Bypass** - Admins can access site even in maintenance mode
- ✅ **Database-backed** - Settings persist across deployments

## 📍 Location

**Admin Dashboard → Header → Right Side**

```
┌─────────────────────────────────────────────────────┐
│ Admin  [Live Stats]         [Refresh] [Maintenance] │
│                                         Mode [  ON] │
└─────────────────────────────────────────────────────┘
```

## 🎯 How to Use

### 1. Enable Maintenance Mode

1. Open **Admin Dashboard**
2. Look at the **header** (top right)
3. Find the **"Maintenance Mode"** switch
4. **Toggle it ON**
5. A confirmation dialog appears:

```
╔═══════════════════════════════════════════════════╗
║  ⚠️  Enable Maintenance Mode?                     ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  This will block all non-admin users from        ║
║  accessing the site.                             ║
║                                                   ║
║  What happens:                                    ║
║  • Customers will see maintenance page           ║
║  • Partners cannot access their dashboard        ║
║  • Only ADMINs can bypass and use the site       ║
║  • All reservations and operations are paused    ║
║                                                   ║
║         [Cancel]  [Enable Maintenance Mode]      ║
╚═══════════════════════════════════════════════════╝
```

6. Click **"Enable Maintenance Mode"** to confirm

### 2. What Happens When Enabled

**For Customers & Partners:**
- See maintenance page immediately
- Cannot browse offers
- Cannot make reservations
- Cannot access dashboards

**For Admins:**
- ✅ Can still access all pages
- ✅ Can manage partners, users, offers
- ✅ Can toggle maintenance mode OFF
- ✅ Bypass completely automatic

### 3. Disable Maintenance Mode

1. Toggle the switch **OFF**
2. Confirmation dialog appears:

```
╔═══════════════════════════════════════════════════╗
║  ⚠️  Disable Maintenance Mode?                    ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  This will restore normal access for all users.  ║
║                                                   ║
║  What happens:                                    ║
║  • Site becomes publicly accessible              ║
║  • Customers can browse and reserve offers       ║
║  • Partners can manage their dashboard           ║
║  • All normal operations resume                  ║
║                                                   ║
║         [Cancel]  [Disable Maintenance Mode]     ║
╚═══════════════════════════════════════════════════╝
```

3. Click **"Disable Maintenance Mode"** to confirm

## 🔧 Setup Required

### Run Migration
Before using this feature, run the migration:

1. Go to **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Run: `supabase/migrations/20251117_create_system_settings.sql`

This creates the `system_settings` table and default maintenance mode entry.

## 📊 Technical Details

### Database
- Table: `system_settings`
- Key: `maintenance_mode`
- Value: `{"enabled": true/false}`

### How It Works
1. Admin toggles switch
2. Confirmation dialog shows
3. On confirm: Updates `system_settings` table
4. `App.tsx` checks database on load
5. If enabled + user not admin → Show maintenance page
6. If enabled + user is admin → Allow full access

### Persistence
- Settings stored in **database** (not environment variable)
- Persists across:
  - Deployments
  - Server restarts
  - Browser sessions

## 🎯 Use Cases

### ✅ When to Enable

1. **Database Migrations**
   - Running large schema changes
   - Updating indexes
   - Data transformations

2. **Critical Bug Fixes**
   - Fixing payment issues
   - Resolving data corruption
   - Emergency patches

3. **Major Feature Deployments**
   - Testing new features in production
   - Staged rollouts
   - Configuration changes

4. **Server Maintenance**
   - Backup operations
   - Performance tuning
   - Infrastructure updates

### ❌ When NOT to Enable

- Regular deployments (zero-downtime)
- Minor bug fixes
- Content updates
- Admin-only changes

## 💡 Pro Tips

1. **Plan Ahead** - Announce maintenance window to users
2. **Quick Toggles** - Keep maintenance periods short
3. **Admin Testing** - Test changes while in maintenance mode
4. **Verify Before Disabling** - Ensure everything works
5. **Monitor** - Watch for issues after re-enabling

## 🚨 Important Notes

- ⚠️ **Admins always bypass** - You can work while maintenance is ON
- ⚠️ **Partners are blocked** - They cannot access their dashboard
- ⚠️ **No grace period** - Takes effect immediately
- ⚠️ **All tabs blocked** - Customers cannot browse at all

## 🔍 Troubleshooting

### Issue: Toggle doesn't work
- **Solution**: Run the migration file
- Check Supabase SQL Editor for errors

### Issue: Still seeing maintenance page as admin
- **Solution**: Sign out and sign back in
- Clear browser cache
- Check your role is set to 'ADMIN'

### Issue: Users can still access after enabling
- **Solution**: They may have cached the old state
- Wait 10-15 seconds for propagation
- Have them refresh their browser

## 📝 Maintenance Page Text

Users see:
```
🚧 Under Construction

We're working on something amazing!

Our site is currently undergoing scheduled
maintenance to bring you new features and
improvements. We'll be back soon!

● ● ● (animated dots)
```

---

**All changes committed and pushed to GitHub!** 🎉
