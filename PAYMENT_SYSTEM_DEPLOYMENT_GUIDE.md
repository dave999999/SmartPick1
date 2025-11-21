# SmartPoints Payment System - Deployment Guide

This guide covers deploying the complete "Buy SmartPoints" payment flow using Bank of Georgia (BOG) Payments API.

## Overview

The payment system consists of:
- **Database**: `point_purchase_orders` table to track purchases
- **Frontend**: `BuyPointsModal` component for package selection
- **Backend**: Two Supabase Edge Functions:
  - `bog-create-session`: Initiates payment session
  - `bog-webhook`: Handles payment completion callbacks
- **Integration**: Seamless flow from UserProfile wallet page

## Architecture Flow

```
User clicks "Buy Points"
    ↓
BuyPointsModal opens (select package/custom amount)
    ↓
Frontend calls bog-create-session Edge Function
    ↓
Function creates order in DB (status: PENDING)
    ↓
Function calls BOG API to create payment session
    ↓
User redirected to BOG payment page
    ↓
User completes payment (card/bank)
    ↓
BOG calls bog-webhook with payment result
    ↓
Webhook updates order status (PAID/FAILED)
    ↓
Webhook credits SmartPoints to user wallet
    ↓
User redirected back to app with success/error message
```

## Prerequisites

### 1. Bank of Georgia Developer Account

1. Register at: https://developer.bog.ge
2. Create a new application
3. Note down:
   - Client ID
   - Client Secret
   - Configure Redirect URI: `https://your-domain.com/profile?purchase=success`
   - Configure Webhook URL: `https://your-project.supabase.co/functions/v1/bog-webhook`

### 2. Supabase Project

- Supabase URL
- Anon Key (public)
- Service Role Key (secret)

## Step 1: Database Migration

Run the migration to create the `point_purchase_orders` table:

```bash
# Navigate to your Supabase project SQL editor
# Run the contents of: supabase/migrations/20251118_point_purchase_orders.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

**Verify:**
```sql
SELECT * FROM point_purchase_orders LIMIT 1;
```

## Step 2: Configure Environment Variables

### For Edge Functions (Supabase Dashboard)

Navigate to: **Project Settings → Edge Functions → Environment Variables**

Add the following variables:

```env
BOG_CLIENT_ID=your_client_id_from_bog
BOG_CLIENT_SECRET=your_client_secret_from_bog
BOG_AUTH_URL=https://api.bog.ge/oauth2/authorize
BOG_TOKEN_URL=https://api.bog.ge/oauth2/token
BOG_PAYMENTS_API_URL=https://api.bog.ge/api/v1/payments
BOG_REDIRECT_URI=https://your-domain.com/profile?purchase=success
PUBLIC_BASE_URL=https://your-domain.com
```

**For Testing (Sandbox):**
```env
BOG_AUTH_URL=https://sandbox.bog.ge/oauth2/authorize
BOG_TOKEN_URL=https://sandbox.bog.ge/oauth2/token
BOG_PAYMENTS_API_URL=https://sandbox.bog.ge/api/v1/payments
```

### For Frontend (Vite)

Update your `.env` or `.env.production`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
PUBLIC_BASE_URL=https://your-domain.com
```

## Step 3: Deploy Edge Functions

### Using Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy bog-create-session function
supabase functions deploy bog-create-session

# Deploy bog-webhook function
supabase functions deploy bog-webhook

# Verify deployment
supabase functions list
```

### Using Manual Deploy (Dashboard)

1. Navigate to **Edge Functions** in Supabase Dashboard
2. Create new function: `bog-create-session`
3. Copy contents from `supabase/functions/bog-create-session/index.ts`
4. Create new function: `bog-webhook`
5. Copy contents from `supabase/functions/bog-webhook/index.ts`
6. Deploy both functions

## Step 4: Configure BOG Webhook

In your BOG Developer Portal:

1. Go to your application settings
2. Set **Webhook URL**:
   ```
   https://your-project.supabase.co/functions/v1/bog-webhook
   ```
3. Select events to receive:
   - Payment Success
   - Payment Failed
   - Payment Cancelled

**Optional**: If BOG provides webhook secret for signature verification:
```env
BOG_WEBHOOK_SECRET=your_webhook_secret
```

## Step 5: Deploy Frontend

Build and deploy your Vite app with the updated UserProfile.tsx:

```bash
# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Deploy to your hosting provider (Vercel, Netlify, etc.)
# Or upload dist/ folder to your server
```

## Step 6: Test the Flow

### Testing Checklist

**1. Package Selection:**
- [ ] Open UserProfile → Wallet tab
- [ ] Click "Buy Points" button
- [ ] Modal opens with 4 packages
- [ ] Current balance displayed correctly
- [ ] Package selection highlights properly

**2. Custom Amount:**
- [ ] Enter custom amount (test: 10 GEL)
- [ ] Points calculation shows (1000 points)
- [ ] Validation works: min 5 GEL, max 500 GEL

**3. Payment Session Creation:**
- [ ] Click "Proceed to Payment"
- [ ] Check browser console for API call
- [ ] Should redirect to BOG payment page
- [ ] Check database: order created with status PENDING

**4. Payment Completion:**
- [ ] Complete payment on BOG page (use sandbox test cards)
- [ ] Redirected back to app
- [ ] Success toast message appears
- [ ] Wallet balance updated with new points
- [ ] Check database: order status changed to PAID

**5. Payment Failure/Cancellation:**
- [ ] Test cancelling payment
- [ ] Redirected back with error message
- [ ] No points credited
- [ ] Order status: CANCELLED or FAILED

### Sandbox Test Cards (BOG)

Check BOG documentation for test card numbers. Typically:
- **Success**: `4111111111111111`
- **Failure**: `4000000000000002`
- **3D Secure**: `4000000000000010`

### Database Verification

```sql
-- Check created orders
SELECT * FROM point_purchase_orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Check points history
SELECT * FROM points_history 
WHERE reason = 'POINT_PURCHASE'
ORDER BY created_at DESC 
LIMIT 10;

