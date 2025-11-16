'use client';

import { useState, useEffect, useCallback } from 'react';
import TeacherLayout from '@/components/TeacherLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { SCHOOL_ID } from '@/lib/constants';
import { collection, query, where, orderBy, onSnapshot, Unsubscribe, getDocs } from 'firebase/firestore';
import { MessageSquare, DollarSign, CheckCircle, Bell } from 'lucide-react';

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
  if (date.toDate) {
    return date.toDate().toLocaleDateString('bn-BD');
  }
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString('bn-BD');
  }
  return '';
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
    } else {
      return formatDate(date);
    }
  } catch {
    return '';
  }
};

function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  // Helper function to process messages
  const processMessages = useCallback((snapshot: any) => {
    console.log('📨 Processing messages, snapshot size:', snapshot.size || snapshot.docs?.length || 0);
    
    const allMessages = snapshot.docs.map((doc: any) => {
      const data = typeof doc.data === 'function' ? doc.data() : doc;
      const messageId = doc.id || data.id;
      
      return {
        id: messageId,
        ...data
      };
    });

    // Sort by createdAt (newest first)
    allMessages.sort((a: any, b: any) => {
      const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });

    console.log('✅ Processed messages count:', allMessages.length);
    
    setMessages(allMessages);
    
    // Auto-select first unread message or first message if no message is selected
    setSelectedMessage((prevSelected: any) => {
      if (allMessages.length === 0) {
        return null;
      }
      
      if (!prevSelected) {
        const firstUnread = allMessages.find((m: any) => !m.isRead);
        const messageToSelect = firstUnread || allMessages[0];
        return messageToSelect;
      } else {
        const updatedSelected = allMessages.find((m: any) => m.id === prevSelected.id);
        if (updatedSelected) {
          return updatedSelected;
        } else {
          const firstUnread = allMessages.find((m: any) => !m.isRead);
          return firstUnread || allMessages[0];
        }
      }
    });
  }, []);

  // Setup real-time listener for messages
  useEffect(() => {
    if (!user?.uid) {
      console.log('⚠️ No user UID found, cannot load messages');
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('📨 Setting up real-time messages listener for teacher:', user.uid);
    
    let unsubscribeList: Unsubscribe[] = [];
    
    // Load admin messages from messages collection
    const adminMessagesRef = collection(db, 'messages');
    
    const loadAdminMessages = () => {
      getDocs(adminMessagesRef).then((adminSnapshot) => {
        console.log('📨 Loading admin messages, total:', adminSnapshot.size);
        
        const adminMessages = adminSnapshot.docs
          .map((doc: any) => {
            const data = doc.data();
            const recipientType = data.recipientType || 'bulk';
            const recipientCategory = data.recipientCategory || 'all';
            const recipients = data.recipients || [];
            
            // CRITICAL: Check if this teacher should see this message
            let shouldShow = false;
            
            if (recipientType === 'individual') {
              // If individual recipients selected, ONLY show if this teacher's UID is in recipients list
              // Use .trim() to handle any whitespace issues in UIDs
              const teacherUid = (user.uid || '').trim();
              const isRecipient = recipients.some((r: any) => {
                const recipientUid = (r.uid || '').trim();
                const matches = recipientUid === teacherUid;
                if (matches) {
                  console.log(`✅ Individual recipient match found:`, {
                    messageId: doc.id,
                    teacherUid,
                    recipientUid,
                    recipientName: r.name,
                    recipientRole: r.role
                  });
                }
                return matches;
              });
              shouldShow = isRecipient;
              console.log(`📨 Individual message check for teacher ${teacherUid}:`, {
                messageId: doc.id,
                isRecipient,
                recipients: recipients.map((r: any) => ({ 
                  uid: (r.uid || '').trim(), 
                  name: r.name,
                  role: r.role 
                }))
              });
            } else {
              // If bulk message, check category
              // Check if this teacher is in the recipients list (for bulk with specific selection)
              const teacherUid = (user.uid || '').trim();
              const isRecipient = recipients.some((r: any) => {
                const recipientUid = (r.uid || '').trim();
                return recipientUid === teacherUid;
              });
              // Check if category matches
              const isTeacherCategory = recipientCategory === 'all' || recipientCategory === 'teachers';
              // Show if: (1) teacher is in recipients list, OR (2) category is 'all' or 'teachers'
              shouldShow = isRecipient || isTeacherCategory;
              console.log(`📨 Bulk message check for teacher ${teacherUid}:`, {
                messageId: doc.id,
                recipientCategory,
                isRecipient,
                isTeacherCategory,
                shouldShow
              });
            }
            
            if (shouldShow) {
              return {
                id: doc.id,
                title: data.subject || '',
                message: data.message || '',
                subject: data.subject || '',
                description: data.message || '',
                type: 'admin_message',
                senderName: data.senderName || 'Admin',
                createdAt: data.sentAt || data.createdAt,
                isRead: false,
                source: 'adminMessages'
              };
            }
            return null;
          })
          .filter(Boolean);
        
        console.log('📨 Admin messages for this teacher:', adminMessages.length);
        
        // Sort by createdAt (newest first)
        adminMessages.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return dateB - dateA;
        });
        
        processMessages({ docs: adminMessages.map((msg: any, idx: number) => ({
          id: msg.id || `msg-${idx}`,
          data: () => msg
        })) } as any);
        setLoading(false);
      }).catch((error) => {
        console.error('❌ Error loading admin messages:', error);
        setLoading(false);
      });
    };
    
    // Initial load
    loadAdminMessages();
    
    // Setup real-time listener for admin messages
    const adminMessagesQuery = query(
      adminMessagesRef,
      orderBy('sentAt', 'desc')
    );
    
    const unsubscribeAdminMessages = onSnapshot(
      adminMessagesQuery,
      (snapshot) => {
        console.log('🔄 Real-time admin messages update:', snapshot.size, 'messages');
        
        const adminMessages = snapshot.docs
          .map((doc: any) => {
            const data = doc.data();
            const recipientType = data.recipientType || 'bulk';
            const recipientCategory = data.recipientCategory || 'all';
            const recipients = data.recipients || [];
            
            // CRITICAL: Check if this teacher should see this message
            let shouldShow = false;
            
            if (recipientType === 'individual') {
              // If individual recipients selected, ONLY show if this teacher's UID is in recipients list
              // Use .trim() to handle any whitespace issues in UIDs
              const teacherUid = (user.uid || '').trim();
              const isRecipient = recipients.some((r: any) => {
                const recipientUid = (r.uid || '').trim();
                return recipientUid === teacherUid;
              });
              shouldShow = isRecipient;
              if (isRecipient) {
                console.log(`✅ Individual message match in real-time listener:`, {
                  messageId: doc.id,
                  teacherUid,
                  recipientCount: recipients.length
                });
              }
            } else {
              // If bulk message, check category
              const teacherUid = (user.uid || '').trim();
              const isRecipient = recipients.some((r: any) => {
                const recipientUid = (r.uid || '').trim();
                return recipientUid === teacherUid;
              });
              const isTeacherCategory = recipientCategory === 'all' || recipientCategory === 'teachers';
              shouldShow = isRecipient || isTeacherCategory;
            }
            
            if (shouldShow) {
              return {
                id: doc.id,
                title: data.subject || '',
                message: data.message || '',
                subject: data.subject || '',
                description: data.message || '',
                type: 'admin_message',
                senderName: data.senderName || 'Admin',
                createdAt: data.sentAt || data.createdAt,
                isRead: false,
                source: 'adminMessages'
              };
            }
            return null;
          })
          .filter(Boolean);
        
        adminMessages.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return dateB - dateA;
        });
        
        processMessages({ docs: adminMessages.map((msg: any, idx: number) => ({
          id: msg.id || `msg-${idx}`,
          data: () => msg
        })) } as any);
      },
      (error) => {
        console.error('❌ Error in admin messages listener:', error);
        // If orderBy fails, try without orderBy
        if (error.code === 'failed-precondition') {
          const adminMessagesQuerySimple = query(adminMessagesRef);
          const unsubscribeAdminSimple = onSnapshot(
            adminMessagesQuerySimple,
            (snapshot) => {
              const adminMessages = snapshot.docs
                .map((doc: any) => {
                  const data = doc.data();
                  const recipientType = data.recipientType || 'bulk';
                  const recipientCategory = data.recipientCategory || 'all';
                  const recipients = data.recipients || [];
                  
                  // CRITICAL: Check if this teacher should see this message
                  let shouldShow = false;
                  
                  if (recipientType === 'individual') {
                    // If individual recipients selected, ONLY show if this teacher's UID is in recipients list
                    // Use .trim() to handle any whitespace issues in UIDs
                    const teacherUid = (user.uid || '').trim();
                    const isRecipient = recipients.some((r: any) => {
                      const recipientUid = (r.uid || '').trim();
                      return recipientUid === teacherUid;
                    });
                    shouldShow = isRecipient;
                  } else {
                    // If bulk message, check category
                    const teacherUid = (user.uid || '').trim();
                    const isRecipient = recipients.some((r: any) => {
                      const recipientUid = (r.uid || '').trim();
                      return recipientUid === teacherUid;
                    });
                    const isTeacherCategory = recipientCategory === 'all' || recipientCategory === 'teachers';
                    shouldShow = isRecipient || isTeacherCategory;
                  }
                  
                  if (shouldShow) {
                    return {
                      id: doc.id,
                      title: data.subject || '',
                      message: data.message || '',
                      subject: data.subject || '',
                      description: data.message || '',
                      type: 'admin_message',
                      senderName: data.senderName || 'Admin',
                      createdAt: data.sentAt || data.createdAt,
                      isRead: false,
                      source: 'adminMessages'
                    };
                  }
                  return null;
                })
                .filter(Boolean);
              
              adminMessages.sort((a: any, b: any) => {
                const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return dateB - dateA;
              });
              
              processMessages({ docs: adminMessages.map((msg: any, idx: number) => ({
                id: msg.id || `msg-${idx}`,
                data: () => msg
              })) } as any);
            }
          );
          unsubscribeList.push(unsubscribeAdminSimple);
        }
      }
    );
    
    unsubscribeList.push(unsubscribeAdminMessages);

    // Cleanup function
    return () => {
      console.log('🔌 Unsubscribing from all messages listeners');
      unsubscribeList.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid, processMessages]);

  const handleMessageClick = async (message: any) => {
    setSelectedMessage(message);
    
    // Mark as read if unread (for admin messages, we can update locally)
    if (!message.isRead) {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, isRead: true } : m
      ));
      setSelectedMessage({ ...message, isRead: true });
    }
  };

  const unreadCount = messages.filter((m: any) => !m.isRead).length;
  const adminMessages = messages.filter((m: any) => m.type === 'admin_message');

  if (loading) {
    return (
      <TeacherLayout title="বার্তা" subtitle="প্রশাসনিক বার্তা">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="বার্তা" subtitle="প্রশাসনিক বার্তা">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">বার্তাসমূহ</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {toBengaliNumerals(unreadCount)} নতুন
                </span>
              )}
            </div>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {adminMessages.length > 0 && (
              <>
                <div className="p-3 bg-purple-50 border-b border-purple-200">
                  <h3 className="text-sm font-semibold text-purple-900 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    প্রশাসনিক বার্তা
                  </h3>
                </div>
                {adminMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedMessage?.id === message.id ? 'bg-purple-50' : ''
                    } ${!message.isRead ? 'bg-purple-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {message.subject || message.title || 'বার্তা'}
                          </p>
                          {!message.isRead && (
                            <span className="w-2 h-2 bg-purple-500 rounded-full ml-2 flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate mt-1">
                          {message.senderName || 'Admin'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{getTimeAgo(message.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>কোন বার্তা নেই</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          {selectedMessage ? (
            <>
              {/* Message Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedMessage.subject || selectedMessage.title || 'প্রশাসনিক বার্তা'}
                    </p>
                    <p className="text-xs text-gray-600">{getTimeAgo(selectedMessage.createdAt)}</p>
                  </div>
                  {selectedMessage.isRead && (
                    <div className="ml-auto flex items-center text-xs text-gray-500">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      পড়া হয়েছে
                    </div>
                  )}
                </div>
              </div>

              {/* Message Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      {selectedMessage.subject || selectedMessage.title || 'বার্তা'}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">প্রেরক:</span>
                        <span className="font-medium text-gray-900">{selectedMessage.senderName || 'Admin'}</span>
                      </div>
                      {selectedMessage.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">তারিখ:</span>
                          <span className="font-medium text-gray-900">{formatDate(selectedMessage.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    <p>{selectedMessage.message || selectedMessage.description || 'বার্তার বিষয়বস্তু নেই'}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p>একটি বার্তা নির্বাচন করুন</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <MessagesPage />
    </ProtectedRoute>
  );
}

