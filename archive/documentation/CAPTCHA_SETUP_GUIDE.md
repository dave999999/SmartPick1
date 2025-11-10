# 🔒 hCaptcha Setup Guide for SmartPick

## ✅ What's Been Done

I've successfully implemented hCaptcha in your application! Here's what was added:

1. ✅ Installed `@hcaptcha/react-hcaptcha` package
2. ✅ Updated `AuthDialog.tsx` with CAPTCHA component
3. ✅ Added `.env` configuration for CAPTCHA keys
4. ✅ Implemented smart CAPTCHA logic:
   - **Sign Up**: CAPTCHA required for all registrations
   - **Sign In**: CAPTCHA shown after 2 failed login attempts

---

## 🚀 Setup Instructions (5 Minutes)

### Step 1: Get Your hCaptcha Keys (FREE)

1. **Go to hCaptcha Dashboard:**
   - Visit: https://dashboard.hcaptcha.com/signup
   - Sign up for a FREE account (no credit card required)

2. **Create a New Site:**
   - Click "New Site"
   - **Site Name:** SmartPick
   - **Hostnames:** 
     - `localhost` (for development)
     - `yourapp.vercel.app` (for production)
     - Your custom domain if you have one
   - **Difficulty:** Normal
   - Click "Add Site"

3. **Copy Your Keys:**
   - You'll see two keys:
     - **Site Key** (starts with `10000000-...` for test, or real key)
     - **Secret Key** (keep this secret!)

### Step 2: Update Your Environment Variables