-- Check user balance
SELECT id, name, user_points 
FROM users 
WHERE id = 'your_test_user_id';
```

## Step 7: Monitor and Debug

### Supabase Edge Function Logs

```bash
# Real-time logs for create-session function
supabase functions serve bog-create-session

# Real-time logs for webhook function
supabase functions serve bog-webhook
```

Or view logs in Supabase Dashboard:
**Edge Functions → Function Name → Logs**

### Common Issues

**Issue**: Webhook not receiving calls
- **Fix**: Check BOG webhook URL configuration
- **Fix**: Verify Edge Function is deployed and public
- **Fix**: Check Edge Function logs for errors

**Issue**: Payment redirects to wrong URL
- **Fix**: Update `BOG_REDIRECT_URI` environment variable
- **Fix**: Update BOG app configuration with correct redirect URI

**Issue**: Points not credited after payment
- **Fix**: Check `bog-webhook` logs for errors
- **Fix**: Verify `points_history` table exists
- **Fix**: Check RLS policies on `users` and `points_history` tables

**Issue**: "Insufficient permissions" error
- **Fix**: Ensure Edge Functions use `SUPABASE_SERVICE_ROLE_KEY`
- **Fix**: Check RLS policies allow service role to update

## Step 8: Production Checklist

Before going live:

- [ ] Switch from sandbox to production BOG API URLs
- [ ] Use production BOG credentials
- [ ] Update redirect URI to production domain
- [ ] Update webhook URL to production
- [ ] Test full flow in production environment
- [ ] Set up monitoring/alerts for failed payments
- [ ] Configure email notifications for failed webhooks
- [ ] Add retry logic for webhook failures (if needed)
- [ ] Document customer support process for payment issues

## Pricing Configuration

Current conversion rate: **1 GEL = 100 SmartPoints**

To change the conversion rate, update `src/lib/payments/bog.ts`:

```typescript
export const BOG_CONFIG = {
  POINTS_PER_GEL: 100, // Change this value
  // ...
};
```

Package pricing in `BuyPointsModal.tsx`:

```typescript
const packages = [
  { points: 500, gel: 5 },
  { points: 1000, gel: 10 },
  { points: 2500, gel: 25 },
  { points: 5000, gel: 50 },
];
```

## Security Considerations

1. **Never expose secrets in frontend code**
   - BOG_CLIENT_SECRET only in Edge Functions
   - Use environment variables

2. **Validate webhook authenticity**
   - Implement signature verification in `bog-webhook`
   - Check `x-bog-signature` header

3. **Prevent duplicate processing**
   - Webhook checks order status before processing
   - Idempotent design (can receive same webhook multiple times)

4. **Rate limiting**
   - Add rate limiting to Edge Functions if needed
   - Use Supabase Edge Function rate limiting

5. **Audit logging**
   - All orders stored in `point_purchase_orders`
   - Metadata field stores webhook data for debugging

## Support and Troubleshooting

### Customer Issues

**"Payment was deducted but points not added"**
1. Check `point_purchase_orders` for order status
2. Check if webhook was received (Edge Function logs)
3. Manually credit points if needed:
   ```sql
   -- Update order status
   UPDATE point_purchase_orders 
   SET status = 'PAID' 
   WHERE id = 'order_id';
   
   -- Credit points
   UPDATE users 
   SET user_points = user_points + 1000 
   WHERE id = 'user_id';
   
   -- Insert history
   INSERT INTO points_history (user_id, delta, reason, balance_after, metadata)
   VALUES ('user_id', 1000, 'MANUAL_CREDIT', new_balance, '{"reason": "webhook_failed"}');
   ```

**"Can't complete payment"**
1. Check BOG service status
2. Verify Edge Function is deployed and running
3. Check environment variables are set correctly

### Developer Debugging

```typescript
// Enable detailed logging in Edge Functions
console.log('BOG API Request:', requestData);
console.log('BOG API Response:', responseData);
console.log('Order created:', orderId);
```

View logs:
```bash
supabase functions logs bog-create-session
supabase functions logs bog-webhook
```

## Additional Resources

- [BOG Developer Documentation](https://developer.bog.ge/docs)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## Maintenance

### Regular Tasks

1. **Monitor failed payments**
   ```sql
   SELECT * FROM point_purchase_orders 
   WHERE status = 'FAILED' 
   AND created_at > NOW() - INTERVAL '7 days';
   ```

2. **Check for stuck PENDING orders**
   ```sql
   SELECT * FROM point_purchase_orders 
   WHERE status = 'PENDING' 
   AND created_at < NOW() - INTERVAL '1 hour';
   ```

3. **Review webhook logs weekly**
   - Check for errors or failures
   - Verify all payments processed correctly

4. **Update Edge Functions**
   ```bash
   supabase functions deploy bog-create-session
   supabase functions deploy bog-webhook
   ```

---

**Deployment Date**: {{ current_date }}  
**Last Updated**: {{ current_date }}  
**Version**: 1.0.0
