# 🧪 Admin Dashboard Testing Checklist

## PRE-TESTING SETUP
- [ ] Dev server running: `pnpm dev`
- [ ] Navigate to: http://localhost:5173/admin-dashboard
- [ ] Login with ADMIN role user
- [ ] Open browser DevTools (F12)
- [ ] Open Console tab

---

## PHASE 1: CONSOLE ERROR CHECK

### Initial Load
- [ ] Check console immediately after page load
- [ ] Expected: No "logger is not defined" errors
- [ ] Expected: May see debug logs like "Admin API: Fetching..." (NORMAL)

### Tab Navigation (Check console after clicking each tab)
- [ ] Overview
- [ ] Partners
- [ ] Pending
- [ ] Users
- [ ] New Users
- [ ] Banned
- [ ] Offers
- [ ] Moderation
- [ ] Financial
- [ ] Analytics
- [ ] Health
- [ ] Audit
- [ ] Config

---

## PHASE 2: FUNCTIONAL TESTING

### OVERVIEW TAB
- [ ] Verify stats display (partners, users, offers counts)
- [ ] Check "Connection Status" indicator
- [ ] Click "Test Connection" button
- [ ] Test quick action buttons (Pending, New Users, Offers)
- [ ] Click "Refresh" button

### PARTNERS TAB (1241 lines)
- [ ] Search for partner by business name
- [ ] Filter by status: ALL → PENDING → APPROVED → PAUSED → BLOCKED
- [ ] Click "View" to see partner details modal
- [ ] View partner's offers in details modal
- [ ] Test pagination (Next/Prev buttons)
- [ ] Select multiple partners (checkboxes)
- [ ] Test bulk actions (Approve All)
- [ ] Click "Add Partner" button
- [ ] Test Georgian phone validation: +995 5XX XXX XXX
- [ ] Test map location picker

### PENDING TAB
- [ ] View pending partners list
- [ ] Check badge count matches list
- [ ] Click "View Details" on a partner
- [ ] Click "Approve" on a partner
- [ ] Check toast notification appears
- [ ] Verify partner removed from pending list
- [ ] Check Partners tab shows newly approved partner
- [ ] Test realtime updates (open two browser windows)

### USERS TAB (435 lines)
- [ ] Search by name
- [ ] Search by email
- [ ] Filter by status: ACTIVE → DISABLED → BANNED
- [ ] Filter by role: CUSTOMER → PARTNER → ADMIN
- [ ] Click "Edit" to modify user details
- [ ] Test disable user
- [ ] Test enable user
- [ ] Test pagination

### NEW USERS TAB
- [ ] View users registered in last 4 days
- [ ] Check total count display
- [ ] Click "View Details" to see user info
- [ ] Verify creation dates are recent

### BANNED USERS TAB (228 lines)
- [ ] View banned users list
- [ ] Check ban details (penalty_count, penalty_until)
- [ ] Click "Unban" button
- [ ] Confirm unban action
- [ ] Check toast notification
- [ ] Verify user removed from banned list
- [ ] Check Users tab shows user as ACTIVE

### OFFERS TAB (519 lines)
- [ ] Search by title
- [ ] Search by description
- [ ] Search by partner name
- [ ] Filter by status: ACTIVE → PAUSED → EXPIRED
- [ ] Filter by category
- [ ] Click "Edit" to modify offer
- [ ] Test enable offer
- [ ] Test disable offer
- [ ] Test pagination
- [ ] View partner info for offer

### MODERATION TAB (309 lines)
- [ ] View flagged offers list
- [ ] Click "Review" on a flag
- [ ] Test approve flag with notes
- [ ] Test reject flag
- [ ] Test flag offer manually
- [ ] Test unflag offer
- [ ] Test feature offer (for homepage)
- [ ] Test unfeature offer

### FINANCIAL TAB (369 lines)
- [ ] Verify revenue stats display:
  - [ ] Total revenue
  - [ ] Platform commission
  - [ ] Partner payouts
  - [ ] Completed reservations
- [ ] Check payouts list loads
- [ ] Click "Create Payout" button
- [ ] Select partner from dropdown
- [ ] Enter commission rate
- [ ] Submit payout creation
- [ ] Test mark payout as PAID
- [ ] Test mark payout as CANCELLED
- [ ] Click "Export Report" button
- [ ] Verify CSV downloads
- [ ] Open CSV and verify format

### ANALYTICS TAB
- [ ] Check charts render correctly
- [ ] Test date range filters
- [ ] Test export functionality
- [ ] Verify data accuracy

### HEALTH TAB
- [ ] View system metrics
- [ ] Check database status indicator
- [ ] Verify performance metrics display

### AUDIT TAB
- [ ] View admin action logs
- [ ] Test filtering by action type
- [ ] Test search functionality
- [ ] Test date range filtering
- [ ] Verify logs show correct user info

### CONFIG TAB (581 lines)
- [ ] Open "Points & Economy" tab
- [ ] Change welcomePoints value
- [ ] Open "Commission & Fees" tab
- [ ] Change platformCommission value
- [ ] Open "Email Settings" tab
- [ ] Toggle notificationsEnabled
- [ ] Open "Moderation" tab
- [ ] Toggle autoApprovePartners
- [ ] Open "Technical" tab
- [ ] Toggle maintenanceMode
- [ ] Click "Save Changes" button
- [ ] Check toast confirmation
- [ ] Refresh page
- [ ] Verify changes persisted

