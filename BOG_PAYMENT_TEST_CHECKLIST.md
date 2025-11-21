# Bank of Georgia Payment Integration - Test Checklist

## ✅ Implementation Status

### Files Updated
- ✅ `src/lib/payments/bog.ts` - E-Commerce API client
- ✅ `supabase/functions/bog-create-session/index.ts` - Payment initiation
- ✅ `supabase/functions/bog-webhook/index.ts` - Payment completion handler
- ✅ `.env.example` - Environment variable documentation

### Deployed Edge Functions
- ✅ `bog-create-session` - https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-create-session
- ✅ `bog-webhook` - https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-webhook

---

## 🔧 Pre-Testing Configuration

### 1. Supabase Environment Variables (Dashboard)
Go to: **Supabase Dashboard → Project Settings → Edge Functions → Environment Variables**

Verify these are set:

```env
# BOG Credentials
BOG_PUBLIC_KEY=10002951
BOG_SECRET_KEY=***REMOVED_BOG_SECRET***

# BOG API Endpoint
BOG_PAYMENTS_API_URL=https://api.bog.ge/payments/v1/ecommerce/orders

# URLs
PUBLIC_BASE_URL=https://www.smartpick.ge
BOG_REDIRECT_URI=https://www.smartpick.ge/profile?purchase=success
BOG_CALLBACK_URL=https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-webhook

# Optional Security
BOG_AUTH_KEY=your_auth_key_if_configured

# Supabase (already set)
SUPABASE_URL=https://***REMOVED_PROJECT_ID***.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Bank of Georgia Portal Configuration
Go to: **BOG E-Commerce Merchant Portal**

Configure:
- ✅ **Callback URL**: `https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-webhook`
- ✅ **Return URL**: `https://www.smartpick.ge/profile?purchase=success`
- ✅ **Merchant ID**: 10002951
- ✅ **Secret Key**: ***REMOVED_BOG_SECRET*** (keep secure)

### 3. Database Migration
Ensure migration is applied:

```sql
-- Check if point_purchase_orders table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'point_purchase_orders'
);
```

If not, run:
```bash
psql -h db.***REMOVED_PROJECT_ID***.supabase.co -U postgres -d postgres -f supabase/migrations/20251118_point_purchase_orders.sql
```

---

## 🧪 Testing Steps

### Test 1: Database Setup Verification

**Goal**: Ensure all database objects are created correctly

```sql
-- 1. Check table exists
SELECT * FROM point_purchase_orders LIMIT 1;

-- 2. Check points_history table
SELECT * FROM points_history WHERE reason = 'POINT_PURCHASE' LIMIT 1;

-- 3. Check users table has user_points column
SELECT id, user_points FROM users WHERE id = 'your-test-user-id';

-- Expected: All queries should work without errors
```

**✅ Pass Criteria**: All tables exist and are accessible

---

### Test 2: Edge Function Authentication

**Goal**: Verify user authentication works

**Steps**:
1. Open browser DevTools (F12) → Console
2. Go to: https://www.smartpick.ge/profile
3. Login if not already
4. Run this in Console:

```javascript
// Get current session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session ? 'Valid' : 'Invalid');
console.log('User ID:', session?.user?.id);
console.log('Token:', session?.access_token?.substring(0, 20) + '...');
```

**✅ Pass Criteria**: 
- Session is Valid
- User ID is displayed
- Access token exists

---

### Test 3: Payment Initiation (Frontend)

**Goal**: Test payment flow from UI

**Steps**:
1. Go to: https://www.smartpick.ge/profile
2. Click **Wallet** tab
3. Click **Buy Points** button
4. Select **500 points (5 GEL)** package
5. Click **Proceed to Payment**
6. Monitor Browser Console and Network tab

**Expected Behavior**:
- ✅ Modal opens with packages
- ✅ Package selection highlights
- ✅ "Proceed to Payment" button is clickable
- ✅ Loading state shows while processing
- ✅ Network request to `/functions/v1/bog-create-session` with status 200
- ✅ Response contains `redirectUrl`
- ✅ Browser redirects to BOG payment page

**Console Logs to Look For**:
```
[BOG] Initiating payment session...
[BOG] Order created: <order-id>
[BOG] Redirecting to BOG...
```

**Network Request Check**:
```
POST https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-create-session

Request Body:
{
  "gel_amount": 5,
  "points": 500
}

Response (200):
{
  "redirectUrl": "https://api.bog.ge/checkout/..."
}
```

