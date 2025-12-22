# 📱 SmartPick Telegram Notifications - Complete Guide

## 🏪 PARTNER NOTIFICATIONS

---

### 1️⃣ New Order Alert (🎉)

**Full Message Text:**
```
🎉 ახალი შეკვეთა!

მომხმარებელი: [Customer Name]
პროდუქტი: [Offer Title]
რაოდენობა: [Quantity]
აღება: [Pickup Deadline]

მომხმარებელი მალე ჩამოვა შეკვეთის ასაღებად.
```

**English Translation:**
```
🎉 New Order!

Customer: [Customer Name]
Product: [Offer Title]
Quantity: [Quantity]
Pickup By: [Pickup Deadline]

The customer will come soon to pick up the order.
```

**How It Triggers:**

1. **Function Called:** `notifyPartnerNewReservation()`
2. **Triggered When:** Customer successfully creates a reservation
3. **Code Location:** `src/lib/api/reservations.ts` - `createReservation()` function
4. **Trigger Code:**
```typescript
// After successful reservation creation
await notifyPartnerNewReservation(
  partner.user_id,           // Partner's user_id
  customerName,              // From users table
  offer.title,               // Offer title
  quantity,                  // Reservation quantity
  pickupDeadline             // Format: "Dec 22, 2025 - 5:00 PM"
);
```

5. **Preference Check:**
   - `partners.notification_preferences.newOrder` must be `true`
   - `partners.notification_preferences.telegram` must be `true`
   - If either is false, notification is NOT sent

6. **Required Data:**
   - Partner's `user_id` (from partners table)
   - Customer's full name (from auth.users + profiles)
   - Offer title
   - Quantity reserved
   - Pickup deadline timestamp

---

### 2️⃣ Low Stock Warning (⚠️)

**Full Message Text:**
```
⚠️ დაბალი მარაგი!

პროდუქტი: [Offer Title]
დარჩენილი: [Quantity Left]

თქვენი პროდუქტის მარაგი იწურება. ჩაამატეთ მეტი რაოდენობა!
```

**English Translation:**
```
⚠️ Low Stock!

Product: [Offer Title]
Remaining: [Quantity Left]

Your product stock is running low. Add more quantity!
```

**How It Triggers:**

1. **Function Called:** `notifyPartnerLowStock()`
2. **Triggered When:** After reservation creation, remaining quantity ≤ 2
3. **Code Location:** `src/lib/api/reservations.ts` - `createReservation()` function
4. **Trigger Code:**
```typescript
// After creating reservation, check remaining quantity
const remainingQuantity = offer.quantity - quantity;

if (remainingQuantity <= 2 && remainingQuantity > 0) {
  await notifyPartnerLowStock(
    partner.user_id,
    offer.title,
    remainingQuantity
  );
}
```

5. **Trigger Conditions:**
   - `remainingQuantity <= 2` (2 or fewer items left)
   - `remainingQuantity > 0` (not completely sold out)
   - Happens AFTER reservation is created

6. **Preference Check:**
   - `partners.notification_preferences.lowStock` must be `true`
   - `partners.notification_preferences.telegram` must be `true`
   - If either is false, notification is NOT sent

7. **Example Scenarios:**
   - Offer has 10 items → Customer reserves 8 → 2 left → ⚠️ Notification sent
   - Offer has 5 items → Customer reserves 4 → 1 left → ⚠️ Notification sent
   - Offer has 3 items → Customer reserves 1 → 2 left → ⚠️ Notification sent
   - Offer has 2 items → Customer reserves 2 → 0 left → ❌ No notification (sold out)

---

### 3️⃣ Cancellation Notice (🚫)

**Full Message Text:**
```
🚫 რეზერვაცია გაუქმდა

მომხმარებელი: [Customer Name]
პროდუქტი: [Offer Title]
რაოდენობა: [Quantity]

მომხმარებელმა გააუქმა რეზერვაცია. რაოდენობა დაბრუნდა თქვენს შეთავაზებაში.
```

