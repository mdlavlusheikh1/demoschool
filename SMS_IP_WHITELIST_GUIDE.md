# BulkSMS BD IP Whitelist করার গাইড

## সমস্যা:
SMS পাঠানোর সময় error: "আপনার IP address BulkSMS BD dashboard-এ whitelist করা নেই"

## সমাধান:

### ধাপ 1: আপনার IP Address জানুন
1. Browser-এ https://whatismyipaddress.com/ visit করুন
2. আপনার "IPv4 Address" কপি করুন (যেমন: 103.45.67.89)

### ধাপ 2: BulkSMS BD Dashboard-এ IP Whitelist করুন
1. https://portal.bulksmsbd.net/ এ login করুন
2. Dashboard-এ যান
3. **Settings** বা **IP Whitelist** section-এ যান
4. **Add IP Address** বা **Whitelist IP** button-এ click করুন
5. আপনার IP address paste করুন
6. Save করুন

### ধাপ 3: Test করুন
1. আপনার app-এ ফিরে আসুন
2. SMS send করার চেষ্টা করুন
3. এখন কাজ করা উচিত

## সমস্যা:
- **Local Development**: আপনার local IP address whitelist করতে হবে, কিন্তু এটি পরিবর্তন হতে পারে
- **Production**: Server IP address whitelist করতে হবে

## সুপারিশ:
Server-side API route ব্যবহার করুন (নিচের guide দেখুন) - এটি আরও secure এবং reliable

