'use client';

import { useState, useEffect, useRef } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp, where, limit } from 'firebase/firestore';
import { settingsQueries, SystemSettings } from '@/lib/database-queries';
import { 
  Bell, AlertCircle, Calendar, Clock, User, ChevronRight, 
  Eye, ArrowLeft, CheckCircle, Info, AlertTriangle
} from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  description: string;
  category: 'all' | 'teachers' | 'students' | 'parents';
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'archived';
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  expiresAt?: Timestamp;
  attachments?: string[];
}

const PublicNoticePage = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeNotices, setActiveNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generalSettings, setGeneralSettings] = useState<SystemSettings | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Load settings once (optimized for public page)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsQueries.getSettings();
        setGeneralSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Load notices once (optimized for public page)
  useEffect(() => {
    const loadNotices = async () => {
      setLoading(true);
      try {
        // Try to use optimized query with limit
        let q;
        try {
          q = query(
            collection(db, 'notices'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(50) // Limit to 50 most recent notices
          );
        } catch (e) {
          // If query fails (missing index), use simple query
          q = query(collection(db, 'notices'), limit(50));
        }

        const snapshot = await getDocs(q);
        const noticesData: Notice[] = [];
        const now = new Date();
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          // Filter: only active notices
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
            noticesData.push({
              id: docSnap.id,
              title: data.title || '',
              description: data.description || '',
              category: data.category || 'all',
              priority: data.priority || 'medium',
              status: data.status || 'active',
              createdBy: data.createdBy || '',
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt,
              expiresAt: data.expiresAt,
              attachments: data.attachments || [],
            } as Notice);
          }
        });

        // Sort by createdAt in descending order
        noticesData.sort((a, b) => {
          try {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
          } catch (e) {
            return 0;
          }
        });

        setNotices(noticesData);
        setActiveNotices(noticesData);
      } catch (error) {
        console.error('Error loading notices:', error);
        setNotices([]);
        setActiveNotices([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotices();
  }, []);

  // Format date
  const formatDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return 'তারিখ নেই';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Get relative time
  const getRelativeTime = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'আজ';
    if (diffInDays === 1) return 'গতকাল';
    if (diffInDays < 7) return `${diffInDays} দিন আগে`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} সপ্তাহ আগে`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} মাস আগে`;
    return `${Math.floor(diffInDays / 365)} বছর আগে`;
  };

  // Get priority icon and color
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
          iconColor: 'text-red-600'
        };
      case 'medium':
        return {
          icon: AlertCircle,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
          iconColor: 'text-yellow-600'
        };
      case 'low':
        return {
          icon: Info,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          iconColor: 'text-green-600'
        };
      default:
        return {
          icon: Bell,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300',
          iconColor: 'text-blue-600'
        };
    }
  };

  // Get category label
  const getCategoryLabel = (category: string): string => {
    const labels: { [key: string]: string } = {
      all: 'সকল',
      teachers: 'শিক্ষক',
      students: 'শিক্ষার্থী',
      parents: 'অভিভাবক',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Scrolling Headline Ticker */}
      {activeNotices.length > 0 && (
        <div className="bg-gray-100 border-b border-gray-300 py-2 fixed w-full top-20 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center overflow-hidden">
              {/* Notice Badge */}
              <div className="flex items-center mr-4 flex-shrink-0">
                <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  নোটিশ
                </span>
              </div>

              {/* Scrolling Ticker */}
              <div className="flex-1 overflow-hidden relative">
                <div 
                  ref={tickerRef}
                  className="flex items-center space-x-8 animate-scroll"
                  style={{
                    animationDuration: `${activeNotices.length * 5}s`,
                  }}
                >
                  {/* Duplicate items for seamless loop */}
                  {[...activeNotices, ...activeNotices].map((notice, index) => {
                    const priorityStyle = getPriorityStyle(notice.priority);
                    const PriorityIcon = priorityStyle.icon;
                    
                    return (
                      <div 
                        key={`${notice.id}-${index}`}
                        className="flex items-center space-x-2 whitespace-nowrap flex-shrink-0"
                      >
                        <PriorityIcon className={`w-4 h-4 ${priorityStyle.iconColor}`} />
                        <span className="text-sm font-medium text-gray-900">
                          {notice.title}
                        </span>
                        <span className="text-gray-400">•</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`pt-24 pb-12 ${activeNotices.length > 0 ? 'pt-32' : 'pt-24'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">নোটিশ বোর্ড</h1>
                <p className="text-gray-600">সকল গুরুত্বপূর্ণ ঘোষণা ও নোটিশ</p>
              </div>
            </div>
          </div>

          {/* Notice Cards Grid */}
          {activeNotices.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl text-gray-500">কোনো নোটিশ নেই</p>
              <p className="text-gray-400 mt-2">নতুন নোটিশ প্রকাশিত হলে এখানে দেখানো হবে</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeNotices.map((notice) => {
                const priorityStyle = getPriorityStyle(notice.priority);
                const PriorityIcon = priorityStyle.icon;
                const relativeTime = getRelativeTime(notice.createdAt);

                return (
                  <div
                    key={notice.id}
                    onClick={() => setSelectedNotice(notice)}
                    className={`bg-white rounded-xl shadow-sm border-2 ${priorityStyle.borderColor} p-6 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex items-center space-x-2 ${priorityStyle.bgColor} ${priorityStyle.textColor} px-3 py-1 rounded-full`}>
                        <PriorityIcon className={`w-4 h-4 ${priorityStyle.iconColor}`} />
                        <span className="text-xs font-semibold">
                          {notice.priority === 'high' ? 'জরুরি' : notice.priority === 'medium' ? 'গুরুত্বপূর্ণ' : 'সাধারণ'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {getCategoryLabel(notice.category)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {notice.title}
                    </h3>

                    {/* Description Preview */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {notice.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{relativeTime}</span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-sm font-medium">
                        <span>বিস্তারিত</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Expiry Date (if set) */}
                    {notice.expiresAt && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>মেয়াদ শেষ: {formatDate(notice.expiresAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-modal-enter"
          onClick={() => setSelectedNotice(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {(() => {
                    const priorityStyle = getPriorityStyle(selectedNotice.priority);
                    const PriorityIcon = priorityStyle.icon;
                    return (
                      <div className={`${priorityStyle.bgColor} ${priorityStyle.textColor} px-3 py-1 rounded-full flex items-center space-x-2`}>
                        <PriorityIcon className={`w-4 h-4 ${priorityStyle.iconColor}`} />
                        <span className="text-xs font-semibold">
                          {selectedNotice.priority === 'high' ? 'জরুরি' : selectedNotice.priority === 'medium' ? 'গুরুত্বপূর্ণ' : 'সাধারণ'}
                        </span>
                      </div>
                    );
                  })()}
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {getCategoryLabel(selectedNotice.category)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedNotice.title}</h2>
              
              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedNotice.description}
                </p>
              </div>

              {/* Notice Metadata */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>প্রকাশিত: {formatDate(selectedNotice.createdAt)}</span>
                </div>
                {selectedNotice.expiresAt && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>মেয়াদ শেষ: {formatDate(selectedNotice.expiresAt)}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>বিভাগ: {getCategoryLabel(selectedNotice.category)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
              <button
                onClick={() => setSelectedNotice(null)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">{generalSettings?.schoolName || 'ইকরা নূরানী একাডেমি'}</h3>
              <p className="text-gray-400">{generalSettings?.schoolDescription || 'শিক্ষার জন্য আমাদের অঙ্গীকার'}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">যোগাযোগ</h4>
              <div className="space-y-2 text-gray-400">
                <p>📞 {generalSettings?.schoolPhone || '+৮৮০ ১৭১১ ১১১১১১'}</p>
                <p>✉️ {generalSettings?.schoolEmail || 'info@iqraschool.edu'}</p>
                <p>📍 {generalSettings?.schoolAddress || 'ঢাকা, বাংলাদেশ'}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">দ্রুত লিঙ্ক</h4>
              <div className="space-y-2 text-gray-400">
                <a href="/" className="block hover:text-white transition-colors">হোম</a>
                <a href="/about" className="block hover:text-white transition-colors">আমাদের সম্পর্কে</a>
                <a href="/contact" className="block hover:text-white transition-colors">যোগাযোগ</a>
                <a href="/notice" className="block hover:text-white transition-colors">নোটিশ</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} {generalSettings?.schoolName || 'ইকরা নূরানী একাডেমি'}. সকল অধিকার সংরক্ষিত।</p>
          </div>
        </div>
      </footer>

      {/* Scroll Animation CSS */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PublicNoticePage;