**English Translation:**
```
🚫 Reservation Cancelled

Customer: [Customer Name]
Product: [Offer Title]
Quantity: [Quantity]

Customer cancelled the reservation. Quantity has been returned to your offer.
```

**How It Triggers:**

1. **Function Called:** `notifyPartnerReservationCancelled()`
2. **Triggered When:** Customer cancels their active reservation
3. **Code Location:** `src/lib/api/reservations.ts` - `cancelReservation()` function
4. **Trigger Code:**
```typescript
// After successful cancellation and quantity restoration
await notifyPartnerReservationCancelled(
  partner.user_id,
  customerName,
  offer.title,
  reservation.quantity
);
```

5. **Trigger Conditions:**
   - Reservation status changes to 'cancelled'
   - Quantity is restored to offer
   - Customer is the one who cancelled (not auto-expired)

6. **Preference Check:**
   - `partners.notification_preferences.cancellation` must be `true`
   - `partners.notification_preferences.telegram` must be `true`
   - If either is false, notification is NOT sent

7. **NOT Sent When:**
   - Reservation auto-expires (timeout)
   - Partner cancels the reservation
   - System marks as no-show

---

### 4️⃣ Pickup Complete (✅)

**Full Message Text:**
```
✅ Pickup Complete!

Customer: [Customer Name]
Item: [Offer Title]
Quantity: [Quantity]

Order successfully completed. Great job! 👏
```

**How It Triggers:**

1. **Function Called:** `notifyPartnerPickupComplete()`
2. **Triggered When:** Partner marks reservation as "picked up" via QR scan
3. **Code Location:** `supabase/functions/mark-pickup/index.ts`
4. **Trigger Code:**
```typescript
// After successful pickup confirmation
await notifyPartnerPickupComplete(
  partnerId,
  customerName,
  offerTitle,
  quantity
);
```

5. **Trigger Process:**
   - Customer shows QR code
   - Partner scans QR code in dashboard
   - Reservation status → 'picked_up'
   - Points transferred to customer
   - Notification sent

6. **Preference Check:**
   - ⚠️ **NO PREFERENCE CHECK** - Always sent!
   - This is a critical business confirmation

7. **Required Actions:**
   - Partner must scan QR code
   - OR partner clicks "Mark as Picked Up" button
   - Cannot be undone once confirmed

---

### 5️⃣ Customer No-Show (❌)

**Full Message Text:**
```
❌ Customer No-Show

Customer: [Customer Name]
Item: [Offer Title]
Quantity: [Quantity]

The customer did not pick up their reservation. Penalty has been applied to their account.
```

**How It Triggers:**

1. **Function Called:** `notifyPartnerNoShow()`
2. **Triggered When:** Pickup deadline passes and customer didn't pick up
3. **Code Location:** `supabase/functions/detect-missed-pickups/index.ts` (scheduled job)
4. **Trigger Code:**
```typescript
// Runs every hour, checks expired reservations
const expiredReservations = await getExpiredReservations();

for (const reservation of expiredReservations) {
  // Mark as no-show
  await markAsNoShow(reservation.id);
  
  // Notify partner
  await notifyPartnerNoShow(
    reservation.partner_id,
    reservation.customer_name,
    reservation.offer_title,
    reservation.quantity
  );
}
```

5. **Trigger Conditions:**
   - Current time > `reservation.pickup_by`
   - Status is still 'active' (not picked up, not cancelled)
   - Customer didn't cancel before deadline

6. **Preference Check:**
   - ⚠️ **NO PREFERENCE CHECK** - Always sent!
   - This is a critical business notification

7. **Automatic Process:**
   - Edge function runs every hour
   - Checks all active reservations
   - If deadline passed → mark as no-show
   - Quantity restored to offer
   - Penalty applied to customer (points deduction)
   - Notification sent

8. **Penalty Applied:**
   - Customer loses cancellation points
   - Affects their reliability score
   - May trigger cooldown period

---

## 👤 CUSTOMER NOTIFICATIONS

---

### 6️⃣ Reservation Confirmed (✅)

**Full Message Text:**
```
✅ Reservation Confirmed!

Item: [Offer Title]
Quantity: [Quantity]

Pickup from:
[Partner Business Name]
[Partner Address]

Pick up before: [Deadline]

See you there! 🎉
```

