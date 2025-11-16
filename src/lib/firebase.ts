import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Production Firebase Configuration - Iqra Nuranu Academy
const firebaseConfig = {
  apiKey: "AIzaSyDDePHt9x1aKNWuUffo50GEsAz7Tr8sWfE",
  authDomain: "iqra-nuranu-academy.firebaseapp.com",
  projectId: "iqra-nuranu-academy",
  storageBucket: "iqra-nuranu-academy.firebasestorage.app",
  messagingSenderId: "34173119939",
  appId: "1:34173119939:web:13bf9c15956f0ce37d2176"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

// Initialize Firebase Cloud Messaging (only in browser)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('Firebase Messaging initialization failed:', error);
  }
}

export { auth, db, storage, realtimeDb, messaging };
export default app;