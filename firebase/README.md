# Firebase Push Notifications - 100% Firebase Architecture

This setup uses **Firebase Cloud Functions** and **Firestore** for push notifications, consuming **zero Supabase resources**.

## Architecture Overview

```
SmartPick App (React + Capacitor)
  ↓
Firebase Cloud Functions (send notifications)
  ↓
Firebase Cloud Messaging (FCM)
  ↓
User's Device (Android/iOS/Web)
```

**Data Flow:**
1. User logs in → FCM token generated
2. Token saved to **Firestore** collection `fcm_tokens`
3. App triggers Cloud Function (e.g., `notifyReservationConfirmed`)
4. Cloud Function reads token from Firestore
5. Cloud Function sends notification via FCM
6. User receives notification

## Files Created

### Frontend (React)
- `src/lib/firebase.ts` - Firebase initialization, FCM token management
- `src/lib/pushNotifications.ts` - Helper functions to call Cloud Functions
- `src/hooks/usePushNotifications.ts` - Updated to save tokens to Firestore

### Backend (Firebase Cloud Functions)
- `firebase/functions/src/index.ts` - Cloud Functions for sending notifications
- `firebase/functions/package.json` - Dependencies (firebase-admin, firebase-functions)
- `firebase/functions/tsconfig.json` - TypeScript configuration
- `firebase/firebase.json` - Firebase project configuration
- `firebase/.firebaserc` - Project alias (smartpick-app)

## Setup Instructions

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Service Account for Cloud Functions
1. Go to [Firebase Console](https://console.firebase.google.com/project/smartpick-app/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save the JSON file as `firebase/functions/service-account.json`
4. Add to `.gitignore`:
```bash
echo "firebase/functions/service-account.json" >> .gitignore
```

### 4. Build and Deploy Cloud Functions
```bash
cd firebase/functions
npm install
npm run build
firebase deploy --only functions
```

### 5. Add VAPID Key for Web Push (optional, for web browser notifications)
```bash
# Generate VAPID key
firebase login:ci

# Add to .env
echo "VITE_FIREBASE_VAPID_KEY=<your-vapid-key>" >> .env
```

### 6. Test Notifications
```typescript
import { notifyReservationConfirmed } from '@/lib/pushNotifications';

// Send test notification
await notifyReservationConfirmed(
  userId: 'user123',
  offerTitle: 'Khachapuri',
  partnerName: 'Cafe Tbilisi',
  pickupBy: '18:00'
);
```

## Available Cloud Functions

### `sendPushNotification`
Generic notification sender.
```typescript
sendPushNotification({
  userId: 'user123',
  title: 'Test Notification',
  body: 'This is a test',
  notificationData: { type: 'custom' }
});
```

### `notifyReservationConfirmed`
Notify customer about confirmed reservation.
```typescript
notifyReservationConfirmed({
  userId: 'user123',
  offerTitle: 'Khachapuri',
  partnerName: 'Cafe Tbilisi',
  pickupBy: '18:00'
});
```

### `notifyReservationExpiring`
Notify customer about expiring reservation.
```typescript
notifyReservationExpiring({
  userId: 'user123',
  offerTitle: 'Khachapuri',
  minutesLeft: 15
});
```

### `notifyPartnerNewReservation`
Notify partner about new reservation.
```typescript
notifyPartnerNewReservation({
  partnerId: 'partner456',
  customerName: 'John Doe',
  offerTitle: 'Khachapuri',
  quantity: 2
});
```

## Firestore Collection Structure

### `fcm_tokens` collection
```typescript
{
  userId: string;           // Document ID = userId
  token: string;            // FCM registration token
  platform: 'web' | 'android' | 'ios';
  notificationTypes: {
    nearby: boolean;
    favorite_partner: boolean;
    expiring: boolean;
  };
  updatedAt: Timestamp;
}
```

## Security Rules (Add to Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fcm_tokens/{userId} {
      // Users can only read/write their own token
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Pricing (Firebase Free Tier)

| Resource | Free Tier | Your Usage | Status |
|----------|-----------|------------|--------|
| **Cloud Functions** | 2M invocations/month | ~10K/month | ✅ FREE |
| **FCM Messages** | Unlimited | ~5K/month | ✅ FREE |
| **Firestore Reads** | 50K/day | ~1K/day | ✅ FREE |
| **Firestore Writes** | 20K/day | ~200/day | ✅ FREE |

**Result:** With ~1000 users sending ~10 notifications/day each:
- ~10K Cloud Function calls/month
- ~10K Firestore reads/month
- ~1K Firestore writes/month

**All well within free tier limits!**

## Advantages Over Supabase Edge Functions

1. **Zero Supabase Resource Usage**
   - No Edge Function invocations
   - No database queries for FCM tokens
   - Keep Supabase for business logic only

2. **FCM Native Integration**
   - Firebase Admin SDK handles FCM natively
   - Automatic token refresh
   - Better error handling

3. **Generous Free Tier**
   - 2M Cloud Function invocations vs 500K Edge Function invocations
   - Unlimited FCM messages
   - 50K Firestore reads/day

4. **Better Monitoring**
   - Firebase Console shows function logs
   - FCM delivery reports
   - Error tracking built-in

## Troubleshooting

### Cloud Functions not deploying
```bash
# Check Firebase project
firebase projects:list

# Check authentication
firebase login --reauth

# Deploy with verbose logging
firebase deploy --only functions --debug
```

### FCM token not saving
Check Firestore rules allow writes for authenticated users:
```bash
firebase firestore:rules:get
```

### Notifications not received
1. Check Android manifest has FCM permissions
2. Verify google-services.json in android/app/
3. Check Cloud Function logs: `firebase functions:log`
4. Test token in FCM Console: https://console.firebase.google.com/project/smartpick-app/notification

## Next Steps

1. ✅ Install Firebase CLI: `npm install -g firebase-tools`
2. ✅ Deploy Cloud Functions: `firebase deploy --only functions`
3. ⬜ Add Firestore security rules
4. ⬜ Test notifications on Android emulator
5. ⬜ Test notifications on real device
6. ⬜ Set up scheduled Cloud Functions for expiring reservations (optional)

## Migration from Supabase Edge Functions

If you had Supabase Edge Functions before:

1. **Keep existing data in Supabase** (partners, offers, reservations, users)
2. **Only move FCM tokens to Firestore** (from `push_subscriptions` table)
3. **Update notification triggers** to call Firebase Cloud Functions instead of Supabase Edge Functions
4. **Delete Supabase Edge Function** `send-push-notification` (optional, to avoid confusion)

Migration script:
```typescript
// Copy FCM tokens from Supabase to Firestore (one-time)
import { supabase } from './lib/supabase';
import { db } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

async function migrateTokens() {
  const { data } = await supabase.from('push_subscriptions').select('*');
  
  for (const sub of data) {
    await setDoc(doc(db, 'fcm_tokens', sub.user_id), {
      token: sub.fcm_token,
      userId: sub.user_id,
      platform: 'android',
      notificationTypes: sub.notification_types,
      updatedAt: new Date()
    });
  }
  
  console.log(`Migrated ${data.length} tokens to Firestore`);
}
```

## Resources

- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [FCM Testing Tools](https://firebase.google.com/docs/cloud-messaging/js/first-message)
