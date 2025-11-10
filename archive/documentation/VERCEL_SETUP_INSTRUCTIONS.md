# Vercel Environment Variable Setup for Turnstile

## 🚀 QUICK SETUP (2 Minutes)

Your Turnstile code is already pushed to GitHub (commit 9c8a00e).
Now you just need to add the environment variable to Vercel.

## ✅ Step-by-Step Instructions

### 1. Open Vercel Dashboard
Go to: https://vercel.com/dashboard

### 2. Select Your Project
- Look for your project (probably named "SmartPick1" or "shadcn-ui")
- Click on it

### 3. Add Environment Variable
1. Click **"Settings"** tab (top menu)
2. Click **"Environment Variables"** in left sidebar
3. Click **"Add New"** button
4. Fill in:
   ```
   Name:  VITE_TURNSTILE_SITE_KEY
   Value: 0x4AAAAAACABKIwWhPNRi7fs
   ```
5. Select ALL environments:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
6. Click **"Save"**

### 4. Redeploy Your Site
1. Click **"Deployments"** tab
2. Find the latest deployment (top of the list)
3. Click the **"..."** (three dots) button
4. Click **"Redeploy"**
5. Click **"Redeploy"** again to confirm

### 5. Wait for Deployment (30-60 seconds)
- Watch the deployment progress
- Wait until it says "Ready" with green checkmark

### 6. Test Your Website
1. Go to: https://smartpick.ge
2. Click **"Sign In"** button
3. Switch to **"Sign Up"** tab
4. **You should now see the Turnstile CAPTCHA widget!**

---

## 🎯 What the CAPTCHA Looks Like

Users will see one of these:
- ✅ **Automatic verification**: "Verifying you are human..." (disappears quickly)
- ✅ **Checkbox**: "I am human" checkbox to click
- ✅ **Challenge**: Visual puzzle (only if flagged as suspicious)

---

## 🔍 Troubleshooting

### CAPTCHA Still Not Showing?

**1. Check Environment Variable in Vercel:**
- Settings → Environment Variables
- Make sure `VITE_TURNSTILE_SITE_KEY` is there
- Value should be: `0x4AAAAAACABKIwWhPNRi7fs`

**2. Force Clear Cache:**
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or clear browser cache completely
- Or try incognito/private window

**3. Check Vercel Deployment Logs:**
- Deployments tab → Click on latest deployment
- Click "Build Logs"
- Search for "TURNSTILE" to verify env var is loaded

**4. Verify Supabase Configuration:**
- Your Supabase is already configured (I saw your screenshot)
- But double-check: Supabase Dashboard → Authentication → Settings
- "Enable Captcha protection" should be ON
- Provider: "Turnstile by Cloudflare"
- Secret Key: `0x4AAAAAACABKEkwPz55qMY5XqqD1HBz3ac`

---

## 📊 Current Status

✅ Code pushed to GitHub (commit: 9c8a00e)
✅ Turnstile package installed
✅ AuthDialog.tsx updated
✅ .env.local configured (local development)
⏳ **PENDING**: Add VITE_TURNSTILE_SITE_KEY to Vercel
⏳ **PENDING**: Redeploy on Vercel

---

## 🆘 Need Help?

If you're stuck, send me a screenshot of:
1. Vercel Environment Variables page
2. Latest deployment status
3. Browser console errors (F12 → Console tab)

---

## ✨ After Setup

Once the environment variable is added and deployed:
- ✅ All new sign-ups will require CAPTCHA verification
- ✅ Sign-ins will show CAPTCHA after 2 failed attempts
- ✅ Bots and spam will be blocked automatically
- ✅ Your website will be protected from automated attacks

**Estimated time to go live: 5 minutes from now!** 🚀