**✅ Pass Criteria**: 
- Request successful (200)
- redirectUrl received
- Redirect happens automatically

---

### Test 4: Database Order Creation

**Goal**: Verify order is created with PENDING status

**Steps**:
1. After initiating payment (Test 3)
2. Run this SQL query:

```sql
-- Get most recent order
SELECT 
  id,
  user_id,
  points,
  gel_amount,
  status,
  provider,
  provider_session_id,
  created_at
FROM point_purchase_orders
ORDER BY created_at DESC
LIMIT 1;
```

**✅ Pass Criteria**:
- Order exists
- `status = 'PENDING'`
- `points = 500`
- `gel_amount = 5`
- `provider = 'BOG'`
- `provider_session_id` is set
- `user_id` matches logged-in user

---

### Test 5: BOG Payment Page

**Goal**: Verify redirection to BOG and payment form

**Steps**:
1. After redirect from Test 3
2. You should see BOG payment page

**Expected Elements**:
- ✅ BOG logo/branding
- ✅ Order details showing 5 GEL
- ✅ Card number input field
- ✅ Expiry date input
- ✅ CVV input
- ✅ Submit payment button

**Test Card Numbers** (if BOG provides test cards):
```
Card: 5555 5555 5555 5555
Expiry: 12/25
CVV: 123
```

**✅ Pass Criteria**: 
- Payment form loads correctly
- Amount shown is correct (5 GEL)
- Order ID is visible

---

### Test 6: Edge Function Logs (Create Session)

**Goal**: Check server-side logs for issues

**Steps**:
1. Go to: **Supabase Dashboard → Edge Functions → bog-create-session**
2. Click **Logs** tab
3. Find most recent invocation

**Expected Logs**:
```
[bog-create-session] Request received
[bog-create-session] User authenticated: <user-id>
[bog-create-session] Creating order: { user_id: '...', points: 500, gel_amount: 5 }
[bog-create-session] Order created: <order-id>
[bog-create-session] Creating BOG payment session: { amount: 5, orderId: '...' }
[bog-create-session] BOG session created: <session-id>
[bog-create-session] Success, redirectUrl: https://api.bog.ge/...
```

**❌ Error Patterns to Watch For**:
```
Error: Unauthorized → Check JWT token
Error: Invalid gel_amount → Check request payload
Error: Failed to create order → Check database RLS policies
Error: BOG API returned 401 → Check BOG_PUBLIC_KEY/SECRET_KEY
Error: BOG API returned 400 → Check API payload format
```

**✅ Pass Criteria**: 
- All logs appear in sequence
- No error messages
- BOG session ID returned

---

### Test 7: Successful Payment (Test Webhook)

**Goal**: Complete payment and verify webhook processing

**Steps**:
1. On BOG payment page, enter test card details
2. Submit payment
3. Wait for redirect back to SmartPick

**Expected Flow**:
1. ✅ Payment processes on BOG
2. ✅ BOG calls webhook: `https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-webhook`
3. ✅ Webhook updates order status to PAID
4. ✅ Webhook credits 500 points to user
5. ✅ Browser redirects to: `https://www.smartpick.ge/profile?purchase=success&orderId=<id>`
6. ✅ Success message shown
7. ✅ Points balance updated in UI

**After Completion, Check Database**:

```sql
-- 1. Check order status updated
SELECT id, status, provider_transaction_id, updated_at
FROM point_purchase_orders
WHERE id = '<order-id-from-url>';
-- Expected: status = 'PAID', provider_transaction_id is set

-- 2. Check user points increased
SELECT id, user_points
FROM users
WHERE id = '<your-user-id>';
-- Expected: user_points increased by 500

-- 3. Check points history recorded
SELECT 
  user_id,
  delta,
  reason,
  balance_after,
  metadata,
  created_at
FROM points_history
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: 
-- delta = 500
-- reason = 'POINT_PURCHASE'
-- metadata contains order_id, transaction_id
```

**✅ Pass Criteria**:
- Order status = PAID
- User points increased by 500
- points_history record created
- No duplicate point credits

---

### Test 8: Webhook Logs Verification

**Goal**: Verify webhook processed payment correctly

**Steps**:
1. Go to: **Supabase Dashboard → Edge Functions → bog-webhook**
2. Click **Logs** tab
3. Find webhook invocation (should be right after payment)

