# SmartPick Telegram Notification Messages

## 📋 Overview
All Telegram notification templates for partners and customers.

---

## 🏪 PARTNER NOTIFICATIONS

### 1. New Reservation Alert
**Function:** `notifyPartnerNewReservation()`  
**Preference Check:** `partner.notification_preferences.newOrder` && `telegram`

```
🎉 **ახალი შეკვეთა!**

**მომხმარებელი:** {customerName}
**პროდუქტი:** {offerTitle}
**რაოდენობა:** {quantity}
**აღება:** {pickupBy}

მომხმარებელი მალე ჩამოვა შეკვეთის ასაღებად.
```

---

### 2. Low Stock Warning
**Function:** `notifyPartnerLowStock()`  
**Preference Check:** `partner.notification_preferences.lowStock` && `telegram`  
**Trigger:** When `quantity <= 2`

```
⚠️ **დაბალი მარაგი!**

**პროდუქტი:** {offerTitle}
**დარჩენილი:** {quantityLeft}

თქვენი პროდუქტის მარაგი იწურება. ჩაამატეთ მეტი რაოდენობა!
```

---

### 3. Reservation Cancelled
**Function:** `notifyPartnerReservationCancelled()`  
**Preference Check:** `partner.notification_preferences.cancellation` && `telegram`

```
🚫 **რეზერვაცია გაუქმდა**

**მომხმარებელი:** {customerName}
**პროდუქტი:** {offerTitle}
**რაოდენობა:** {quantity}

მომხმარებელმა გააუქმა რეზერვაცია. რაოდენობა დაბრუნდა თქვენს შეთავაზებაში.
```

---

### 4. Pickup Complete
**Function:** `notifyPartnerPickupComplete()`  
**Preference:** Always sent (no preference check)

```
✅ **Pickup Complete!**

**Customer:** {customerName}
**Item:** {offerTitle}
**Quantity:** {quantity}

Order successfully completed. Great job! 👏
```

---

### 5. Customer No-Show
**Function:** `notifyPartnerNoShow()`  
**Preference:** Always sent (no preference check)

```
❌ **Customer No-Show**

**Customer:** {customerName}
**Item:** {offerTitle}
**Quantity:** {quantity}

The customer did not pick up their reservation. Penalty has been applied to their account.
```

---

## 👤 CUSTOMER NOTIFICATIONS

### 6. Reservation Confirmed
**Function:** `notifyCustomerReservationConfirmed()`

```
✅ **Reservation Confirmed!**

**Item:** {offerTitle}
**Quantity:** {quantity}

**Pickup from:**
{partnerName}
{partnerAddress}

**Pick up before:** {pickupBy}

See you there! 🎉
```

---

### 7. Pickup Reminder (15 minutes)
**Function:** `notifyCustomerPickupReminder()`  
**Trigger:** 15 minutes before expiration

```
⏰ **Pickup Reminder!**

**Hurry! Only 15 minutes left to pick up:**
{offerTitle}

**Location:** {partnerName}
{partnerAddress}

**Expires at:** {expiresAt}

Don't forget to pick up your order! 🏃‍♂️
```

---

### 8. New Offer Nearby
**Function:** `notifyCustomerNewOffer()`

```
🎁 **New Offer Nearby!**

**{offerTitle}**
📍 {partnerName} ({distance})

**Expires:** {expiresAt}

Open SmartPick app to reserve now! 🚀
```

---

## 🤖 BOT COMMANDS & RESPONSES

### /start (with connection link)

#### Success Message:
```
✅ **Success! Your SmartPick account is now connected.**

You'll receive notifications about:
🎉 New reservations
⏰ Pickup reminders
🎁 Special offers
✅ Order confirmations

You can disconnect anytime from your dashboard.

Type /status to check your connection.
Type /help for more information.
```

