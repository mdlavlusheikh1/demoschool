'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, Timestamp, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Bell, Calendar, AlertCircle, Info, Loader2 } from 'lucide-react';

// Helper function to convert numbers to Bengali numerals
const toBengaliNumerals = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '০';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formatted = num.toLocaleString('en-US');
  return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

// Helper function to format date
const formatDate = (date: any): string => {
  if (!date) return '';
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
};

// Helper function to get time ago
const getTimeAgo = (date: any): string => {
  if (!date) return '';
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${toBengaliNumerals(diffMins)} মিনিট আগে`;
    } else if (diffHours < 24) {
      return `${toBengaliNumerals(diffHours)} ঘন্টা আগে`;
    } else if (diffDays < 7) {
      return `${toBengaliNumerals(diffDays)} দিন আগে`;
    } else if (diffDays < 30) {
      return `${toBengaliNumerals(Math.floor(diffDays / 7))} সপ্তাহ আগে`;
    } else {
      return formatDate(date);
    }
  } catch {
    return '';
  }
};

// Get notice icon and color based on priority
const getNoticeStyle = (priority: string) => {
  switch (priority) {
    case 'high':
    case 'উচ্চ':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-600',
        icon: AlertCircle,
        text: 'text-red-600'
      };
    case 'medium':
    case 'মাঝারি':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-600',
        icon: Info,
        text: 'text-blue-600'
      };
    default:
      return {
        bg: 'bg-white',
        border: 'border-gray-200',
        iconBg: 'bg-green-600',
        icon: Bell,
        text: 'text-gray-600'
      };
  }
};

function NoticePage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<any[]>([]);

  // Helper function to process notices
  const processNotices = useCallback((snapshot: any) => {
    const allNotices: any[] = [];
    const now = new Date();
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      
      // Only show active notices
      if (data.status !== 'active') {
        return;
      }
      
      // Check if notice has expired
      let isExpired = false;
      if (data.expiresAt) {
        try {
          const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
          isExpired = expiresAt < now;
        } catch (e) {
          console.warn('Error parsing expiresAt:', e);
        }
      }

      if (!isExpired) {
        allNotices.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'all',
          priority: data.priority || 'medium',
          status: data.status || 'active',
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          attachments: data.attachments || []
        });
      }
    });

    // Sort by priority (high first) then by date (newest first)
    allNotices.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'উচ্চ': 3, 'medium': 2, 'মাঝারি': 2, 'low': 1, 'নিম্ন': 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    setNotices(allNotices);
  }, []);

  // Setup real-time listener for notices
  useEffect(() => {
    setLoading(true);
    
    console.log('📢 Setting up real-time notices listener for parent...');
    
    // Load notices from Firebase with real-time listener
    const noticesRef = collection(db, 'notices');
    const noticesQuery = query(
      noticesRef,
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => {
        console.log('🔄 Real-time notices update received:', snapshot.size, 'notices');
        processNotices(snapshot);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in real-time notices listener:', error);
        setLoading(false);
      }
    );

    // Cleanup function
    return () => {
      console.log('🔌 Unsubscribing from notices listener');
      unsubscribe();
    };
  }, [processNotices]);

  if (loading) {
    return (
      <ParentLayout title="নোটিশ" subtitle="গুরুত্বপূর্ণ বিজ্ঞপ্তি এবং ঘোষণা">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="নোটিশ" subtitle="গুরুত্বপূর্ণ বিজ্ঞপ্তি এবং ঘোষণা">
      {/* Important Notices */}
      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
            <div className="text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">কোনো নোটিশ নেই</p>
              <p className="text-sm mt-1">এই মুহূর্তে কোনো সক্রিয় নোটিশ নেই</p>
            </div>
          </div>
        ) : (
          notices.map((notice) => {
            const style = getNoticeStyle(notice.priority);
            const Icon = style.icon;
            
            return (
              <div key={notice.id} className={`${style.bg} border ${style.border} rounded-xl p-6 shadow-sm`}>
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 ${style.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">{notice.title}</h3>
                      <span className="text-xs text-gray-500">{getTimeAgo(notice.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{notice.description}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-3">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>প্রকাশিত: {formatDate(notice.createdAt)}</span>
                      {notice.expiresAt && (
                        <span className="ml-4">
                          মেয়াদ শেষ: {formatDate(notice.expiresAt)}
                        </span>
                      )}
                    </div>
                    {notice.attachments && notice.attachments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500">সংযুক্তি: {toBengaliNumerals(notice.attachments.length)} টি ফাইল</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <NoticePage />
    </ProtectedRoute>
  );
}
