import { messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SCHOOL_ID } from './constants';

// VAPID key - Get this from Firebase Console > Project Settings > Cloud Messaging
// You need to generate a Web Push certificate key pair
// Steps:
// 1. Go to Firebase Console > Project Settings > Cloud Messaging
// 2. Under "Web configuration", click "Generate key pair"
// 3. Copy the key and paste it here
// Note: If VAPID key is configured in Firebase Console, you don't need to set it here
// Firebase will automatically use the console-configured key
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

export interface PushSubscription {
  userId: string;
  token: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined' || !messaging) {
    console.warn('Firebase Messaging is not available');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Get FCM token
      // Try without explicit VAPID key first - Firebase will use the one configured in Console
      // This is the recommended approach as it avoids key format issues
      let token: string | null = null;
      
      try {
        // First try without explicit VAPID key (uses Firebase Console configuration)
        token = await getToken(messaging);
        
        if (token) {
          console.log('FCM Token (using Firebase Console VAPID key):', token);
          return token;
        }
      } catch (error) {
        console.warn('Failed to get token without explicit VAPID key:', error);
        
        // If that fails and we have a VAPID key, try with it
        if (VAPID_KEY && VAPID_KEY.length > 0) {
          try {
            // Validate VAPID key format (base64url, typically 87 chars)
            if (/^[A-Za-z0-9_-]+$/.test(VAPID_KEY) && VAPID_KEY.length >= 65) {
              token = await getToken(messaging, { vapidKey: VAPID_KEY });
              if (token) {
                console.log('FCM Token (using explicit VAPID key):', token);
                return token;
              }
            } else {
              console.warn('VAPID key format appears invalid. Length:', VAPID_KEY.length);
            }
          } catch (vapidError) {
            console.error('Failed to get token with explicit VAPID key:', vapidError);
          }
        }
      }
      
      if (!token) {
        console.warn('No FCM token available. Please configure VAPID key in Firebase Console > Project Settings > Cloud Messaging');
        return null;
      }
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    // If VAPID key error, try without explicit key (Firebase will use console configuration)
    if (error instanceof Error && error.message.includes('applicationServerKey')) {
      console.warn('VAPID key error detected. Trying without explicit key...');
      try {
        const token = await getToken(messaging);
        if (token) {
          console.log('FCM Token (without explicit VAPID):', token);
          return token;
        }
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
      }
    }
    return null;
  }
}

/**
 * Save user's push subscription token
 */
export async function savePushToken(userId: string, token: string): Promise<boolean> {
  try {
    const subscriptionData: Omit<PushSubscription, 'createdAt' | 'updatedAt'> & {
      createdAt: any;
      updatedAt: any;
    } = {
      userId,
      token,
      deviceInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = doc(collection(db, 'push_subscriptions'), userId);
    await setDoc(docRef, subscriptionData, { merge: true });

    console.log('Push token saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving push token:', error);
    return false;
  }
}

/**
 * Get user's push subscription token
 */
export async function getPushToken(userId: string): Promise<string | null> {
  try {
    const docRef = doc(db, 'push_subscriptions', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.token || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Delete user's push subscription
 */
export async function deletePushToken(userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'push_subscriptions', userId);
    
    // Check if document exists first
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Document exists, update it
      await updateDoc(docRef, {
        token: null,
        updatedAt: new Date(),
      });
    } else {
      // Document doesn't exist, create it with null token (already deleted)
      await setDoc(docRef, {
        userId,
        token: null,
        updatedAt: new Date(),
      }, { merge: true });
    }

    return true;
  } catch (error) {
    // If document doesn't exist, that's fine - it's already deleted
    if (error instanceof Error && error.message.includes('No document to update')) {
      console.log('Push token document does not exist, already deleted');
      return true;
    }
    console.error('Error deleting push token:', error);
    return false;
  }
}

/**
 * Initialize push notifications for a user
 */
export async function initializePushNotifications(userId: string): Promise<boolean> {
  try {
    // Check if already subscribed
    const existingToken = await getPushToken(userId);
    if (existingToken) {
      console.log('User already has push token');
      return true;
    }

    // Request permission and get token
    const token = await requestNotificationPermission();
    
    if (token) {
      // Save token
      await savePushToken(userId, token);
      
      // Listen for foreground messages
      if (messaging) {
        onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload);
          
          // Show notification if app is in foreground
          if (Notification.permission === 'granted') {
            const notificationTitle = payload.notification?.title || payload.data?.title || 'নতুন নোটিফিকেশন';
            const notificationOptions = {
              body: payload.notification?.body || payload.data?.message || '',
              icon: payload.notification?.icon || '/favicon.ico',
              badge: '/favicon.ico',
              tag: payload.data?.notificationId || 'notification',
              data: payload.data || {},
            };

            new Notification(notificationTitle, notificationOptions);
          }
        });
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
}

/**
 * Check if notification permission is granted
 */
export function isNotificationPermissionGranted(): boolean {
  if (typeof window === 'undefined') return false;
  return Notification.permission === 'granted';
}

/**
 * Check if notification permission is denied
 */
export function isNotificationPermissionDenied(): boolean {
  if (typeof window === 'undefined') return false;
  return Notification.permission === 'denied';
}

/**
 * Get notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined') return 'default';
  return Notification.permission;
}

