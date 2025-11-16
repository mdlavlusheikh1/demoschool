# 🚀 Quick Vercel Deployment Guide

## ⚡ 5-Minute Deployment

### Step 1: GitHub-এ Push করুন
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Vercel Dashboard
1. https://vercel.com/dashboard → **"Add New..."** → **"Project"**
2. GitHub repository select করুন
3. **"Import"** ক্লিক করুন

### Step 3: Environment Variables
**Settings** → **Environment Variables** → এই variables add করুন:

#### Firebase (Required):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

#### Firebase Admin (Required):
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `FIREBASE_ADMIN_CLIENT_EMAIL`

#### ImageKit (Optional):
- `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`
- `IMAGEKIT_PRIVATE_KEY`

#### School (Required):
- `NEXT_PUBLIC_SCHOOL_ID`
- `NEXT_PUBLIC_SCHOOL_NAME`

**📋 Full list:** `VERCEL_ENV_VARIABLES.md` file দেখুন

### Step 4: Deploy
1. **"Deploy"** button ক্লিক করুন
2. Build complete হওয়ার জন্য wait করুন (2-5 min)
3. ✅ Done! Your site is live!

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Project Settings:** https://vercel.com/[your-project]/settings
- **Environment Variables:** https://vercel.com/[your-project]/settings/environment-variables

---

## 📞 Need Help?

1. Check build logs in Vercel dashboard
2. See `DEPLOY_VERCEL.md` for detailed guide
3. See `VERCEL_ENV_VARIABLES.md` for all environment variables

---

**🎉 Happy Deploying!**