#### Link Expired (24h+):
```
⏰ **This connection link has expired.**

📱 Please get a new link from SmartPick:
1. Open SmartPick app
2. Go to your Dashboard
3. Click "Connect Telegram"

Links expire after 24 hours for security.
```

#### Invalid Link Format:
```
❌ **This connection link has expired.**

📱 Please get a new connection link:
1. Open SmartPick app
2. Go to your Dashboard
3. Click "Connect Telegram" button
4. Click the new link that opens

This ensures your account is connected securely.
```

---

### /start (without parameters)
```
👋 **Welcome to SmartPick!**

Smart choice every day - Get notifications about your orders and offers.

**To connect your account:**
1. Open SmartPick app (smartpick.ge)
2. Go to Settings/Profile
3. Click "Connect Telegram"
4. You'll be redirected back here

Need help? Visit smartpick.ge or type /help
```

---

### /status

#### Connected & Enabled:
```
✅ **Connected!**

Your SmartPick account is receiving notifications.
Username: @{username}
Status: Active 🟢

To disconnect, go to your SmartPick dashboard.
```

#### Connected but Disabled:
```
⚠️ **Connected but Disabled**

Your account is connected but notifications are turned off.
Enable them in your SmartPick dashboard settings.
```

#### Not Connected:
```
❌ **Not Connected**

You need to connect your SmartPick account first.

**How to connect:**
1. Visit smartpick.ge
2. Sign in to your account
3. Click "Connect Telegram" in Settings
4. Follow the instructions

Type /help for more information.
```

---

### /help
```
📱 **SmartPick Bot - Help**

**Available Commands:**
/start - Connect your account
/status - Check connection status
/help - Show this message

**For Partners:**
🎉 New reservation alerts
✅ Pickup confirmations
❌ No-show notifications
⚠️ Low stock warnings

**For Customers:**
⏰ 15-min pickup reminders
✅ Reservation confirmations
🎁 New offer alerts

**Need Support?**
Website: smartpick.ge
Email: support@smartpick.ge

**Privacy:**
We only send notifications related to your SmartPick account.
You can disconnect anytime from your dashboard.
```

---

### Unknown Command
```
I don't understand that command. Type /help to see available commands.
```

---

## ❌ ERROR MESSAGES

### Database Error (Connection Failed):
```
❌ Error connecting your account. Please try again or contact support.
```

### Invalid Connection Link:
```
❌ Invalid connection link. Please try again from the SmartPick app.
```

---

## 🔧 NOTIFICATION PREFERENCES

### Partner Notification Settings:
Located in `partners.notification_preferences` JSONB column:

```json
{
  "newOrder": true,      // 🎉 New reservations
  "lowStock": true,      // ⚠️ Low stock warnings
  "cancellation": true,  // 🚫 Cancellations
  "telegram": true,      // 📱 Telegram channel enabled
  "sms": false,          // 📧 SMS (coming soon)
  "email": false         // ✉️ Email (coming soon)
}
```

### Notification Logic:
- Each notification checks TWO preferences:
  1. **Alert Type**: `newOrder`, `lowStock`, or `cancellation`
  2. **Channel**: `telegram` must be `true`
- Both must be enabled for notification to send
- Some notifications (pickup complete, no-show) bypass preferences

---

## 📊 NOTIFICATION FLOW

```
Customer Action → Trigger Function → Check Preferences → Send to Edge Function → Telegram API
```

**Files Involved:**
1. `src/lib/telegram.ts` - Notification functions
2. `src/lib/api/reservations.ts` - Trigger calls
3. `supabase/functions/send-notification/index.ts` - Edge function
4. `supabase/functions/telegram-webhook/index.ts` - Bot commands

---

## 🌐 SUPPORTED LANGUAGES

**Georgian (ქართული):**
- Partner notifications: New order, low stock, cancellation

**English:**
- Customer notifications
- Bot commands and help
- Error messages

**Mixed:**
- Partner: Georgian preferred
- Customer: English default
- Bot interface: English only
