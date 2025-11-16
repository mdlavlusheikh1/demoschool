'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { studentQueries, teacherQueries, parentQueries, classQueries } from '@/lib/database-queries';
import type { User as UserType } from '@/lib/queries/user-queries';
import { sendSMS, sendBulkSMS, formatPhoneNumber, getSMSConfigFromSettings } from '@/lib/sms-api';
import { sendNotification } from '@/lib/notification-helper';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, deleteDoc, doc, where, getDocs } from 'firebase/firestore';
import { SCHOOL_ID } from '@/lib/constants';
import { 
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Plus, MessageSquare, Send, Trash2, Eye, User as UserIcon,
  Package,
  Globe,
  FileText,
  Award,
  Gift,
  Sparkles,
  AlertCircle,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  Mail,
  Smartphone,
} from 'lucide-react';

interface Message {
  id: string;
  subject: string;
  message: string;
  recipients: Array<{
    uid: string;
    name: string;
    phone?: string;
    role: string;
  }>;
  recipientType: 'individual' | 'bulk';
  recipientCategory: 'all' | 'teachers' | 'students' | 'parents';
  messageType: 'free' | 'sms';
  senderUid: string;
  senderName: string;
  sentAt: Timestamp;
  status: 'sent' | 'failed' | 'pending';
  smsCost?: number;
  totalRecipients: number;
  deliveredCount?: number;
  failedCount?: number;
}