**Expected Logs**:
```
[bog-webhook] Webhook received
[bog-webhook] Webhook body: { "order_id": "...", "status": "SUCCEEDED", ... }
[bog-webhook] Parsed data: { orderId: '...', status: 'SUCCEEDED', transactionId: '...' }
[bog-webhook] Order found: { id: '...', currentStatus: 'PENDING', points: 500 }
[bog-webhook] Status mapped: { raw: 'SUCCEEDED', mapped: 'SUCCESS' }
[bog-webhook] Processing successful payment
[bog-webhook] Crediting points: { currentPoints: X, pointsToAdd: 500, newPoints: X+500 }
[bog-webhook] Payment processed successfully
```

**✅ Pass Criteria**:
- Webhook received BOG callback
- Order found and still PENDING
- Status mapped correctly
- Points credited successfully
- No errors

---

### Test 9: Failed Payment Handling

**Goal**: Test payment failure/cancellation

**Steps**:
1. Start new payment (500 points)
2. On BOG page, click **Cancel** or use invalid card
3. Check order status

**Expected Behavior**:
- ✅ Redirect back to SmartPick
- ✅ Error message shown
- ✅ No points credited
- ✅ Order status = FAILED or CANCELLED

**Database Check**:
```sql
SELECT id, status, points
FROM point_purchase_orders
WHERE id = '<cancelled-order-id>';
-- Expected: status = 'FAILED', points not credited
```

**✅ Pass Criteria**:
- Order status updated to FAILED
- No points credited to user
- User can try again

---

### Test 10: Idempotency Test

**Goal**: Ensure webhook doesn't credit points twice

**Steps**:
1. Find a successful order ID
2. Manually trigger webhook with same payload twice:

```bash
curl -X POST https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-webhook \
  -H "Content-Type: application/json" \
  -H "Auth-Key: your_auth_key" \
  -d '{
    "order_id": "<existing-paid-order-id>",
    "status": "SUCCEEDED",
    "transaction_id": "test-transaction"
  }'
```

3. Check logs and database

**Expected Logs**:
```
[bog-webhook] Order already processed with status: PAID
```

**✅ Pass Criteria**:
- Webhook returns "Already processed"
- Points NOT credited again
- Database unchanged

---

### Test 11: All Packages Test

**Goal**: Test different point packages

Test each package:

| Package | Points | GEL | Expected Result |
|---------|--------|-----|----------------|
| Starter | 500 | 5 | ✅ Order created |
| Popular | 1000 | 10 | ✅ Order created |
| Value | 2500 | 25 | ✅ Order created |
| Premium | 5000 | 50 | ✅ Order created |
| Custom | 1500 | 15 | ✅ Order created |

**Steps for Each**:
1. Click Buy Points
2. Select package
3. Complete payment
4. Verify correct amount charged
5. Verify correct points credited

**✅ Pass Criteria**: All packages work correctly

---

### Test 12: Custom Amount Test

**Goal**: Test custom point amounts

**Steps**:
1. Click Buy Points
2. Click "Custom Amount"
3. Enter: **15 GEL**
4. Verify shows: **1500 points**
5. Complete payment
6. Check 1500 points credited

**Edge Cases to Test**:
```
5 GEL → 500 points ✅
10.5 GEL → 1050 points ✅
99.99 GEL → 9999 points ✅
```

**✅ Pass Criteria**: 
- Conversion is accurate (1 GEL = 100 points)
- Custom amounts work
- Validation prevents invalid amounts

---

### Test 13: Concurrent Payments

**Goal**: Test multiple simultaneous orders

**Steps**:
1. User A starts payment (500 points)
2. User B starts payment (1000 points) 
3. Both complete
4. Check both processed correctly

**✅ Pass Criteria**:
- Both orders created with unique IDs
- Both webhooks processed
- Each user gets correct points
- No race conditions

---

### Test 14: Error Handling

**Goal**: Test various error scenarios

#### 14a. Unauthorized Access
```bash
# Call without auth token
curl -X POST https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-create-session \
  -H "Content-Type: application/json" \
  -d '{"gel_amount": 5, "points": 500}'
```
**Expected**: 401 Unauthorized

#### 14b. Invalid Amount
```javascript
// From browser console
const { data, error } = await supabase.functions.invoke('bog-create-session', {
  body: { gel_amount: -5, points: 500 }
});
```
**Expected**: 400 Bad Request

