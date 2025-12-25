# 🔥 Firebase + Capacitor Setup Guide

## Step 1: Install Dependencies

```bash
npm install @capacitor/core @capacitor/cli @capacitor/push-notifications
npm install firebase-admin
npx cap init
```

## Step 2: Firebase Console Setup

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Create Project**:
   - Click "Add project"
   - Name: "SmartPick"
   - Disable Google Analytics (optional)
   - Click "Create project"

## Step 3: Add Android App

1. In Firebase Console → Project Settings → Add app → Android
2. **Android package name**: `ge.smartpick.app`
3. **Download `google-services.json`**
4. **Place it here**: `android/app/google-services.json`
5. Click "Continue" through remaining steps

## Step 4: Add iOS App

1. In Firebase Console → Project Settings → Add app → iOS
2. **iOS bundle ID**: `ge.smartpick.app`
3. **Download `GoogleService-Info.plist`**
4. **Place it here**: `ios/App/App/GoogleService-Info.plist`
5. Click "Continue" through remaining steps

## Step 5: Get Service Account Key

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. **Download JSON file** (keep it secure!)
4. **Add to Supabase Secrets**:
   ```bash
   # In Supabase Dashboard → Project Settings → Edge Functions → Secrets
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----
   ```

## Step 6: Add Platforms

```bash
# Add Android
npx cap add android

# Add iOS (Mac only)
npx cap add ios

# Sync after each change
npx cap sync
```

## Step 7: Build for Mobile

```bash
# Build web assets
npm run build

# Copy to native platforms
npx cap copy

# Open in Android Studio
npx cap open android

# Open in Xcode (Mac only)
npx cap open ios
```

## Step 8: Database Migration

Run this SQL in your Supabase dashboard:

```sql
-- Add FCM token column to push_subscriptions
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token 
ON push_subscriptions(fcm_token);
```

## Step 9: Test Notifications

1. Install app on Android/iOS device
2. Grant notification permission
3. Create a test reservation
4. Partner should receive push notification! 🎉

## Troubleshooting

### Android: No notifications
- Check `google-services.json` is in `android/app/`
- Verify package name matches Firebase: `ge.smartpick.app`
- Run: `npx cap sync android`

### iOS: No notifications
- Check `GoogleService-Info.plist` is in `ios/App/App/`
- Verify bundle ID matches Firebase: `ge.smartpick.app`
- Enable Push Notifications capability in Xcode
- Run: `npx cap sync ios`

### Edge Function errors
- Verify Firebase secrets are set in Supabase
- Check private key format (includes \n for newlines)
- Test with: `curl -X POST your-edge-function-url`

## Production Checklist

- [ ] Firebase project created
- [ ] `google-services.json` added to Android
- [ ] `GoogleService-Info.plist` added to iOS
- [ ] Firebase secrets added to Supabase
- [ ] Database migration run
- [ ] Edge Function deployed
- [ ] Tested on real devices
- [ ] APNs certificate uploaded (iOS only)

## Next Steps

Your app now supports:
✅ Web push notifications (existing)
✅ Android push notifications (FCM)
✅ iOS push notifications (APNs via FCM)
✅ Telegram fallback

**Ready to publish to App Stores!** 🚀
