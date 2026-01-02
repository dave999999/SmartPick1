# 🚀 Production Deployment - Environment Variables Setup

## ⚠️ CRITICAL: Your Website is Broken

Your production website is showing this error:
```
FirebaseError: Missing App configuration value: "projectId"
```

**Cause:** Environment variables from `.env.local` are NOT deployed to production.

## 🔧 Quick Fix (Choose Your Platform)

### Option 1: Vercel (Recommended)

1. **Go to your Vercel dashboard**: https://vercel.com/dashboard
2. **Select your project** (SmartPick1)
3. **Click "Settings" → "Environment Variables"**
4. **Add these variables** (click "Add" for each):

```
VITE_FIREBASE_API_KEY = AIzaSyCi4S2B_BgrnmCArm9i-j6vquJtWGjNDTY
VITE_FIREBASE_PROJECT_ID = smartpick-app
VITE_FIREBASE_STORAGE_BUCKET = smartpick-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 1041329500996
VITE_FIREBASE_APP_ID = 1:1041329500996:android:609c24107dae65288b1d11

VITE_VAPID_PUBLIC_KEY = BFWa-fyPrMVWlvHijTsWzotg8If5U7NLiGn6JMK54gTjfWl43bxnESJuAYd_LbfIy8YSQ9-BsdJE7LPnxftqrkI

VITE_SUPABASE_URL = https://ggzhtpaxnhwcilomswtm.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA

VITE_GOOGLE_MAPS_API_KEY = AIzaSyDrGllMUYSRyN_MOvzrXTLJv2iCXcMd7nU
VITE_MAPTILER_KEY = lbc0oIt12XmRGOSqhQUx
VITE_TURNSTILE_SITE_KEY = 0x4AAAAAACABKInWhPNRi7fs

VITE_TELEGRAM_BOT_USERNAME = SmartPickGE_bot
VITE_PUBLIC_BASE_URL = https://www.smartpick.ge
VITE_MAINTENANCE_MODE = false
```

5. **Set Environment** to "Production" for each variable
6. **Click "Save"**
7. **Redeploy**: Go to "Deployments" → Click "..." on latest deployment → "Redeploy"

### Option 2: Netlify

1. **Go to Netlify dashboard**: https://app.netlify.com/
2. **Select your site**
3. **Click "Site settings" → "Build & deploy" → "Environment"**
4. **Click "Add a variable"** and add all the variables from above
5. **Trigger new deployment**: "Deploys" → "Trigger deploy" → "Deploy site"

### Option 3: Other Hosting Platform

Add the environment variables from above to your hosting platform's environment settings.

## 🔄 After Adding Variables

1. **Wait for rebuild** (usually 1-2 minutes)
2. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Test your website**
4. **Verify Firebase is working** (try login and notifications)

## 📝 Alternative: Use .env.production File

If your hosting platform supports it, you can commit `.env.production` to Git:

**⚠️ Warning:** This exposes some keys publicly. Only do this if you've added API key restrictions in Google Cloud Console.

```bash
# Remove .env.production from .gitignore
# Then commit and push
git add .env.production
git commit -m "Add production environment variables"
git push
```

## 🔐 Security Note

**REMEMBER:** After adding these to production, you still need to:
1. **Regenerate the Firebase API key** (see FIREBASE_API_KEY_SECURITY_FIX.md)
2. **Add API key restrictions** in Google Cloud Console
3. **Update the new key** in both `.env.local` and your hosting platform

## ✅ Verification

After deployment, check:
- Website loads without Firebase errors
- Push notifications work
- User authentication works
- Google Maps loads correctly

## 🆘 Still Having Issues?

1. Check browser console for other errors
2. Verify all environment variables are set correctly
3. Make sure deployment finished successfully
4. Try clearing CDN cache (in hosting platform settings)
5. Check that variable names match exactly (including `VITE_` prefix)

## 📚 More Info

- Vercel Env Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Netlify Env Variables: https://docs.netlify.com/environment-variables/overview/
- Vite Environment Variables: https://vitejs.dev/guide/env-and-mode.html
