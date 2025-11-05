# SmartPoints Reward & Payment System - Setup Guide

## 📋 Overview

The SmartPoints system is a reward and payment mechanism for SmartPick where:
- Every new user gets **100 free SmartPoints**
- Each reservation costs **5 SmartPoints**
- Users can purchase **100 points for ₾1**
- All transactions are logged for audit and analytics

---

## 🗄️ Step 1: Database Setup

### Run the SQL Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250105_create_smartpoints_tables.sql`
4. Execute the migration

This will create:
- ✅ `user_points` table (stores current balances)
- ✅ `point_transactions` table (audit log)
- ✅ Automatic trigger to give new users 100 points
- ✅ Database functions for safe point operations
- ✅ Row Level Security (RLS) policies

### What the Migration Does:

```sql
-- Creates user_points table
CREATE TABLE user_points (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  balance INT DEFAULT 100 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Creates transaction log
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  change INT NOT NULL, -- +100 or -5
  reason TEXT NOT NULL, -- 'registration', 'reservation', 'purchase'
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-creates 100 points for new users
CREATE TRIGGER create_user_points_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION init_user_points();
```

---

## 🔒 Step 2: Security Setup

### Row Level Security (RLS)

The migration automatically enables RLS:

```sql
-- Users can view their own points
CREATE POLICY "Users can view their own points"
  ON user_points FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can modify points
CREATE POLICY "Service role can modify points"
  ON user_points FOR ALL
  USING (auth.role() = 'service_role');
```

### Required Permissions

Ensure your Supabase service role has execute permissions:
```sql
GRANT EXECUTE ON FUNCTION deduct_user_points TO service_role;
GRANT EXECUTE ON FUNCTION add_user_points TO service_role;
```

---

## 🎨 Step 3: Frontend Integration

### Components Created:

1. **SmartPointsWallet** (`src/components/SmartPointsWallet.tsx`)
   - Displays current balance
   - Shows recent transactions
   - "Buy Points" button
   - Usage:
   ```tsx
   import { SmartPointsWallet } from '@/components/SmartPointsWallet';

   <SmartPointsWallet userId={user.id} />
   // or compact mode:
   <SmartPointsWallet userId={user.id} compact={true} />
   ```

2. **BuyPointsModal** (`src/components/BuyPointsModal.tsx`)
   - Purchase 100 points for ₾1
   - Shows current and future balance
   - Integrated with Stripe (placeholder for now)

3. **Updated ReservationModal** (`src/components/ReservationModal.tsx`)
   - Checks SmartPoints before reservation
   - Deducts 5 points automatically
   - Shows insufficient funds warning
   - Opens buy modal if needed

### API Functions (`src/lib/smartpoints-api.ts`):

```typescript
// Get user's balance
const points = await getUserPoints(userId);

// Check if user has enough points
const { sufficient, balance } = await checkSufficientPoints(userId, 5);

// Deduct points (uses database function)
const result = await deductPoints(userId, 5, 'reservation', {
  offer_id: offerId
});

// Add points (after purchase)
const result = await addPoints(userId, 100, 'purchase', {
  payment_intent_id: 'pi_...'
});

// Get transaction history
const transactions = await getPointTransactions(userId, 10);
```

---

## 💳 Step 4: Payment Integration (Stripe)

### Current Status: Mock Payment

The system currently uses a **mock payment** that directly adds points without Stripe.

### To Integrate Real Stripe Payments:

1. Install Stripe:
   ```bash
   npm install @stripe/stripe-js
   ```

2. Update `src/components/BuyPointsModal.tsx`:
   ```typescript
   import { loadStripe } from '@stripe/stripe-js';

   const handlePurchase = async () => {
     const stripe = await loadStripe('pk_test_...');

     // Create checkout session on your backend
     const response = await fetch('/api/create-checkout-session', {
       method: 'POST',
       body: JSON.stringify({
         userId: userId,
         amount: 100,
         priceGEL: 1
       })
     });

     const session = await response.json();
     await stripe.redirectToCheckout({ sessionId: session.id });
   };
   ```

3. Create Supabase Edge Function for Stripe Webhook:
   ```typescript
   // supabase/functions/stripe-webhook/index.ts
   import { serve } from 'std/server'
   import Stripe from 'stripe'

   const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'))

   serve(async (req) => {
     const signature = req.headers.get('stripe-signature')
     const event = stripe.webhooks.constructEvent(
       await req.text(),
       signature,
       Deno.env.get('STRIPE_WEBHOOK_SECRET')
     )

     if (event.type === 'checkout.session.completed') {
       const session = event.data.object
       // Add points to user
       await addPoints(session.metadata.userId, 100, 'purchase')
     }

     return new Response(JSON.stringify({ received: true }))
   })
   ```

