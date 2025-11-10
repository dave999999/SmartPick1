# 🧪 ADMIN DASHBOARD - HANDS-ON TESTING GUIDE

**Date:** November 11, 2025  
**URL:** http://localhost:5174/admin  
**Purpose:** Systematic manual testing of all admin functions

---

## 🚀 QUICK START

### Step 1: Open the Admin Dashboard
```bash
# Server should already be running on port 5174
# If not, start it:
cd d:\v3\workspace\shadcn-ui
pnpm dev
```

### Step 2: Login as Admin
- Navigate to http://localhost:5174/login
- Use admin credentials
- Should redirect to http://localhost:5174/admin

### Step 3: Open Browser Console
- Press `F12` or `Ctrl+Shift+J`
- Keep console open to see errors

---

## 📋 TEST CHECKLIST (Do in Order)

### ✅ TAB 1: OVERVIEW
**Time:** 2 minutes

- [ ] Click "Overview" tab
- [ ] Verify 4 stat cards show numbers:
  - Total Partners
  - Pending Applications
  - Active Users
  - Total Reservations
- [ ] Check connection status (green dot = connected)
- [ ] Click "Refresh Stats" button
- [ ] Verify numbers update

**Expected:** All stats load, no errors  
**If broken:** Check browser console for API errors

---

### ✅ TAB 2: PARTNERS
**Time:** 10 minutes

#### Part A: View Partners
- [ ] Click "Partners" tab
- [ ] Verify partner table loads
- [ ] Check columns: Business Name, Email, Phone, Status, Actions
- [ ] Verify pagination shows "Page X of Y"

#### Part B: Search & Filter
- [ ] Type business name in search box
- [ ] Verify table filters in real-time
- [ ] Select status filter: "ACTIVE"
- [ ] Verify only active partners show
- [ ] Clear search and filter

#### Part C: Bulk Selection ⚠️ CRITICAL TEST
- [ ] Click checkbox in table header (select all)
- [ ] Verify all checkboxes on page are checked
- [ ] Verify "BulkActions" panel appears above table
- [ ] Click individual checkbox to deselect one partner
- [ ] Verify "select all" checkbox becomes unchecked
- [ ] Click "Clear Selection" button
- [ ] Verify all checkboxes uncheck

**WHAT TO LOOK FOR:**
- ✅ Checkboxes respond immediately
- ✅ Selection count updates (e.g., "5 partners selected")
- ✅ BulkActions panel shows available actions
- ❌ If checkboxes don't work: handleSelectAll/handleSelectPartner missing

#### Part D: Bulk Operations
- [ ] Select 2-3 partners using checkboxes
- [ ] Click "Approve" in BulkActions (if applicable)
- [ ] Verify confirmation dialog appears
- [ ] Confirm action
- [ ] Verify success toast appears
- [ ] Verify table refreshes
- [ ] Try "Export to CSV" button
- [ ] Verify CSV file downloads

#### Part E: Add New Partner
- [ ] Click "Add Partner" button
- [ ] Fill in form:
  - Business Name: "Test Bakery"
  - Email: test@example.com
  - Phone: +995591123456
  - Category: BAKERY
  - Description: "Test description"
  - Address: "123 Test Street"
  - City: "Tbilisi"
- [ ] Click "Get Current Location" (may need browser permission)
- [ ] Set open/close times
- [ ] Click "Add Partner"
- [ ] Verify success message
- [ ] Verify new partner appears in table

**Expected:** All operations work smoothly  
**Common Issues:**
- ❌ Checkboxes don't toggle → Missing handlers
- ❌ Bulk actions fail → Rate limiting or RLS issue
- ❌ CSV export fails → Check BulkActions component

---

### ✅ TAB 3: PENDING PARTNERS
**Time:** 5 minutes

- [ ] Click "Pending Partners" tab
- [ ] Verify table shows only status="PENDING"
- [ ] If partners exist:
  - [ ] Click "Approve" on one partner
  - [ ] Verify confirmation dialog
  - [ ] Confirm approval
  - [ ] Verify success toast
  - [ ] Verify partner disappears from pending list
  - [ ] Go to "Partners" tab
  - [ ] Verify partner now shows as "ACTIVE"
- [ ] Return to "Pending Partners"
- [ ] Click "Reject" on one partner (if available)
- [ ] Verify rejection works

**Expected:** Approve/reject instantly updates status  
**If broken:** Check RLS policies on partners table

---

### ✅ TAB 4: USERS MANAGEMENT
**Time:** 8 minutes

#### Part A: View Users
- [ ] Click "Users" tab
- [ ] Verify user table loads
- [ ] Check columns: Name, Email, Role, Status, Points, Actions

#### Part B: Search & Filter
- [ ] Search by name or email
- [ ] Select role filter: "CUSTOMER"
- [ ] Verify only customers show
- [ ] Select role filter: "PARTNER"
- [ ] Verify only partners show
- [ ] Clear filters

#### Part C: Edit User
- [ ] Click edit icon on a user
- [ ] Change role (e.g., CUSTOMER → PARTNER)
- [ ] Click "Save Changes"
- [ ] Verify success toast
- [ ] Verify role updated in table

