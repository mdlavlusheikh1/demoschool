# Vercel Deployment Guide - বাংলা

## 🚀 Vercel-এ Deploy করার সম্পূর্ণ গাইড

### Step 1: GitHub Repository তৈরি করুন

1. আপনার কোড GitHub-এ push করুন
2. Repository public বা private রাখতে পারেন

### Step 2: Vercel Account তৈরি করুন

1. [vercel.com](https://vercel.com) এ যান
2. "Sign Up" করুন (GitHub account দিয়ে sign up করা সহজ)
3. GitHub account connect করুন

### Step 3: Vercel Dashboard থেকে Deploy করুন

#### Method 1: Vercel Dashboard (সবচেয়ে সহজ)

1. **Vercel Dashboard** এ যান: https://vercel.com/dashboard
2. **"Add New..."** → **"Project"** ক্লিক করুন
3. **"Import Git Repository"** থেকে আপনার GitHub repository select করুন
4. **"Import"** ক্লিক করুন

### Step 4: Environment Variables Setup করুন

**⚠️ খুবই গুরুত্বপূর্ণ:** Deploy করার আগে অবশ্যই Environment Variables add করতে হবে।

#### Vercel Dashboard-এ Environment Variables যোগ করুন:

1. Project import করার পর, **"Environment Variables"** section-এ যান
2. নিচের সব variables add করুন:

#### Firebase Configuration (Client-side):
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

#### Firebase Admin (Server-side):
```
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

#### ImageKit Configuration:
```
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

#### School Configuration:
```
NEXT_PUBLIC_SCHOOL_ID=your_school_id
NEXT_PUBLIC_SCHOOL_NAME=your_school_name
```

**📝 Note:** 
- প্রতিটি variable-এর জন্য **Environment** select করুন: **Production**, **Preview**, এবং **Development** (সবগুলোতে same values)
- Firebase Admin Private Key যোগ করার সময়, পুরো key-টি copy করুন (newlines সহ)

### Step 5: Build Settings Check করুন

Vercel automatically detect করবে:
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### Step 6: Deploy করুন

1. সব Environment Variables add করার পর
2. **"Deploy"** button ক্লিক করুন
3. Build process শুরু হবে (২-৫ মিনিট লাগতে পারে)
4. Build successful হলে, আপনার site live হবে!

### Step 7: Custom Domain Setup (Optional)

1. **Project Settings** → **Domains**
2. আপনার domain add করুন
3. DNS records configure করুন (Vercel instructions অনুযায়ী)

---

## 🔧 Vercel CLI দিয়ে Deploy (Alternative Method)

যদি CLI ব্যবহার করতে চান:

```bash
# Vercel CLI install করুন
npm install -g vercel

# Vercel-এ login করুন
vercel login

# Project root directory-তে যান
cd your-project-directory

# Deploy করুন
vercel

# Production-এ deploy করতে
vercel --prod
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Build Fails
**Solution:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check `next.config.ts` for any errors

### Issue 2: Environment Variables Not Working
**Solution:**
- Verify variable names match exactly (case-sensitive)
- Ensure variables are added for correct environments (Production/Preview/Development)
- Redeploy after adding new variables

### Issue 3: Firebase Connection Issues
**Solution:**
- Verify Firebase configuration values
- Check Firebase project is active
- Ensure Firebase Admin credentials are correct

### Issue 4: ImageKit Upload Not Working
**Solution:**
- Verify ImageKit credentials
- Check ImageKit domain is in `next.config.ts`
- Ensure API route `/api/imagekit` is working

### Issue 5: API Routes Timeout
**Solution:**
- Check `vercel.json` for function timeout settings
- Optimize API route code
- Consider using Vercel Edge Functions for faster responses

---

## 📋 Post-Deployment Checklist

Deploy করার পর এইগুলো test করুন:

- [ ] Home page loads correctly
- [ ] Login page works
- [ ] Admin dashboard accessible
- [ ] Student/Teacher/Parent login works
- [ ] Image upload works (if ImageKit configured)
- [ ] Firebase authentication works
- [ ] All API routes working
- [ ] Database queries working
- [ ] Mobile responsive design works

---

## 🔄 Continuous Deployment

Vercel automatically:
- ✅ GitHub-এ push করলে automatically redeploy হবে
- ✅ Pull requests-এর জন্য preview deployments তৈরি করবে
- ✅ Production branch (main/master) changes-এর জন্য production deploy করবে

---

## 📞 Support

যদি কোনো সমস্যা হয়:
1. Vercel Dashboard → Project → Deployments → Build logs check করুন
2. Vercel Documentation: https://vercel.com/docs
3. Next.js Documentation: https://nextjs.org/docs

---

## 🎉 Success!

Deployment successful হলে, আপনি পাবেন:
- ✅ Live production URL (e.g., `your-project.vercel.app`)
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments on git push

**Good luck with your deployment! 🚀**