**How It Triggers:**

1. **Function Called:** `notifyCustomerReservationConfirmed()`
2. **Triggered When:** Customer successfully creates a reservation
3. **Code Location:** `src/lib/api/reservations.ts` - `createReservation()` function
4. **Trigger Code:**
```typescript
// Right after partner notification
await notifyCustomerReservationConfirmed(
  customerId,                // Customer's user_id
  offer.title,
  quantity,
  partner.business_name,
  partner.address,
  pickupDeadline
);
```

5. **Trigger Conditions:**
   - Reservation created successfully
   - Payment/points deducted
   - Offer quantity reduced
   - Status set to 'active'

6. **Preference Check:**
   - Checks `notification_preferences.enable_telegram` for customer
   - If false or no Telegram connected → NOT sent

7. **Contains:**
   - What they reserved
   - How many
   - Where to pick up (full address)
   - When to pick up by
   - Confirmation that reservation is active

---

### 7️⃣ 15-Minute Pickup Reminder (⏰)

**Full Message Text:**
```
⏰ Pickup Reminder!

Hurry! Only 15 minutes left to pick up:
[Offer Title]

Location: [Partner Name]
[Partner Address]

Expires at: [Exact Time]

Don't forget to pick up your order! 🏃‍♂️
```

**How It Triggers:**

1. **Function Called:** `notifyCustomerPickupReminder()`
2. **Triggered When:** 15 minutes before pickup deadline
3. **Code Location:** `supabase/functions/send-pickup-reminders/index.ts` (scheduled job)
4. **Trigger Code:**
```typescript
// Runs every 5 minutes, finds reservations expiring soon
const upcomingDeadlines = await getReservationsExpiringSoon();

for (const reservation of upcomingDeadlines) {
  const timeLeft = reservation.pickup_by - now;
  
  if (timeLeft <= 15 * 60 * 1000 && timeLeft > 10 * 60 * 1000) {
    await notifyCustomerPickupReminder(
      reservation.customer_id,
      reservation.offer_title,
      reservation.partner_name,
      reservation.partner_address,
      formatTime(reservation.pickup_by)
    );
  }
}
```

5. **Trigger Timing:**
   - Edge function runs **every 5 minutes**
   - Checks reservations with deadline in 10-15 minutes
   - Sends notification once per reservation
   - Prevents duplicate reminders

6. **Trigger Conditions:**
   - Reservation status = 'active'
   - Time until deadline between 10-15 minutes
   - Reminder not already sent (tracked in DB)

7. **Preference Check:**
   - Checks `notification_preferences.enable_telegram`
   - If disabled → NOT sent

8. **Edge Function Schedule:**
```sql
-- Runs as Supabase cron job
SELECT cron.schedule(
  'send-pickup-reminders',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT send_pickup_reminders()'
);
```

---

### 8️⃣ New Offer Nearby (🎁)

**Full Message Text:**
```
🎁 New Offer Nearby!

[Offer Title]
📍 [Partner Name] ([Distance])

Expires: [Expiration Time]

Open SmartPick app to reserve now! 🚀
```

**How It Triggers:**

1. **Function Called:** `notifyCustomerNewOffer()`
2. **Triggered When:** Partner creates a new offer near customer's location
3. **Code Location:** `src/lib/api/offers.ts` - `createOffer()` function (when implemented)
4. **Trigger Code:**
```typescript
// After partner creates new offer
const nearbyCustomers = await findCustomersNearby(
  partner.latitude,
  partner.longitude,
  5 // 5km radius
);

for (const customer of nearbyCustomers) {
  await notifyCustomerNewOffer(
    customer.user_id,
    offer.title,
    partner.business_name,
    calculateDistance(customer, partner),
    formatTime(offer.expires_at)
  );
}
```

5. **Trigger Conditions:**
   - Partner creates new offer
   - Offer is active and available
   - Customer is within 5km radius
   - Customer has location permissions enabled

