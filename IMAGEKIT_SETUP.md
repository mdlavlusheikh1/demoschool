# Environment Variables Setup

## Required: Create .env.local file

Create a file named `.env.local` in your project root directory with the following content:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# ImageKit Configuration (Optional - for image uploads)
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id
```

## Setup Instructions

### Firebase Setup:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project or create a new one
3. Go to Project Settings (⚙️ gear icon)
4. Scroll to "Your apps" section
5. Click on Web app (</>) or add new web app
6. Copy the configuration values from the firebaseConfig object
7. Replace the placeholder values in .env.local

### ImageKit Setup (Optional):
1. Go to [ImageKit.io](https://imagekit.io/)
2. Sign up for a free account
3. Create a new project
4. Go to Settings → API Keys
5. Copy Public Key, Private Key, and URL Endpoint
6. Replace the placeholder values in .env.local

### After Setup:
1. Restart your development server: `npm run dev`
2. The ImageKit error should be resolved
3. Image upload functionality will work properly

## Note:
- Without ImageKit credentials, the app will show warnings but won't crash
- Image uploads are optional - the student management system works without them
- You can add ImageKit setup later without affecting other features