1. **Open your `.env.local` file** (create if it doesn't exist):

```bash
# In d:\v3\workspace\shadcn-ui\.env.local

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_MAINTENANCE_MODE=false

# hCaptcha Keys
VITE_HCAPTCHA_SITE_KEY=YOUR_SITE_KEY_HERE
```

2. **Replace `YOUR_SITE_KEY_HERE`** with your actual Site Key from Step 1

### Step 3: Configure Supabase to Accept hCaptcha

**Important:** You need to tell Supabase to accept hCaptcha tokens!

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com
   - Select your project

2. **Navigate to Authentication Settings:**
   - Click "Authentication" in left sidebar
   - Click "Settings" → "Auth Providers"

3. **Enable CAPTCHA Protection:**
   - Find "Email" provider
   - Enable "CAPTCHA Protection"
   - **Provider:** Select "hCaptcha"
   - **Secret Key:** Paste your hCaptcha Secret Key (from Step 1)
   - Click "Save"

### Step 4: Test It!

1. **Start your dev server:**
```bash
pnpm dev
```

2. **Test Sign Up:**
   - Open http://localhost:5173
   - Click "Sign Up"
   - You should see the hCaptcha checkbox appear
   - Complete the CAPTCHA
   - Try creating an account

3. **Test Sign In:**
   - Try logging in with wrong password 2 times
   - On the 3rd attempt, CAPTCHA should appear

---

## 🎯 What the CAPTCHA Does

### Sign Up Form:
- ✅ **Always shows CAPTCHA** (prevents bot registrations)
- ✅ Submit button is disabled until CAPTCHA is completed
- ✅ Token is sent to Supabase for verification

### Sign In Form:
- ✅ **Shows CAPTCHA after 2 failed attempts** (prevents brute force)
- ✅ Resets failed attempt counter on successful login
- ✅ User must complete CAPTCHA to try again

### Error Handling:
- ✅ Shows error if CAPTCHA verification fails
- ✅ Auto-resets CAPTCHA on error
- ✅ Clear error messages for users

---

## 🐛 Troubleshooting

### Issue: "captcha verification process failed"

**Cause:** Supabase is expecting a CAPTCHA token but not receiving a valid one.

**Solutions:**

1. **Check if CAPTCHA is configured in Supabase:**
   - Go to Supabase Dashboard → Authentication → Settings
   - Make sure hCaptcha is enabled with correct Secret Key

2. **Verify your Site Key:**
   - Make sure `VITE_HCAPTCHA_SITE_KEY` is set in `.env.local`
   - Restart dev server after adding environment variables

3. **Check domain whitelist in hCaptcha:**
   - Go to https://dashboard.hcaptcha.com
   - Edit your site
   - Make sure `localhost` is in the hostnames list

4. **Use test keys for development:**
   ```bash
   # In .env.local for testing
   VITE_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
   ```
   - In Supabase, use secret key: `0x0000000000000000000000000000000000000000`

### Issue: CAPTCHA not showing

**Solutions:**

1. **Check console for errors:**
   - Open browser DevTools (F12)
   - Look for hCaptcha errors

2. **Verify package installation:**
   ```bash
   pnpm list @hcaptcha/react-hcaptcha
   ```

3. **Clear cache and reload:**
   ```bash
   pnpm dev --force
   ```

### Issue: "Invalid site key"

**Solution:**
- Your Site Key is incorrect
- Copy it again from hCaptcha Dashboard
- Make sure no extra spaces in `.env.local`

---

## 🔐 Security Best Practices

### ✅ DO:
- Keep your Secret Key secret (never commit to GitHub)
- Use different keys for development and production
- Enable CAPTCHA on all public forms
- Monitor hCaptcha dashboard for abuse

### ❌ DON'T:
- Don't put Secret Key in frontend code
- Don't commit `.env.local` to version control
- Don't disable CAPTCHA in production
- Don't use test keys in production

---

## 📊 hCaptcha Analytics

After setup, you can monitor:
- Number of CAPTCHA challenges served
- Pass/fail rates
- Bot detection statistics
- Traffic patterns

**Access Dashboard:** https://dashboard.hcaptcha.com/sites

---

## 🎨 Customization (Optional)

### Change CAPTCHA Theme:

```tsx
<HCaptcha
  sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
  theme="dark" // or "light"
  size="compact" // or "normal", "invisible"
  onVerify={(token) => setCaptchaToken(token)}
/>
```

### Change Language:

```tsx
<HCaptcha
  sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
  languageOverride="ka" // Georgian
  // or "ru" (Russian), "de" (German), etc.
  onVerify={(token) => setCaptchaToken(token)}
/>
```

---

## 📝 Environment Variables Checklist

Make sure you have these in `.env.local`:

```bash
# Required for app to work
✅ VITE_SUPABASE_URL=
✅ VITE_SUPABASE_ANON_KEY=

# Required for CAPTCHA
✅ VITE_HCAPTCHA_SITE_KEY=

# Optional
VITE_MAINTENANCE_MODE=false
```

---

## 🎯 Quick Test Commands

```bash
# 1. Make sure package is installed
pnpm list @hcaptcha/react-hcaptcha

# 2. Check environment variables
echo $env:VITE_HCAPTCHA_SITE_KEY  # Windows PowerShell

# 3. Restart dev server
# Stop current server (Ctrl+C)
pnpm dev

# 4. Build for production
pnpm build
```

---

## ✅ Final Checklist

Before deploying to production:

- [ ] hCaptcha account created
- [ ] Site Key copied to `.env.local`
- [ ] Secret Key added to Supabase
- [ ] hCaptcha enabled in Supabase Auth settings
- [ ] Tested signup with CAPTCHA
- [ ] Tested login with CAPTCHA after failures
- [ ] Production domain added to hCaptcha whitelist
- [ ] Production environment variables set in Vercel/hosting

---

## 🆘 Still Having Issues?

1. **Check the browser console** for specific error messages
2. **Check Supabase logs** for authentication errors
3. **Verify hCaptcha is loaded** in Network tab
4. **Try test keys first** to isolate the issue

### Test Keys (Development Only):

**Site Key:**
```
10000000-ffff-ffff-ffff-000000000001
```

**Secret Key (for Supabase):**
```
0x0000000000000000000000000000000000000000
```

These test keys will always pass verification.

---

## 📞 Support Resources

- **hCaptcha Docs:** https://docs.hcaptcha.com/
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **React Integration:** https://docs.hcaptcha.com/integration#react

---

**Your CAPTCHA is now implemented! 🎉**

Once you add your keys and configure Supabase, the "captcha verification process failed" error will be gone!
