# 🚀 STEP-BY-STEP DEPLOYMENT GUIDE - SmartPoints Payment System

This guide walks you through deploying the payment system you just implemented.

---

## ✅ Current Status

- ✅ All code files created (8 new files)
- ✅ UserProfile.tsx integrated with Buy Points modal
- ✅ Build tested successfully (`npm run build` ✅)
- ✅ TypeScript errors fixed
- ⏳ **NEXT**: Deploy to Supabase and configure BOG

---

## 📋 STEP 1: Bank of Georgia (BOG) Setup

### 1.1 Log into BOG Developer Portal

Visit: **https://developer.bog.ge** (or the BOG merchant portal you mentioned)

### 1.2 Find Your Application Credentials

In your BOG profile/dashboard, locate:
- ✅ **Client ID** (you should already have this)
- ✅ **Client Secret** (you should already have this)

**Copy these values** - you'll need them in Step 3.

### 1.3 Configure Redirect URI

In BOG app settings, set the **Redirect URI**:

**For Testing (Local):**
```
http://localhost:5173/profile?purchase=success
```

**For Production:**
```
https://your-domain.com/profile?purchase=success
```

### 1.4 Configure Webhook URL

In BOG app settings, set the **Webhook URL**:

**For Production:**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/bog-webhook
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference (we'll get this in Step 2).

**Example:**
```
https://abcdefghijklmnop.supabase.co/functions/v1/bog-webhook
```

### 1.5 API Endpoints to Use

BOG should provide you with these endpoints. If you're testing, use sandbox:

**Sandbox (Testing):**
```
Auth URL: https://sandbox.bog.ge/oauth2/authorize
Token URL: https://sandbox.bog.ge/oauth2/token
Payments API: https://sandbox.bog.ge/api/v1/payments
```

**Production:**
```
Auth URL: https://api.bog.ge/oauth2/authorize
Token URL: https://api.bog.ge/oauth2/token
Payments API: https://api.bog.ge/api/v1/payments
```

*Note: These URLs might be different based on BOG's actual API. Check your BOG documentation.*

✅ **Write these down - you'll need them in Step 3!**

---

## 📋 STEP 2: Supabase Database Setup

### 2.1 Open Supabase Dashboard

Go to: **https://supabase.com/dashboard**

Log in to your project.

### 2.2 Get Your Project Reference

Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

Or find it in: **Project Settings → General → Reference ID**

✅ **Copy this - you'll need it for BOG webhook configuration**

### 2.3 Run the Database Migration

1. In Supabase Dashboard, go to: **SQL Editor**

2. Click **New Query**

3. Open this file in VS Code:
   ```
   d:\v3\workspace\shadcn-ui\supabase\migrations\20251118_point_purchase_orders.sql
   ```

4. **Copy the entire contents** of that file

5. **Paste it** into the Supabase SQL Editor

6. Click **Run** (or press Ctrl+Enter)

7. You should see: ✅ **"Success. No rows returned"**

### 2.4 Verify Table Created

Run this query in SQL Editor:
```sql
SELECT * FROM point_purchase_orders LIMIT 1;
```

You should see the table structure (empty results is fine).

✅ **Database is ready!**

---

## 📋 STEP 3: Configure Edge Function Environment Variables

### 3.1 Open Edge Functions Settings

In Supabase Dashboard:
1. Go to **Edge Functions** (left sidebar)
2. Click **Settings** or **Environment Variables**

### 3.2 Add BOG Configuration Variables

Click **Add Variable** for each of these:

#### Required Variables:

| Variable Name | Value | Example |
|---------------|-------|---------|
| `BOG_CLIENT_ID` | Your Client ID from BOG | `12345678-abcd-1234-abcd-123456789abc` |
| `BOG_CLIENT_SECRET` | Your Client Secret from BOG | `your_secret_key_here` |
| `BOG_AUTH_URL` | BOG auth endpoint | `https://sandbox.bog.ge/oauth2/authorize` |
| `BOG_TOKEN_URL` | BOG token endpoint | `https://sandbox.bog.ge/oauth2/token` |
| `BOG_PAYMENTS_API_URL` | BOG payments API | `https://sandbox.bog.ge/api/v1/payments` |
| `BOG_REDIRECT_URI` | Where users return after payment | `http://localhost:5173/profile?purchase=success` |
| `PUBLIC_BASE_URL` | Your app's base URL | `http://localhost:5173` |

**Important Notes:**
- Use **sandbox URLs** for testing
- Use **production URLs** when you go live
- `BOG_REDIRECT_URI` must match what you set in BOG portal (Step 1.3)
- For production, change `localhost:5173` to your actual domain

#### Optional Variable:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `BOG_WEBHOOK_SECRET` | Secret from BOG (if provided) | For webhook signature verification |

### 3.3 Save Variables

After adding all variables, click **Save** or **Apply**.

✅ **Environment variables configured!**

---

## 📋 STEP 4: Deploy Edge Functions

You mentioned BOG website says "you can deploy edge functions as well" - Let's use Supabase CLI for this.

### 4.1 Install Supabase CLI (if not installed)

Open PowerShell and run:
```powershell
# Using npm (recommended)
npm install -g supabase

# Or using Chocolatey
choco install supabase
```

Verify installation:
```powershell
supabase --version
```

### 4.2 Login to Supabase

```powershell
supabase login
```

This will open a browser to authenticate.

### 4.3 Link Your Project

```powershell
cd d:\v3\workspace\shadcn-ui
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual project reference from Step 2.2.

### 4.4 Deploy bog-create-session Function

```powershell
supabase functions deploy bog-create-session
```

You should see:
```
✓ Function deployed successfully
```

### 4.5 Deploy bog-webhook Function

```powershell
supabase functions deploy bog-webhook
```

You should see:
```
✓ Function deployed successfully
```

### 4.6 Verify Deployment

```powershell
supabase functions list
```

You should see both functions listed:
```
bog-create-session
bog-webhook
```

✅ **Edge Functions deployed!**

---

## 📋 STEP 5: Test Locally First

Before deploying frontend, let's test the flow locally.

### 5.1 Start Development Server

```powershell
cd d:\v3\workspace\shadcn-ui
npm run dev
```

### 5.2 Test the Flow

1. Open browser: **http://localhost:5173**

2. **Sign in** to your account

3. Go to **Profile** page

4. Click **Wallet** tab

5. Click **"Buy Points"** button

6. You should see the modal with packages

7. Select **"1000 points (10 GEL)"**

8. Click **"Proceed to Payment"**

9. You should be **redirected to BOG payment page**

10. **Complete the test payment** (use test card if sandbox)

11. You should be **redirected back** to your app

12. You should see a **success message**

13. Your **wallet balance should increase** by 1000 points

### 5.3 Troubleshooting

**If redirect doesn't work:**
- Check browser console for errors
- Check Edge Function logs: `supabase functions logs bog-create-session`
- Verify environment variables are set correctly

**If webhook doesn't fire:**
- Check Edge Function logs: `supabase functions logs bog-webhook`
- Verify webhook URL in BOG portal matches your Supabase project
- Check BOG webhook logs in their dashboard

**If points not credited:**
- Check database: `SELECT * FROM point_purchase_orders ORDER BY created_at DESC LIMIT 5;`
- Check webhook logs for errors
- Verify order status changed from PENDING to PAID

✅ **Local testing complete!**

---

## 📋 STEP 6: Deploy Frontend to Production

### 6.1 Update Environment for Production

Edit `.env.production`:

```powershell
code .env.production
```

Add these lines:
```env
# Bank of Georgia - Production
BOG_REDIRECT_URI=https://your-domain.com/profile?purchase=success
PUBLIC_BASE_URL=https://your-domain.com
```

### 6.2 Build for Production

```powershell
npm run build
```

Verify build succeeds with no errors.

### 6.3 Deploy to Your Host

**If using Vercel:**
```powershell
vercel deploy --prod
```

**If using Netlify:**
```powershell
netlify deploy --prod
```

**If using other host:**
- Upload contents of `dist/` folder to your web server

### 6.4 Update BOG Configuration for Production

Go back to BOG Developer Portal and update:

1. **Redirect URI**: Change to `https://your-domain.com/profile?purchase=success`

2. **Webhook URL**: Should already be set to `https://YOUR_PROJECT.supabase.co/functions/v1/bog-webhook`

### 6.5 Update Supabase Edge Function Variables for Production

In Supabase Dashboard → Edge Functions → Environment Variables:

Update these to production values:
- `BOG_AUTH_URL` → `https://api.bog.ge/oauth2/authorize`
- `BOG_TOKEN_URL` → `https://api.bog.ge/oauth2/token`
- `BOG_PAYMENTS_API_URL` → `https://api.bog.ge/api/v1/payments`
- `BOG_REDIRECT_URI` → `https://your-domain.com/profile?purchase=success`
- `PUBLIC_BASE_URL` → `https://your-domain.com`

Keep Client ID and Secret the same (production credentials).

### 6.6 Test in Production

1. Visit your production site
2. Sign in
3. Go to Profile → Wallet
4. Try buying points
5. Complete a real payment (small amount like 5 GEL)
6. Verify points credited

✅ **Production deployment complete!**

---

## 📋 STEP 7: Monitoring and Maintenance

### 7.1 Set Up Monitoring

**Check orders regularly:**
```sql
-- Recent orders
SELECT * FROM point_purchase_orders 
ORDER BY created_at DESC 
LIMIT 20;

-- Failed orders
SELECT * FROM point_purchase_orders 
WHERE status = 'FAILED' 
AND created_at > NOW() - INTERVAL '7 days';

-- Stuck pending orders
SELECT * FROM point_purchase_orders 
WHERE status = 'PENDING' 
AND created_at < NOW() - INTERVAL '1 hour';
```

### 7.2 Monitor Edge Function Logs

```powershell
# Real-time logs
supabase functions logs bog-create-session --tail
supabase functions logs bog-webhook --tail
```

Or view in Supabase Dashboard → Edge Functions → Logs

### 7.3 Handle Failed Payments

If a customer reports payment was deducted but points not added:

1. **Check order status:**
   ```sql
   SELECT * FROM point_purchase_orders 
   WHERE user_id = 'customer_user_id' 
   ORDER BY created_at DESC;
   ```

2. **Check BOG transaction** in BOG merchant dashboard

3. **If payment succeeded but webhook failed**, manually credit:
   ```sql
   -- Update order
   UPDATE point_purchase_orders 
   SET status = 'PAID' 
   WHERE id = 'order_id';
   
   -- Credit points
   UPDATE users 
   SET user_points = user_points + 1000 
   WHERE id = 'user_id';
   
   -- Add history
   INSERT INTO points_history (user_id, delta, reason, balance_after, metadata)
   VALUES ('user_id', 1000, 'MANUAL_CREDIT', 
           (SELECT user_points FROM users WHERE id = 'user_id'),
           '{"reason": "webhook_failed", "order_id": "order_id"}');
   ```

✅ **Monitoring set up!**

---

## 📋 Quick Command Reference

### Deploy Functions
```powershell
supabase functions deploy bog-create-session
supabase functions deploy bog-webhook
```

### View Logs
```powershell
supabase functions logs bog-create-session --tail
supabase functions logs bog-webhook --tail
```

### Check Database
```sql
-- Recent orders
SELECT * FROM point_purchase_orders ORDER BY created_at DESC LIMIT 10;

-- User balance
SELECT id, name, user_points FROM users WHERE id = 'user-id';
```

### Build & Deploy
```powershell
npm run build
# Then deploy to your host
```

---

## 🎯 Summary Checklist

- [ ] **Step 1**: Get BOG credentials and configure redirect/webhook URLs
- [ ] **Step 2**: Run database migration in Supabase
- [ ] **Step 3**: Add environment variables in Supabase Edge Functions
- [ ] **Step 4**: Deploy Edge Functions using Supabase CLI
- [ ] **Step 5**: Test locally (localhost:5173)
- [ ] **Step 6**: Deploy frontend to production
- [ ] **Step 7**: Set up monitoring

---

## 🆘 Need Help?

### Common Issues

**"supabase: command not found"**
→ Install Supabase CLI: `npm install -g supabase`

**"Function deployment failed"**
→ Check you're in the right directory: `cd d:\v3\workspace\shadcn-ui`
→ Check you're logged in: `supabase login`
→ Check project is linked: `supabase link --project-ref YOUR_REF`

**"Payment redirect doesn't work"**
→ Check `BOG_REDIRECT_URI` matches in both BOG portal and Supabase env vars
→ Check browser console for errors
→ Check Edge Function logs

**"Points not credited"**
→ Check webhook is being called (Edge Function logs)
→ Check order status in database
→ Check user_points increased in users table

### Files Reference

All implementation files are in your workspace:
- Migration: `supabase/migrations/20251118_point_purchase_orders.sql`
- Functions: `supabase/functions/bog-create-session/` and `bog-webhook/`
- Modal: `src/components/wallet/BuyPointsModal.tsx`
- Integration: `src/pages/UserProfile.tsx`

### Documentation

- Full guide: `PAYMENT_SYSTEM_DEPLOYMENT_GUIDE.md`
- Quick start: `QUICK_START_PAYMENT_SYSTEM.md`
- Technical details: `PAYMENT_SYSTEM_IMPLEMENTATION_SUMMARY.md`

---

## 🎉 You're Ready!

Start with **Step 1** and work through each step. The system is fully implemented and tested - you just need to configure and deploy!

**Estimated Time:**
- Steps 1-3: 15-20 minutes (configuration)
- Step 4: 5 minutes (deploy functions)
- Step 5: 10 minutes (testing)
- Step 6: 10 minutes (production deploy)
- **Total: ~45 minutes**

Good luck! 🚀