function MessagePage() {
  const { user: authUser, userData, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Message form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'free' | 'sms'>('free');
  const [recipientType, setRecipientType] = useState<'individual' | 'bulk'>('bulk');
  const [recipientCategory, setRecipientCategory] = useState<'all' | 'teachers' | 'students' | 'parents'>('all');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  // Data state
  const [teachers, setTeachers] = useState<UserType[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);
  const [parents, setParents] = useState<UserType[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageError, setImageError] = useState(false);
  
  // Class selection state
  const [classes, setClasses] = useState<Array<{ classId: string; className: string; section?: string }>>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  // Role filter state (for class-based filtering)
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'students' | 'teachers' | 'parents'>('students');
  
  // Selected names from role filter list
  const [selectedNamesFromList, setSelectedNamesFromList] = useState<Set<string>>(new Set());

  // Message templates
  const messageTemplates = [
    {
      id: '',
      name: 'টেমপ্লেট নির্বাচন করুন',
      subject: '',
      message: ''
    },
    {
      id: 'attendance',
      name: 'উপস্থিতি নোটিশ',
      subject: 'উপস্থিতি সম্পর্কে',
      message: 'আপনার সন্তান/সন্তানীর উপস্থিতি নিয়ে আপনার সাথে যোগাযোগ করা প্রয়োজন। অনুগ্রহ করে শীঘ্রই আমাদের সাথে যোগাযোগ করুন।'
    },
    {
      id: 'exam',
      name: 'পরীক্ষা সংক্রান্ত',
      subject: 'পরীক্ষা সম্পর্কে',
      message: 'আপনার সন্তান/সন্তানীর পরীক্ষা সম্পর্কে গুরুত্বপূর্ণ তথ্য রয়েছে। অনুগ্রহ করে অ্যাপটি চেক করুন।'
    },
    {
      id: 'homework',
      name: 'বাড়ির কাজ',
      subject: 'বাড়ির কাজ',
      message: 'আজকের বাড়ির কাজ দেওয়া হয়েছে। অনুগ্রহ করে আপনার সন্তান/সন্তানীকে বাড়ির কাজ সম্পন্ন করতে সহায়তা করুন।'
    },
    {
      id: 'meeting',
      name: 'মিটিং আমন্ত্রণ',
      subject: 'মিটিং আমন্ত্রণ',
      message: 'আমরা আপনাকে একটি গুরুত্বপূর্ণ মিটিংয়ে আমন্ত্রণ জানাচ্ছি। অনুগ্রহ করে নির্দিষ্ট তারিখ ও সময়ে উপস্থিত থাকুন।'
    },
    {
      id: 'payment',
      name: 'ফি পরিশোধ',
      subject: 'ফি পরিশোধ',
      message: 'আপনার মাসিক ফি পরিশোধের তারিখ হয়ে গেছে। অনুগ্রহ করে সময়মতো ফি পরিশোধ করুন।'
    },
    {
      id: 'salary',
      name: 'বেতন',
      subject: 'বেতন পরিশোধ',
      message: 'আপনার বেতন পরিশোধ করা হয়েছে। অনুগ্রহ করে অ্যাপটি চেক করুন এবং আপনার বেতন বিবরণ দেখুন।'
    },
    {
      id: 'exam-fee',
      name: 'পরীক্ষার ফি',
      subject: 'পরীক্ষার ফি পরিশোধ',
      message: 'আপনার সন্তান/সন্তানীর পরীক্ষার ফি পরিশোধের তারিখ হয়ে গেছে। অনুগ্রহ করে সময়মতো পরীক্ষার ফি পরিশোধ করুন।'
    },
    {
      id: 'admission-fee',
      name: 'ভর্তি ফি',
      subject: 'ভর্তি ফি পরিশোধ',
      message: 'ভর্তি ফি পরিশোধের তারিখ হয়ে গেছে। অনুগ্রহ করে সময়মতো ভর্তি ফি পরিশোধ করুন।'
    },
    {
      id: 'session-fee',
      name: 'সেশন ফি',
      subject: 'সেশন ফি পরিশোধ',
      message: 'আপনার সেশন ফি পরিশোধের তারিখ হয়ে গেছে। অনুগ্রহ করে সময়মতো সেশন ফি পরিশোধ করুন।'
    },
    {
      id: 'due-reminder',
      name: 'বকেয়া রিমাইন্ডার',
      subject: 'বকেয়া পরিশোধের জন্য রিমাইন্ডার',
      message: 'আপনার বকেয়া টাকা/ফি পরিশোধ করা হয়নি। অনুগ্রহ করে যত শীঘ্র সম্ভব বকেয়া পরিশোধ করুন। দেরি হলে অতিরিক্ত ফি বা শাস্তিমূলক ব্যবস্থা নেওয়া হতে পারে।'
    },
    {
      id: 'holiday',
      name: 'ছুটির ঘোষণা',
      subject: 'ছুটির ঘোষণা',
      message: 'আগামীকাল স্কুল বন্ধ থাকবে। অনুগ্রহ করে নোটিশ দেখুন।'
    },
    {
      id: 'event',
      name: 'ইভেন্ট সম্পর্কে',
      subject: 'ইভেন্ট সম্পর্কে',
      message: 'আমাদের একটি বিশেষ ইভেন্টের আয়োজন করা হয়েছে। অনুগ্রহ করে অংশগ্রহণ করুন।'
    },
    {
      id: 'general',
      name: 'সাধারণ নোটিশ',
      subject: 'জরুরি নোটিশ',
      message: 'এটি একটি গুরুত্বপূর্ণ নোটিশ। অনুগ্রহ করে অ্যাপটি চেক করুন।'
    }
  ];

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = messageTemplates.find(t => t.id === templateId);
      if (template) {
        setSubject(template.subject);
        setMessage(template.message);
      }
    } else {
      setSubject('');
      setMessage('');
    }
  };

  // Load user data
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Check if user has admin or super_admin role
    if (userData) {
      if (userData.role !== 'admin' && userData.role !== 'super_admin') {
        router.push('/admin/dashboard');
        return;
      }
      setUser(authUser);
      setLoading(false);
      loadRecipients();
      loadClasses();
      const unsubscribe = loadMessages();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else if (!authUser) {
      router.push('/auth/login');
      setLoading(false);
    }
  }, [userData, authUser, authLoading, router]);

  // Load recipients from Firebase
  const loadRecipients = async () => {
    try {
      setLoadingData(true);
      const [teachersData, studentsData, parentsData] = await Promise.all([
        teacherQueries.getAllTeachers(true),
        studentQueries.getAllStudents(true),
        parentQueries.getAllParents(true),
      ]);
      setTeachers(teachersData);
      setStudents(studentsData);
      setParents(parentsData);
    } catch (error) {
      console.error('Error loading recipients:', error);
      setShowErrorMessage(true);
      setMessageText('প্রাপকদের তথ্য লোড করতে সমস্যা হয়েছে');
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setLoadingData(false);
    }
  };

  // Load classes from Firebase
  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const classesData = await classQueries.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  // Load messages from Firebase
  const loadMessages = (): (() => void) | undefined => {
    try {
      const q = query(
        collection(db, 'messages'),
        orderBy('sentAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        setMessages(messagesData);
      }, (error) => {
        console.error('Error loading messages:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      return undefined;
    }
  };

  // Handle ESC key to close delete confirmation modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteConfirm) {
        cancelDelete();
      }
    };

    if (showDeleteConfirm) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showDeleteConfirm]);

  // Get recipients based on category
  const getRecipients = (): UserType[] => {
    let recipients: UserType[] = [];
    
    if (recipientCategory === 'teachers') {
      recipients = teachers;
    } else if (recipientCategory === 'students') {
      recipients = students;
      // Filter by class if selected
      if (selectedClass) {
        recipients = recipients.filter(s => {
          const studentClass = s.class || s.className || '';
          return studentClass === selectedClass || studentClass.includes(selectedClass);
        });
      }
      
      // Apply role filter if class is selected
      if (selectedClass) {
        if (selectedRoleFilter === 'students') {
          // Already filtered to students, no change needed
        } else if (selectedRoleFilter === 'teachers') {
          // Get teachers for this class
          const classTeachers = teachers.filter(t => {
            const teacherClass = t.class || t.className || '';
            return teacherClass === selectedClass || teacherClass.includes(selectedClass);
          });
          recipients = classTeachers;
        } else if (selectedRoleFilter === 'parents') {
          // Get parents whose children are in this class
          const classStudentIds = students
            .filter(s => {
              const studentClass = s.class || s.className || '';
              return studentClass === selectedClass || studentClass.includes(selectedClass);
            })
            .map(s => s.uid);
          
          recipients = parents.filter(p => {
            const associatedStudents = (p as any).associatedStudents || [];
            return associatedStudents.some((as: any) => classStudentIds.includes(as.uid));
          });
        }
      }
    } else if (recipientCategory === 'parents') {
      recipients = parents;
    } else {
      recipients = [...teachers, ...students, ...parents];
    }
    
    return recipients;
  };

  // Filter recipients by search term
  const filteredRecipients = getRecipients().filter(recipient => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (recipient.name || '').toLowerCase().includes(searchLower) ||
      (recipient.email || '').toLowerCase().includes(searchLower) ||
      (recipient.phone || '').toLowerCase().includes(searchLower) ||
      (recipient.guardianPhone || '').toLowerCase().includes(searchLower)
    );
  });

  // Handle send message
  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      setShowErrorMessage(true);
      setMessageText('বিষয় এবং বার্তা প্রয়োজন');
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    let recipientsToSend: UserType[] = [];

    if (recipientType === 'bulk') {
      recipientsToSend = filteredRecipients;
    } else {
      if (selectedRecipients.length === 0) {
        setShowErrorMessage(true);
        setMessageText('অনুগ্রহ করে অন্তত একজন প্রাপক নির্বাচন করুন');
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }
      recipientsToSend = getRecipients().filter(r => selectedRecipients.includes(r.uid));
      
      // CRITICAL: If students are selected, also add their associated parents to recipients
      // This ensures parents can see messages sent to their children
      const selectedStudents = recipientsToSend.filter(r => r.role === 'student');
      if (selectedStudents.length > 0) {
        console.log('📨 Selected students found:', selectedStudents.length, 'Adding their parents...');
        
        // Get all students with full data (including guardian/father/mother phone)
        const allStudentsData = await studentQueries.getAllStudents();
        console.log('📨 Total students in database:', allStudentsData.length);
        
        // Get all parents from 'users' collection (not 'parents' collection)
        // Parents are stored in 'users' collection with role='parent'
        let allParents: UserType[] = [];
        try {
          // First try from 'users' collection (where parents are actually stored)
          const usersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'parent'),
            where('isActive', '==', true)
          );
          const usersSnapshot = await getDocs(usersQuery);
          allParents = usersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          } as UserType));
          console.log('📨 Parents from users collection:', allParents.length);
          
          // If no parents found in 'users', try from 'parents' collection as fallback
          if (allParents.length === 0) {
            console.log('📨 No parents in users collection, trying parents collection...');
            allParents = await parentQueries.getAllParents(true);
            console.log('📨 Parents from parentQueries (fallback):', allParents.length);
          }
        } catch (error) {
          console.error('⚠️ Error loading parents from users collection:', error);
          // Fallback: try from 'parents' collection
          try {
            allParents = await parentQueries.getAllParents(true);
            console.log('📨 Parents from parentQueries (fallback):', allParents.length);
          } catch (fallbackError) {
            console.error('⚠️ Error loading parents from parentQueries:', fallbackError);
          }
        }
        
        console.log('📨 Total parents found:', allParents.length);
        
        // For each selected student, find their parents
        const parentUidsToAdd = new Set<string>();
        
        for (const selectedStudent of selectedStudents) {
          // Find full student data
          const fullStudentData = allStudentsData.find(s => 
            (s.uid || s.id) === selectedStudent.uid || 
            s.studentId === (selectedStudent as any).studentId
          );
          
          if (!fullStudentData) {
            console.log(`⚠️ Full student data not found for: ${selectedStudent.name} (${selectedStudent.uid})`);
            continue;
          }
          
          const studentGuardianPhone = (fullStudentData as any).guardianPhone || '';
          const studentFatherPhone = (fullStudentData as any).fatherPhone || '';
          const studentMotherPhone = (fullStudentData as any).motherPhone || '';
          const studentEmail = fullStudentData.email || selectedStudent.email || '';
          
          console.log(`📨 Student ${selectedStudent.name} (${selectedStudent.uid}):`, {
            guardianPhone: studentGuardianPhone,
            fatherPhone: studentFatherPhone,
            motherPhone: studentMotherPhone,
            email: studentEmail
          });
          
          // Find parents by matching phone numbers or email
          const studentParents = allParents.filter(parent => {
            const parentPhone = (parent.phone || parent.phoneNumber || '').trim();
            const parentEmail = (parent.email || '').trim();
            
            // Check if parent's phone matches student's guardian/father/mother phone
            const phoneMatches = parentPhone && (
              parentPhone === studentGuardianPhone.trim() ||
              parentPhone === studentFatherPhone.trim() ||
              parentPhone === studentMotherPhone.trim()
            );
            
            // Check if parent's email matches student's email
            const emailMatches = parentEmail && studentEmail && parentEmail === studentEmail.trim();
            
            return phoneMatches || emailMatches;
          });
          
          console.log(`📨 Student ${selectedStudent.name}: Found ${studentParents.length} parents`);
          
          // Add parent UIDs
          studentParents.forEach(parent => {
            if (parent.uid && !selectedRecipients.includes(parent.uid)) {
              parentUidsToAdd.add(parent.uid);
              console.log(`  → Adding parent: ${parent.name} (${parent.uid})`);
            }
          });
        }
        
        // Add parents to recipientsToSend
        if (parentUidsToAdd.size > 0) {
          const parentsToAdd = allParents.filter(p => parentUidsToAdd.has(p.uid));
          recipientsToSend = [...recipientsToSend, ...parentsToAdd];
          console.log(`✅ Added ${parentsToAdd.length} parents to recipients. Total recipients: ${recipientsToSend.length}`);
          console.log(`📋 Final recipients:`, recipientsToSend.map(r => ({ name: r.name, role: r.role, uid: r.uid })));
        } else {
          console.log('⚠️ No parents found for selected students');
        }
      }
    }

    if (recipientsToSend.length === 0) {
      setShowErrorMessage(true);
      setMessageText('কোনো প্রাপক পাওয়া যায়নি');
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    // For SMS mode, validate phone numbers
    if (messageType === 'sms') {
      const validRecipients = recipientsToSend.filter(r => {
        const phone = r.phone || r.phoneNumber || r.guardianPhone;
        return phone && phone.trim().length > 0;
      });

      if (validRecipients.length === 0) {
        setShowErrorMessage(true);
        setMessageText('SMS পাঠানোর জন্য প্রাপকদের ফোন নম্বর প্রয়োজন');
        setTimeout(() => setShowErrorMessage(false), 3000);
        return;
      }

      if (validRecipients.length < recipientsToSend.length) {
        const missing = recipientsToSend.length - validRecipients.length;
        if (!confirm(`${missing} জন প্রাপকের ফোন নম্বর নেই। শুধু ফোন নম্বর আছে এমন প্রাপকদের কাছে SMS পাঠানো হবে। আপনি কি চালিয়ে যেতে চান?`)) {
          return;
        }
        recipientsToSend = validRecipients;
      }
    }

    setIsSending(true);

    try {
      const senderName = user?.displayName || user?.email?.split('@')[0] || 'Admin';

      // Prepare recipient data
      const recipientsData: Array<{
        uid: string;
        name: string;
        phone?: string;
        role: string;
        error?: string;
      }> = recipientsToSend.map(r => ({
        uid: r.uid,
        name: r.name || r.displayName || r.email || 'Unknown',
        phone: r.phone || r.phoneNumber || r.guardianPhone,
        role: r.role,
      }));

      let smsCost = 0;
      let deliveredCount = 0;
      let failedCount = 0;

      // Send notifications and/or SMS based on message type
      if (messageType === 'free') {
        // Send in-app notifications and push notifications (NO SMS)
        for (const recipient of recipientsData) {
          try {
            await sendNotification({
              userId: recipient.uid,
              schoolId: SCHOOL_ID,
              title: subject.trim(),
              message: message.trim(),
              type: 'announcement',
              notificationType: 'announcement'
            });
            deliveredCount++;
          } catch (error) {
            console.error(`Error sending notification to ${recipient.uid}:`, error);
            failedCount++;
          }
        }
      } else if (messageType === 'sms') {
        // Send SMS only
        const phoneNumbers = recipientsData
          .map(r => r.phone)
          .filter(Boolean)
          .map(phone => formatPhoneNumber(phone || ''));

        if (phoneNumbers.length > 0) {
          // Get SMS configuration from settings
          const smsConfig = await getSMSConfigFromSettings();
          
          if (!smsConfig || !smsConfig.apiKey) {
            throw new Error('SMS API কনফিগার করা নেই। অনুগ্রহ করে সেটিংস পেজে SMS Gateway কনফিগার করুন।');
          }

          console.log('Sending SMS to:', phoneNumbers);
          console.log('SMS Config:', { provider: smsConfig.provider, hasApiKey: !!smsConfig.apiKey, senderId: smsConfig.senderId });
          
          // Use server-side API route to avoid IP whitelist issues
          const smsResponse = await fetch('/api/sms/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumbers,
              message,
            }),
          });

          const smsData = await smsResponse.json();
          
          if (!smsData.success) {
            throw new Error(smsData.error || 'SMS পাঠানো যায়নি');
          }

          const smsResults = smsData.results || [];
          
          console.log('SMS Results:', smsResults);
          
          for (let i = 0; i < smsResults.length; i++) {
            if (smsResults[i].success) {
              deliveredCount++;
              smsCost += smsResults[i].cost || 0;
            } else {
              failedCount++;
              console.error(`SMS failed for ${phoneNumbers[i]}:`, smsResults[i].error);
              // Store error for display
              if (!recipientsData[i].error) {
                recipientsData[i].error = smsResults[i].error || 'Unknown error';
              }
            }
          }
        } else {
          throw new Error('SMS পাঠানোর জন্য প্রাপকদের ফোন নম্বর প্রয়োজন');
        }
      }

      // Save message to Firebase
      const messageDoc: any = {
        subject: subject.trim(),
        message: message.trim(),
        recipients: recipientsData,
        recipientType,
        recipientCategory,
        messageType,
        senderUid: user?.uid || '',
        senderName,
        sentAt: serverTimestamp(),
        status: failedCount === recipientsData.length ? 'failed' : 
                deliveredCount === 0 ? 'pending' : 'sent',
        totalRecipients: recipientsData.length,
        deliveredCount,
        failedCount,
        schoolId: SCHOOL_ID, // Add schoolId to filter messages by school
      };

      // Only include smsCost if it's greater than 0 (for SMS mode)
      if (messageType === 'sms' && smsCost > 0) {
        messageDoc.smsCost = smsCost;
      }

      await addDoc(collection(db, 'messages'), messageDoc);

      // Reset form
      setSubject('');
      setMessage('');
      setSelectedRecipients([]);
      setRecipientType('bulk');
      setRecipientCategory('all');
      setMessageType('free');
      setSelectedClass('');
      setSelectedTemplate('');

      if (messageType === 'sms' && failedCount > 0 && deliveredCount === 0) {
        // All SMS failed
        const firstError = recipientsData.find(r => r.error)?.error || 'SMS পাঠানো যায়নি';
        setShowErrorMessage(true);
        setMessageText(`SMS পাঠানো যায়নি: ${firstError}`);
        setTimeout(() => setShowErrorMessage(false), 5000);
      } else if (messageType === 'sms' && failedCount > 0) {
        // Some SMS failed
        setShowSuccessMessage(true);
        setMessageText(`${deliveredCount} জনের কাছে SMS পাঠানো হয়েছে, ${failedCount} জন ব্যর্থ${smsCost > 0 ? ` (মোট খরচ: ${smsCost.toFixed(2)} টাকা)` : ''}`);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      } else {
        setShowSuccessMessage(true);
        if (messageType === 'free') {
          setMessageText(`${deliveredCount} জনের কাছে ইন-অ্যাপ নোটিফিকেশন এবং পুশ নোটিফিকেশন পাঠানো হয়েছে`);
        } else {
          setMessageText(`${deliveredCount} জনের কাছে SMS পাঠানো হয়েছে${smsCost > 0 ? ` (মোট খরচ: ${smsCost.toFixed(2)} টাকা)` : ''}`);
        }
        setTimeout(() => setShowSuccessMessage(false), 5000);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setShowErrorMessage(true);
      setMessageText(error.message || 'বার্তা পাঠানো যায়নি। দয়া করে আবার চেষ্টা করুন');
      setTimeout(() => setShowErrorMessage(false), 5000);
    } finally {
      setIsSending(false);
    }
  };

  // Toggle recipient selection
  const toggleRecipient = (uid: string) => {
    setSelectedRecipients(prev =>
      prev.includes(uid)
        ? prev.filter(id => id !== uid)
        : [...prev, uid]
    );
  };

  // Select all filtered recipients
  const selectAllFiltered = () => {
    const allIds = filteredRecipients.map(r => r.uid);
    setSelectedRecipients(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedRecipients([]);
  };

  // Get recipient display name
  const getRecipientDisplayName = (recipient: UserType): string => {
    return recipient.name || recipient.displayName || recipient.email || 'Unknown';
  };

  // Get recipient phone
  const getRecipientPhone = (recipient: UserType): string => {
    return recipient.phone || recipient.phoneNumber || recipient.guardianPhone || '';
  };

  // Get recipient role label
  const getRecipientRoleLabel = (role: string): string => {
    const labels: { [key: string]: string } = {
      teacher: 'শিক্ষক',
      student: 'শিক্ষার্থী',
      parent: 'অভিভাবক',
      admin: 'অ্যাডমিন',
      super_admin: 'সুপার অ্যাডমিন',
    };
    return labels[role] || role;
  };

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

  // Handle delete message - show confirmation
  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
    setShowDeleteConfirm(true);
  };

  // Confirm delete message
  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      await deleteDoc(doc(db, 'messages', messageToDelete));
      setShowSuccessMessage(true);
      setMessageText('বার্তা সফলভাবে ডিলিট করা হয়েছে');
      setTimeout(() => setShowSuccessMessage(false), 3000);
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
    } catch (error: any) {
      console.error('Error deleting message:', error);
      setShowErrorMessage(true);
      setMessageText(error.message || 'বার্তা ডিলিট করা যায়নি। দয়া করে আবার চেষ্টা করুন');
      setTimeout(() => setShowErrorMessage(false), 3000);
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setMessageToDelete(null);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Award, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: Bell, label: 'নোটিশ', href: '/admin/notice', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: true },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">ই</span>
            </div>
            <span className="text-lg font-bold text-gray-900">সুপার অ্যাডমিন</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {menuItems.map((item) => (
            <a key={item.label} href={item.href} className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </a>
          ))}
          <button onClick={handleLogout} className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Navigation */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 mr-4">
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">বার্তা ব্যবস্থাপনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">শিক্ষক, অভিভাবক এবং শিক্ষার্থীদের সাথে যোগাযোগ করুন</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 h-full">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                  {((userData as any)?.photoURL || user?.photoURL || authUser?.photoURL) && !imageError ? (
                    <img
                      src={(userData as any)?.photoURL || user?.photoURL || authUser?.photoURL || ''}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <span className="text-white font-medium text-sm">
                      {(user?.email?.charAt(0) || userData?.email?.charAt(0) || authUser?.email?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Messages */}
        {showSuccessMessage && (
          <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
            <CheckCircle className="w-5 h-5" />
            <span>{messageText}</span>
            <button onClick={() => setShowSuccessMessage(false)} className="ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showErrorMessage && (
          <div className="fixed top-20 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
            <XCircle className="w-5 h-5" />
            <span>{messageText}</span>
            <button onClick={() => setShowErrorMessage(false)} className="ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={cancelDelete}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">বার্তা ডিলিট করুন</h3>
                  <p className="text-sm text-gray-500">এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                আপনি কি নিশ্চিত যে আপনি এই বার্তাটি ডিলিট করতে চান?
              </p>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  onClick={confirmDeleteMessage}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  ডিলিট করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Compose Message */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">নতুন বার্তা</h3>
                <div className="space-y-4">
                  {/* Message Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বার্তার ধরন</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMessageType('free')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          messageType === 'free'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Phone className="w-4 h-4 inline mr-1" />
                        বিনামূল্যে
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageType('sms')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          messageType === 'sms'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 inline mr-1" />
                        SMS
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {messageType === 'free' ? 'ইন-অ্যাপ নোটিফিকেশন এবং পুশ নোটিফিকেশন পাঠানো হবে (বিনামূল্যে)' : '3rd party API ব্যবহার করে ফোনে SMS পাঠানো হবে (খরচ হতে পারে)'}
                    </p>
                  </div>

                  {/* Recipient Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">প্রাপক নির্বাচন</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRecipientType('bulk');
                          setSelectedRecipients([]);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          recipientType === 'bulk'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        সবার কাছে
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipientType('individual')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          recipientType === 'individual'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        নির্বাচিত
                      </button>
                    </div>
                  </div>

                  {/* Recipient Category (for bulk) */}
                  {recipientType === 'bulk' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">প্রাপক শ্রেণী</label>
                      <select 
                        value={recipientCategory}
                        onChange={(e) => {
                          setRecipientCategory(e.target.value as any);
                          setSelectedClass(''); // Reset class selection when category changes
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">সকল (শিক্ষক + অভিভাবক + শিক্ষার্থী)</option>
                        <option value="teachers">শুধু শিক্ষক</option>
                        <option value="students">শুধু শিক্ষার্থী</option>
                        <option value="parents">শুধু অভিভাবক</option>
                      </select>
                      
                      {/* Class selection for students */}
                      {recipientCategory === 'students' && (
                        <div className="mt-2 space-y-2">
                          <select 
                            value={selectedClass}
                            onChange={(e) => {
                              setSelectedClass(e.target.value);
                              setSelectedRoleFilter('students'); // Reset role filter to students when class changes
                              if (recipientType === 'individual') {
                                setSelectedRecipients([]); // Reset selection when class changes
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loadingClasses}
                          >
                            <option value="">সকল ক্লাস</option>
                            {classes.map((cls) => (
                              <option key={cls.classId} value={cls.className}>
                                {cls.className} {cls.section ? `(${cls.section})` : ''}
                              </option>
                            ))}
                          </select>
                          
                          {/* Role filter when class is selected */}
                          {selectedClass && (() => {
                            // Calculate counts for each role in the selected class
                            const classStudents = students.filter(s => {
                              const studentClass = s.class || (s as any).className || '';
                              return studentClass === selectedClass || studentClass.includes(selectedClass);
                            });
                            const classTeachers = teachers.filter(t => {
                              const teacherClass = t.class || (t as any).className || '';
                              return teacherClass === selectedClass || teacherClass.includes(selectedClass);
                            });
                            const classStudentIds = classStudents.map(s => s.uid);
                            const classParents = parents.filter(p => {
                              const associatedStudents = (p as any).associatedStudents || [];
                              return associatedStudents.some((as: any) => classStudentIds.includes(as.uid));
                            });
                            
                            return (
                              <select 
                                value={selectedRoleFilter}
                                onChange={(e) => {
                                  setSelectedRoleFilter(e.target.value as any);
                                  setSelectedRecipients([]); // Reset selection when role filter changes
                                  setSelectedNamesFromList(new Set()); // Reset names list selection
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                <option value="students">সকল শিক্ষার্থী ({classStudents.length} জন)</option>
                                <option value="teachers">শিক্ষক ({classTeachers.length} জন)</option>
                                <option value="parents">অভিভাবক ({classParents.length} জন)</option>
                              </select>
                            );
                          })()}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        {recipientCategory === 'all' && `${teachers.length + students.length + parents.length} জন প্রাপক`}
                        {recipientCategory === 'teachers' && `${teachers.length} জন শিক্ষক`}
                        {recipientCategory === 'students' && (
                          selectedClass 
                            ? selectedRoleFilter === 'students'
                              ? `${getRecipients().length} জন শিক্ষার্থী (${selectedClass})`
                              : selectedRoleFilter === 'teachers'
                              ? `${getRecipients().length} জন শিক্ষক (${selectedClass})`
                              : `${getRecipients().length} জন অভিভাবক (${selectedClass})`
                            : `${students.length} জন শিক্ষার্থী`
                        )}
                        {recipientCategory === 'parents' && `${parents.length} জন অভিভাবক`}
                      </p>
                    </div>
                  )}

                  {/* Template Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">টেমপ্লেট নির্বাচন করুন</label>
                    <select 
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {messageTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      টেমপ্লেট নির্বাচন করলে বিষয় এবং বার্তা স্বয়ংক্রিয়ভাবে পূরণ হবে
                    </p>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বিষয়</label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="বার্তার বিষয়"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বার্তা</label>
                    <textarea 
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="আপনার বার্তা লিখুন..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {messageType === 'sms' && (
                      <p className="text-xs text-gray-500 mt-1">
                        SMS সীমা: {message.length}/160 অক্ষর {message.length > 160 && <span className="text-red-600">(বহু SMS প্রয়োজন)</span>}
                      </p>
                    )}
                  </div>

                  {/* Send Button */}
                  <button 
                    onClick={handleSendMessage}
                    disabled={isSending || !subject.trim() || !message.trim()}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>পাঠানো হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>পাঠান {messageType === 'sms' ? '(SMS)' : '(বিনামূল্যে - ইন-অ্যাপ + পুশ)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Recipients Selection / Messages List */}
            <div className="lg:col-span-2">
              {recipientType === 'individual' ? (
                /* Individual Recipient Selection */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">প্রাপক নির্বাচন করুন</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={selectAllFiltered}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          সব নির্বাচন
                        </button>
                        <button
                          onClick={deselectAll}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          সব বাতিল
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <select 
                        value={recipientCategory}
                        onChange={(e) => {
                          setRecipientCategory(e.target.value as any);
                          setSelectedRecipients([]);
                          setSelectedClass(''); // Reset class when category changes
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="all">সকল</option>
                        <option value="teachers">শিক্ষক</option>
                        <option value="students">শিক্ষার্থী</option>
                        <option value="parents">অভিভাবক</option>
                      </select>
                      
                      {/* Class selection for students in individual mode */}
                      {recipientCategory === 'students' && (
                        <>
                          <select 
                            value={selectedClass}
                            onChange={(e) => {
                              setSelectedClass(e.target.value);
                              setSelectedRoleFilter('all'); // Reset role filter when class changes
                              setSelectedRecipients([]); // Reset selection when class changes
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={loadingClasses}
                          >
                            <option value="">সকল ক্লাস</option>
                            {classes.map((cls) => (
                              <option key={cls.classId} value={cls.className}>
                                {cls.className} {cls.section ? `(${cls.section})` : ''}
                              </option>
                            ))}
                          </select>
                          
                          {/* Role filter when class is selected */}
                          {selectedClass && (() => {
                            // Calculate counts for each role in the selected class
                            const classStudents = students.filter(s => {
                              const studentClass = s.class || (s as any).className || '';
                              return studentClass === selectedClass || studentClass.includes(selectedClass);
                            });
                            const classTeachers = teachers.filter(t => {
                              const teacherClass = t.class || (t as any).className || '';
                              return teacherClass === selectedClass || teacherClass.includes(selectedClass);
                            });
                            const classStudentIds = classStudents.map(s => s.uid);
                            const classParents = parents.filter(p => {
                              const associatedStudents = (p as any).associatedStudents || [];
                              return associatedStudents.some((as: any) => classStudentIds.includes(as.uid));
                            });
                            
                            return (
                              <select 
                                value={selectedRoleFilter}
                                onChange={(e) => {
                                  setSelectedRoleFilter(e.target.value as any);
                                  setSelectedRecipients([]); // Reset selection when role filter changes
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                              >
                                <option value="students">সকল শিক্ষার্থী ({classStudents.length} জন)</option>
                                <option value="teachers">শিক্ষক ({classTeachers.length} জন)</option>
                                <option value="parents">অভিভাবক ({classParents.length} জন)</option>
                              </select>
                            );
                          })()}
                        </>
                      )}
                      
                      <span className="text-sm text-gray-600 self-center">
                        নির্বাচিত: {selectedRecipients.length} / {filteredRecipients.length}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 max-h-[600px] overflow-y-auto">
                    {loadingData ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : filteredRecipients.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>কোনো প্রাপক পাওয়া যায়নি</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredRecipients.map((recipient) => {
                          const phone = getRecipientPhone(recipient);
                          const isSelected = selectedRecipients.includes(recipient.uid);
                          const hasPhone = phone && phone.trim().length > 0;
                          
                          return (
                            <div
                              key={recipient.uid}
                              onClick={() => toggleRecipient(recipient.uid)}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              } ${messageType === 'sms' && !hasPhone ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                  }`}>
                                    {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-gray-900">{getRecipientDisplayName(recipient)}</span>
                                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                        {getRecipientRoleLabel(recipient.role)}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                      {recipient.email && (
                                        <span className="flex items-center space-x-1">
                                          <Mail className="w-3 h-3" />
                                          <span>{recipient.email}</span>
                                        </span>
                                      )}
                                      {hasPhone && (
                                        <span className="flex items-center space-x-1">
                                          <Phone className="w-3 h-3" />
                                          <span>{phone}</span>
                                        </span>
                                      )}
                                      {messageType === 'sms' && !hasPhone && (
                                        <span className="text-red-600 flex items-center space-x-1">
                                          <XCircle className="w-3 h-3" />
                                          <span>ফোন নেই</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Messages List */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">পাঠানো বার্তা</h3>
                      <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="বার্তা খুঁজুন..."
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 max-h-[700px] overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>কোনো বার্তা পাঠানো হয়নি</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div key={msg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  msg.messageType === 'sms' 
                                    ? 'bg-green-100 text-green-600' 
                                    : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {msg.messageType === 'sms' ? (
                                    <Smartphone className="w-5 h-5" />
                                  ) : (
                                    <MessageSquare className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-gray-900">{msg.subject}</span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      msg.messageType === 'sms' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {msg.messageType === 'sms' ? 'SMS' : 'বিনামূল্যে'}
                                    </span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      msg.status === 'sent' ? 'bg-green-100 text-green-800' :
                                      msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {msg.status === 'sent' ? 'পাঠানো' : msg.status === 'failed' ? 'ব্যর্থ' : 'প্রক্রিয়াধীন'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{msg.message}</p>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span>প্রাপক: {msg.totalRecipients} জন</span>
                                    {msg.messageType === 'sms' && (
                                      <>
                                        <span className="text-green-600">সফল: {msg.deliveredCount || 0}</span>
                                        {msg.failedCount && msg.failedCount > 0 && (
                                          <span className="text-red-600">ব্যর্থ: {msg.failedCount}</span>
                                        )}
                                        {msg.smsCost && msg.smsCost > 0 && (
                                          <span className="text-gray-700">খরচ: {msg.smsCost.toFixed(2)} টাকা</span>
                                        )}
                                      </>
                                    )}
                                    <span>{formatDate(msg.sentAt)}</span>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500">
                                    <span>প্রাপক: </span>
                                    <span>
                                      {msg.recipientType === 'bulk' 
                                        ? msg.recipientCategory === 'all' ? 'সকল' :
                                          msg.recipientCategory === 'teachers' ? 'সকল শিক্ষক' :
                                          msg.recipientCategory === 'students' ? 'সকল শিক্ষার্থী' :
                                          'সকল অভিভাবক'
                                        : `${msg.recipients.length} জন ব্যক্তিগত প্রাপক`
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-red-600 hover:text-red-800 p-1 transition-colors"
                                title="বার্তা ডিলিট করুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagePageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <MessagePage />
    </ProtectedRoute>
  );
}
