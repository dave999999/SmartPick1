# 🚀 SmartPick Supabase Setup Guide - FOOLPROOF 3-STEP METHOD

This guide will help you set up your database in **3 simple steps**. Each step must be completed and verified before moving to the next.

---

## 📋 Before You Start

✅ You already have:
- Supabase project created
- Environment variables in `.env` file

✅ You need:
- 10 minutes of time
- Access to Supabase SQL Editor

---

## 🎯 STEP 1: Create Tables

### What This Does
Creates the 4 main database tables, indexes, and automatic functions.

### Instructions

1. **Open Supabase SQL Editor**
   - Click: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql
   - Click the **"New Query"** button

2. **Copy Step 1 Script**
   - Open file: `/workspace/shadcn-ui/supabase-step1-tables.sql`
   - Select ALL text (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

3. **Paste and Run**
   - Paste into SQL Editor (Ctrl+V / Cmd+V)
   - Click **"RUN"** button (or Ctrl+Enter)
   - Wait for: **"Success. No rows returned"**

### ✅ Verify Step 1

Run this verification query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**You MUST see these 4 tables:**
- ✅ offers
- ✅ partners
- ✅ reservations
- ✅ users

**If you see all 4 tables, proceed to Step 2. Otherwise, DO NOT continue.**

---

## 🔐 STEP 2: Enable Row Level Security

### What This Does
Sets up security policies so users can only access their own data.

### Instructions

1. **Open a NEW Query**
   - In SQL Editor, click **"New Query"** again

2. **Copy Step 2 Script**
   - Open file: `/workspace/shadcn-ui/supabase-step2-rls.sql`
   - Select ALL text (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

3. **Paste and Run**
   - Paste into SQL Editor (Ctrl+V / Cmd+V)
   - Click **"RUN"** button
   - Wait for: **"Success. No rows returned"**

### ✅ Verify Step 2

Run this verification query:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**All 4 tables MUST show `rowsecurity = true`:**
- ✅ offers → true
- ✅ partners → true
- ✅ reservations → true
- ✅ users → true

**If all show "true", proceed to Step 3. Otherwise, DO NOT continue.**

---

## 📦 STEP 3: Create Storage Buckets

### What This Does
Creates folders for storing offer and partner images.

### Instructions

1. **Open a NEW Query**
   - In SQL Editor, click **"New Query"** again

2. **Copy Step 3 Script**
   - Open file: `/workspace/shadcn-ui/supabase-step3-storage.sql`
   - Select ALL text (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

3. **Paste and Run**
   - Paste into SQL Editor (Ctrl+V / Cmd+V)
   - Click **"RUN"** button
   - Wait for: **"Success. No rows returned"**

### ✅ Verify Step 3

Go to Storage page:
- Click: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/storage/buckets

**You MUST see 2 buckets:**
- ✅ offer-images (public)
- ✅ partner-images (public)

**If you see both buckets, database setup is COMPLETE! ✨**

---

## 🔐 STEP 4: Configure Google Sign-In

### A. Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com

2. **Create/Select Project**
   - Click project dropdown (top bar)
   - Click "New Project"
   - Name: "SmartPick"
   - Click "Create"

3. **Enable Google+ API**
   - Go to: "APIs & Services" → "Library"
   - Search: "Google+ API"
   - Click it, then click "Enable"

4. **Create OAuth Credentials**
   - Go to: "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure consent screen:
     - User Type: External
     - App name: SmartPick
     - User support email: (your email)
     - Developer contact: (your email)
     - Click "Save and Continue" through all steps
   - Back to Create OAuth client ID:
     - Application type: **Web application**
     - Name: **SmartPick**
     - Authorized redirect URIs - ADD THIS:
       ```
       https://***REMOVED_PROJECT_ID***.supabase.co/auth/v1/callback
       ```
     - Click "Create"

5. **Copy Credentials**
   - A popup shows your credentials
   - **COPY** both:
     - Client ID
     - Client Secret
   - Save them somewhere safe!

### B. Add to Supabase

1. **Go to Supabase Auth Settings**
   - Click: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/auth/providers

2. **Enable Google**
   - Find "Google" in the providers list
   - Toggle the switch **ON** (it should turn green)

3. **Paste Credentials**
   - Client ID: (paste from Google)
   - Client Secret: (paste from Google)
   - Click **"Save"**

### ✅ Verify Step 4

- Google provider should show as **"Enabled"** with green checkmark

---

## 🎉 STEP 5: Test the Application

### Restart Development Server

```bash
cd /workspace/shadcn-ui
pnpm run dev
```

### Test Sign In

1. **Open the app** in your browser
2. Click **"Sign In"** button
3. Click **"Sign in with Google"**
4. Choose your Google account
5. You should be redirected back to the app
6. You should see your name/email in the app

### Verify User Created

1. Go to: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/editor
2. Click the **"users"** table
3. You should see YOUR user record with your email

**If you can sign in and see your user, EVERYTHING WORKS! 🎉**

---

## 🐛 Troubleshooting

### Error: "column user_id does not exist"

**This means you skipped verification steps!**

**Solution:**
1. Delete everything and start over:
   ```sql
   DROP TABLE IF EXISTS public.reservations CASCADE;
   DROP TABLE IF EXISTS public.offers CASCADE;
   DROP TABLE IF EXISTS public.partners CASCADE;
   DROP TABLE IF EXISTS public.users CASCADE;
   ```
2. Go back to STEP 1
3. Follow instructions EXACTLY
4. VERIFY each step before continuing

### Error: "relation already exists"

**This is OK!** It means tables already exist. Continue to next step.

### Error: "policy already exists"

**This is OK!** It means policies already exist. Continue to next step.

### Can't Sign In with Google

**Check these:**
1. Is Google OAuth **enabled** in Supabase? (green toggle)
2. Is redirect URI exactly: `https://***REMOVED_PROJECT_ID***.supabase.co/auth/v1/callback`
3. Did you enable Google+ API in Google Cloud Console?
4. Are Client ID and Secret correct?

**Try:**
- Clear browser cache
- Try incognito/private window
- Check Supabase logs: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/logs/explorer

### App Still Shows "Demo Mode"

**Solutions:**
1. Check `.env` file has correct credentials
2. Restart dev server: `pnpm run dev`
3. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Check all 4 tables exist in database

---

## ✅ Final Checklist

Before you're done, verify:

- [ ] All 4 tables exist (users, partners, offers, reservations)
- [ ] RLS enabled on all tables (rowsecurity = true)
- [ ] 2 storage buckets exist (offer-images, partner-images)
- [ ] Google OAuth configured and enabled
- [ ] Can sign in with Google
- [ ] User record appears in users table
- [ ] No "Demo Mode" banner in app

---

## 🎯 What's Next?

### Become a Partner

1. Click **"Become a Partner"** in the app
2. Fill out the business application form
3. Submit (status will be "PENDING")

### Approve Yourself

Since you're the first user, approve yourself:

1. Go to: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/editor
2. Click **"partners"** table
3. Find your partner record
4. Click the **status** field
5. Change from "PENDING" to "APPROVED"
6. Click the checkmark to save

### Create Your First Offer

1. Go to **Partner Dashboard** in the app
2. Click **"Create New Offer"**
3. Fill in:
   - Title (e.g., "Fresh Khachapuri")
   - Category (BAKERY, CAFE, etc.)
   - Description
   - Original price and Smart price
   - Quantity
   - Pickup time window
4. Click **"Create Offer"**
5. Your offer appears on the homepage!

---

## 📊 Understanding Your Database

### Tables

- **users**: All user accounts (customers, partners, admins)
- **partners**: Business profiles for restaurants, bakeries, cafes
- **offers**: Smart-Time offers created by partners
- **reservations**: Customer reservations with QR codes

### Security

- **RLS (Row Level Security)**: Users can only see/edit their own data
- **Policies**: Define who can read/write what data
- **Storage Policies**: Control who can upload/view images

---

## 🆘 Still Stuck?

### Check Logs

Supabase logs show detailed errors:
- https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/logs/explorer

### Test Database Connection

Run this simple query:
```sql
SELECT NOW();
```
If this works, your database connection is fine.

### Common Issues

1. **Wrong credentials**: Double-check `.env` file
2. **Skipped verification**: Go back and verify each step
3. **Browser cache**: Clear cache or use incognito
4. **OAuth misconfigured**: Check redirect URI is exact

---

## 📞 Quick Links

- **Dashboard**: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***
- **SQL Editor**: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql
- **Table Editor**: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/editor
- **Auth Settings**: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/auth/providers
- **Storage**: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/storage/buckets
- **Logs**: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/logs/explorer

---

**🎉 Congratulations!** Once you complete all steps, you'll have a fully functional SmartPick platform with real authentication, database, and image storage!

**Good luck! 🚀**