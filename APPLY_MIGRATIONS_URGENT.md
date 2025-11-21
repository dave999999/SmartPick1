# 🚨 URGENT: Apply No-Show Migrations

## Why It's Failing

The error "toast.failedMarkNoShow" means the database functions don't exist yet in your database. You MUST apply the migrations first!

## Step-by-Step Fix

### **Step 1: Check if Functions Exist**

Go to Supabase Dashboard SQL Editor:
https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql

Run this query:
```sql
-- Copy from: supabase/CHECK_NO_SHOW_FUNCTIONS.sql
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname IN ('partner_mark_no_show', 'partner_mark_no_show_no_penalty')
ORDER BY proname;
```

**Expected Result:**
- Should return 2 rows (both functions)
- If returns 0 or 1 row, continue to Step 2

---

### **Step 2: Apply Migration 1 - Fix Existing Function**

Copy ENTIRE content from:
`supabase/migrations/20251113_fix_partner_mark_no_show_restore_quantity.sql`

Paste in SQL Editor and click **RUN**

This fixes `partner_mark_no_show` to restore offer quantity.

---

### **Step 3: Apply Migration 2 - Add No-Penalty Option**

Copy ENTIRE content from:
`supabase/migrations/20251113_partner_no_show_no_penalty.sql`

Paste in SQL Editor and click **RUN**

This creates `partner_mark_no_show_no_penalty` function.

---

### **Step 4: Verify Functions Exist**

Run the check query from Step 1 again. You should now see:
1. `partner_mark_no_show` (with quantity restoration)
2. `partner_mark_no_show_no_penalty` (new function)

---

### **Step 5: Test in Browser**

1. Refresh your Partner Dashboard page (Ctrl+F5)
2. Open browser DevTools Console (F12)
3. Find an expired reservation
4. Click either button:
   - **Apply Penalty** (red)
   - **No Penalty** (orange)

**What to Watch:**
- Console should NOT show "function does not exist"
- Toast should show actual error message now (not generic)
- If successful, reservation disappears and offer quantity increases

---

## Common Errors & Solutions

### Error: "function partner_mark_no_show_no_penalty does not exist"
**Solution:** You haven't applied Step 3 migration yet

### Error: "Reservation not found"
**Solution:** Reservation may have already been processed

### Error: "Reservation not active"
**Solution:** Reservation status is not ACTIVE (might be CANCELLED or COMPLETED already)

### Error: "Not authenticated"
**Solution:** You're not logged in as the partner who owns this reservation

---

## Debug Mode

After applying migrations, test with better error messages. The new version will show:
- ❌ **Old:** "Failed to mark as no-show" (generic)
- ✅ **New:** "Error: function does not exist" (specific)
- ✅ **New:** "Failed: Reservation not found" (specific)

Check browser console (F12) for detailed logs from `logger.error()`

---

## Quick Test Script

```javascript
// Run in browser console after logging in as partner
console.log('Testing no-show functions...');

// This should work after migrations
fetch('/api/partner_mark_no_show_no_penalty', {
  method: 'POST',
  body: JSON.stringify({ p_reservation_id: 'your-reservation-id' })
});
```

---

## Summary

✅ **Step 1:** Check functions exist
✅ **Step 2:** Apply migration 1 (fix existing)
✅ **Step 3:** Apply migration 2 (add new)
✅ **Step 4:** Verify both functions
✅ **Step 5:** Test in browser with F12 open

**Expected behavior after migrations:**
- Click "Apply Penalty" → Reservation disappears, quantity restored, partner gets points
- Click "No Penalty" → Reservation disappears, quantity restored, customer gets refund
- Better error messages tell you exactly what went wrong

🚀 Apply migrations now and test again!
