# TELEGRAM CONNECTION ISSUE - ROOT CAUSE ANALYSIS

## Problem
Telegram webhook receiving email `batumashvili.davit@gmail.com` instead of UUID, causing error:
```
[telegram-webhook] Invalid user ID format: batumashvili.davit@gmail.com
```

## Root Cause Investigation

### What We Fixed
1. ✅ **Edge Function** - Updated `telegram-webhook/index.ts`:
   - Added better error messages for invalid/expired links
   - Added 24-hour link expiration
   - Deployed to production

2. ✅ **Frontend Code** - Verified `src/lib/telegram.ts`:
   - `getTelegramBotLink()` correctly uses `userId` parameter
   - Never used email in git history (checked commit `ddf9d3f`)
   - TelegramConnect component passes `partner.user_id` correctly

### Likely Root Cause: DATABASE ISSUE

**The `partners.user_id` column may contain EMAIL instead of UUID!**

## Action Required

### Step 1: Diagnose
Run this in Supabase SQL Editor:
```sql
-- File: URGENT_CHECK_PARTNER_USER_ID.sql
```

This will show if `partners.user_id` contains emails.

### Step 2: Fix (if diagnosis confirms)
If Step 1 shows emails in `user_id`, run:
```sql
-- File: FIX_PARTNER_USER_ID_TO_UUID.sql
```

This will:
1. Backup current data
2. Update `user_id` from email to proper UUID
3. Verify the fix

### Step 3: Test
1. Partner logs into dashboard
2. Clicks "Connect Telegram" button
3. Should get a fresh link with properly encoded UUID
4. Link should work in Telegram

## Alternative Explanation

If database is correct, then the partner has an **old saved/bookmarked link** from before. Solution:
1. Partner must get a NEW link from dashboard
2. Old link will show helpful error message telling them to get new link
3. New link will work correctly

## Files Modified
- ✅ `supabase/functions/telegram-webhook/index.ts` - Deployed
- ✅ Created diagnostic scripts
- ✅ Created fix scripts

## Next Steps
1. Run `URGENT_CHECK_PARTNER_USER_ID.sql` to diagnose
2. If needed, run `FIX_PARTNER_USER_ID_TO_UUID.sql` to fix
3. Partner gets fresh link from dashboard
4. Test connection

---
Build: 20251123001800
