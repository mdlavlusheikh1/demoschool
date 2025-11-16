/**
 * Migration Script: Update School Code in Existing Data
 * 
 * This script updates all existing Firestore documents that contain the old school code
 * to use the new school code "102330".
 * 
 * Usage:
 *   node scripts/utils/update-school-code.js
 * 
 * IMPORTANT: Backup your database before running this script!
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../firestore-super-admin.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error('❌ Error loading service account:', error.message);
  console.error('Please ensure firestore-super-admin.json exists in the root directory');
  process.exit(1);
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Old and new school codes
const OLD_SCHOOL_CODE = '302310';
const NEW_SCHOOL_CODE = '102330';

// Collections that contain schoolId field
const COLLECTIONS_TO_UPDATE = [
  'users',           // Students, teachers, parents, admins
  'classes',         // Class records
  'attendanceRecords', // Attendance records
  'transactions',    // Financial transactions
  'categories',      // Financial categories
  'exams',           // Exam records
  'subjects',        // Subject records
  'feeCollections',  // Fee collection records
  'media',           // Media records (if exists)
  'inventory',       // Inventory items (if exists)
  'notices',         // Notices (if exists)
  'events',          // Events (if exists)
];

// Additional collections that might have schoolCode or schoolId
const ADDITIONAL_COLLECTIONS = [
  'settings',
  'examFees',
  'examSpecificFees',
];

async function updateCollection(collectionName, oldSchoolId, newSchoolId) {
  try {
    console.log(`\n📋 Processing collection: ${collectionName}`);
    
    // Get all documents with the old school ID
    const snapshot = await db.collection(collectionName)
      .where('schoolId', '==', oldSchoolId)
      .get();
    
    if (snapshot.empty) {
      console.log(`   ℹ️  No documents found with schoolId: ${oldSchoolId}`);
      
      // Also check for schoolCode field
      const snapshotByCode = await db.collection(collectionName)
        .where('schoolCode', '==', oldSchoolId)
        .get();
      
      if (snapshotByCode.empty) {
        console.log(`   ℹ️  No documents found with schoolCode: ${oldSchoolId}`);
        return { updated: 0, checked: 0 };
      }
      
      console.log(`   📝 Found ${snapshotByCode.size} documents with schoolCode: ${oldSchoolId}`);
      
      // Process in batches (Firestore limit is 500 per batch)
      const BATCH_SIZE = 500;
      let totalUpdated = 0;
      const docs = snapshotByCode.docs;
      
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const batchDocs = docs.slice(i, i + BATCH_SIZE);
        
        batchDocs.forEach((doc) => {
          batch.update(doc.ref, {
            schoolCode: newSchoolId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        
        await batch.commit();
        totalUpdated += batchDocs.length;
        console.log(`   ⏳ Progress: ${totalUpdated}/${docs.length} documents updated...`);
      }
      
      if (totalUpdated > 0) {
        console.log(`   ✅ Updated ${totalUpdated} documents in ${collectionName}`);
      }
      
      return { updated: totalUpdated, checked: snapshotByCode.size };
    }
    
    console.log(`   📝 Found ${snapshot.size} documents with schoolId: ${oldSchoolId}`);
    
    // Process in batches (Firestore limit is 500 per batch)
    const BATCH_SIZE = 500;
    let totalUpdated = 0;
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchDocs = docs.slice(i, i + BATCH_SIZE);
      
      batchDocs.forEach((doc) => {
        const updateData = {
          schoolId: newSchoolId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Also update schoolCode if it exists
        const data = doc.data();
        if (data.schoolCode === oldSchoolId) {
          updateData.schoolCode = newSchoolId;
        }
        
        batch.update(doc.ref, updateData);
      });
      
      await batch.commit();
      totalUpdated += batchDocs.length;
      console.log(`   ⏳ Progress: ${totalUpdated}/${docs.length} documents updated...`);
    }
    
    if (totalUpdated > 0) {
      console.log(`   ✅ Updated ${totalUpdated} documents in ${collectionName}`);
    }
    
    return { updated: totalUpdated, checked: snapshot.size };
  } catch (error) {
    console.error(`   ❌ Error updating ${collectionName}:`, error.message);
    return { updated: 0, checked: 0, error: error.message };
  }
}

async function updateDocumentCollections(collectionName, oldSchoolId, newSchoolId) {
  try {
    console.log(`\n📋 Processing document collection: ${collectionName}`);
    
    // For document collections, check if document ID matches or contains schoolId
    const docRef = db.collection(collectionName).doc(oldSchoolId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      const hasSchoolId = data && (data.schoolId === oldSchoolId || data.schoolCode === oldSchoolId);
      
      if (hasSchoolId) {
        // Update the document
        await docRef.update({
          schoolId: newSchoolId,
          schoolCode: newSchoolId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Also create/update document with new ID
        const newDocRef = db.collection(collectionName).doc(newSchoolId);
        await newDocRef.set(data, { merge: true });
        await newDocRef.update({
          schoolId: newSchoolId,
          schoolCode: newSchoolId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`   ✅ Updated document ${oldSchoolId} → ${newSchoolId} in ${collectionName}`);
        return { updated: 1, checked: 1 };
      }
    }
    
    // Check all documents for schoolId/schoolCode fields
    const allDocs = await db.collection(collectionName).get();
    let updatedCount = 0;
    
    for (const doc of allDocs.docs) {
      const data = doc.data();
      if (data.schoolId === oldSchoolId || data.schoolCode === oldSchoolId) {
        await doc.ref.update({
          schoolId: newSchoolId,
          schoolCode: data.schoolCode === oldSchoolId ? newSchoolId : data.schoolCode,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      console.log(`   ✅ Updated ${updatedCount} documents in ${collectionName}`);
    } else {
      console.log(`   ℹ️  No documents found with schoolId/schoolCode: ${oldSchoolId}`);
    }
    
    return { updated: updatedCount, checked: allDocs.size };
  } catch (error) {
    console.error(`   ❌ Error updating ${collectionName}:`, error.message);
    return { updated: 0, checked: 0, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting School Code Migration');
  console.log(`   Old Code: ${OLD_SCHOOL_CODE}`);
  console.log(`   New Code: ${NEW_SCHOOL_CODE}`);
  console.log('\n⚠️  WARNING: This will update all existing data in Firestore!');
  console.log('   Make sure you have a backup before proceeding.\n');
  
  const results = {
    totalUpdated: 0,
    totalChecked: 0,
    collections: {}
  };
  
  // Update regular collections
  for (const collectionName of COLLECTIONS_TO_UPDATE) {
    const result = await updateCollection(collectionName, OLD_SCHOOL_CODE, NEW_SCHOOL_CODE);
    results.collections[collectionName] = result;
    results.totalUpdated += result.updated;
    results.totalChecked += result.checked;
  }
  
  // Update document collections (where document ID might be the schoolId)
  for (const collectionName of ADDITIONAL_COLLECTIONS) {
    const result = await updateDocumentCollections(collectionName, OLD_SCHOOL_CODE, NEW_SCHOOL_CODE);
    results.collections[collectionName] = result;
    results.totalUpdated += result.updated;
    results.totalChecked += result.checked;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total Documents Checked: ${results.totalChecked}`);
  console.log(`Total Documents Updated: ${results.totalUpdated}`);
  console.log('\n📋 Per Collection:');
  
  for (const [collection, result] of Object.entries(results.collections)) {
    if (result.checked > 0 || result.updated > 0) {
      console.log(`   ${collection}: ${result.updated} updated / ${result.checked} checked`);
      if (result.error) {
        console.log(`      ⚠️  Error: ${result.error}`);
      }
    }
  }
  
  console.log('\n✅ Migration completed!');
  
  // Close the connection
  await admin.app().delete();
  process.exit(0);
}

// Run the migration
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

