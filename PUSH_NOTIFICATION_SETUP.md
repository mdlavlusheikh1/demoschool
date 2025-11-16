# Push Notification Setup Guide

এই guide-এ web app-এ push notification সেটআপ করার পদ্ধতি বর্ণনা করা হয়েছে।

## প্রয়োজনীয় Setup

### 1. Firebase Console থেকে VAPID Key পাওয়া

1. [Firebase Console](https://console.firebase.google.com/) এ যান
2. আপনার project নির্বাচন করুন
3. **Project Settings** (⚙️ gear icon) → **Cloud Messaging** tab
4. **Web configuration** section-এ scroll করুন
5. **Web Push certificates** section-এ **Generate key pair** button-এ click করুন
6. Generated key কপি করুন

### 2. Environment Variable Setup

`.env.local` file-এ VAPID key যোগ করুন:

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key-here
```

### 3. Service Worker Registration

Service Worker automatically register হবে যখন app load হবে। `public/firebase-messaging-sw.js` file-টি already আছে।

### 4. Firestore Rules Update

Firestore rules-এ `push_subscriptions` collection-এর জন্য rules যোগ করা হয়েছে। Rules deploy করুন:

```bash
firebase deploy --only firestore:rules
```

## ব্যবহার

### User Push Notification Enable করা

1. `/admin/settings` পেজে যান
2. **নোটিফিকেশন** tab-এ scroll করুন
3. **Push Notification Setup** section-এ **পুশ নোটিফিকেশন সক্রিয় করুন** button-এ click করুন
4. Browser permission prompt-এ **Allow** করুন

### Push Notification Send করা

```typescript
import { sendNotification } from '@/lib/notification-helper';

// Send notification (automatically sends push if enabled)
await sendNotification({
  userId: 'user-id',
  schoolId: 'school-id',
  title: 'নতুন নোটিশ',
  message: 'আপনার জন্য একটি নতুন নোটিশ আছে',
  type: 'notice_notification',
  notificationType: 'announcement'
});
```

## Important Notes

### Browser Compatibility

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS 16.4+)
- ⚠️ Safari (Desktop) - Limited support

### HTTPS Requirement

Push notifications শুধুমাত্র HTTPS connection-এ কাজ করে:
- ✅ Production (HTTPS)
- ⚠️ Local development - `localhost` allowed
- ❌ HTTP - Not supported

### Firebase Admin SDK (Backend)

Actual push notification send করার জন্য Firebase Admin SDK দরকার। এটি implement করতে:

1. Firebase Admin SDK install করুন:
```bash
npm install firebase-admin
```

2. Service account key download করুন Firebase Console থেকে
3. Backend API route তৈরি করুন (Node.js/Express বা Next.js API route)

Example:
```typescript
import admin from 'firebase-admin';

admin.messaging().send({
  token: userFcmToken,
  notification: {
    title: 'নতুন নোটিশ',
    body: 'আপনার জন্য একটি নতুন নোটিশ আছে',
  },
});
```

## Troubleshooting

### Service Worker Register হচ্ছে না

- Browser console check করুন errors এর জন্য
- HTTPS connection verify করুন
- Browser cache clear করুন

### Permission Denied

- Browser settings → Site Settings → Notifications → Allow
- Page refresh করুন

### Push Token পাওয়া যাচ্ছে না

- VAPID key correct আছে কিনা check করুন
- Firebase Console-এ Cloud Messaging enabled আছে কিনা verify করুন
- Browser compatibility check করুন

## Next Steps

1. ✅ VAPID key setup করুন
2. ✅ Environment variable add করুন
3. ✅ Firestore rules deploy করুন
4. ⏳ Backend API implement করুন (Firebase Admin SDK দিয়ে)
5. ⏳ Test push notification send করুন

## Support

সমস্যা হলে:
- Firebase Console → Cloud Messaging → Check logs
- Browser DevTools → Application → Service Workers
- Browser DevTools → Console → Check errors

