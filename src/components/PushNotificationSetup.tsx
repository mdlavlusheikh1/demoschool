'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  initializePushNotifications,
  isNotificationPermissionGranted,
  isNotificationPermissionDenied,
  getNotificationPermissionStatus,
  deletePushToken,
} from '@/lib/push-notification';

export default function PushNotificationSetup() {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermissionStatus(getNotificationPermissionStatus());
      setIsEnabled(isNotificationPermissionGranted());
    }
  }, []);

  const handleEnablePush = async () => {
    if (!user?.uid) {
      setMessage({ type: 'error', text: 'লগইন করুন' });
      return;
    }

    setIsInitializing(true);
    setMessage(null);

    try {
      const success = await initializePushNotifications(user.uid);
      
      if (success) {
        setIsEnabled(true);
        setPermissionStatus('granted');
        setMessage({ type: 'success', text: 'পুশ নোটিফিকেশন সফলভাবে সক্রিয় করা হয়েছে!' });
      } else {
        setMessage({ type: 'error', text: 'পুশ নোটিফিকেশন সক্রিয় করতে সমস্যা হয়েছে' });
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      setMessage({ type: 'error', text: 'ত্রুটি: ' + (error instanceof Error ? error.message : 'অজানা সমস্যা') });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDisablePush = async () => {
    if (!user?.uid) {
      setMessage({ type: 'error', text: 'লগইন করুন' });
      return;
    }

    setIsInitializing(true);
    setMessage(null);

    try {
      await deletePushToken(user.uid);
      setIsEnabled(false);
      setPermissionStatus('default');
      setMessage({ type: 'success', text: 'পুশ নোটিফিকেশন নিষ্ক্রিয় করা হয়েছে' });
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      setMessage({ type: 'error', text: 'ত্রুটি: ' + (error instanceof Error ? error.message : 'অজানা সমস্যা') });
    } finally {
      setIsInitializing(false);
    }
  };

  if (isNotificationPermissionDenied()) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900 mb-1">নোটিফিকেশন ব্লক করা হয়েছে</h4>
            <p className="text-sm text-red-700 mb-3">
              ব্রাউজার সেটিংস থেকে নোটিফিকেশন অনুমতি দিন
            </p>
            <ol className="text-xs text-red-600 list-decimal list-inside space-y-1">
              <li>ব্রাউজারের সেটিংসে যান</li>
              <li>Privacy & Security → Site Settings</li>
              <li>Notifications → Allow</li>
              <li>পেজ refresh করুন</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-1">পুশ নোটিফিকেশন</h4>
          <p className="text-sm text-gray-600">
            {isEnabled
              ? 'আপনার ব্রাউজারে নোটিফিকেশন পাওয়া যাবে'
              : 'ব্রাউজারে নোটিফিকেশন সক্রিয় করুন'}
          </p>
        </div>
        {isEnabled ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <BellOff className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : message.type === 'error'
              ? 'bg-red-50 text-red-800'
              : 'bg-blue-50 text-blue-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : message.type === 'error' ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="flex items-center space-x-3">
        {!isEnabled ? (
          <button
            onClick={handleEnablePush}
            disabled={isInitializing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span>{isInitializing ? 'সক্রিয় হচ্ছে...' : 'পুশ নোটিফিকেশন সক্রিয় করুন'}</span>
          </button>
        ) : (
          <button
            onClick={handleDisablePush}
            disabled={isInitializing}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <BellOff className="w-4 h-4" />
            <span>{isInitializing ? 'নিষ্ক্রিয় হচ্ছে...' : 'পুশ নোটিফিকেশন নিষ্ক্রিয় করুন'}</span>
          </button>
        )}
      </div>

      {permissionStatus === 'default' && (
        <p className="mt-3 text-xs text-gray-500">
          প্রথমবার অনুমতি দিলে ব্রাউজার একটি পপআপ দেখাবে
        </p>
      )}
    </div>
  );
}

