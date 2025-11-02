# Setup Password Feature for Admin Add Partner

This guide shows you how to enable the password setting feature when adding new partners from the admin dashboard.

## 🔑 Step 1: Get Supabase Service Role Key

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your **SmartPick project**
3. Click on **Settings** (gear icon in sidebar)
4. Click on **API** in the settings menu
5. Scroll down to **Project API keys** section
6. Find **service_role** key (⚠️ **NOT** the anon key!)
7. Click **Reveal** and **Copy** the key

⚠️ **IMPORTANT:** The service_role key is **SECRET** - never commit it to git or share publicly!

## 🚀 Step 2: Add to Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Click on your **SmartPick project**
3. Click on **Settings** tab
4. Click on **Environment Variables** in the sidebar
5. Click **Add New**
6. Enter:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (paste the service role key you copied)
   - **Environment:** Select all (Production, Preview, Development)
7. Click **Save**

## 🔄 Step 3: Redeploy

After adding the environment variable, you need to redeploy:

1. Go to **Deployments** tab in Vercel
2. Find the latest deployment
3. Click **•••** (three dots menu)
4. Click **Redeploy**
5. Wait 1-2 minutes for deployment to complete

## ✅ Step 4: Verify It Works

1. Go to https://www.smartpick.ge/admin-dashboard
2. Click **Partners** tab
3. Click **+ Add Partner** button
4. Fill in all fields including the **Partner Password** field
5. Click **Add Partner**
6. ✅ Should succeed with message: "Partner added successfully with password!"

## 🎯 How It Works

**With Password:**
- Admin enters password → Creates auth user with password → Partner can login immediately

**Without Password:**
- Admin leaves password empty → Creates partner without auth → Partner uses "Forgot Password" to set password

## 🔒 Security Notes

- ✅ Service role key is stored securely in Vercel environment variables
- ✅ Key is never exposed to browser/client code
- ✅ API endpoint runs on Vercel serverless function (backend only)
- ✅ Only admins can access this feature (protected by RLS)

## 🐛 Troubleshooting

**Still getting 500 error?**
- Make sure you added `SUPABASE_SERVICE_ROLE_KEY` (exact name!)
- Make sure you redeployed after adding the variable
- Clear browser cache: Ctrl+Shift+R

**Can't find service role key?**
- It's in Supabase Dashboard → Settings → API
- Look for "service_role" (NOT "anon" key!)
- It's much longer than the anon key

## 📝 Example

```
Name: John's Bakery
Email: john@example.com
Phone: +995555123456
Business Type: Bakery
Password: MySecurePass123  ← Partner can login with this!
```

Partner can now immediately login with:
- Email: john@example.com
- Password: MySecurePass123

---

**Last Updated:** 2025-01-02