6. **Preference Check:**
   - Checks `notification_preferences.enable_telegram`
   - Checks customer's notification settings for "new offers"
   - Respects "Do Not Disturb" hours (if implemented)

7. **Location Logic:**
   - Uses Haversine formula for distance calculation
   - Filters customers by radius (default 5km)
   - Sorts by distance (closest first)
   - Rate-limited to prevent spam (max 1 per hour per customer)

8. **Currently:**
   - ⚠️ **NOT YET IMPLEMENTED** in production
   - Function exists but trigger not active
   - Planned for future release

---

## 🔧 TESTING NOTIFICATIONS

### Test Partner Notifications:

1. **New Order Alert:**
   ```sql
   -- Create a test reservation
   SELECT create_test_reservation(
     'partner_user_id',
     'offer_id',
     'customer_id',
     1  -- quantity
   );
   ```

2. **Low Stock Warning:**
   ```sql
   -- Update offer to have 2 items, then reserve 1
   UPDATE offers SET quantity = 2 WHERE id = 'offer_id';
   -- Then create reservation for 1 item
   ```

3. **Cancellation Notice:**
   ```sql
   -- Cancel a reservation
   SELECT cancel_reservation('reservation_id', 'customer_id');
   ```

4. **Test Manually via SQL:**
   ```sql
   -- Send test notification directly
   SELECT send_notification(
     'user_id',
     '🎉 Test notification text here',
     'partner'  -- or 'customer'
   );
   ```

---

## 📊 NOTIFICATION FLOW DIAGRAM

```
┌─────────────────┐
│  User Action    │
│  (Reserve/Cancel)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API Function    │
│ (reservations.ts)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Prefs     │
│ (DB Query)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Enabled?│
    └────┬────┘
         │ Yes
         ▼
┌─────────────────┐
│ Notify Function │
│ (telegram.ts)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function   │
│ send-notification│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Telegram API    │
│ (Bot sends msg) │
└─────────────────┘
```

---

## 🎯 PREFERENCE PRIORITY

**Which notifications respect preferences:**
- ✅ New Order Alert - respects preferences
- ✅ Low Stock Warning - respects preferences  
- ✅ Cancellation Notice - respects preferences
- ❌ Pickup Complete - **ALWAYS SENT**
- ❌ Customer No-Show - **ALWAYS SENT**

**Why some bypass preferences:**
- Critical business confirmations
- Legal/financial implications
- Cannot be missed
- Rare occurrence (not spam)

---

## 🚀 QUICK REFERENCE

| Notification | Georgian? | Preference | Auto-Trigger | Manual Trigger |
|-------------|-----------|------------|--------------|----------------|
| New Order | ✅ | newOrder + telegram | createReservation() | ❌ |
| Low Stock | ✅ | lowStock + telegram | quantity ≤ 2 | ❌ |
| Cancellation | ✅ | cancellation + telegram | cancelReservation() | ❌ |
| Pickup Complete | ❌ | None (always) | ❌ | QR Scan |
| No-Show | ❌ | None (always) | Cron job (hourly) | ❌ |
| Reservation Confirmed | ❌ | enable_telegram | createReservation() | ❌ |
| Pickup Reminder | ❌ | enable_telegram | Cron job (5 min) | ❌ |
| New Offer | ❌ | enable_telegram | createOffer() | Not implemented |

---

## ⚙️ CONFIGURATION

**Partner Preferences:**
```sql
SELECT notification_preferences FROM partners WHERE user_id = 'xxx';

-- Returns:
{
  "newOrder": true,
  "lowStock": true,
  "cancellation": true,
  "telegram": true,
  "sms": false,
  "email": false
}
```

**Customer Preferences:**
```sql
SELECT enable_telegram FROM notification_preferences WHERE user_id = 'xxx';

-- Returns: true or false
```

**Enable/Disable:**
```sql
-- Partner
UPDATE partners 
SET notification_preferences = jsonb_set(
  notification_preferences, 
  '{telegram}', 
  'false'
)
WHERE user_id = 'xxx';

-- Customer
UPDATE notification_preferences 
SET enable_telegram = false 
WHERE user_id = 'xxx';
```