#### Part D: Enable/Disable
- [ ] Click "Disable" button on a user
- [ ] Verify confirmation
- [ ] Confirm action
- [ ] Verify status changes to "Inactive"
- [ ] Click "Enable" button
- [ ] Verify status returns to "Active"

#### Part E: Delete User ⚠️ Dangerous
- [ ] Click delete icon on a TEST user only
- [ ] Verify confirmation dialog
- [ ] Confirm deletion
- [ ] Verify user removed from table

**Expected:** All operations work  
**Missing Features (Not Errors):**
- ⚠️ No bulk selection (consider adding)
- ⚠️ No "Last Login" column (future improvement)

---

### ✅ TAB 5: NEW USERS
**Time:** 2 minutes

- [ ] Click "New Users" tab
- [ ] Verify table shows users from last 7 days
- [ ] Check "Created At" column shows recent dates
- [ ] No actions needed (read-only view)

**Expected:** Shows recent signups  
**Recommendation:** Add "Quick Approve as Partner" action

---

### ✅ TAB 6: BANNED USERS
**Time:** 3 minutes

- [ ] Click "Banned Users" tab
- [ ] If banned users exist:
  - [ ] Verify table shows only banned users
  - [ ] Click "Unban" button
  - [ ] Verify confirmation
  - [ ] Confirm unban
  - [ ] Verify user disappears from banned list
- [ ] If no banned users:
  - [ ] Go to Users tab
  - [ ] Ban a TEST user
  - [ ] Return to Banned Users tab
  - [ ] Verify user appears

**Expected:** Unban works instantly  
**Missing Features:**
- ⚠️ No "Ban Reason" displayed
- ⚠️ No "Banned At" timestamp
- ⚠️ No "Banned By" admin tracking

---

### ✅ TAB 7: OFFERS MANAGEMENT
**Time:** 8 minutes

#### Part A: View Offers
- [ ] Click "Offers" tab
- [ ] Verify offer table loads
- [ ] Check columns: Title, Partner, Price, Original Price, Quantity, Status

#### Part B: Search & Filter
- [ ] Search by offer title
- [ ] Select category filter (e.g., BAKERY)
- [ ] Select status filter (e.g., ACTIVE)
- [ ] Clear filters

#### Part C: Edit Offer
- [ ] Click edit icon
- [ ] Modify title or price
- [ ] Click "Save Changes"
- [ ] Verify update works

#### Part D: Pause/Resume
- [ ] Click "Pause" button on active offer
- [ ] Verify offer status changes to "PAUSED"
- [ ] Click "Resume" button
- [ ] Verify status returns to "ACTIVE"

#### Part E: Delete Offer
- [ ] Click delete icon on TEST offer
- [ ] Verify confirmation
- [ ] Confirm deletion
- [ ] Verify offer removed

**Expected:** All CRUD operations work  
**Missing Features:**
- ❌ No bulk selection (should add for mass pause/resume)
- ⚠️ No image thumbnails in table
- ⚠️ No "Views" or "Reservations" count

---

### ✅ TAB 8: MODERATION
**Time:** 3 minutes

- [ ] Click "Moderation" tab
- [ ] Check what appears

**UNKNOWN:** Need to test what content moderation features exist  
**Recommendations:**
- Add flagged content queue
- Add reported offers
- Add reported users
- Add moderation actions

---

### ✅ TAB 9: FINANCIAL
**Time:** 3 minutes

- [ ] Click "Financial" tab
- [ ] Check what data appears
- [ ] Verify revenue calculations
- [ ] Check transaction history

**UNKNOWN:** Need to test financial tracking  
**Recommendations:**
- Add total revenue chart
- Add partner commissions
- Add platform fees collected
- Add export to Excel

---

### ✅ TAB 10: ANALYTICS
**Time:** 5 minutes

- [ ] Click "Analytics" tab
- [ ] Check for charts/graphs
- [ ] Verify data visualizations load
- [ ] Check date range filters (if any)

**UNKNOWN:** Need to test analytics features  
**Recommendations:**
- Add user growth chart (7-day, 30-day)
- Add revenue trend
- Add partner performance metrics
- Add conversion rate

---

### ✅ TAB 11: HEALTH
**Time:** 3 minutes

- [ ] Click "Health" tab
- [ ] Check system status indicators
- [ ] Verify database connection status
- [ ] Check API response times (if shown)

**UNKNOWN:** Need to test health monitoring  
**Recommendations:**
- Add database ping test
- Add API latency
- Add error rate (last hour)
- Add disk space usage

---

### ✅ TAB 12: AUDIT
**Time:** 3 minutes

- [ ] Click "Audit" tab
- [ ] Check if audit logs appear
- [ ] Verify recent admin actions are logged
- [ ] Try search/filter (if available)

**UNKNOWN:** Need to test audit logging  
**Recommendations:**
- Create admin_actions table
- Log: who, what, when, result
- Add search by admin, action type, date
- Add export audit log

---

### ✅ TAB 13: CONFIG (SYSTEM CONFIGURATION) ⚠️ CRITICAL
**Time:** 10 minutes

