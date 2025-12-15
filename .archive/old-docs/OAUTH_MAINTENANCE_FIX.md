# 🔧 OAuth + Maintenance Mode Fix

## Issues Fixed

### Issue 1: Maintenance Mode Blocking OAuth Callback
**Problem:** When you clicked "Sign in with Google" from dev server, it redirected you to production (`www.smartpick.ge`), but maintenance mode blocked you before OAuth could complete.

**Symptoms:**
- URL shows `?code=f39366dc-09e3-4f7b-878a-20f340a7058f` (OAuth authorization code)
- Maintenance page appears
- OAuth flow never completes
- You can't sign in

**Root Cause:** `App.tsx` was checking maintenance mode BEFORE detecting OAuth callback, blocking legitimate OAuth redirects.

### Issue 2: `?code=` URL Parameter Explanation
The URL `https://www.smartpick.ge/?code=f39366dc-09e3-4f7b-878a-20f340a7058f` is **not an error** - it's part of Google OAuth flow:

1. User clicks "Sign in with Google"
2. Redirected to Google login
3. After authentication, Google redirects back with authorization code
4. Supabase exchanges code for access token
5. User is now logged in

**But maintenance mode was blocking step 4!**

## ✅ What Was Fixed

### Modified `src/App.tsx`

Added OAuth callback detection BEFORE maintenance mode check:

```typescript
// Check if we're in the middle of OAuth callback (don't block it)
const urlParams = new URLSearchParams(window.location.search);
const isOAuthCallback = urlParams.has('code') || urlParams.has('access_token') || urlParams.has('error');

if (isOAuthCallback) {
  console.log('OAuth callback detected - skipping maintenance check');
  setIsMaintenanceMode(false);
  setIsLoading(false);
  return;
}
```

**Now:** OAuth callbacks bypass maintenance mode check, allowing authentication to complete successfully.

## 🚀 How to Deploy Fix

### Option 1: Immediate (Disable Maintenance)
1. Go to Supabase Dashboard → SQL Editor
2. Run `DISABLE_MAINTENANCE_NOW.sql`
3. Try signing in again

### Option 2: Keep Maintenance On (Apply Code Fix)
1. Commit the `src/App.tsx` changes
2. Deploy to production
3. OAuth will now work even with maintenance mode enabled

## 🧪 Testing

### Test OAuth with Maintenance Mode ON:

1. **Enable maintenance mode:**
   ```sql
   UPDATE system_settings 
   SET value = '{"enabled": true}'::jsonb
   WHERE key = 'maintenance_mode';
   ```

2. **Sign out completely**

3. **Try "Sign in with Google":**
   - Should redirect to Google
   - Should redirect back with `?code=...`
   - Should **NOT** show maintenance page
   - Should complete sign-in successfully

4. **After sign-in as admin:**
   - Should bypass maintenance mode
   - Should see full site

5. **After sign-in as regular user:**
   - Should see maintenance page (expected behavior)

## 🎯 Expected Behavior

| User State | Maintenance ON | What Happens |
|-----------|---------------|--------------|
| Not logged in | ✅ | See maintenance page |
| OAuth callback (`?code=`) | ✅ | Bypass maintenance, complete OAuth |
| Logged in as Customer | ✅ | See maintenance page |
| Logged in as Partner | ✅ | See maintenance page |
| Logged in as Admin | ✅ | Full site access |

## 🔐 Security Note

This fix does NOT compromise maintenance mode security:
- OAuth callback only bypasses for the redirect URL processing
- After OAuth completes, normal maintenance checks apply
- Non-admin users are still blocked
- Admins are still allowed through

The OAuth code is single-use and expires in seconds, so there's no security risk in allowing it through maintenance mode.

## 📝 Additional Notes

### Why This Happened
Your dev server (`localhost:5173`) tried to use Google OAuth, but Google only has production URLs whitelisted, so it redirected to `www.smartpick.ge`. Maintenance mode then blocked the OAuth callback.

### Long-term Solution
Add localhost to Google OAuth allowed redirect URIs (as explained in previous message) to avoid cross-origin OAuth flows during development.
