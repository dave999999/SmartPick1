# Apply No-Penalty No-Show Migration

## What's New? 🎉

Partners can now choose whether to penalize customers who don't show up:
- **No-Show (Penalty)** - Red button: Customer gets penalty, partner receives points
- **No-Show (No Penalty)** - Orange button: Customer gets refund, no penalty applied

## How to Apply

### 1. Apply Database Migration

Go to Supabase Dashboard SQL Editor:
https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql

Copy and paste the SQL from: `supabase/migrations/20251113_partner_no_show_no_penalty.sql`

Click **Run** to create the new function.

### 2. Test the Feature

1. Create a test reservation
2. Wait for it to expire (or manually change `expires_at` in database)
3. Go to Partner Dashboard
4. You'll see three buttons for expired reservations:
   - ✅ **Picked Up** (green) - Customer came after expiry
   - ❌ **No-Show (Penalty)** (red) - Apply penalty, partner gets points
   - ❌ **No-Show (No Penalty)** (orange) - No penalty, customer gets refund

### 3. Expected Behavior

#### No-Show (Penalty):
- Customer penalty count increases
- Partner receives points
- Toast: "No-show marked! X points received as penalty"

#### No-Show (No Penalty):
- Customer gets points refunded
- No penalty applied
- Toast: "No-show marked (no penalty)! X points refunded to customer"

## Code Changes

✅ Database function: `partner_mark_no_show_no_penalty()`
✅ API function: `partnerMarkNoShowNoPenalty()`
✅ UI: Two separate buttons in EnhancedActiveReservations
✅ I18n: English and Georgian translations
✅ Build: Successful
✅ Git: Pushed to main (commit 604c8d0)

## Use Cases

**When to use No Penalty:**
- Customer called and explained legitimate reason
- Weather/emergency prevented pickup
- Partner's discretion for good customers
- First-time offense, showing goodwill

**When to use Penalty:**
- Repeat offenders
- No communication from customer
- Clear pattern of booking without pickup
- Following strict no-show policy

## Technical Details

The new function (`partner_mark_no_show_no_penalty`):
1. Refunds points to customer's balance
2. Logs transaction as 'NO_SHOW_REFUND'
3. Marks reservation as CANCELLED
4. Does NOT increment penalty_count
5. Does NOT create user_bans entry

Partner has full control over penalty application! 🎯
