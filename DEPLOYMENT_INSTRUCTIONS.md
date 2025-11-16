# 🚀 Vercel Deployment - সম্পূর্ণ নির্দেশনা

## ⚡ দ্রুত Deployment (3টি Method)

### Method 1: Automated Script (সবচেয়ে সহজ) ⭐

#### Windows:
```bash
npm run deploy
```

#### Mac/Linux:
```bash
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

Script automatically:
- ✅ Prerequisites check করবে
- ✅ Vercel CLI install করবে (যদি না থাকে)
- ✅ Git changes commit/push করবে
- ✅ Project build করবে
- ✅ Vercel-এ deploy করবে

---

### Method 2: Vercel Dashboard (Recommended for First Time)

1. **GitHub-এ Push করুন:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Vercel Dashboard:**
   - https://vercel.com/dashboard → **"Add New..."** → **"Project"**
   - GitHub repository select করুন
   - **"Import"** ক্লিক করুন

3. **Environment Variables Add করুন:**
   - **Settings** → **Environment Variables**
   - `VERCEL_ENV_VARIABLES.md` file থেকে সব variables copy করে add করুন
   - প্রতিটি variable-এর জন্য **Production**, **Preview**, **Development** select করুন

4. **Deploy:**
   - **"Deploy"** button ক্লিক করুন
   - Build complete হওয়ার জন্য wait করুন

---

### Method 3: Vercel CLI (Advanced)

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
npm run deploy:vercel

# Deploy to production
npm run deploy:prod
```

---

## 📋 Environment Variables Setup

### Step 1: Vercel Dashboard-এ যান
**Project Settings** → **Environment Variables**

### Step 2: এই Variables Add করুন:

#### Firebase (Client-side):
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDDePHt9x1aKNWuUffo50GEsAz7Tr8sWfE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=iqra-nuranu-academy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=iqra-nuranu-academy
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=iqra-nuranu-academy.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=34173119939
NEXT_PUBLIC_FIREBASE_APP_ID=1:34173119939:web:13bf9c15956f0ce37d2176
```

#### Firebase Admin (Server-side):
**Firebase Console → Project Settings → Service Accounts** থেকে নিন:
```
FIREBASE_ADMIN_PROJECT_ID=iqra-nuranu-academy
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@iqra-nuranu-academy.iam.gserviceaccount.com
```

#### School Configuration:
```
NEXT_PUBLIC_SCHOOL_ID=102330
NEXT_PUBLIC_SCHOOL_NAME=ইকরা নূরানী একাডেমি
```

#### ImageKit (Optional):
```
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
IMAGEKIT_PRIVATE_KEY=your_key
```

**📄 Complete list:** `VERCEL_ENV_VARIABLES.md` দেখুন

---

## ✅ Post-Deployment Checklist

Deploy করার পর test করুন:

- [ ] Home page loads
- [ ] Login works
- [ ] Admin dashboard accessible
- [ ] Student/Teacher/Parent login works
- [ ] Image upload works (if ImageKit configured)
- [ ] Firebase authentication works
- [ ] All API routes working

---

## 🔧 Troubleshooting

### Build Fails:
1. Check build logs in Vercel dashboard
2. Verify all dependencies in `package.json`
3. Check `next.config.ts` for errors

### Environment Variables Not Working:
1. Verify variable names (case-sensitive)
2. Ensure variables added for all environments
3. Redeploy after adding variables

### Firebase Connection Issues:
1. Verify Firebase config values
2. Check Firebase project is active
3. Ensure Firebase Admin credentials correct

---

## 📞 Support

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Detailed Guide:** `DEPLOY_VERCEL.md`

---

## 🎉 Success!

Deployment successful হলে:
- ✅ Live URL: `your-project.vercel.app`
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Auto-deploy on git push

**Happy Deploying! 🚀**