#### 14c. Invalid Points/GEL Ratio
```javascript
const { data, error } = await supabase.functions.invoke('bog-create-session', {
  body: { gel_amount: 5, points: 1000 } // Wrong ratio
});
```
**Expected**: 400 Bad Request "Invalid points to GEL ratio"

**✅ Pass Criteria**: All errors handled gracefully

---

## 📊 Final Verification Checklist

Before going live, verify ALL of these:

### Configuration
- [ ] All Supabase environment variables set correctly
- [ ] BOG portal configured with correct URLs
- [ ] Database migration applied successfully
- [ ] Edge Functions deployed (both)

### Functionality
- [ ] Can initiate payment from UI
- [ ] Redirect to BOG works
- [ ] Test payment completes successfully
- [ ] Webhook receives callback
- [ ] Order status updates to PAID
- [ ] Points credited to user correctly
- [ ] points_history record created
- [ ] Failed payment marks order as FAILED
- [ ] Idempotency prevents double-crediting

### Security
- [ ] User authentication required for payment creation
- [ ] Auth-Key verification in webhook (if configured)
- [ ] RLS policies prevent unauthorized access
- [ ] Sensitive data (SECRET_KEY) only in server environment

### User Experience
- [ ] Success message shows after payment
- [ ] Error message shows on failure
- [ ] Points balance updates in real-time
- [ ] Transaction appears in history
- [ ] Can make multiple purchases

---

## 🐛 Common Issues & Solutions

### Issue: "Unauthorized" on bog-create-session
**Cause**: Invalid or expired JWT token
**Solution**: 
```javascript
// Refresh session
await supabase.auth.refreshSession();
```

### Issue: "BOG_PUBLIC_KEY and BOG_SECRET_KEY are required"
**Cause**: Environment variables not set
**Solution**: Set in Supabase Dashboard → Edge Functions → Environment Variables

### Issue: Webhook never receives callback
**Cause**: BOG portal webhook URL incorrect
**Solution**: Update in BOG portal to: `https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-webhook`

### Issue: Points credited twice
**Cause**: Idempotency check not working
**Solution**: Check order status before crediting (code already has this)

### Issue: "Invalid points to GEL ratio"
**Cause**: Frontend calculation doesn't match (1 GEL = 100 points)
**Solution**: Fix calculation in BuyPointsModal

### Issue: BOG API returns 401
**Cause**: Invalid credentials
**Solution**: Verify BOG_PUBLIC_KEY=10002951 and BOG_SECRET_KEY=***REMOVED_BOG_SECRET***

### Issue: Order stuck in PENDING
**Cause**: Webhook failed or not called
**Solution**: 
1. Check BOG portal webhook configuration
2. Check webhook logs for errors
3. Manually verify payment status with BOG

---

## 📞 Support Resources

- **BOG Support**: Contact your BOG account manager
- **API Docs**: Bank of Georgia E-Commerce API documentation
- **Supabase Logs**: Dashboard → Edge Functions → Logs
- **Database**: Dashboard → Table Editor → point_purchase_orders

---

## ✅ Production Deployment

Once all tests pass:

1. **Update Production URLs**:
   ```env
   PUBLIC_BASE_URL=https://www.smartpick.ge
   BOG_REDIRECT_URI=https://www.smartpick.ge/profile?purchase=success
   BOG_CALLBACK_URL=https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/bog-webhook
   ```

2. **Switch to Production BOG Credentials** (if different from test):
   ```env
   BOG_PUBLIC_KEY=<production-merchant-id>
   BOG_SECRET_KEY=<production-secret-key>
   BOG_PAYMENTS_API_URL=https://api.bog.ge/payments/v1/ecommerce/orders
   ```

3. **Test with Real Money** (small amount):
   - Make 5 GEL purchase
   - Complete with real card
   - Verify points credited
   - Test refund if needed

4. **Monitor Logs** for first 24 hours:
   - Check for errors
   - Verify all payments processing
   - Watch for webhook failures

---

## 🎉 Success Criteria

Payment system is ready for production when:

- ✅ All 14 tests pass
- ✅ No errors in logs
- ✅ Test payment completed successfully
- ✅ Points credited correctly
- ✅ Webhook processing works
- ✅ Idempotency verified
- ✅ Error handling tested
- ✅ Production URLs configured
- ✅ Real money test successful

**Current Status**: 🚀 Ready for Testing

**Last Updated**: November 19, 2025
