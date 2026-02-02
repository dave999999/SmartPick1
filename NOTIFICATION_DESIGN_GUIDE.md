# 🎨 Notification Design Customization Guide

## What I Changed

✅ **Better Emoji**: Changed 🔔 → 🎉 (more exciting!)  
✅ **Enhanced Text**: Added "• Tap to view details" for better CTA  
✅ **Brand Color**: Added SmartPick teal (#10b981) to notification  
✅ **Custom Icon**: Configured for custom notification icon  

---

## 3 Ways to Customize Further

### **1. Change Notification Icon (Recommended)**

Your notification currently shows a generic icon. Create a custom one:

#### Step 1: Create Icon Files
Place these files in `android/app/src/main/res/`:

```
drawable-mdpi/ic_notification.png (24x24px)
drawable-hdpi/ic_notification.png (36x36px)
drawable-xhdpi/ic_notification.png (48x48px)
drawable-xxhdpi/ic_notification.png (72x72px)
drawable-xxxhdpi/ic_notification.png (96x96px)
```

**Design Requirements:**
- White icon on transparent background
- Simple silhouette (Android will tint it)
- Use your logo or a food/shopping bag icon

**Quick Generate:** Use https://romannurik.github.io/AndroidAssetStudio/icons-notification.html

---

### **2. Add Large Image/Photo to Notification** 

For offer images or partner photos:

```typescript
// In firebase/functions/src/index.ts
android: {
  notification: {
    imageUrl: 'https://smartpick.ge/images/offers/faxlava.jpg', // 🖼️ Add this
    icon: 'ic_notification',
    color: '#10b981'
  }
}
```

---

### **3. Create Rich Notification with Actions**

Add buttons to notifications:

```typescript
const message = {
  notification: {
    title: '🎉 New Reservation!',
    body: `${customerName} reserved ${quantity}x ${offerTitle}`
  },
  android: {
    notification: {
      channelId: 'reservations',
      icon: 'ic_notification',
      color: '#10b981',
      // ✨ Add action buttons
      actions: [
        {
          title: '✅ Confirm',
          icon: 'ic_check',
          pressAction: { id: 'confirm' }
        },
        {
          title: '👀 View',
          icon: 'ic_view', 
          pressAction: { id: 'view' }
        }
      ]
    }
  }
};
```

---

## Current Notification Channels

You have 4 channels (defined in MainActivity.java):

| Channel | Name | Priority | Use Case |
|---------|------|----------|----------|
| `fcm_default_channel` | SmartPick Notifications | High | General |
| `reservations` | Reservations | High | **Your current notification** |
| `offers` | New Offers | Default | Partner offers |
| `achievements` | Achievements & Rewards | Default | Gamification |

---

## Emojis That Work Well

| Type | Emoji | When to Use |
|------|-------|-------------|
| Success | ✅ ✨ 🎉 | Confirmed reservations |
| Alert | 🔔 ⚡ 🚨 | New reservation (partner) |
| Food | 🍕 🍔 🥘 | Food offers |
| Reward | 🎁 💰 ⭐ | Points, achievements |
| Time | ⏰ ⏳ 🕐 | Expiring offers |

---

## Test Your Changes

### Deploy Functions:
```bash
cd firebase
npx firebase deploy --only functions:notifyPartnerNewReservation
```

### Test from Code:
```typescript
// In your app
await fetch('https://europe-west1-YOUR-PROJECT.cloudfunctions.net/notifyPartnerNewReservation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    partnerId: 'your-partner-id',
    customerName: 'John Doe',
    offerTitle: 'Delicious Faxlava',
    quantity: 2
  })
});
```

---

## Android Notification Styles

You can also use different notification styles:

### BigTextStyle (Long Messages)
```typescript
android: {
  notification: {
    body: 'Short version',
    style: {
      type: 'BigTextStyle',
      text: 'Much longer text that shows when notification is expanded...'
    }
  }
}
```

### InboxStyle (Multiple Lines)
```typescript
style: {
  type: 'InboxStyle',
  lines: [
    '• Customer: John Doe',
    '• Item: 2x Faxlava', 
    '• Pickup: 19:00-20:00'
  ]
}
```

### BigPictureStyle (With Image)
```typescript
style: {
  type: 'BigPictureStyle',
  picture: 'https://smartpick.ge/offer-image.jpg'
}
```

---

## Next Steps

1. ✅ **I already improved** your notification text and added colors
2. 📱 **Create notification icons** using Android Asset Studio
3. 🖼️ **Add images** to make notifications more visual
4. 🔘 **Add action buttons** for quick responses
5. 🚀 **Deploy and test** on your device

The updated code is already in your Firebase functions!
