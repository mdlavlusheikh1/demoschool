# School Code Migration Script

## Overview
This script updates all existing Firestore documents that contain the old school code `302310` to use the new school code `102330`.

## Prerequisites
1. **Firebase Admin SDK** - Ensure `firebase-admin` is installed
2. **Service Account** - You need a valid Firebase Admin service account JSON file
3. **Backup** - **IMPORTANT**: Backup your Firestore database before running this script!

## Setup

### 1. Get Firebase Admin Service Account
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file as `firestore-super-admin.json` in the project root
4. **DO NOT commit this file to Git!**

### 2. Verify Service Account File
The file should be located at: `h:\LAvlu Personal\Iqra\Website\webapp\firestore-super-admin.json`

The file should contain:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...@your-project.iam.gserviceaccount.com",
  ...
}
```

## Usage

### Option 1: Using npm script
```bash
npm run migrate-school-code
```

### Option 2: Direct Node execution
```bash
node scripts/utils/update-school-code.js
```

## What It Does

The script will:
1. Search through all specified Firestore collections
2. Find documents with `schoolId` or `schoolCode` matching `302310`
3. Update them to `102330`
4. Add/update `updatedAt` timestamp

## Collections Updated

The following collections will be checked and updated:
- `users` (Students, Teachers, Parents, Admins)
- `classes`
- `attendanceRecords`
- `transactions`
- `categories`
- `exams`
- `subjects`
- `feeCollections`
- `media`
- `inventory`
- `notices`
- `events`
- `settings`
- `examFees`
- `examSpecificFees`

## Output

The script will display:
- Progress for each collection
- Number of documents found and updated
- Summary at the end with totals

## Example Output

```
🚀 Starting School Code Migration
   Old Code: 302310
   New Code: 102330

📋 Processing collection: users
   📝 Found 150 documents with schoolId: 302310
   ✅ Updated 150 documents in users

📋 Processing collection: classes
   📝 Found 12 documents with schoolId: 302310
   ✅ Updated 12 documents in classes

...

📊 Migration Summary
Total Documents Checked: 250
Total Documents Updated: 250
```

## Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Test in Dev**: Test this script on a development/staging database first
3. **No Rollback**: This script does not provide rollback functionality
4. **Verify Results**: After running, verify the data in Firebase Console

## Troubleshooting

### Error: "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### Error: "firestore-super-admin.json not found"
- Ensure the service account JSON file is in the project root
- Check the file path in the script matches your setup

### Error: "Permission denied"
- Ensure your service account has Firestore Admin permissions
- Check the service account JSON has the correct project ID

## Safety

- The script uses batch writes for efficiency
- It only updates documents that match the old school code
- It preserves all other document fields
- It adds timestamps for audit purposes