---

## 🧪 Step 5: Testing

### Test New User Registration:

1. Create a new user account
2. Check that they automatically have 100 points
3. Query:
   ```sql
   SELECT * FROM user_points WHERE user_id = 'user-uuid';
   SELECT * FROM point_transactions WHERE user_id = 'user-uuid';
   ```

### Test Reservation Flow:

1. Open an offer reservation modal
2. Verify balance shows correctly
3. Click "Reserve Now"
4. Check that 5 points were deducted
5. Verify toast shows: "✅ Reservation confirmed! 5 SmartPoints used"

### Test Purchase Flow:

1. Reduce balance to < 5 points (manually in DB or make 20 reservations)
2. Try to reserve
3. Verify "Insufficient Points" warning appears
4. Click "Buy SmartPoints"
5. Complete purchase
6. Verify balance increased by 100

### SQL Test Queries:

```sql
-- Check user's current balance
SELECT * FROM user_points WHERE user_id = 'YOUR_USER_ID';

-- View transaction history
SELECT * FROM point_transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- Manually adjust points (testing only)
SELECT add_user_points('USER_ID'::uuid, 100, 'admin_adjustment'::text, '{}'::jsonb);
SELECT deduct_user_points('USER_ID'::uuid, 5, 'test'::text, '{}'::jsonb);
```

---

## 🎯 Step 6: Add to Your Pages

### User Profile Page:

```tsx
import { SmartPointsWallet } from '@/components/SmartPointsWallet';

function UserProfile() {
  const { user } = useAuth();

  return (
    <div className="container">
      <h1>My Profile</h1>
      <SmartPointsWallet userId={user.id} />
    </div>
  );
}
```

### Dashboard/Header (Compact):

```tsx
<div className="flex items-center gap-4">
  <SmartPointsWallet userId={user.id} compact={true} />
  <UserMenu />
</div>
```

---

## 🔧 Troubleshooting

### Issue: New users don't get points

**Solution**: Check if the trigger is enabled:
```sql
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgname = 'create_user_points_trigger';
```

If not enabled:
```sql
ALTER TABLE users ENABLE TRIGGER create_user_points_trigger;
```

### Issue: "Function deduct_user_points does not exist"

**Solution**: Grant execute permissions:
```sql
GRANT EXECUTE ON FUNCTION deduct_user_points TO service_role;
GRANT EXECUTE ON FUNCTION add_user_points TO service_role;
```

### Issue: Points deducted but reservation failed

**Solution**: Wrap both operations in a try-catch and refund on failure:
```typescript
try {
  await deductPoints(...);
  await createReservation(...);
} catch (error) {
  // Refund points
  await addPoints(userId, 5, 'refund', { reason: 'reservation_failed' });
  throw error;
}
```

---

## 📊 Analytics Queries

### Total Points in System:
```sql
SELECT SUM(balance) as total_points FROM user_points;
```

### Most Active Users:
```sql
SELECT user_id, COUNT(*) as transaction_count
FROM point_transactions
GROUP BY user_id
ORDER BY transaction_count DESC
LIMIT 10;
```

### Revenue from Point Purchases:
```sql
SELECT
  COUNT(*) as purchases,
  SUM(change) as total_points_sold,
  SUM(change) / 100 as revenue_gel
FROM point_transactions
WHERE reason = 'purchase';
```

---

## 🚀 Future Enhancements

- **Referral Bonuses**: Give 25 points when a friend signs up
- **Streak Bonuses**: Extra points for consecutive days of activity
- **Promotional Events**: Double points weekends
- **Tiered Pricing**: Buy more, save more (500 points = ₾4)
- **Points Expiry**: Optional expiration after 6 months
- **Leaderboards**: Show top point earners

---

## ✅ Deployment Checklist

Before pushing to production:

- [ ] Run SQL migration on production Supabase
- [ ] Test new user registration triggers
- [ ] Test point deduction on reservation
- [ ] Test point purchase flow
- [ ] Configure Stripe production keys
- [ ] Set up Stripe webhook endpoint
- [ ] Test RLS policies
- [ ] Monitor error logs
- [ ] Set up alerts for low balances
- [ ] Document for support team

---

## 📞 Support

For issues or questions:
1. Check Supabase logs: Dashboard → Logs → Functions
2. Check browser console for API errors
3. Query `point_transactions` table for audit trail
4. Review this documentation

---

**Built with ❤️ for SmartPick**
