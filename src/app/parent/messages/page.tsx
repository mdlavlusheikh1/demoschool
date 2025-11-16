'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getParentMessages, markMessageAsRead } from '@/lib/fee-notification-helper';
import { db } from '@/lib/firebase';
import { SCHOOL_ID } from '@/lib/constants';
import { collection, query, where, orderBy, onSnapshot, Unsubscribe, getDocs } from 'firebase/firestore';
import { MessageSquare, Send, User, Clock, DollarSign, CheckCircle, Bell } from 'lucide-react';

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
    const docs = snapshot.docs || snapshot || [];
    console.log('📨 Processing messages, input:', {
      isArray: Array.isArray(snapshot),
      hasDocs: !!snapshot.docs,
      docsLength: docs.length,
      snapshotSize: snapshot.size,
      snapshotType: typeof snapshot
    });
    
    const parentMessages = docs.map((doc: any, index: number) => {
      let data: any;
      let messageId: string;
      
      // Handle different data structures
      if (typeof doc.data === 'function') {
        data = doc.data();
        messageId = doc.id || `msg-${index}`;
      } else if (doc && typeof doc === 'object' && doc.id) {
        data = doc;
        messageId = doc.id;
      } else {
        // If doc is already the data
        data = doc;
        messageId = doc.id || data.id || `msg-${index}`;
      }
      
      console.log(`📋 Processing message ${index + 1}:`, {
        id: messageId,
        type: data.type,
        source: data.source,
        subject: data.subject,
        title: data.title,
        hasCreatedAt: !!data.createdAt,
        createdAtType: typeof data.createdAt,
        isRead: data.isRead
      });
      
      return {
        id: messageId,
        ...data
      };
    });

    // Sort by createdAt (newest first)
    parentMessages.sort((a: any, b: any) => {
      const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });

    console.log('✅ Processed messages count:', parentMessages.length);
    console.log('📋 All messages details:', parentMessages.map((m: any) => ({ 
      id: m.id, 
      type: m.type, 
      source: m.source,
      subject: m.subject || m.title,
      hasCreatedAt: !!m.createdAt
    })));
    console.log('📋 Fee payment messages:', parentMessages.filter((m: any) => m.type === 'fee_payment').length);
    console.log('📋 Admin messages:', parentMessages.filter((m: any) => m.type === 'admin_message').length);
    
    // CRITICAL: Set messages state
    console.log('🔄 Setting messages state with', parentMessages.length, 'messages');
    setMessages(parentMessages);
    
    // Auto-select first unread message or first message if no message is selected
    // Use functional update to avoid dependency on selectedMessage
    setSelectedMessage((prevSelected: any) => {
      if (parentMessages.length === 0) {
        console.log('⚠️ No messages to select');
        return null;
      }
      
      if (!prevSelected) {
        const firstUnread = parentMessages.find((m: any) => !m.isRead);
        const messageToSelect = firstUnread || parentMessages[0];
        console.log('📌 Auto-selecting message:', messageToSelect.id, messageToSelect.subject || messageToSelect.title);
        return messageToSelect;
      } else {
        // Update selected message if it still exists
        const updatedSelected = parentMessages.find((m: any) => m.id === prevSelected.id);
        if (updatedSelected) {
          return updatedSelected;
        } else {
          // If selected message was deleted, select first unread or first message
          const firstUnread = parentMessages.find((m: any) => !m.isRead);
          return firstUnread || parentMessages[0];
        }
      }
    });
  }, []);

  // Initial load function - loads all messages immediately
  const loadAllMessages = useCallback(async () => {
    if (!user?.uid) {
      console.log('⚠️ No user UID found, cannot load messages');
      return;
    }

    console.log('🔄 Initial load: Loading all messages for parent:', user.uid);
    console.log('🔄 School ID:', SCHOOL_ID);
    
    try {
      // 1. Load fee payment messages
      const parentMessagesRef = collection(db, 'parentMessages');
      const parentMessagesQuery = query(
        parentMessagesRef,
        where('parentUserId', '==', user.uid),
        where('schoolId', '==', SCHOOL_ID)
      );
      
      const parentSnapshot = await getDocs(parentMessagesQuery);
      const feePaymentMessages = parentSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        source: 'parentMessages',
        type: 'fee_payment'
      }));
      
      console.log('✅ Fee payment messages loaded:', feePaymentMessages.length);
      
      // 2. Load admin messages - try multiple approaches
      let adminMessages: any[] = [];
      
      // Try with schoolId filter first
      try {
        const adminMessagesRef = collection(db, 'messages');
        const adminMessagesQuery = query(
          adminMessagesRef,
          where('schoolId', '==', SCHOOL_ID)
        );
        
        const adminSnapshot = await getDocs(adminMessagesQuery);
        console.log('📨 Admin messages found (with schoolId filter):', adminSnapshot.size);
        
        adminMessages = adminSnapshot.docs
          .map((doc: any) => {
            const data = doc.data();
            const recipientType = data.recipientType || 'bulk';
            const recipientCategory = data.recipientCategory || 'all';
            const recipients = data.recipients || [];
            
            console.log('🔍 Checking message:', {
              id: doc.id,
              subject: data.subject,
              recipientType,
              recipientCategory,
              recipientsCount: recipients.length,
              recipients: recipients.map((r: any) => ({ uid: r.uid, role: r.role, name: r.name }))
            });
            
            let shouldShow = false;
            
            if (recipientType === 'individual') {
              // For individual messages, check if this parent's UID is in recipients list
              const isRecipient = recipients.some((r: any) => {
                const recipientUid = (r.uid || '').trim();
                const parentUid = (user.uid || '').trim();
                const matches = recipientUid === parentUid;
                
                if (!matches) {
                  console.log(`  → UID mismatch: recipient="${recipientUid}" vs parent="${parentUid}"`);
                }
                
                return matches;
              });
              
              shouldShow = isRecipient;
              console.log(`  → Individual check:`, {
                messageId: doc.id,
                subject: data.subject,
                parentUid: user.uid,
                recipientsCount: recipients.length,
                recipients: recipients.map((r: any) => ({ uid: r.uid, name: r.name, role: r.role })),
                isRecipient: isRecipient,
                result: isRecipient ? '✅ MATCH' : '❌ NO MATCH'
              });
            } else {
              // For bulk messages, check if parent is in recipients or category matches
              const isRecipient = recipients.some((r: any) => {
                const recipientUid = (r.uid || '').trim();
                const parentUid = (user.uid || '').trim();
                return recipientUid === parentUid;
              });
              // Show if: (1) parent is in recipients, OR (2) category is 'all', 'parents', OR 'students' (parents can see messages sent to their children)
              const isParentCategory = recipientCategory === 'all' || recipientCategory === 'parents' || recipientCategory === 'students';
              shouldShow = isRecipient || isParentCategory;
              console.log(`  → Bulk check: isRecipient=${isRecipient}, recipientCategory=${recipientCategory}, isParentCategory=${isParentCategory}, shouldShow=${shouldShow} ${shouldShow ? '✅ MATCH' : '❌ NO MATCH'}`);
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
        
        console.log('✅ Admin messages filtered for this parent:', adminMessages.length);
      } catch (error) {
        console.error('❌ Error loading admin messages with schoolId filter:', error);
        
        // Fallback: Load all messages and filter in code
        try {
          const adminMessagesRef = collection(db, 'messages');
          const adminSnapshot = await getDocs(adminMessagesRef);
          console.log('📨 Loading all admin messages (fallback):', adminSnapshot.size);
          
          adminMessages = adminSnapshot.docs
            .map((doc: any) => {
              const data = doc.data();
              
              // Filter by schoolId in code
              if (data.schoolId && data.schoolId !== SCHOOL_ID) {
                return null;
              }
              
              const recipientType = data.recipientType || 'bulk';
              const recipientCategory = data.recipientCategory || 'all';
              const recipients = data.recipients || [];
              
              let shouldShow = false;
              
              if (recipientType === 'individual') {
                // For individual messages, check if this parent's UID is in recipients list
                const isRecipient = recipients.some((r: any) => {
                  const recipientUid = (r.uid || '').trim();
                  const parentUid = (user.uid || '').trim();
                  return recipientUid === parentUid;
                });
                shouldShow = isRecipient;
                console.log(`📨 Fallback individual check:`, {
                  messageId: doc.id,
                  subject: data.subject,
                  parentUid: user.uid,
                  recipients: recipients.map((r: any) => ({ uid: r.uid, name: r.name, role: r.role })),
                  isRecipient: isRecipient
                });
              } else {
                // For bulk messages, check if parent is in recipients or category matches
                const isRecipient = recipients.some((r: any) => {
                  const recipientUid = (r.uid || '').trim();
                  const parentUid = (user.uid || '').trim();
                  return recipientUid === parentUid;
                });
                // Show if: (1) parent is in recipients, OR (2) category is 'all', 'parents', OR 'students' (parents can see messages sent to their children)
                const isParentCategory = recipientCategory === 'all' || recipientCategory === 'parents' || recipientCategory === 'students';
                shouldShow = isRecipient || isParentCategory;
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
          
          console.log('✅ Admin messages (fallback) filtered for this parent:', adminMessages.length);
        } catch (fallbackError) {
          console.error('❌ Error loading admin messages (fallback):', fallbackError);
        }
      }
      
      // Combine and sort messages
      const allMessages = [...feePaymentMessages, ...adminMessages];
      allMessages.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      });
      
      console.log('✅ Total messages loaded:', allMessages.length);
      console.log('📋 Messages breakdown:', {
        feePayment: feePaymentMessages.length,
        admin: adminMessages.length,
        total: allMessages.length
      });
      
      // Update state - pass messages directly as array
      console.log('🔄 Calling processMessages with', allMessages.length, 'messages');
      processMessages(allMessages.map((msg: any, idx: number) => ({
        id: msg.id || `msg-${idx}`,
        ...msg,
        // Ensure data() function exists for compatibility
        data: () => msg
      })));
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error in initial load:', error);
      setLoading(false);
    }
  }, [user?.uid, processMessages]);

  // Setup real-time listener for messages
  useEffect(() => {
    if (!user?.uid) {
      console.log('⚠️ No user UID found, cannot load messages');
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('📨 Setting up real-time messages listener for parent:', user.uid);
    console.log('📨 School ID:', SCHOOL_ID);
    
    // Initial load first
    loadAllMessages();
    
    let unsubscribeList: Unsubscribe[] = [];
    
    // 1. Load fee payment messages from parentMessages collection
    const parentMessagesRef = collection(db, 'parentMessages');
    const parentMessagesQuery = query(
      parentMessagesRef,
      where('parentUserId', '==', user.uid),
      where('schoolId', '==', SCHOOL_ID)
    );
    
    const unsubscribeParentMessages = onSnapshot(
      parentMessagesQuery,
      (snapshot) => {
        console.log('🔄 Real-time parentMessages update:', snapshot.size, 'messages');
        const feePaymentMessages = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          source: 'parentMessages' // Mark as fee payment message
        }));
        
        // 2. Load admin messages from messages collection
        const adminMessagesRef = collection(db, 'messages');
        const adminMessagesQuery = query(
          adminMessagesRef,
          where('schoolId', '==', SCHOOL_ID)
        );
        
        getDocs(adminMessagesQuery).then((adminSnapshot) => {
          console.log('📨 Loading admin messages for school:', SCHOOL_ID, 'total:', adminSnapshot.size);
          
          const adminMessages = adminSnapshot.docs
            .map((doc: any) => {
              const data = doc.data();
              const recipientType = data.recipientType || 'bulk';
              const recipientCategory = data.recipientCategory || 'all';
              const recipients = data.recipients || [];
              
              // CRITICAL: Check if this parent should see this message
              let shouldShow = false;
              
              if (recipientType === 'individual') {
                // If individual recipients selected, ONLY show if this parent's UID is in recipients list
                const isRecipient = recipients.some((r: any) => {
                  const recipientUid = (r.uid || '').trim();
                  const parentUid = (user.uid || '').trim();
                  return recipientUid === parentUid;
                });
                shouldShow = isRecipient;
                console.log(`📨 Individual message check for parent ${user.uid}:`, {
                  messageId: doc.id,
                  subject: data.subject,
                  parentUid: user.uid,
                  recipientsCount: recipients.length,
                  recipients: recipients.map((r: any) => ({ uid: r.uid, role: r.role, name: r.name })),
                  isRecipient: isRecipient,
                  result: isRecipient ? '✅ MATCH' : '❌ NO MATCH'
                });
              } else {
                // If bulk message, check category
                // Check if this parent is in the recipients list (for bulk with specific selection)
                const isRecipient = recipients.some((r: any) => {
                  const recipientUid = (r.uid || '').trim();
                  const parentUid = (user.uid || '').trim();
                  return recipientUid === parentUid;
                });
                // Check if category matches
                // Show if: (1) parent is in recipients, OR (2) category is 'all', 'parents', OR 'students' (parents can see messages sent to their children)
                const isParentCategory = recipientCategory === 'all' || recipientCategory === 'parents' || recipientCategory === 'students';
                shouldShow = isRecipient || isParentCategory;
                console.log(`📨 Bulk message check for parent ${user.uid}:`, {
                  messageId: doc.id,
                  subject: data.subject,
                  recipientCategory,
                  isRecipient,
                  isParentCategory,
                  shouldShow,
                  recipients: recipients.map((r: any) => ({ uid: r.uid, role: r.role, name: r.name }))
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
                  isRead: false, // Admin messages are always unread initially
                  source: 'adminMessages'
                };
              }
              return null;
            })
            .filter(Boolean);
          
          console.log('📨 Admin messages for this parent:', adminMessages.length);
          
          // Combine both types of messages
          const allMessages = [...feePaymentMessages, ...adminMessages];
          
          // Sort by createdAt (newest first)
          allMessages.sort((a: any, b: any) => {
            const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return dateB - dateA;
          });
          
          console.log('✅ Total messages (fee + admin):', allMessages.length);
          console.log('🔄 Calling processMessages (real-time listener) with', allMessages.length, 'messages');
          processMessages(allMessages.map((msg: any, idx: number) => ({
            id: msg.id || `msg-${idx}`,
            ...msg,
            data: () => msg
          })));
          setLoading(false);
        }).catch((error) => {
          console.error('❌ Error loading admin messages with schoolId filter:', error);
          console.log('⚠️ Trying fallback query without schoolId filter...');
          
          // Fallback: Try without schoolId filter (for old messages that don't have schoolId)
          const adminMessagesRefFallback = collection(db, 'messages');
          getDocs(adminMessagesRefFallback).then((adminSnapshotFallback) => {
            console.log('📨 Loading admin messages (fallback), total:', adminSnapshotFallback.size);
            
            const adminMessages = adminSnapshotFallback.docs
              .map((doc: any) => {
                const data = doc.data();
                // Filter by schoolId in code if available, otherwise show all
                if (data.schoolId && data.schoolId !== SCHOOL_ID) {
                  return null; // Skip messages from other schools
                }
                
                const recipientType = data.recipientType || 'bulk';
                const recipientCategory = data.recipientCategory || 'all';
                const recipients = data.recipients || [];
                
                let shouldShow = false;
                
                if (recipientType === 'individual') {
                  // For individual messages, check if this parent's UID is in recipients list
                  const isRecipient = recipients.some((r: any) => {
                    const recipientUid = (r.uid || '').trim();
                    const parentUid = (user.uid || '').trim();
                    return recipientUid === parentUid;
                  });
                  shouldShow = isRecipient;
                } else {
                  const isRecipient = recipients.some((r: any) => r.uid === user.uid);
                  // Show if: (1) parent is in recipients, OR (2) category is 'all', 'parents', OR 'students' (parents can see messages sent to their children)
                  const isParentCategory = recipientCategory === 'all' || recipientCategory === 'parents' || recipientCategory === 'students';
                  shouldShow = isRecipient || isParentCategory;
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
            
            const allMessages = [...feePaymentMessages, ...adminMessages];
            allMessages.sort((a: any, b: any) => {
              const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return dateB - dateA;
            });
            
            console.log('✅ Total messages (fee + admin fallback):', allMessages.length);
            console.log('🔄 Calling processMessages (fallback) with', allMessages.length, 'messages');
            processMessages(allMessages.map((msg: any, idx: number) => ({
              id: msg.id || `msg-${idx}`,
              ...msg,
              data: () => msg
            })));
            setLoading(false);
          }).catch((fallbackError) => {
            console.error('❌ Error loading admin messages (fallback):', fallbackError);
            // If admin messages fail, still process fee payment messages
            console.log('🔄 Processing fee payment messages only (fallback error)');
            processMessages(feePaymentMessages.map((msg: any, idx: number) => ({
              id: msg.id || `msg-${idx}`,
              ...msg,
              data: () => msg
            })));
            setLoading(false);
          });
        });
      },
      (error) => {
        console.error('❌ Error in parentMessages listener:', error);
        setLoading(false);
      }
    );
    
    unsubscribeList.push(unsubscribeParentMessages);
    
    // 3. Also listen to admin messages collection for real-time updates
    const adminMessagesRef = collection(db, 'messages');
    
    // Helper function to process admin messages
    const processAdminMessages = (snapshot: any, feePaymentMessages: any[]) => {
      const adminMessages = snapshot.docs
        .map((doc: any) => {
          const data = doc.data();
          
          // Filter by schoolId if available
          if (data.schoolId && data.schoolId !== SCHOOL_ID) {
            return null; // Skip messages from other schools
          }
          
          const recipientType = data.recipientType || 'bulk';
          const recipientCategory = data.recipientCategory || 'all';
          const recipients = data.recipients || [];
          
          // CRITICAL: Check if this parent should see this message
          let shouldShow = false;
          
            if (recipientType === 'individual') {
              // If individual recipients selected, ONLY show if this parent's UID is in recipients list
              const isRecipient = recipients.some((r: any) => {
                const recipientUid = (r.uid || '').trim();
                const parentUid = (user.uid || '').trim();
                return recipientUid === parentUid;
              });
              shouldShow = isRecipient;
              console.log(`📨 Real-time individual message check for parent ${user.uid}:`, {
                messageId: doc.id,
                subject: data.subject,
                parentUid: user.uid,
                recipientsCount: recipients.length,
                recipients: recipients.map((r: any) => ({ uid: r.uid, role: r.role, name: r.name })),
                isRecipient: isRecipient,
                result: isRecipient ? '✅ MATCH' : '❌ NO MATCH'
              });
            } else {
            // If bulk message, check category
            const isRecipient = recipients.some((r: any) => {
              const recipientUid = (r.uid || '').trim();
              const parentUid = (user.uid || '').trim();
              return recipientUid === parentUid;
            });
            // Show if: (1) parent is in recipients, OR (2) category is 'all', 'parents', OR 'students' (parents can see messages sent to their children)
            const isParentCategory = recipientCategory === 'all' || recipientCategory === 'parents' || recipientCategory === 'students';
            shouldShow = isRecipient || isParentCategory;
            console.log(`📨 Real-time bulk message check for parent ${user.uid}:`, {
              messageId: doc.id,
              subject: data.subject,
              recipientCategory,
              isRecipient,
              isParentCategory,
              shouldShow,
              recipients: recipients.map((r: any) => ({ uid: r.uid, role: r.role, name: r.name }))
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
      
      const allMessages = [...feePaymentMessages, ...adminMessages];
      allMessages.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      });
      
          console.log('✅ Real-time total messages (fee + admin):', allMessages.length);
          console.log('🔄 Calling processMessages (real-time) with', allMessages.length, 'messages');
          processMessages(allMessages.map((msg: any, idx: number) => ({
            id: msg.id || `msg-${idx}`,
            ...msg,
            data: () => msg
          })));
    };
    
    // Try with orderBy first
    const adminMessagesQuery = query(
      adminMessagesRef,
      where('schoolId', '==', SCHOOL_ID),
      orderBy('sentAt', 'desc')
    );
    
    const unsubscribeAdminMessages = onSnapshot(
      adminMessagesQuery,
      (snapshot) => {
        console.log('🔄 Real-time admin messages update for school:', SCHOOL_ID, 'total:', snapshot.size, 'messages');
        
        // Reload parent messages and combine
        getDocs(parentMessagesQuery).then((parentSnapshot) => {
          const feePaymentMessages = parentSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            source: 'parentMessages'
          }));
          
          processAdminMessages(snapshot, feePaymentMessages);
        }).catch((error) => {
          console.error('❌ Error loading parent messages in real-time listener:', error);
        });
      },
      (error) => {
        console.error('❌ Error in admin messages listener with orderBy:', error);
        console.log('⚠️ Trying fallback query without orderBy...');
        
        // Fallback: Try without orderBy
        const adminMessagesQueryFallback = query(
          adminMessagesRef,
          where('schoolId', '==', SCHOOL_ID)
        );
        
        const unsubscribeAdminFallback = onSnapshot(
          adminMessagesQueryFallback,
          (snapshot) => {
            console.log('🔄 Real-time admin messages update (fallback) for school:', SCHOOL_ID, 'total:', snapshot.size, 'messages');
            
            // Reload parent messages and combine
            getDocs(parentMessagesQuery).then((parentSnapshot) => {
              const feePaymentMessages = parentSnapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
                source: 'parentMessages'
              }));
              
              processAdminMessages(snapshot, feePaymentMessages);
            }).catch((error) => {
              console.error('❌ Error loading parent messages in fallback listener:', error);
            });
          },
          (fallbackError) => {
            console.error('❌ Error in admin messages fallback listener:', fallbackError);
            console.log('⚠️ Trying final fallback without schoolId filter...');
            
            // Final fallback: Try without schoolId filter
            const adminMessagesQueryFinal = query(adminMessagesRef);
            
            const unsubscribeAdminFinal = onSnapshot(
              adminMessagesQueryFinal,
              (snapshot) => {
                console.log('🔄 Real-time admin messages update (final fallback), total:', snapshot.size, 'messages');
                
                // Reload parent messages and combine
                getDocs(parentMessagesQuery).then((parentSnapshot) => {
                  const feePaymentMessages = parentSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                    source: 'parentMessages'
                  }));
                  
                  processAdminMessages(snapshot, feePaymentMessages);
                }).catch((error) => {
                  console.error('❌ Error loading parent messages in final fallback listener:', error);
                });
              },
              (finalError) => {
                console.error('❌ Error in admin messages final fallback listener:', finalError);
              }
            );
            
            unsubscribeList.push(unsubscribeAdminFinal);
          }
        );
        
        unsubscribeList.push(unsubscribeAdminFallback);
      }
    );
    
    unsubscribeList.push(unsubscribeAdminMessages);

    // Cleanup function
    return () => {
      console.log('🔌 Unsubscribing from all messages listeners');
      unsubscribeList.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid, processMessages, loadAllMessages]);

  const handleMessageClick = async (message: any) => {
    setSelectedMessage(message);
    
    // Mark as read if unread
    // Only mark fee payment messages as read in database (they are in parentMessages collection)
    // Admin messages are in messages collection, so we only update local state for them
    if (!message.isRead && message.id) {
      try {
        // Only call markMessageAsRead for fee payment messages (parentMessages collection)
        if (message.type === 'fee_payment' && message.source === 'parentMessages') {
        await markMessageAsRead(message.id);
        }
        // For admin messages, we only update local state (they are in messages collection, not parentMessages)
        // Update local state for both types
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, isRead: true } : m
        ));
        setSelectedMessage({ ...message, isRead: true });
      } catch (error) {
        console.error('Error marking message as read:', error);
        // If error occurs, still update local state
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, isRead: true } : m
        ));
        setSelectedMessage({ ...message, isRead: true });
      }
    }
  };

  const unreadCount = messages.filter((m: any) => !m.isRead).length;
  const feePaymentMessages = messages.filter((m: any) => m.type === 'fee_payment');
  const adminMessages = messages.filter((m: any) => m.type === 'admin_message');
  const otherMessages = messages.filter((m: any) => m.type !== 'fee_payment' && m.type !== 'admin_message');
  
  console.log('📊 UI Render - Messages state:', {
    totalMessages: messages.length,
    feePaymentCount: feePaymentMessages.length,
    adminMessagesCount: adminMessages.length,
    otherCount: otherMessages.length,
    unreadCount: unreadCount,
    messages: messages.map((m: any) => ({ id: m.id, type: m.type, studentName: m.studentName, subject: m.subject }))
  });

  if (loading) {
    return (
      <ParentLayout title="বার্তা" subtitle="ফি পেমেন্ট এবং অন্যান্য বার্তা">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="বার্তা" subtitle="ফি পেমেন্ট এবং অন্যান্য বার্তা">
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
            {feePaymentMessages.length > 0 && (
              <>
                <div className="p-3 bg-green-50 border-b border-green-200">
                  <h3 className="text-sm font-semibold text-green-900 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    ফি পেমেন্ট
                  </h3>
                </div>
                {feePaymentMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                    } ${!message.isRead ? 'bg-green-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        message.type === 'fee_payment' ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {message.type === 'fee_payment' ? (
                          <DollarSign className="w-5 h-5 text-white" />
                        ) : (
                          <Bell className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">ফি পেমেন্ট কনফার্মেশন</p>
                          {!message.isRead && (
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {message.studentName} - {message.feeName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{getTimeAgo(message.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

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

            {otherMessages.length > 0 && (
              <>
                <div className="p-3 bg-blue-50 border-b border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 flex items-center">
                    <Bell className="w-4 h-4 mr-2" />
                    অন্যান্য বার্তা
                  </h3>
                </div>
                {otherMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                    } ${!message.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">নোটিফিকেশন</p>
                          {!message.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedMessage.type === 'fee_payment' 
                      ? 'bg-green-600' 
                      : selectedMessage.type === 'admin_message'
                      ? 'bg-purple-600'
                      : 'bg-blue-600'
                  }`}>
                    {selectedMessage.type === 'fee_payment' ? (
                      <DollarSign className="w-5 h-5 text-white" />
                    ) : selectedMessage.type === 'admin_message' ? (
                      <MessageSquare className="w-5 h-5 text-white" />
                    ) : (
                      <Bell className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedMessage.type === 'fee_payment' 
                        ? 'ফি পেমেন্ট কনফার্মেশন' 
                        : selectedMessage.type === 'admin_message'
                        ? (selectedMessage.subject || selectedMessage.title || 'প্রশাসনিক বার্তা')
                        : 'নোটিফিকেশন'
                      }
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
                {selectedMessage.type === 'fee_payment' ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        ফি পেমেন্ট সফল
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">শিক্ষার্থীর নাম:</span>
                          <span className="font-medium text-gray-900">{selectedMessage.studentName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ক্লাস:</span>
                          <span className="font-medium text-gray-900">{selectedMessage.className}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ফির ধরন:</span>
                          <span className="font-medium text-gray-900">{selectedMessage.feeName}</span>
                        </div>
                        {selectedMessage.month && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">মাস:</span>
                            <span className="font-medium text-gray-900">{selectedMessage.month}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">পরিমাণ:</span>
                          <span className="font-medium text-green-600 text-lg">
                            ৳{toBengaliNumerals(selectedMessage.amount)}
                          </span>
                        </div>
                        {selectedMessage.voucherNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">ভাউচার নম্বর:</span>
                            <span className="font-medium text-gray-900">{selectedMessage.voucherNumber}</span>
                          </div>
                        )}
                        {selectedMessage.paymentMethod && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">পেমেন্ট পদ্ধতি:</span>
                            <span className="font-medium text-gray-900">{selectedMessage.paymentMethod}</span>
                          </div>
                        )}
                        {selectedMessage.paymentDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">পেমেন্ট তারিখ:</span>
                            <span className="font-medium text-gray-900">{formatDate(selectedMessage.paymentDate)}</span>
                          </div>
                        )}
                        {selectedMessage.collectedBy && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">সংগ্রহ করেছেন:</span>
                            <span className="font-medium text-gray-900">{selectedMessage.collectedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>
                        {selectedMessage.studentName} ({selectedMessage.className}) এর {selectedMessage.feeName}
                        {selectedMessage.month ? ` (${selectedMessage.month})` : ''} - ৳{toBengaliNumerals(selectedMessage.amount)} 
                        সফলভাবে সংগ্রহ করা হয়েছে।
                      </p>
                    </div>
                  </div>
                ) : selectedMessage.type === 'admin_message' ? (
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
                ) : (
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    <p>{selectedMessage.message || selectedMessage.description || 'বার্তার বিষয়বস্তু নেই'}</p>
                  </div>
                )}
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
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <MessagesPage />
    </ProtectedRoute>
  );
}
