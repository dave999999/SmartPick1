# Firebase Push Notification Setup - COMPLETE ✅

## What Was Done

### 1. Architecture Shift: Supabase → Firebase
- **Before:** Supabase Edge Functions + PostgreSQL table
- **After:** Firebase Cloud Functions + Firestore collection
- **Result:** Zero Supabase resource usage for notifications

### 2. Files Created

#### Frontend Files
- ✅ `src/lib/firebase.ts` - Firebase SDK initialization
- ✅ `src/lib/pushNotifications.ts` - Updated to call Firebase Cloud Functions
- ✅ `src/hooks/usePushNotifications.ts` - Updated to save tokens to Firestore

#### Backend Files
- ✅ `firebase/functions/src/index.ts` - 4 Cloud Functions for notifications
- ✅ `firebase/functions/package.json` - Node dependencies
- ✅ `firebase/functions/tsconfig.json` - TypeScript config
- ✅ `firebase/.firebaserc` - Project alias (smartpick-app)
- ✅ `firebase/firebase.json` - Firebase configuration
- ✅ `firebase/README.md` - Complete documentation

### 3. Dependencies Installed
- ✅ `firebase@12.7.0` - Firebase Web SDK (frontend)
- ✅ `firebase-admin@12.0.0` - Firebase Admin SDK (Cloud Functions)
- ✅ `firebase-functions@5.0.0` - Cloud Functions SDK

### 4. Build Status
- ✅ TypeScript compilation successful
- ✅ Cloud Functions compiled to `firebase/functions/lib/`
- ⬜ **NOT DEPLOYED YET** - waiting for you to deploy

## Available Cloud Functions

### 1. `sendPushNotification` (Generic)
Send any notification to any user.

```typescript
import { sendPushNotification } from '@/lib/pushNotifications';

await sendPushNotification({
  userId: 'user123',
  title: 'Test',
  body: 'Hello!',
  notificationData: { type: 'custom' }
});
```

### 2. `notifyReservationConfirmed`
Notify customer when reservation is confirmed.

```typescript
import { notifyReservationConfirmed } from '@/lib/pushNotifications';

await notifyReservationConfirmed(
  'user123',
  'Khachapuri',
  'Cafe Tbilisi',
  '18:00'
);
```

### 3. `notifyReservationExpiring`
Notify customer when reservation is about to expire.

```typescript
import { notifyReservationExpiring } from '@/lib/pushNotifications';

await notifyReservationExpiring(
  'user123',
  'Khachapuri',
  15 // minutes left
);
```

### 4. `notifyPartnerNewReservation`
Notify partner when they receive a new reservation.

```typescript
import { notifyPartnerNewReservation } from '@/lib/pushNotifications';

await notifyPartnerNewReservation(
  'partner456',
  'John Doe',
  'Khachapuri',
  2 // quantity
);
```

## How It Works

### Step 1: User Opens App
```
App loads → Firebase SDK initializes → FCM token generated
```

### Step 2: Token Saved to Firestore
```typescript
// Happens automatically in usePushNotifications hook
{
  userId: "user123",
  token: "fZxK9x...",
  platform: "android",
  notificationTypes: {
    nearby: true,
    favorite_partner: true,
    expiring: true
  },
  updatedAt: Timestamp
}
```

### Step 3: Trigger Notification
```typescript
// Your app code (e.g., when reservation created)
await notifyReservationConfirmed(
  userId,
  offerTitle,
  partnerName,
  pickupBy
);
```

### Step 4: Cloud Function Executes
```typescript
// Firebase Cloud Function runs
1. Receives request with userId, title, body
2. Queries Firestore: fcm_tokens/{userId}
3. Gets FCM token
4. Sends via Firebase Admin SDK
5. Returns success/failure
```

### Step 5: User Receives Notification
```
FCM → Device → Notification appears
```

## Next Steps to Deploy

### 1. Login to Firebase (if not already logged in)
```bash
firebase login
```

### 2. Deploy Cloud Functions
```bash
cd firebase
firebase deploy --only functions
```

**Expected output:**
```
✔  Deploy complete!

Functions:
  sendPushNotification(us-central1)
  notifyReservationConfirmed(us-central1)
  notifyReservationExpiring(us-central1)
  notifyPartnerNewReservation(us-central1)
```

