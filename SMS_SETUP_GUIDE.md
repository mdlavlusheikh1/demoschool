# SMS Setup Guide - IP Whitelist সমস্যার সমাধান

## সমস্যা:
"SMS failed: আপনার IP address BulkSMS BD dashboard-এ whitelist করা নেই"

## সমাধান 1: IP Whitelist করুন (দ্রুত)

### ধাপ 1: আপনার IP Address জানুন
1. Browser-এ https://whatismyipaddress.com/ visit করুন
2. আপনার **IPv4 Address** কপি করুন (যেমন: `103.45.67.89`)

### ধাপ 2: BulkSMS BD Dashboard-এ Whitelist করুন
1. https://portal.bulksmsbd.net/ এ login করুন
2. Dashboard-এ যান
3. **Settings** → **IP Whitelist** section-এ যান
4. **Add IP Address** button-এ click করুন
5. আপনার IP address paste করুন
6. **Save** করুন

### ধাপ 3: Test করুন
- আপনার app-এ ফিরে আসুন
- SMS send করার চেষ্টা করুন

## সমাধান 2: Server-Side API Route ব্যবহার করুন (সুপারিশকৃত)

✅ **ইতিমধ্যে implement করা হয়েছে!**

এখন SMS automatically server-side API route দিয়ে পাঠানো হবে, যা:
- ✅ Server IP ব্যবহার করে (client IP নয়)
- ✅ API keys secure থাকে
- ✅ IP whitelist সমস্যা এড়ায়
- ✅ Production-এ reliable

### কিভাবে কাজ করে:
1. Client-side code `/api/sms/send` API route call করে
2. Server-side API route SMS পাঠায়
3. Server IP ব্যবহার হয়, তাই whitelist করতে হবে server IP

### Production-এ:
- Vercel/Netlify deploy করলে server IP whitelist করুন
- VPS/Server ব্যবহার করলে server IP whitelist করুন

## Troubleshooting:

### যদি এখনও কাজ না করে:
1. **Check SMS Config**: `/admin/settings` → SMS Gateway → API Key এবং Sender ID আছে কিনা
2. **Check Console**: Browser console-এ error message দেখুন
3. **Server IP Whitelist**: Production server-এর IP whitelist করুন
4. **API Key**: API key সঠিক আছে কিনা verify করুন

## Note:
- Local development-এ এখনও আপনার local IP whitelist করতে হতে পারে
- Production-এ server IP whitelist করুন (একবার)

