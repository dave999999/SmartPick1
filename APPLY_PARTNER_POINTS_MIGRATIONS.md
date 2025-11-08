# Apply Partner Points System Migrations

## ⚠️ Error Explanation

The error you're seeing (`404 Not Found` on `partner_points`) means the database tables don't exist yet. The migrations need to be applied to your Supabase database first.

## 🚀 Quick Fix - Apply Migrations

### **Option 1: Using Supabase SQL Editor (RECOMMENDED)**

This is the easiest and most reliable method:

1. **Go to Supabase SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql/new

2. **Apply First Migration (Partner Points System):**
   - Open `supabase/migrations/20251108_partner_points_system.sql`
   - Copy the ENTIRE file contents
   - Paste into Supabase SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for success message

3. **Apply Second Migration (Point Transfer on Pickup):**
   - Open `supabase/migrations/20251108_partner_point_transfer.sql`
   - Copy the ENTIRE file contents
   - Paste into Supabase SQL Editor (new query)
   - Click "Run"
   - Wait for success message

4. **Apply Third Migration (Points Deduction for Reservations):**
   - Open `supabase/migrations/20251108_add_points_to_reservation.sql`
   - Copy the ENTIRE file contents
   - Paste into Supabase SQL Editor (new query)
   - Click "Run"
   - Wait for success message

4. **Refresh Your Dashboard:**
   - Go back to your partner dashboard
   - Refresh the page (F5 or Ctrl+R)
   - You should now see your points and slots!

---

### **Option 2: Using Node.js Script**

If you prefer automation:

1. **Get your Service Role Key:**
   - Go to: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/settings/api
   - Copy the **service_role** key (NOT anon key)
   - ⚠️ Keep this secret! Don't commit it to git

2. **Run the migration script:**
   ```powershell
   node apply-partner-points-migration.js YOUR_SERVICE_ROLE_KEY_HERE
   ```

3. **Refresh your dashboard** after successful migration

---

## 📋 What Gets Created

### Tables:
- **`partner_points`** - Stores balance and offer slots for each partner
- **`partner_point_transactions`** - Audit log of all point movements

### Triggers:
- **Welcome Bonus** - Auto-grants 1000 points when partner approved
- **Pickup Rewards** - Transfers points to partner on successful pickup
- **Slot Validation** - Prevents creating offers beyond slot limit

### Functions:
- **`add_partner_points()`** - Securely add/deduct points (service_role only)
- **`purchase_partner_offer_slot()`** - Buy additional slots with points (authenticated)

### RLS Policies:
- Partners can view their own points
- Service role has full access
- Users/anon have no access

---

## ✅ Verification

After applying migrations, verify everything works:

1. **Check Points Display:**
   - Open partner dashboard
   - You should see green badge with "1000 Points • 4 Slots" in header

2. **Test Pickup Flow:**
   - Create a test reservation as a user
   - Mark as picked up as partner
   - Partner should receive points (check transactions)

3. **Test Slot Purchase:**
   - Click on points badge
   - Try purchasing 5th slot (costs 50 points)
   - Should succeed and show "5 Slots"

---

## 🔧 Troubleshooting

**"Still getting 404 after applying migrations"**
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Check Supabase Table Editor to confirm tables exist
- Verify no SQL errors in Supabase logs

**"Migration failed with error"**
- Check if tables already exist (might be partial migration)
- Review error message in Supabase SQL Editor
- You may need to drop conflicting objects first

**"Points not showing for existing partners"**
- The backfill script runs automatically in migration 1
- Check `partner_points` table in Supabase Table Editor
- All approved partners should have 1000 point records

---

## 🆘 Need Help?

If migrations fail or you need assistance:
1. Share the exact error message from Supabase
2. Check which step failed (migration 1 or 2)
3. We can manually fix any conflicts