---

## PHASE 3: ERROR SCENARIOS

### Validation Testing
- [ ] Try adding partner with invalid email format
- [ ] Try adding partner with invalid Georgian phone
- [ ] Try empty business name when adding partner
- [ ] Try to change your own admin role (should prevent)

### Constraint Testing
- [ ] Try to delete partner with active offers (check error handling)
- [ ] Try to delete user with active reservations
- [ ] Try to set negative commission rate

### Network Testing
- [ ] Open DevTools → Network tab → Set "Offline"
- [ ] Try to load partners list (should show error)
- [ ] Set back to "Online"
- [ ] Verify data loads again

### Rate Limiting
- [ ] Make rapid API calls (click approve 10 times fast)
- [ ] Verify rate limiting kicks in

---

## PHASE 4: PERFORMANCE CHECK

### Load Times
- [ ] Measure page initial load (should be < 2 seconds)
- [ ] Measure search response time (should be < 500ms)
- [ ] Measure stats refresh time (should be < 1 second)

### Data Volume
- [ ] Test pagination with 100+ records
- [ ] Test search with large result set
- [ ] Verify UI remains responsive

### Memory Usage
- [ ] Open DevTools → Performance Monitor
- [ ] Navigate through all tabs
- [ ] Check for memory leaks (should be stable)

---

## PHASE 5: SECURITY VERIFICATION

### Authentication
- [ ] Logout from admin account
- [ ] Try to access /admin-dashboard directly
- [ ] Should redirect to login or home

### Authorization
- [ ] Login as regular user (non-admin)
- [ ] Try to access /admin-dashboard
- [ ] Should show "Admin access required" error

### RLS Verification
- [ ] Open DevTools → Network tab
- [ ] Filter by "rest" (Supabase API calls)
- [ ] Perform admin actions (approve partner, etc.)
- [ ] Verify no 403 errors (RLS blocking)
- [ ] All requests should return 200 or 201

### Audit Trail
- [ ] Perform several admin actions
- [ ] Go to Audit tab
- [ ] Verify all actions logged with:
  - [ ] Correct timestamp
  - [ ] Correct admin user
  - [ ] Correct action type
  - [ ] Correct target ID

---

## PHASE 6: BULK OPERATIONS

### Bulk Partner Actions
- [ ] Select 5 partners
- [ ] Click "Approve Selected" (via BulkActions)
- [ ] Check all 5 approved
- [ ] Verify toast notification shows count

### Bulk User Actions
- [ ] Select multiple users
- [ ] Test bulk disable
- [ ] Test bulk enable

---

## EXPECTED RESULTS

### Console
✅ Clean console (no "logger is not defined" errors)  
✅ May see intentional debug logs: "Admin API: Fetching..." (NORMAL)  
✅ No unhandled promise rejections  
✅ No React warnings  

### Network (DevTools)
✅ All Supabase requests return 200 (or 201 for inserts)  
✅ No 403 errors (RLS blocking)  
✅ No 401 errors (authentication issues)  
✅ No timeout errors  

### UI/UX
✅ Toast notifications on all actions  
✅ Loading states during data fetch  
✅ Confirmation dialogs for destructive actions  
✅ Badge counts update in realtime  
✅ Pagination works smoothly  
✅ Search has debounce (doesn't spam API)  

---

## ISSUE REPORTING

If you find any errors, document:

1. **Tab:** Which tab were you on?
2. **Action:** What did you click/do?
3. **Error Message:** Exact console error (copy/paste)
4. **Screenshot:** Visual proof of issue
5. **Network:** DevTools → Network tab details
6. **User Role:** Admin, Partner, or Customer?
7. **Browser:** Chrome, Firefox, Safari, etc.
8. **Steps to Reproduce:**
   - Step 1: ...
   - Step 2: ...
   - Step 3: Error occurs

---

## DOCUMENTATION REFERENCES

- **Full Audit Report:** `ADMIN_DASHBOARD_AUDIT_REPORT.md` (13 sections, detailed analysis)
- **Quick Summary:** `ADMIN_DASHBOARD_QUICK_SUMMARY.md` (at-a-glance overview)
- **API Functions:** `src/lib/admin-api.ts` (581 lines, 40+ functions)
- **RLS Policies:** `supabase/migrations/20251102_add_rls_policies.sql`

---

## STATUS SUMMARY

✅ **Fixed:** Missing logger imports (11 files)  
✅ **Verified:** RLS policies (all tables secured)  
✅ **Verified:** Admin authentication flow  
✅ **Verified:** Error handling throughout  
✅ **Ready:** Comprehensive functional testing  

**Grade:** A- (Excellent foundation, needs comprehensive QA)

---

## START TESTING NOW!

```bash
cd d:\v3\workspace\shadcn-ui
pnpm dev
```

Then open: http://localhost:5173/admin-dashboard

**Check console immediately after page load!**

Good luck! 🚀
