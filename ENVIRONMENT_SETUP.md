# Environment Setup Guide

## Firebase Configuration

To fix the 500 Internal Server Errors, you need to create a `.env.local` file in your project root with your Firebase configuration.

### Step 1: Create .env.local file

Create a file named `.env.local` in the root directory of your project with the following content:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# ImageKit Configuration (optional)
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id
```

### Step 2: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps" section
5. Click on the web app icon (</>) or add a new web app
6. Copy the configuration values from the Firebase config object

### Step 3: Replace the placeholder values

Replace the placeholder values in `.env.local` with your actual Firebase configuration:

- `your-api-key-here` → Your Firebase API key
- `your-project.firebaseapp.com` → Your Firebase auth domain
- `your-project-id` → Your Firebase project ID
- `your-project.appspot.com` → Your Firebase storage bucket
- `your-sender-id` → Your Firebase messaging sender ID
- `your-app-id` → Your Firebase app ID

### Step 4: Restart the development server

After creating the `.env.local` file, restart your development server:

```bash
> npm run dev
```

## ImageKit Setup (For Image Upload Feature)

If you want to use the image upload feature for student photos, you need to configure ImageKit:

### Step 1: Create ImageKit Account

1. Go to [ImageKit.io](https://imagekit.io/)
2. Sign up for a free account
3. Create a new project
4. Go to your dashboard and find the API keys

### Step 2: Get ImageKit Credentials

From your ImageKit dashboard:

1. Go to **Settings** → **API Keys**
2. Copy the **Public Key** (this will be `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`)
3. Copy the **Private Key** (this will be `IMAGEKIT_PRIVATE_KEY`)
4. Copy the **URL Endpoint** (this will be `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`)

### Step 3: Update .env.local file

Add these lines to your `.env.local` file:

```env
# ImageKit Configuration
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your-copied-public-key
IMAGEKIT_PRIVATE_KEY=your-copied-private-key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id
```

### Step 4: Replace placeholder values

Replace the placeholder values with your actual ImageKit credentials.

### Step 5: Restart the development server

```bash
npm run dev
```

## Note

- ImageKit is optional - if not configured, the image upload feature will show an error but won't break the application
- The application will work without ImageKit, but student photo uploads won't function
- You can add ImageKit configuration later without affecting other features
