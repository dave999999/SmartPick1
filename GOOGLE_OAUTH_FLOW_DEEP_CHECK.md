# Google OAuth Sign-In Flow - Deep Check & Test Guide

## ✅ **FIXES APPLIED**

### **Before (BROKEN)**
1. User clicks "Continue with Google"
2. Redirects to `/verify-email` 
3. Shows toast: "Please check your email to verify your account" ❌
4. **WRONG**: Google OAuth doesn't need email verification!

### **After (FIXED)**
1. User clicks "Continue with Google"
2. Google OAuth popup opens
3. User authorizes with Google
4. Redirects to `/` (homepage)
5. User is **immediately logged in** ✅
6. No email confirmation needed (Google already verified)

---

## 📋 **COMPLETE FLOW BREAKDOWN**

### **Step 1: User Clicks "Continue with Google"**

**File**: `src/components/AuthDialog.tsx`
**Function**: `handleGoogleSignIn()`

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/`,  // ✅ Fixed: Goes to homepage
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});
```

**What happens:**
- Opens Google OAuth popup
- User selects Google account
- Google authenticates and verifies email
- Generates OAuth tokens

---

### **Step 2: Google Redirects Back**

**Redirect URL**: `https://yourdomain.com/#access_token=...&refresh_token=...`

**File**: `src/lib/supabase.ts`
**Config**: `detectSessionInUrl: true`

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,  // ✅ Detects OAuth tokens in URL hash
    flowType: 'pkce',
    storageKey: 'smartpick-auth',
  },
});
```

**What happens:**
- Supabase SDK detects tokens in URL hash
- Automatically exchanges tokens for session
- Stores session in localStorage (`smartpick-auth`)
- Fires `SIGNED_IN` event

---

### **Step 3: Auth State Change Listener**

**File**: `src/pages/IndexRedesigned.tsx`

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      checkUser();  // ✅ Fetches user profile
    } else if (event === 'SIGNED_OUT') {
      setUser(null);
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

**What happens:**
- Detects `SIGNED_IN` event
- Calls `checkUser()` to fetch user data
- Updates UI to show logged-in state

---

### **Step 4: User Profile Creation**

**File**: `src/lib/api.ts` (via `getCurrentUser()`)

**Database Trigger** (should exist in Supabase):
```sql
-- Trigger: on_auth_user_created
-- When a user signs up via OAuth, auto-create profile in public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'CUSTOMER',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**What happens:**
- New user row created in `auth.users` (by Supabase)
- Trigger automatically creates profile in `public.users`
- User is ready to browse and make reservations

---

### **Step 5: UI Updates**

**File**: `src/pages/IndexRedesigned.tsx`

```typescript
const checkUser = async () => {
  const { user } = await getCurrentUser();
  setUser(user);  // ✅ Updates state, shows profile menu
};
```

**What happens:**
- User sees their profile picture (from Google)
- "Sign In" button → Profile menu
- Full access to protected features

---

## 🧪 **TESTING CHECKLIST**

### **Test 1: First-Time Google Sign-Up**

| Step | Expected Result | Status |
|------|----------------|--------|
| 1. Click "Create Account" tab | Tab switches | ⬜ |
| 2. Click "Continue with Google" | Google popup opens | ⬜ |
| 3. Select Google account | Redirects back to app | ⬜ |
| 4. Check console for `SIGNED_IN` | Event fires | ⬜ |
| 5. Check localStorage for `smartpick-auth` | Session stored | ⬜ |
| 6. User profile menu visible | Shows name/email | ⬜ |
| 7. Check database `public.users` | Row created | ⬜ |

### **Test 2: Returning Google User**

| Step | Expected Result | Status |
|------|----------------|--------|
| 1. Sign out first | Logged out | ⬜ |
| 2. Click "Sign In" tab | Tab switches | ⬜ |
| 3. Click "Continue with Google" | Google popup opens | ⬜ |
| 4. Auto-selects previous account | Instant redirect | ⬜ |
| 5. Logged in immediately | No email check | ⬜ |

