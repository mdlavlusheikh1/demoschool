# 🚀 Vercel Deployment শুরু করুন

## ⚡ দ্রুত শুরু (Windows)

### Option 1: Automated Script (সবচেয়ে সহজ) ⭐

```bash
npm run deploy
```

অথবা:

```bash
node deploy-vercel.js
```

### Option 2: Batch Script (Windows)

```bash
deploy-vercel.bat
```

---

## 📋 Deployment করার আগে

### 1. GitHub-এ Code Push করুন

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Environment Variables প্রস্তুত করুন

`VERCEL_ENV_VARIABLES.md` file দেখুন - সেখানে সব variables-এর list আছে।

**গুরুত্বপূর্ণ Variables:**
- Firebase configuration (`.env.local` থেকে copy করুন)
- Firebase Admin credentials (Firebase Console থেকে নিন)
- School ID এবং Name

---

## 🎯 Deployment Steps

### Step 1: Script Run করুন

```bash
npm run deploy
```

### Step 2: Script আপনাকে guide করবে:

1. ✅ Prerequisites check
2. ✅ Vercel CLI install (যদি না থাকে)
3. ✅ Git changes commit/push
4. ✅ Project build
5. ✅ Vercel deployment

### Step 3: Environment Variables Add করুন

Script run করার পর, Vercel Dashboard-এ যান:
- **Project Settings** → **Environment Variables**
- `VERCEL_ENV_VARIABLES.md` থেকে সব variables add করুন

### Step 4: Deploy করুন

Vercel Dashboard থেকে:
- **"Deploy"** button ক্লিক করুন
- অথবা script-এর option 2 select করুন (production deploy)

---

## 📄 সহায়ক Documents

- **`DEPLOYMENT_INSTRUCTIONS.md`** - সম্পূর্ণ নির্দেশনা
- **`DEPLOY_VERCEL.md`** - বিস্তারিত guide
- **`VERCEL_ENV_VARIABLES.md`** - সব environment variables
- **`QUICK_DEPLOY.md`** - দ্রুত deployment guide

---

## ⚠️ Important Notes

1. **Firebase Admin Credentials:** Firebase Console → Service Accounts থেকে নিতে হবে
2. **Environment Variables:** Vercel Dashboard-এ add করতে হবে (script automatically add করবে না)
3. **Git Repository:** GitHub-এ push করা থাকতে হবে
4. **Build:** Local-এ build test করে নিন (`npm run build`)

---

## 🎉 Ready to Deploy!

এখন এই command run করুন:

```bash
npm run deploy
```

**Good luck! 🚀**

