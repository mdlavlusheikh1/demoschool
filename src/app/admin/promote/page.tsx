'use client';

import { useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, CheckCircle, AlertCircle, Languages } from 'lucide-react';

export default function PromoteUser() {
  const [uid, setUid] = useState('ndrZqsqNWmZ5Hq1fDVYvCNFQKs72');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const { userData } = useAuth();

  // Content translations
  const content = {
    bn: {
      title: 'সুপার অ্যাডমিন প্রমোশন',
      subtitle: 'ব্যবহারকারীকে সুপার অ্যাডমিন করুন',
      uidLabel: 'ব্যবহারকারীর UID',
      uidPlaceholder: 'ব্যবহারকারীর UID লিখুন',
      uidHint: 'Firebase Authentication থেকে ব্যবহারকারীর UID কপি করুন',
      button: 'সুপার অ্যাডমিন করুন',
      processing: 'প্রসেসিং...',
      instructions: 'নির্দেশনা:',
      instruction1: 'Firebase Console → Authentication → Users থেকে ব্যবহারকারীর UID কপি করুন',
      instruction2: 'উপরের ফিল্ডে UID পেস্ট করুন',
      instruction3: '"সুপার অ্যাডমিন করুন" বাটনে ক্লিক করুন',
      instruction4: 'ব্যবহারকারী লগআউট এবং আবার লগইন করলে সুপার অ্যাডমিন অ্যাক্সেস পাবেন',
      currentUid: 'বর্তমান UID:',
      errors: {
        uidRequired: 'UID প্রয়োজন',
        userNotFound: 'ব্যবহারকারী পাওয়া যায়নি',
        promotionFailed: 'সুপার অ্যাডমিন করতে ব্যর্থ: ',
        unknownError: 'অজানা ত্রুটি',
        accessDenied: 'আপনার এই পেইজে প্রবেশের অনুমতি নেই'
      },
      success: {
        promoted: '✅ সফলভাবে সুপার অ্যাডমিন করা হয়েছে!',
        previousRole: 'পূর্বের রোল:',
        newRole: 'নতুন রোল: super_admin'
      }
    },
    en: {
      title: 'Super Admin Promotion',
      subtitle: 'Promote user to super admin',
      uidLabel: 'User UID',
      uidPlaceholder: 'Enter user UID',
      uidHint: 'Copy the user UID from Firebase Authentication',
      button: 'Promote to Super Admin',
      processing: 'Processing...',
      instructions: 'Instructions:',
      instruction1: 'Copy the user UID from Firebase Console → Authentication → Users',
      instruction2: 'Paste the UID in the field above',
      instruction3: 'Click the "Promote to Super Admin" button',
      instruction4: 'User will get super admin access after logging out and logging back in',
      currentUid: 'Current UID:',
      errors: {
        uidRequired: 'UID is required',
        userNotFound: 'User not found',
        promotionFailed: 'Failed to promote to super admin: ',
        unknownError: 'Unknown error',
        accessDenied: 'You do not have permission to access this page'
      },
      success: {
        promoted: '✅ Successfully promoted to super admin!',
        previousRole: 'Previous role:',
        newRole: 'New role: super_admin'
      }
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const promoteToSuperAdmin = async () => {
    const t = content[language];
    
    if (!uid.trim()) {
      showMessage(t.errors.uidRequired, 'error');
      return;
    }

    setLoading(true);

    try {
      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        showMessage(t.errors.userNotFound, 'error');
        return;
      }

      const currentData = userDoc.data();
      
      // Update user to super admin
      await updateDoc(doc(db, 'users', uid), {
        role: 'super_admin',
        schoolId: 'all',
        schoolName: 'System Administrator',
        isActive: true,
        updatedAt: new Date()
      });

      showMessage(
        `${t.success.promoted}\n${t.success.previousRole} ${currentData.role}\n${t.success.newRole}`,
        'success'
      );

    } catch (error) {
      console.error('Error promoting user:', error);
      showMessage(t.errors.promotionFailed + (error instanceof Error ? error.message : t.errors.unknownError), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Only allow access to super admin or your teacher account
  if (!userData || (userData.role !== 'super_admin' && userData.email !== 'mdlavlusheikh220@gmail.com')) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{content[language].errors.accessDenied}</p>
      </div>
    );
  }

  const t = content[language];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border shadow-sm p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setLanguage(prev => prev === 'bn' ? 'en' : 'bn')}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                title={language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
              >
                <Languages className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{language === 'bn' ? 'EN' : 'বাং'}</span>
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-gray-600">{t.subtitle}</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-start">
              {messageType === 'success' ? (
                <CheckCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <pre className="whitespace-pre-wrap text-sm">{message}</pre>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.uidLabel}
            </label>
            <input
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder={t.uidPlaceholder}
            />
            <p className="text-sm text-gray-500 mt-1">
              {t.uidHint}
            </p>
          </div>

          <button
            onClick={promoteToSuperAdmin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {t.processing}
              </div>
            ) : (
              t.button
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">{t.instructions}</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>{t.instruction1}</li>
            <li>{t.instruction2}</li>
            <li>{t.instruction3}</li>
            <li>{t.instruction4}</li>
          </ol>
        </div>

        {/* Current UID Display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">{t.currentUid}</h4>
          <code className="text-sm text-gray-700 bg-white px-2 py-1 rounded border break-all">
            {uid}
          </code>
        </div>
      </div>
    </div>
  );
}