#### Part A: Check Database Table
- [ ] Open Supabase dashboard
- [ ] Go to Table Editor
- [ ] Check if "system_config" table exists
- [ ] **If NOT EXISTS:** Run CREATE_SYSTEM_CONFIG_TABLE.sql

#### Part B: Test Configuration Loading
- [ ] Click "Config" tab
- [ ] Verify 5 sub-tabs appear:
  - Points & Economy
  - Reservations
  - Features
  - Email Templates
  - Security
- [ ] Click each sub-tab
- [ ] Verify input fields populate with default values

#### Part C: Test Saving Configuration
- [ ] Go to "Points & Economy" tab
- [ ] Change "Welcome Points" from 100 to 150
- [ ] Verify "Unsaved changes" indicator appears
- [ ] Click "Save Configuration" button
- [ ] **EXPECTED:** Success toast appears
- [ ] **IF FAILS:** 
  - Check console for error
  - Likely: system_config table doesn't exist
  - Solution: Run CREATE_SYSTEM_CONFIG_TABLE.sql

#### Part D: Test Maintenance Mode ⚠️ DANGEROUS
- [ ] Go to "Features" tab
- [ ] Find "Maintenance Mode" toggle
- [ ] **WARNING:** This will disable the entire platform
- [ ] Toggle ON (if testing)
- [ ] Save configuration
- [ ] Open new incognito tab
- [ ] Try to access http://localhost:5174/
- [ ] **EXPECTED:** Should show maintenance page
- [ ] Return to admin panel
- [ ] Toggle OFF
- [ ] Save configuration
- [ ] Verify normal access restored

#### Part E: Test Other Settings
- [ ] Change referral bonus
- [ ] Change commission rate
- [ ] Enable/disable CAPTCHA
- [ ] Modify email templates
- [ ] Save all changes
- [ ] Refresh page
- [ ] Verify settings persist

**Expected:** All settings save and persist  
**If broken:** 
- ❌ "save is not a function" → API function missing
- ❌ "system_config does not exist" → Run SQL
- ❌ "RLS policy violation" → Need admin RLS policy

---

## 🔍 DEBUGGING CHECKLIST

### If Something Doesn't Work:

#### 1. Check Browser Console
```javascript
// Look for errors like:
// ❌ "TypeError: Cannot read property..."
// ❌ "RLS policy violation"
// ❌ "Function does not exist"
// ❌ "429 Too Many Requests" (rate limiting)
```

#### 2. Check Network Tab
- Press `F12` → Network tab
- Look for failed requests (red)
- Click failed request
- Check Response tab for error details

#### 3. Check Supabase Logs
- Open Supabase dashboard
- Go to Database → Logs
- Look for RLS violations or function errors

#### 4. Test Rate Limiting
```javascript
// In browser console:
localStorage.getItem('admin_actions_count')
localStorage.getItem('admin_actions_timestamp')

// If blocked, clear rate limit:
localStorage.removeItem('admin_actions_count')
localStorage.removeItem('admin_actions_timestamp')
```

---

## 📊 RECORD YOUR FINDINGS

### Use this template:

```markdown
## Test Results - [Your Name] - [Date]

### Working Features ✅
- Partners tab: CRUD operations work
- Users tab: Search and edit work
- Config tab: Loads successfully

### Broken Features ❌
- Partners bulk selection: Checkboxes don't toggle
  - Error: handleSelectAll is not defined
  - Fix: Add function to PartnersManagement.tsx
  
- Config save: Cannot save settings
  - Error: "relation 'system_config' does not exist"
  - Fix: Run CREATE_SYSTEM_CONFIG_TABLE.sql

### Missing Features ⚠️
- Users: No bulk operations
- Offers: No bulk pause/resume
- Moderation: Tab appears empty

### Performance Issues 🐌
- Partner table: Loads slowly with 1000+ partners
- Search: Slight delay in filtering

### Recommendations 💡
1. Add bulk selection to Users and Offers
2. Create system_config table
3. Add loading skeletons for stats cards
4. Add image thumbnails to offers table
```

---

## 🎯 PRIORITY FIXES

### Must Fix Now (Blocker):
1. ✅ Create system_config table (if missing)
2. ✅ Fix partners bulk selection (if broken)

### Should Fix This Week:
3. Add bulk operations to Users and Offers
4. Test Moderation, Financial, Analytics, Health, Audit tabs
5. Add missing columns (ban reason, last login, etc.)

### Nice to Have:
6. Add image thumbnails
7. Add more analytics charts
8. Add config export/import
9. Add undo for bulk delete

---

## 🚀 WHEN ALL TESTS PASS

Congratulations! Your admin dashboard is fully functional! 🎉

**Next Steps:**
1. Document any workarounds needed
2. Create admin user guide
3. Train other admins
4. Set up monitoring/alerts
5. Plan future enhancements

---

## 📝 NOTES

- Test on actual data, not just demo mode
- Use test accounts for destructive operations
- Keep backups before major changes
- Document any custom configurations
- Share findings with development team

**Happy Testing! 🧪**
