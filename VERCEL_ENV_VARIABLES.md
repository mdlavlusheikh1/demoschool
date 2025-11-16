# Vercel Environment Variables - Copy & Paste Ready

## 📋 Vercel Dashboard-এ এই Variables গুলো Add করুন

### Step 1: Vercel Dashboard → Your Project → Settings → Environment Variables

### Step 2: নিচের সব Variables Add করুন:

---

## 🔥 Firebase Configuration (Client-side)

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDDePHt9x1aKNWuUffo50GEsAz7Tr8sWfE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=iqra-nuranu-academy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=iqra-nuranu-academy
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=iqra-nuranu-academy.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=34173119939
NEXT_PUBLIC_FIREBASE_APP_ID=1:34173119939:web:13bf9c15956f0ce37d2176
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://iqra-nuranu-academy-default-rtdb.firebaseio.com
```

---

## 🔐 Firebase Admin (Server-side)

**⚠️ Important:** Firebase Admin credentials Firebase Console থেকে নিতে হবে:

1. Firebase Console → Project Settings → Service Accounts
2. "Generate New Private Key" ক্লিক করুন
3. JSON file download হবে
4. সেই file থেকে values নিন:

```
FIREBASE_ADMIN_PROJECT_ID=iqra-nuranu-academy
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@iqra-nuranu-academy.iam.gserviceaccount.com
```

**Note:** Private Key-এর পুরো value copy করুন (newlines সহ, quotes দিয়ে wrap করুন)

---

## 🖼️ ImageKit Configuration

ImageKit credentials ImageKit Dashboard থেকে নিতে হবে:

```
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

**Note:** ImageKit optional - যদি configure না করেন, image upload feature কাজ করবে না কিন্তু app crash হবে না।

---

## 🏫 School Configuration

```
NEXT_PUBLIC_SCHOOL_ID=102330
NEXT_PUBLIC_SCHOOL_NAME=ইকরা নূরানী একাডেমি
```

---

## 📝 Environment Selection

প্রতিটি variable add করার সময়:
- ✅ **Production** - Select করুন
- ✅ **Preview** - Select করুন  
- ✅ **Development** - Select করুন

---

## ✅ Verification

Variables add করার পর:
1. **Save** করুন
2. **Redeploy** করুন
3. Build logs check করুন errors-এর জন্য

---

## 🔄 After Adding Variables

1. Go to **Deployments** tab
2. Latest deployment-এর **"..."** menu → **"Redeploy"**
3. Build process complete হওয়ার জন্য wait করুন

---

## ⚠️ Important Notes

- Variable names **case-sensitive** - exact match করতে হবে
- `NEXT_PUBLIC_` prefix থাকা variables client-side accessible
- Private keys-এ quotes ব্যবহার করুন
- Firebase Admin Private Key-এ newlines (`\n`) preserve করুন

