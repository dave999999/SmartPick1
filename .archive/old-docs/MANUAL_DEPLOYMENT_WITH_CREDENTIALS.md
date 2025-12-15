# 🚀 Manual Edge Functions Deployment Guide

## Your BOG Credentials (REMOVED FOR SECURITY)
```
⚠️ CREDENTIALS REMOVED - These were exposed and have been rotated.
Get new credentials from Bank of Georgia E-Commerce Portal.
```

---

## STEP 1: Configure Supabase Environment Variables

### Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard
2. Select your project
3. Click **Edge Functions** (left sidebar)
4. Click **Settings** or **Environment Variables** tab

### Add These Variables (Click "Add Variable" for each):

| Variable Name | Value |
|---------------|-------|
| `BOG_CLIENT_ID` | `your_client_id_from_bog_portal` |
| `BOG_CLIENT_SECRET` | `your_client_secret_from_bog_portal` |
| `BOG_AUTH_URL` | `https://oauth.bog.ge/auth/realms/bog/protocol/openid-connect/auth` |
| `BOG_TOKEN_URL` | `https://oauth.bog.ge/auth/realms/bog/protocol/openid-connect/token` |
| `BOG_PAYMENTS_API_URL` | `https://api.bog.ge/payments/v1` |
| `BOG_REDIRECT_URI` | `http://localhost:5173/profile?purchase=success` |
| `PUBLIC_BASE_URL` | `http://localhost:5173` |

**Note:** For production, change `localhost:5173` to your actual domain.

Click **Save** after adding all variables.

---

## STEP 2: Deploy Edge Functions via Dashboard

### Option A: Using Supabase CLI (Recommended)

1. **Login to Supabase:**
   ```powershell
   supabase login
   ```
   (This will open a browser - log in there)

2. **Link your project:**
   ```powershell
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Get YOUR_PROJECT_REF from: Project Settings → General → Reference ID

3. **Deploy both functions:**
   ```powershell
   supabase functions deploy bog-create-session
   supabase functions deploy bog-webhook
   ```

### Option B: Manual via Dashboard (If CLI doesn't work)

#### Deploy bog-create-session:
1. Go to **Edge Functions** → Click **Create Function**
2. Name: `bog-create-session`
3. Copy contents from: `d:\v3\workspace\shadcn-ui\supabase\functions\bog-create-session\index.ts`
4. Paste into editor
5. Click **Deploy**

#### Deploy bog-webhook:
1. Click **Create Function** again
2. Name: `bog-webhook`
3. Copy contents from: `d:\v3\workspace\shadcn-ui\supabase\functions\bog-webhook\index.ts`
4. Paste into editor
5. Click **Deploy**

---

## STEP 3: Get Your Function URLs

After deployment, you'll see URLs like:
```
https://YOUR_PROJECT.supabase.co/functions/v1/bog-create-session
https://YOUR_PROJECT.supabase.co/functions/v1/bog-webhook
```

**Copy the webhook URL** - you'll need it for BOG configuration.

---

## STEP 4: Configure BOG Webhook

1. Go to your BOG Developer Portal: https://developer.bog.ge
2. Find your application settings
3. Set **Webhook URL** to:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/bog-webhook
   ```
4. Set **Redirect URI** to:
   ```
   http://localhost:5173/profile?purchase=success
   ```
   (For production, use your real domain)

5. Save settings

---

## STEP 5: Run Database Migration

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Open file: `d:\v3\workspace\shadcn-ui\supabase\migrations\20251118_point_purchase_orders.sql`
4. Copy ALL contents
5. Paste into SQL Editor
6. Click **Run** (or Ctrl+Enter)
7. Should see: "Success. No rows returned"

Verify:
```sql
SELECT * FROM point_purchase_orders LIMIT 1;
```

---

## STEP 6: Test Locally

1. Start dev server:
   ```powershell
   npm run dev
   ```

2. Open: http://localhost:5173

3. Sign in to your account

4. Go to **Profile** → **Wallet** tab

5. Click **"Buy Points"** button

6. Select a package (try 500 points / 5 GEL)

7. Click **"Proceed to Payment"**

8. You should be redirected to BOG payment page

9. Complete test payment

10. Should redirect back with success message

11. Check your points balance increased

---

## STEP 7: Check Logs (If Issues)

### View Edge Function Logs:
```powershell
supabase functions logs bog-create-session --tail
supabase functions logs bog-webhook --tail
```

Or in Dashboard: **Edge Functions** → Select function → **Logs** tab

### Check Database:
```sql
-- Recent orders
SELECT * FROM point_purchase_orders ORDER BY created_at DESC LIMIT 10;

-- User points
SELECT id, name, user_points FROM users WHERE email = 'your@email.com';
```

---

## Troubleshooting

### "Cannot connect to BOG"
- Check environment variables are set correctly in Supabase
- Verify BOG URLs are correct
- Check Edge Function logs for detailed errors

### "Payment started but no redirect"
- Check BOG_REDIRECT_URI matches in both Supabase env vars and BOG portal
- Check browser console for errors

### "Webhook not firing"
- Verify webhook URL in BOG portal is correct
- Check bog-webhook function logs
- Test webhook manually if BOG provides test option

### "Points not credited"
- Check bog-webhook logs
- Query database: `SELECT * FROM point_purchase_orders ORDER BY created_at DESC;`
- Check order status (should be PAID, not PENDING)

---

## Next Steps After Testing

1. ✅ Verify local testing works
2. Update environment variables for production domain
3. Update BOG redirect URI to production
4. Deploy frontend: `npm run build`
5. Test in production with real small payment

---

## DELETE THIS FILE AFTER SETUP!

**IMPORTANT:** This file contains your credentials. Delete it after successful deployment:
```powershell
rm MANUAL_DEPLOYMENT_WITH_CREDENTIALS.md
```

Never commit this file to git!

---

**Status:**
- [ ] Environment variables set in Supabase
- [ ] Edge Functions deployed
- [ ] Database migration run
- [ ] BOG webhook configured
- [ ] BOG redirect URI configured
- [ ] Tested locally
- [ ] Ready for production
