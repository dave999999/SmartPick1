# Admin Dashboard Fix Guide

## Issues Fixed

### 1. Data Visibility Issue
**Problem:** Admin Dashboard showing "0 partners" and "0 users" even though data exists in Supabase.

**Solution:** 
- Updated admin API functions to properly query Supabase
- Created RLS policies for admin access (see `fix-admin-rls.sql`)
- You need to run the SQL script in your Supabase SQL Editor to enable admin access

**Steps to Fix:**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-admin-rls.sql`
4. Execute the SQL script
5. Refresh the Admin Dashboard

### 2. Admin Dashboard Routing Issue
**Problem:** Clicking "Admin Dashboard" button refreshes page instead of navigating.

**Solution:**
- Fixed routing in `App.tsx` to include `/admin-dashboard` route
- Updated `AdminPanel.tsx` to properly redirect to the new dashboard

### 3. Extended Functionality Added

#### Pause/Unpause Partners
- Added "Pause/Unpause" button in the Actions column for each partner
- Toggles partner status between 'APPROVED' and 'PAUSED'
- Paused partners show an orange badge
- Icon changes: Pause icon for active partners, Play icon for paused partners

#### Clickable Business Names
- Partner business names are now clickable (blue, underlined on hover)
- Clicking opens a Partner View modal showing all offers for that partner
- Modal displays: title, category, price, quantity, status, and created date

#### Partner View - Offer Management
Each offer in the Partner View has action buttons:
- **Pause/Resume** button: Toggles offer status between 'ACTIVE' and 'PAUSED'
- **Delete** button: Removes offer with confirmation dialog

## Database Schema Requirements

Make sure your Supabase tables have these columns:

### partners table
- id (uuid)
- user_id (uuid)
- business_name (text)
- email (text)
- phone (text)
- address (text)
- city (text)
- latitude (numeric)
- longitude (numeric)
- status (text) - should support: 'PENDING', 'APPROVED', 'PAUSED', 'BLOCKED'
- created_at (timestamp)
- updated_at (timestamp)

### users table
- id (uuid)
- email (text)
- name (text)
- role (text) - should support: 'CUSTOMER', 'PARTNER', 'ADMIN'
- status (text) - should support: 'ACTIVE', 'DISABLED'
- created_at (timestamp)
- updated_at (timestamp)

### offers table
- id (uuid)
- partner_id (uuid)
- title (text)
- description (text)
- category (text)
- smart_price (numeric)
- original_price (numeric)
- quantity_available (integer)
- quantity_total (integer)
- status (text) - should support: 'ACTIVE', 'PAUSED', 'EXPIRED'
- created_at (timestamp)
- updated_at (timestamp)

## Testing the Admin Dashboard

1. **Login as Admin:**
   - Make sure your user account has role = 'ADMIN' in the users table
   - Run this SQL if needed:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
   ```

2. **Access the Dashboard:**
   - Navigate to `/admin-dashboard` in your browser
   - Or click the "Admin Dashboard" link from the admin panel

3. **Test Features:**
   - View all partners in the table
   - Click on a business name to view their offers
   - Use the Pause/Unpause button to toggle partner status
   - In the Partner View, pause/resume or delete offers
   - Check that status badges update correctly

## Troubleshooting

### Still showing 0 partners/users?
1. Verify the RLS policies are created (run `fix-admin-rls.sql`)
2. Check that your user has role = 'ADMIN' in the users table
3. Check browser console for any error messages
4. Verify data exists in Supabase tables

### Routing not working?
1. Clear browser cache
2. Do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check that both `/admin` and `/admin-dashboard` routes exist in App.tsx

### Actions not working?
1. Check browser console for errors
2. Verify RLS policies allow admin to UPDATE and DELETE
3. Check that status values match exactly ('PAUSED', 'APPROVED', etc.)

## New Features Summary

✅ Pause/Unpause partners with visual feedback
✅ Clickable business names to view partner details
✅ Partner View modal showing all offers
✅ Pause/Resume individual offers
✅ Delete offers with confirmation
✅ Real-time status badge updates
✅ Consistent styling with existing design

All features maintain the existing layout and design - only functionality was added!