### 3. Set Firestore Security Rules
Go to [Firebase Console → Firestore → Rules](https://console.firebase.google.com/project/smartpick-app/firestore/rules)

Paste this:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fcm_tokens/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Test on Android Emulator
1. Rebuild Android app: `cd android && ./gradlew assembleDebug`
2. Install on emulator: `adb install app/build/outputs/apk/debug/app-debug.apk`
3. Open app → FCM token should save to Firestore
4. Trigger notification → Check if received

### 5. Monitor in Firebase Console
- **Functions Logs:** https://console.firebase.google.com/project/smartpick-app/functions
- **Firestore Data:** https://console.firebase.google.com/project/smartpick-app/firestore
- **FCM Delivery:** https://console.firebase.google.com/project/smartpick-app/notification

## Cost Comparison

### Option A (Supabase) - REJECTED ❌
- Edge Function: 500K free/month → ~10K used = 2% of quota
- Database: 500MB free → ~1MB used = 0.2% of quota
- **Issue:** Consumes Supabase resources you want to preserve

### Option B (Firebase) - CHOSEN ✅
- Cloud Functions: 2M free/month → ~10K used = 0.5% of quota
- Firestore: 50K reads/day → ~1K used = 2% of quota
- FCM: **Unlimited free messages**
- **Result:** Zero Supabase consumption!

## Firestore Structure

```
fcm_tokens (collection)
  ├── user123 (document)
  │   ├── token: "fZxK9x..."
  │   ├── platform: "android"
  │   ├── userId: "user123"
  │   ├── notificationTypes: {...}
  │   └── updatedAt: Timestamp
  │
  ├── user456 (document)
  │   └── ...
  │
  └── partner789 (document)
      └── ...
```

## Integration Example

### When User Makes Reservation
```typescript
// In your reservation creation function
import { notifyPartnerNewReservation, notifyReservationConfirmed } from '@/lib/pushNotifications';

async function createReservation(offerId: string, quantity: number) {
  // 1. Create reservation in Supabase
  const { data: reservation } = await supabase
    .from('reservations')
    .insert({ ... })
    .select()
    .single();

  // 2. Get partner and offer details
  const { data: offer } = await supabase
    .from('offers')
    .select('title, partner:partners(name, user_id)')
    .eq('id', offerId)
    .single();

  // 3. Send notifications via Firebase
  await Promise.all([
    // Notify customer
    notifyReservationConfirmed(
      reservation.user_id,
      offer.title,
      offer.partner.name,
      reservation.pickup_by
    ),
    
    // Notify partner
    notifyPartnerNewReservation(
      offer.partner.user_id,
      currentUser.name,
      offer.title,
      quantity
    )
  ]);

  return reservation;
}
```

## Troubleshooting

### "User must be authenticated" error
**Cause:** Cloud Functions require authenticated user.
**Fix:** Make sure user is logged in before calling functions.

### "No FCM token found for user" warning
**Cause:** User hasn't granted notification permission yet.
**Fix:** Call `requestPermission()` from `usePushNotifications` hook.

### Notifications not received on Android
**Checklist:**
- ✅ `google-services.json` in `android/app/`
- ✅ Firebase BoM in `android/app/build.gradle`
- ✅ FCM plugin in `android/build.gradle`
- ✅ Notification permission granted
- ✅ Token saved to Firestore (check Firebase Console)

### Deployment fails
```bash
# Check if logged in
firebase login --reauth

# Check project
firebase projects:list

# Deploy with debug
firebase deploy --only functions --debug
```

## Summary

**What you have now:**
- ✅ Firebase SDK installed and configured
- ✅ 4 Cloud Functions ready to deploy
- ✅ Firestore integration for FCM tokens
- ✅ Frontend updated to use Firebase
- ✅ Zero Supabase resource consumption for notifications

**What you need to do:**
1. Deploy Cloud Functions: `firebase deploy --only functions`
2. Set Firestore security rules
3. Test on Android emulator
4. Integrate into your reservation flow

**Result:**
- Unlimited free push notifications via FCM
- All notification infrastructure on Firebase free tier
- Supabase resources preserved for business logic only

---

Ready to deploy? Run:
```bash
cd firebase
firebase deploy --only functions
```