### **Test 3: Email/Password Signup (For Comparison)**

| Step | Expected Result | Status |
|------|----------------|--------|
| 1. Enter email/password | Form filled | ⬜ |
| 2. Click "Create Account" | Shows email confirmation | ⬜ |
| 3. Check email | Confirmation link received | ⬜ |
| 4. Click link in email | Redirects to `/verify-email` | ⬜ |
| 5. Verify success message | "Email verified" shown | ⬜ |
| 6. Redirected to homepage | Logged in | ⬜ |

---

## 🔍 **DEBUGGING TOOLS**

### **Check Current Session**

Run in browser console:
```javascript
// Check if user is logged in
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Check localStorage
console.log('Auth Storage:', localStorage.getItem('smartpick-auth'));
```

### **Check Database**

Run in Supabase SQL Editor:
```sql
-- Check if user was created
SELECT id, email, name, role, created_at 
FROM public.users 
WHERE email = 'your-google-email@gmail.com';

-- Check auth record
SELECT id, email, email_confirmed_at, created_at, 
       raw_app_meta_data->>'provider' as provider
FROM auth.users 
WHERE email = 'your-google-email@gmail.com';
```

### **Check Console Logs**

Expected logs:
```
✅ Token refreshed successfully
✅ Google OAuth initiated successfully
🔄 [IndexRedesigned] RENDER {"hasUser": true}
```

---

## ⚠️ **COMMON ISSUES & FIXES**

### **Issue 1: "Failed to sign in with Google"**

**Cause**: Google OAuth not configured in Supabase

**Fix**:
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Google" provider
3. Add Client ID and Client Secret from Google Cloud Console
4. Add redirect URL: `https://ggzhtpaxnhwcilomswtm.supabase.co/auth/v1/callback`

---

### **Issue 2: Redirects to `/verify-email` but stuck**

**Cause**: Old code still redirecting there

**Fix**: Already applied in this update ✅

---

### **Issue 3: User logged in but profile not created**

**Cause**: Missing database trigger

**Fix**: Run the trigger creation SQL above in Supabase SQL Editor

---

### **Issue 4: "Email not verified" error**

**Cause**: Email confirmation required in Supabase settings

**Fix**:
1. Go to Supabase Dashboard → Authentication → Email
2. **DISABLE** "Confirm email" (Google already verifies)
3. Click Save

---

## 📊 **VERIFICATION CHECKLIST**

After testing, verify:

- [ ] ✅ Google OAuth opens popup (not redirect)
- [ ] ✅ User logged in immediately after OAuth
- [ ] ✅ No "check your email" message for Google
- [ ] ✅ User profile created in database
- [ ] ✅ Session persists on page reload
- [ ] ✅ User can access protected features
- [ ] ✅ Sign out works correctly
- [ ] ✅ Can sign in again with same Google account

---

## 🎯 **SUCCESS CRITERIA**

**Google OAuth is working correctly when:**

1. ✅ User clicks "Continue with Google" → Popup opens
2. ✅ User authorizes → Redirect back to homepage
3. ✅ User is **immediately logged in** (no email step)
4. ✅ Profile menu shows user's name and Google avatar
5. ✅ Can make reservations and access all features
6. ✅ Session persists across page reloads

---

## 🔐 **SECURITY NOTES**

- ✅ Google handles email verification (trusted provider)
- ✅ OAuth tokens use PKCE flow (secure)
- ✅ Session stored in localStorage (client-side)
- ✅ Refresh tokens auto-rotate (Supabase handles this)
- ✅ No password stored (OAuth only)

---

## 📞 **IF STILL NOT WORKING**

1. Check Supabase logs: Dashboard → Logs → Auth
2. Check browser Network tab for failed requests
3. Verify Google Cloud Console OAuth consent screen is configured
4. Ensure redirect URLs match exactly (no trailing slash)
5. Clear browser cache and localStorage completely
6. Try incognito mode to rule out cached auth state
