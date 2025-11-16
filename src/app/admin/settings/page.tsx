'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SystemSettings, settingsQueries, classQueries, User } from '@/lib/database-queries';
import { studentQueries } from '@/lib/queries/student-queries';
import {
  Home,
  Users,
  BookOpen,
  BookOpen as BookOpenIcon,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  GraduationCap,
  Building,
  CreditCard,
  TrendingUp,
  Search,
  Bell,
  Save,
  User as UserIcon,
  Users as UsersIcon,
  Shield,
  Database,
  Palette,
  Globe,
  Image as ImageIcon,
  Info,
  Phone,
  Lock,
  Package,
  Eye,
  EyeOff,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Server,
  Key,
  Mail,
  Smartphone,
  Monitor,
  Zap,
  Archive,
  FileText,
  BarChart3,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  Trash2,
  Copy,
  Edit3,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Heart,
  XCircle,
  Loader2,
  Award,
  MessageSquare,
  AlertCircle,
  Gift,
  Sparkles
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { userQueries } from '@/lib/database-queries';
import ImageKitUploader from '@/components/ui/imagekit-uploader';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';
import PushNotificationSetup from '@/components/PushNotificationSetup';

interface PendingUser {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  schoolId?: string;
  schoolName?: string;
  address?: string;
  createdAt?: Timestamp;
  isActive: boolean;
}

function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { userData: authUserData } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [loadingApprovedUsers, setLoadingApprovedUsers] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<Set<string>>(new Set());
  const [userFilter, setUserFilter] = useState<'all' | 'admin' | 'teacher' | 'super_admin'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [systemStats, setSystemStats] = useState({
    uptime: '7d 14h 32m',
    memory: { used: 245, total: 512, percentage: 48 },
    cpu: { usage: 23, cores: 4 },
    storage: { used: 156, total: 500, percentage: 31 },
    activeUsers: 1247,
    totalRequests: 45632
  });

  // Integration state
  const [integrations, setIntegrations] = useState([
    {
      id: 'google-classroom',
      name: 'Google Classroom',
      description: 'ক্লাসরুম এবং অ্যাসাইনমেন্ট সিঙ্কোনাইজেশন',
      status: 'connected',
      icon: BookOpen,
      config: {
        apiKey: '',
        clientId: '',
        clientSecret: ''
      }
    },
    {
      id: 'sms-gateway',
      name: 'SMS Gateway',
      description: 'এসএমএস নোটিফিকেশন এবং অ্যালার্ট',
      status: 'connected',
      icon: Smartphone,
      config: {
        provider: '',
        apiKey: '',
        senderId: '',
        customProvider: ''
      }
    },
    {
      id: 'payment-gateway',
      name: 'Payment Gateway',
      description: 'অনলাইন পেমেন্ট প্রসেসিং',
      status: 'disconnected',
      icon: CreditCard,
      config: {
        provider: '',
        merchantId: '',
        apiKey: '',
        secretKey: '',
        customProvider: ''
      }
    },
    {
      id: 'cloud-storage',
      name: 'Cloud Storage',
      description: 'ফাইল স্টোরেজ এবং ব্যাকআপ',
      status: 'connected',
      icon: Archive,
      config: {
        provider: '',
        bucketName: '',
        accessKey: '',
        secretKey: '',
        customProvider: ''
      }
    }
  ]);

  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  
  // SMS Template state
  const [smsTemplates, setSmsTemplates] = useState<Array<{
    id: string;
    name: string;
    message: string;
    variables: string[];
    category: string;
  }>>([]);
  const [smsGatewayTab, setSmsGatewayTab] = useState<'config' | 'templates'>('config');
  const [editingTemplate, setEditingTemplate] = useState<{
    id: string;
    name: string;
    message: string;
    category: string;
  } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Form state for controlled components - all fields initialized with proper values
  const [formData, setFormData] = useState({
    // General settings
    schoolName: 'ইকরা নূরানী একাডেমি',
    schoolCode: '102330',
    board: '',
    schoolAddress: 'ঢাকা, বাংলাদেশ',
    schoolPhone: '+8801712345678',
    schoolEmail: 'info@iqraschool.edu.bd',
    principalName: 'ড. মোহাম্মদ আলী',
    schoolType: 'মাদ্রাসা',
    academicYear: new Date().getFullYear().toString(),
    systemLanguage: 'bn',
    schoolDescription: 'একটি আধুনিক ইসলামিক শিক্ষা প্রতিষ্ঠান যা ধর্মীয় এবং আধুনিক শিক্ষার সমন্বয়ে শিক্ষার্থীদের বিকাশে কাজ করে।',
    schoolLogo: '', // Logo URL for file export
    establishmentYear: '', // Establishment year

    // Security settings
    minPasswordLength: 8,
    maxPasswordAge: 90,
    sessionTimeout: 30,
    maxActiveSessions: 5,

    // Database settings
    backupFrequency: 'daily',
    backupRetention: 30,

    // System settings
    cacheExpiry: 24,
    maxUploadSize: 10,
    apiRateLimit: 100,
    apiTimeout: 30,

    // Appearance settings
    theme: 'light',
    primaryColor: 'blue',
    compactMode: false,
    sidebarCollapsed: false,
    darkMode: false,
    rtlSupport: false,

    // Public pages settings
    galleryPageEnabled: true,
    aboutPageEnabled: true,
    contactPageEnabled: true,

    // Contact page content
    contactPageTitle: 'যোগাযোগ করুন',
    contactPageSubtitle: 'আমাদের সাথে যোগাযোগ করে আপনার প্রশ্নের উত্তর পান এবং আমাদের সম্পর্কে আরও জানুন',
    contactPhones: ['+৮৮০ ১৭১১ ২৩৪৫৬৭', '+৮৮০ ১৯১১ ২৩৪৫৬৭'],
    contactEmails: ['info@iqraschool.edu', 'admission@iqraschool.edu'],
    contactAddress: ['রামপুরা, ঢাকা-১২১৯', 'বাংলাদেশ'],
    contactHours: ['রবি-বৃহ: সকাল ৮টা - বিকাল ৫টা', 'শুক্র: সকাল ৮টা - দুপুর ১২টা'],
    contactDepartments: [
      { name: 'ভর্তি বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৭', email: 'admission@iqraschool.edu', description: 'নতুন শিক্ষার্থী ভর্তি সংক্রান্ত সকল তথ্য' },
      { name: 'শিক্ষা বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৮', email: 'academic@iqraschool.edu', description: 'শিক্ষা কার্যক্রম ও পাঠ্যক্রম সংক্রান্ত' },
      { name: 'প্রশাসন', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৯', email: 'admin@iqraschool.edu', description: 'সাধারণ প্রশাসনিক কাজ' },
      { name: 'হিসাব বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৭০', email: 'accounts@iqraschool.edu', description: 'ফি ও আর্থিক বিষয়াদি' }
    ],
    contactMapEmbedCode: '',
    contactMapAddress: 'রামপুরা, ঢাকা-১২১৯',
    contactSocialMediaFacebook: '',
    contactSocialMediaTwitter: '',
    contactSocialMediaInstagram: '',
    contactSocialMediaYoutube: '',
    contactFormSubjects: ['ভর্তি সংক্রান্ত', 'শিক্ষা সংক্রান্ত', 'ফি সংক্রান্ত', 'সাধারণ তথ্য', 'অভিযোগ', 'পরামর্শ'],

    // Notification settings
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    smtpEmail: 'noreply@iqraschool.edu.bd',
    smtpPassword: '',
    studentRegistrationEmail: true,
    studentRegistrationPush: false,
    studentRegistrationSMS: false,
    paymentReminderEmail: true,
    paymentReminderPush: true,
    paymentReminderSMS: false,
    attendanceReportEmail: false,
    attendanceReportPush: true,
    attendanceReportSMS: false,
    systemAlertEmail: true,
    systemAlertPush: true,
    systemAlertSMS: false,
    examScheduleEmail: true,
    examSchedulePush: false,
    examScheduleSMS: false,
    examResultsEmail: true,
    examResultsPush: true,
    examResultsSMS: false,
    homeworkAssignmentEmail: true,
    homeworkAssignmentPush: true,
    homeworkAssignmentSMS: false,
    homeworkReminderEmail: true,
    homeworkReminderPush: true,
    homeworkReminderSMS: false,
    classAnnouncementEmail: true,
    classAnnouncementPush: true,
    classAnnouncementSMS: false,
    noticeNotificationEmail: true,
    noticeNotificationPush: true,
    noticeNotificationSMS: false,
    eventReminderEmail: true,
    eventReminderPush: true,
    eventReminderSMS: false,
    messageNotificationEmail: true,
    messageNotificationPush: true,
    messageNotificationSMS: false,
    complaintResponseEmail: true,
    complaintResponsePush: true,
    complaintResponseSMS: false,
    feePaymentConfirmationEmail: false,
    feePaymentConfirmationPush: false,
    feePaymentConfirmationSMS: false,
    admissionConfirmationEmail: true,
    admissionConfirmationPush: true,
    admissionConfirmationSMS: false,
    teacherAssignmentEmail: true,
    teacherAssignmentPush: false,
    teacherAssignmentSMS: false,
    classScheduleEmail: false,
    classSchedulePush: false,
    classScheduleSMS: false,

    // Advanced settings
    debugMode: false,
    apiDocumentation: true,
    enableCSP: true,
    enableXFrameOptions: true,
    enableXContentTypeOptions: true,
    enableHSTS: false,
    enableReferrerPolicy: true,
    customCSS: '',
    customJS: ''
  });
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newAcademicYear, setNewAcademicYear] = useState('');
  const [customAcademicYears, setCustomAcademicYears] = useState<string[]>([]);

  // Fee Management State
  const [fees, setFees] = useState<any[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [feeFormData, setFeeFormData] = useState({
    name: '',
    type: '',
    amount: '',
    description: '',
    applicableClasses: 'all',
    collectionDeadline: '',
    lateFee: '0',
    isActive: true,
    isMandatory: false,
    autoReminder: false
  });

  // Fee amounts state for all fee types
  const [feeAmounts, setFeeAmounts] = useState({
    monthlyFee: '600',
    sessionFee: '1000',
    admissionFee: '1200',
    firstTermExamFee: '200',
    secondTermExamFee: '250',
    annualExamFee: '400',
    monthlyExamFee: '100'
  });

  // Individual class amounts state
  const [classAmounts, setClassAmounts] = useState<{[classId: string]: string}>({});

  // Class-specific fee management
  const [classSpecificFees, setClassSpecificFees] = useState<any[]>([]);
  const [showClassFeeModal, setShowClassFeeModal] = useState(false);
  const [selectedClassForFee, setSelectedClassForFee] = useState<any>(null);
  const [classFeeFormData, setClassFeeFormData] = useState({
    classId: '',
    className: '',
    feeName: '',
    amount: '',
    description: '',
    collectionDeadline: '',
    lateFee: '0',
    isActive: true,
    isMandatory: false,
    autoReminder: false
  });

  // Classes State for Dropdown
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const router = useRouter();

  // Utility function to convert Bengali numerals to English
  const convertBengaliToEnglish = (value: string): string => {
    return value.replace(/[০-৯]/g, (match) => {
      const bengaliToEnglish: {[key: string]: string} = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
      };
      return bengaliToEnglish[match] || match;
    });
  };

  // Load classes from Firebase for dropdown with real-time updates
  const loadClasses = async () => {
    setLoadingClasses(true);
    console.log('🔄 Starting class loading process...');

    try {
      // Try to load from localStorage first for immediate display
      const savedClasses = localStorage.getItem('iqra_classes');
      if (savedClasses) {
        const parsedClasses = JSON.parse(savedClasses);
        console.log('💾 Loaded from localStorage:', parsedClasses);
        setClasses(parsedClasses);
      }

      // Then try to load from Firebase
      try {
        console.log('📡 Connecting to Firebase to load ALL classes...');

        // Direct Firebase query to see what's actually in the database
        const { collection, getDocs, onSnapshot, query } = await import('firebase/firestore');
        const classesSnapshot = await getDocs(collection(db, 'classes'));

        console.log('🔍 Raw classes collection size:', classesSnapshot.size);
        console.log('🔍 Classes documents:');

        const firebaseClasses: any[] = [];
        classesSnapshot.forEach((doc) => {
          console.log(`📄 Document:`, {
            id: doc.id,
            data: doc.data(),
            allFields: Object.keys(doc.data())
          });
          firebaseClasses.push({
            id: doc.id,
            ...doc.data()
          });
        });

        if (firebaseClasses.length > 0) {
          // Show ALL classes from Firebase with proper formatting
          const allClasses = firebaseClasses.map((cls, index) => {
            console.log(`🔢 Processing Firebase class ${index + 1}:`, cls);

            return {
              classId: cls.classId || cls.id || `class_${index}_${Date.now()}`,
              className: cls.className || cls.name || cls.title || cls.class || `Class ${index + 1}`,
              section: cls.section || 'এ',
              teacherName: cls.teacherName || cls.teacher || 'নির্ধারিত নয়',
              academicYear: cls.academicYear || '২০২৫',
              totalStudents: cls.totalStudents || 0,
              isActive: cls.isActive !== false
            };
          });

          console.log('🎯 Final formatted classes:', allClasses);
          console.log('📋 Class names:', allClasses.map(cls => cls.className));

          setClasses(allClasses);
          localStorage.setItem('iqra_classes', JSON.stringify(allClasses));

          // Set up real-time listener for automatic updates
          console.log('🔄 Setting up real-time listener for classes...');
          const classesQuery = query(collection(db, 'classes'));
          const unsubscribe = onSnapshot(classesQuery, (snapshot) => {
            console.log('🔥 Real-time class update detected:', snapshot.size);

            const updatedClasses: any[] = [];
            snapshot.forEach((doc) => {
              updatedClasses.push({
                id: doc.id,
                ...doc.data()
              });
            });

            if (updatedClasses.length > 0) {
              const formattedClasses = updatedClasses.map((cls, index) => ({
                classId: cls.classId || cls.id || `class_${index}_${Date.now()}`,
                className: cls.className || cls.name || cls.title || cls.class || `Class ${index + 1}`,
                section: cls.section || 'এ',
                teacherName: cls.teacherName || cls.teacher || 'নির্ধারিত নয়',
                academicYear: cls.academicYear || '২০২৫',
                totalStudents: cls.totalStudents || 0,
                isActive: cls.isActive !== false
              }));

              console.log('🔄 Auto-updating classes:', formattedClasses);
              setClasses(formattedClasses);
              localStorage.setItem('iqra_classes', JSON.stringify(formattedClasses));

              // Show success message for new class additions
              if (formattedClasses.length > allClasses.length) {
                setSaveMessage(`নতুন ক্লাস যোগ করা হয়েছে! মোট ${formattedClasses.length} টি ক্লাস উপলব্ধ`);
                setTimeout(() => setSaveMessage(''), 3000);
              }
            }
          });

          // Store unsubscribe function for cleanup
          return unsubscribe;
        } else {
          console.log('⚠️ No classes found in Firebase, using fallback...');
          // Fallback classes if Firebase is empty
          const fallbackClasses = [
            { classId: 'play-class', className: 'প্লে', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'nursery-class', className: 'নার্সারি', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'one-class', className: 'প্রথম', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'two-class', className: 'দ্বিতীয়', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'three-class', className: 'তৃতীয়', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'four-class', className: 'চতুর্থ', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'five-class', className: 'পঞ্চম', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true }
          ];

          console.log('📝 Setting fallback classes:', fallbackClasses);
          setClasses(fallbackClasses);
          localStorage.setItem('iqra_classes', JSON.stringify(fallbackClasses));
        }
      } catch (firebaseError) {
        console.error('❌ Firebase error:', firebaseError);

        // Use localStorage as backup or set fallback
        if (!savedClasses) {
          const fallbackClasses = [
            { classId: 'play-class', className: 'প্লে', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'nursery-class', className: 'নার্সারি', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'one-class', className: 'প্রথম', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'two-class', className: 'দ্বিতীয়', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'three-class', className: 'তৃতীয়', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'four-class', className: 'চতুর্থ', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
            { classId: 'five-class', className: 'পঞ্চম', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true }
          ];

          console.log('🚨 Setting fallback classes:', fallbackClasses);
          setClasses(fallbackClasses);
        }
      }
    } catch (error) {
      console.error('💥 Critical error loading classes:', error);
      setSaveMessage('ক্লাস লোড করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 3000);

      // Emergency fallback
      const emergencyClasses = [
        { classId: 'play-class', className: 'প্লে', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
        { classId: 'nursery-class', className: 'নার্সারি', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
        { classId: 'one-class', className: 'প্রথম', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
        { classId: 'two-class', className: 'দ্বিতীয়', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
        { classId: 'three-class', className: 'তৃতীয়', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
        { classId: 'four-class', className: 'চতুর্থ', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true },
        { classId: 'five-class', className: 'পঞ্চম', section: 'এ', teacherName: 'নির্ধারিত নয়', totalStudents: 0, isActive: true }
      ];
      setClasses(emergencyClasses);
    } finally {
      setLoadingClasses(false);
      console.log('🏁 Class loading process completed');
    }
  };

  // Load fees from Firebase (both simple and comprehensive fees)
  const loadFees = async () => {
    if (!user) return;

    setLoadingFees(true);
    try {
      console.log('🔄 Loading fees from Firebase...');

      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');

      // Load comprehensive fees (where new fees are saved)
      const comprehensiveFeesSnapshot = await getDocs(query(collection(db, 'comprehensive_fees'), orderBy('createdAt', 'desc')));

      console.log('🔍 Comprehensive fees collection size:', comprehensiveFeesSnapshot.size);

      if (!comprehensiveFeesSnapshot.empty) {
        const comprehensiveFees: any[] = [];
        comprehensiveFeesSnapshot.forEach((doc) => {
          console.log(`📄 Comprehensive fee document:`, {
            id: doc.id,
            data: doc.data()
          });
          comprehensiveFees.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Transform comprehensive fees for display
        const formattedFees = comprehensiveFees.map((fee) => ({
          id: fee.id,
          name: `কমপ্রিহেনসিভ ফি - ${fee.selectedClassName}`,
          type: 'comprehensive',
          amount: fee.grandTotal,
          description: `টিউশন: ৳${fee.totalTuitionAmount}, পরীক্ষা: ৳${fee.totalExamAmount}`,
          applicableClasses: fee.selectedClass,
          collectionDeadline: fee.collectionDeadline,
          lateFee: fee.lateFee,
          isActive: fee.isActive,
          isMandatory: fee.isMandatory,
          autoReminder: fee.autoReminder,
          students: 0,
          status: fee.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়',
          icon: '🎓',
          color: 'blue',
          createdAt: fee.createdAt,
          createdBy: fee.createdBy,
          tuitionFees: fee.tuitionFees,
          examFees: fee.examFees,
          totalTuitionAmount: fee.totalTuitionAmount,
          totalExamAmount: fee.totalExamAmount,
          grandTotal: fee.grandTotal,
          selectedClassName: fee.selectedClassName
        }));

        console.log('✅ Loaded comprehensive fees from Firebase:', formattedFees);
        setFees(formattedFees);

        // Also save to localStorage for offline access
        localStorage.setItem('iqra_comprehensive_fees', JSON.stringify(formattedFees));
      } else {
        console.log('⚠️ No comprehensive fees found in Firebase, checking localStorage...');
        // Fallback to localStorage if Firebase is empty
        const savedFees = localStorage.getItem('iqra_comprehensive_fees') || localStorage.getItem('iqra_fees');
        if (savedFees) {
          const parsedFees = JSON.parse(savedFees);
          console.log('💾 Loaded fees from localStorage:', parsedFees);
          setFees(parsedFees);
        } else {
          console.log('📝 No fees found anywhere, setting empty array');
          setFees([]);
        }
      }
    } catch (error) {
      console.error('💥 Critical error loading fees:', error);
      setSaveMessage('ফি লোড করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setLoadingFees(false);
    }
  };

  // Helper function to get fee icon based on type
  const getFeeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'monthly': '💰',
      'yearly': '📚',
      'one-time': '🎓',
      'per-exam': '📝',
      'per-semester': '📖'
    };
    return icons[type] || '💰';
  };

  // Helper function to get fee color based on type
  const getFeeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'monthly': 'green',
      'yearly': 'orange',
      'one-time': 'purple',
      'per-exam': 'blue',
      'per-semester': 'indigo'
    };
    return colors[type] || 'green';
  };

  // Create default fees in Firebase
  const createDefaultFees = async () => {
    if (!user) return;

    console.log('📝 Creating default fees in Firebase...');

    const defaultFees = [
      {
        id: '1',
        name: 'বেতন ফি',
        type: 'monthly',
        amount: 1500,
        description: 'মাসিক বেতন ফি',
        applicableClasses: 'all',
        collectionDeadline: '5',
        lateFee: 10,
        isActive: true,
        isMandatory: true,
        autoReminder: true,
        students: 1247,
        status: 'সক্রিয়',
        icon: '💰',
        color: 'green',
        createdAt: new Date().toISOString(),
        createdBy: user?.email
      },
      {
        id: '2',
        name: 'পরীক্ষার ফি',
        type: 'per-exam',
        amount: 500,
        description: 'প্রতি পরীক্ষার ফি',
        applicableClasses: 'all',
        collectionDeadline: '1',
        lateFee: 5,
        isActive: true,
        isMandatory: true,
        autoReminder: true,
        students: 1247,
        status: 'সক্রিয়',
        icon: '📝',
        color: 'blue',
        createdAt: new Date().toISOString(),
        createdBy: user?.email
      },
      {
        id: '3',
        name: 'ভর্তি ফি',
        type: 'one-time',
        amount: 2000,
        description: 'নতুন শিক্ষার্থী ভর্তি ফি',
        applicableClasses: 'all',
        collectionDeadline: '1',
        lateFee: 0,
        isActive: true,
        isMandatory: true,
        autoReminder: false,
        students: 156,
        status: 'সক্রিয়',
        icon: '🎓',
        color: 'purple',
        createdAt: new Date().toISOString(),
        createdBy: user?.email
      },
      {
        id: '4',
        name: 'সেশন ফি',
        type: 'yearly',
        amount: 1000,
        description: 'বার্ষিক সেশন ফি',
        applicableClasses: 'all',
        collectionDeadline: '15',
        lateFee: 20,
        isActive: true,
        isMandatory: true,
        autoReminder: true,
        students: 1247,
        status: 'সক্রিয়',
        icon: '📚',
        color: 'orange',
        createdAt: new Date().toISOString(),
        createdBy: user?.email
      },
      {
        id: '5',
        name: 'ল্যাব ফি',
        type: 'monthly',
        amount: 300,
        description: 'কম্পিউটার ল্যাব ব্যবহার ফি',
        applicableClasses: '6-12',
        collectionDeadline: '10',
        lateFee: 15,
        isActive: true,
        isMandatory: false,
        autoReminder: true,
        students: 234,
        status: 'সক্রিয়',
        icon: '🔬',
        color: 'indigo',
        createdAt: new Date().toISOString(),
        createdBy: user?.email
      },
      {
        id: '6',
        name: 'স্পোর্টস ফি',
        type: 'yearly',
        amount: 200,
        description: 'ক্রীড়া এবং খেলাধুলা ফি',
        applicableClasses: 'all',
        collectionDeadline: '30',
        lateFee: 0,
        isActive: true,
        isMandatory: false,
        autoReminder: false,
        students: 1247,
        status: 'সক্রিয়',
        icon: '⚽',
        color: 'red',
        createdAt: new Date().toISOString(),
        createdBy: user?.email
      }
    ];

    try {
      const { collection, addDoc } = await import('firebase/firestore');

      for (const fee of defaultFees) {
        await addDoc(collection(db, 'fees'), {
          ...fee,
          createdAt: new Date().toISOString(),
          createdBy: user?.email
        });
      }

      console.log('✅ Default fees created in Firebase');
      setFees(defaultFees);
      localStorage.setItem('iqra_fees', JSON.stringify(defaultFees));
    } catch (error) {
      console.error('❌ Error creating default fees:', error);
      setFees(defaultFees);
      localStorage.setItem('iqra_fees', JSON.stringify(defaultFees));
    }
  };

  // Save fee to Firebase
  const saveFee = async (feeData: any) => {
    if (!user) return;

    setSaving(true);
    try {
      console.log('💾 Saving fee to Firebase:', feeData);

      const { collection, addDoc, updateDoc, doc } = await import('firebase/firestore');

      if (editingFee) {
        // Update existing fee in Firebase
        const feeRef = doc(db, 'fees', editingFee.id);
        await updateDoc(feeRef, {
          ...feeData,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email
        });

        console.log('✅ Fee updated in Firebase:', editingFee.id);

        // Update local state
        const updatedFees = fees.map((fee: any) =>
          fee.id === editingFee.id ? { ...feeData, updatedAt: new Date().toISOString(), updatedBy: user?.email } : fee
        );
        setFees(updatedFees);
        localStorage.setItem('iqra_fees', JSON.stringify(updatedFees));

        setSaveMessage('ফি সফলভাবে আপডেট করা হয়েছে!');
      } else {
        // Add new fee to Firebase
        const docRef = await addDoc(collection(db, 'fees'), {
          ...feeData,
          createdAt: new Date().toISOString(),
          createdBy: user?.email
        });

        console.log('✅ New fee added to Firebase:', docRef.id);

        // Update local state
        const newFee = { ...feeData, id: docRef.id };
        const updatedFees = [...fees, newFee];
        setFees(updatedFees);
        localStorage.setItem('iqra_fees', JSON.stringify(updatedFees));

        setSaveMessage('ফি সফলভাবে সংরক্ষণ করা হয়েছে!');
      }

      setTimeout(() => setSaveMessage(''), 3000);

      // Close modal and reset form
      setShowFeeModal(false);
      resetFeeForm();
    } catch (error) {
      console.error('❌ Error saving fee to Firebase:', error);
      setSaveMessage('ফি সংরক্ষণ করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Reset fee form
  const resetFeeForm = () => {
    setFeeFormData({
      name: '',
      type: '',
      amount: '',
      description: '',
      applicableClasses: 'all',
      collectionDeadline: '',
      lateFee: '0',
      isActive: true,
      isMandatory: false,
      autoReminder: false
    });
    setEditingFee(null);
  };

  // Open fee modal for new fee
  const openNewFeeModal = () => {
    resetFeeForm();
    setShowFeeModal(true);
  };

  // Open fee modal for editing
  const openEditFeeModal = (fee: any) => {
    setEditingFee(fee);
    setFeeFormData({
      name: fee.name,
      type: fee.type,
      amount: fee.amount.toString(),
      description: fee.description,
      applicableClasses: fee.applicableClasses,
      collectionDeadline: fee.collectionDeadline,
      lateFee: fee.lateFee.toString(),
      isActive: fee.isActive,
      isMandatory: fee.isMandatory,
      autoReminder: fee.autoReminder
    });
    setShowFeeModal(true);
  };

  // Handle fee form submission
  const handleFeeSubmit = async () => {
    if (!user) {
      setSaveMessage('ব্যবহারকারী লগইন করুন');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    // Validation for class selection
    if (!selectedClass) {
      setSaveMessage('একটি ক্লাস নির্বাচন করুন');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    // Collect all fee amounts from input fields
    const tuitionFees = {
      monthlyFee: parseFloat(feeAmounts.monthlyFee) || 0,
      sessionFee: parseFloat(feeAmounts.sessionFee) || 0,
      admissionFee: parseFloat(feeAmounts.admissionFee) || 0
    };

    const examFees = {
      firstTermExamFee: parseFloat(feeAmounts.firstTermExamFee) || 0,
      secondTermExamFee: parseFloat(feeAmounts.secondTermExamFee) || 0,
      annualExamFee: parseFloat(feeAmounts.annualExamFee) || 0,
      monthlyExamFee: parseFloat(feeAmounts.monthlyExamFee) || 0
    };

    // Check if at least one fee amount is provided
    const hasValidTuitionFee = Object.values(tuitionFees).some(amount => amount > 0);
    const hasValidExamFee = Object.values(examFees).some(amount => amount > 0);

    if (!hasValidTuitionFee && !hasValidExamFee) {
      setSaveMessage('অন্তত একটি ফি এর পরিমাণ নির্ধারণ করুন');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    // Prepare fee data for Firebase
    const feeData = {
      selectedClass: selectedClass,
      selectedClassName: selectedClass === 'all' ? 'সকল ক্লাস' : classes.find(cls => cls.classId === selectedClass)?.className + ' - সেকশন ' + classes.find(cls => cls.classId === selectedClass)?.section,
      tuitionFees: tuitionFees,
      examFees: examFees,
      totalTuitionAmount: Object.values(tuitionFees).reduce((sum, amount) => sum + amount, 0),
      totalExamAmount: Object.values(examFees).reduce((sum, amount) => sum + amount, 0),
      grandTotal: Object.values(tuitionFees).reduce((sum, amount) => sum + amount, 0) + Object.values(examFees).reduce((sum, amount) => sum + amount, 0),
      collectionDeadline: '15', // Default deadline
      lateFee: 10, // Default late fee
      isActive: true,
      isMandatory: true,
      autoReminder: true,
      createdBy: user?.email,
      createdAt: new Date().toISOString(),
      academicYear: new Date().getFullYear().toString()
    };

    console.log('💾 Saving comprehensive fee data:', feeData);

    try {
      setSaving(true);

      // Save to Firebase
      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'comprehensive_fees'), feeData);

      console.log('✅ Comprehensive fee data saved to Firebase:', docRef.id);

      // Update localStorage for offline access
      const existingFees = JSON.parse(localStorage.getItem('iqra_comprehensive_fees') || '[]');
      const newFee = { ...feeData, id: docRef.id };
      const updatedFees = [...existingFees, newFee];
      localStorage.setItem('iqra_comprehensive_fees', JSON.stringify(updatedFees));

      setSaveMessage('ফি সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setSaveMessage(''), 3000);

      // Reset form after successful save
      setSelectedClass('');
      setFeeAmounts({
        monthlyFee: '600',
        sessionFee: '1000',
        admissionFee: '1200',
        firstTermExamFee: '200',
        secondTermExamFee: '250',
        annualExamFee: '400',
        monthlyExamFee: '100'
      });

      // Close modal
      setShowFeeModal(false);

      // Reload fees to show the newly saved fee
      console.log('🔄 Reloading fees after save...');
      await loadFees();

    } catch (error) {
      console.error('❌ Error saving comprehensive fee data:', error);
      setSaveMessage('ফি সংরক্ষণ করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [authUserData, userData, user]);

  useEffect(() => {
    if (!auth) {
      console.error('Auth not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        console.log('🔐 User authenticated:', user.email);

        // Load user data from Firestore
        const userDoc = await userQueries.getUserByEmail(user.email || '');
        if (userDoc) {
          setUserData(userDoc);
        }

        // Load settings from Firebase
        await loadSettings();
        // Load system statistics
        await loadSystemStats();

        // Load fees from Firebase - ensure this runs
        console.log('🔄 Starting fee loading...');
        await loadFees();
        console.log('✅ Fee loading completed');

        // Load classes from Firebase for dropdown
        await loadClasses();

        // Load pending users if super admin and users tab is active
        if (userDoc?.role === 'super_admin' && activeTab === 'users') {
          await loadPendingUsers();
        }
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const settingsData = await settingsQueries.getSettings();
      if (settingsData) {
        setSettings(settingsData);

        // Load integrations from settings if available
        if ((settingsData as any).integrations && Array.isArray((settingsData as any).integrations)) {
          const savedIntegrations = (settingsData as any).integrations;
          setIntegrations(prevIntegrations => 
            prevIntegrations.map(integration => {
              const saved = savedIntegrations.find((s: any) => s.id === integration.id);
              if (saved) {
                return {
                  ...integration,
                  status: saved.status || integration.status,
                  config: {
                    ...integration.config,
                    ...saved.config
                  }
                };
              }
              return integration;
            })
          );
        }

        // Load SMS templates from settings if available
        if ((settingsData as any).smsTemplates && Array.isArray((settingsData as any).smsTemplates)) {
          setSmsTemplates((settingsData as any).smsTemplates);
        }

        // Update form data with loaded settings
        setFormData({
          // General settings
          schoolName: settingsData.schoolName || '',
          schoolCode: settingsData.schoolCode || '',
          board: settingsData.board || '',
          schoolAddress: settingsData.schoolAddress || '',
          schoolPhone: settingsData.schoolPhone || '',
          schoolEmail: settingsData.schoolEmail || '',
          principalName: settingsData.principalName || '',
          schoolType: settingsData.schoolType || '',
          academicYear: settingsData.academicYear || '',
          systemLanguage: settingsData.systemLanguage || '',
          schoolDescription: settingsData.schoolDescription || '',
          schoolLogo: (settingsData as any).schoolLogo || '',
          establishmentYear: (settingsData as any).establishmentYear || '',

          // Security settings
          minPasswordLength: settingsData.minPasswordLength || 8,
          maxPasswordAge: settingsData.maxPasswordAge || 90,
          sessionTimeout: settingsData.sessionTimeout || 30,
          maxActiveSessions: settingsData.maxActiveSessions || 5,

          // Database settings
          backupFrequency: settingsData.backupFrequency || 'daily',
          backupRetention: settingsData.backupRetention || 30,

          // System settings
          cacheExpiry: settingsData.cacheExpiry || 24,
          maxUploadSize: settingsData.maxUploadSize || 10,
          apiRateLimit: settingsData.apiRateLimit || 100,
          apiTimeout: settingsData.apiTimeout || 30,

          // Appearance settings
          theme: settingsData.theme || 'light',
          primaryColor: settingsData.primaryColor || 'blue',
          compactMode: settingsData.compactMode || false,
          sidebarCollapsed: settingsData.sidebarCollapsed || false,
          darkMode: settingsData.darkMode || false,
          rtlSupport: settingsData.rtlSupport || false,

          // Public pages settings
          galleryPageEnabled: settingsData.galleryPageEnabled !== undefined ? settingsData.galleryPageEnabled : true,
          aboutPageEnabled: settingsData.aboutPageEnabled !== undefined ? settingsData.aboutPageEnabled : true,
          contactPageEnabled: settingsData.contactPageEnabled !== undefined ? settingsData.contactPageEnabled : true,

          // Contact page content
          contactPageTitle: settingsData.contactPageTitle || 'যোগাযোগ করুন',
          contactPageSubtitle: settingsData.contactPageSubtitle || 'আমাদের সাথে যোগাযোগ করে আপনার প্রশ্নের উত্তর পান এবং আমাদের সম্পর্কে আরও জানুন',
          contactPhones: settingsData.contactPhones || ['+৮৮০ ১৭১১ ২৩৪৫৬৭', '+৮৮০ ১৯১১ ২৩৪৫৬৭'],
          contactEmails: settingsData.contactEmails || ['info@iqraschool.edu', 'admission@iqraschool.edu'],
          contactAddress: settingsData.contactAddress || ['রামপুরা, ঢাকা-১২১৯', 'বাংলাদেশ'],
          contactHours: settingsData.contactHours || ['রবি-বৃহ: সকাল ৮টা - বিকাল ৫টা', 'শুক্র: সকাল ৮টা - দুপুর ১২টা'],
          contactDepartments: settingsData.contactDepartments || [
            { name: 'ভর্তি বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৭', email: 'admission@iqraschool.edu', description: 'নতুন শিক্ষার্থী ভর্তি সংক্রান্ত সকল তথ্য' },
            { name: 'শিক্ষা বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৮', email: 'academic@iqraschool.edu', description: 'শিক্ষা কার্যক্রম ও পাঠ্যক্রম সংক্রান্ত' },
            { name: 'প্রশাসন', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৯', email: 'admin@iqraschool.edu', description: 'সাধারণ প্রশাসনিক কাজ' },
            { name: 'হিসাব বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৭০', email: 'accounts@iqraschool.edu', description: 'ফি ও আর্থিক বিষয়াদি' }
          ],
          contactMapEmbedCode: settingsData.contactMapEmbedCode || '',
          contactMapAddress: settingsData.contactMapAddress || 'রামপুরা, ঢাকা-১২১৯',
          contactSocialMediaFacebook: settingsData.contactSocialMedia?.facebook || '',
          contactSocialMediaTwitter: settingsData.contactSocialMedia?.twitter || '',
          contactSocialMediaInstagram: settingsData.contactSocialMedia?.instagram || '',
          contactSocialMediaYoutube: settingsData.contactSocialMedia?.youtube || '',
          contactFormSubjects: settingsData.contactFormSubjects || ['ভর্তি সংক্রান্ত', 'শিক্ষা সংক্রান্ত', 'ফি সংক্রান্ত', 'সাধারণ তথ্য', 'অভিযোগ', 'পরামর্শ'],

          // Notification settings
          smtpServer: settingsData.smtpServer || 'smtp.gmail.com',
          smtpPort: settingsData.smtpPort || 587,
          smtpEmail: settingsData.smtpEmail || '',
          smtpPassword: settingsData.smtpPassword || '',
          studentRegistrationEmail: settingsData.studentRegistrationEmail !== undefined ? settingsData.studentRegistrationEmail : true,
          studentRegistrationPush: settingsData.studentRegistrationPush !== undefined ? settingsData.studentRegistrationPush : false,
          studentRegistrationSMS: settingsData.studentRegistrationSMS !== undefined ? settingsData.studentRegistrationSMS : false,
          paymentReminderEmail: settingsData.paymentReminderEmail !== undefined ? settingsData.paymentReminderEmail : true,
          paymentReminderPush: settingsData.paymentReminderPush !== undefined ? settingsData.paymentReminderPush : true,
          paymentReminderSMS: settingsData.paymentReminderSMS !== undefined ? settingsData.paymentReminderSMS : false,
          attendanceReportEmail: settingsData.attendanceReportEmail !== undefined ? settingsData.attendanceReportEmail : false,
          attendanceReportPush: settingsData.attendanceReportPush !== undefined ? settingsData.attendanceReportPush : true,
          attendanceReportSMS: settingsData.attendanceReportSMS !== undefined ? settingsData.attendanceReportSMS : false,
          systemAlertEmail: settingsData.systemAlertEmail !== undefined ? settingsData.systemAlertEmail : true,
          systemAlertPush: settingsData.systemAlertPush !== undefined ? settingsData.systemAlertPush : true,
          examScheduleEmail: settingsData.examScheduleEmail !== undefined ? settingsData.examScheduleEmail : true,
          examSchedulePush: settingsData.examSchedulePush !== undefined ? settingsData.examSchedulePush : false,
          examScheduleSMS: settingsData.examScheduleSMS !== undefined ? settingsData.examScheduleSMS : false,
          examResultsEmail: settingsData.examResultsEmail !== undefined ? settingsData.examResultsEmail : true,
          examResultsPush: settingsData.examResultsPush !== undefined ? settingsData.examResultsPush : true,
          examResultsSMS: settingsData.examResultsSMS !== undefined ? settingsData.examResultsSMS : false,
          homeworkAssignmentEmail: settingsData.homeworkAssignmentEmail !== undefined ? settingsData.homeworkAssignmentEmail : true,
          homeworkAssignmentPush: settingsData.homeworkAssignmentPush !== undefined ? settingsData.homeworkAssignmentPush : true,
          homeworkReminderEmail: settingsData.homeworkReminderEmail !== undefined ? settingsData.homeworkReminderEmail : true,
          homeworkReminderPush: settingsData.homeworkReminderPush !== undefined ? settingsData.homeworkReminderPush : true,
          classAnnouncementEmail: settingsData.classAnnouncementEmail !== undefined ? settingsData.classAnnouncementEmail : true,
          classAnnouncementPush: settingsData.classAnnouncementPush !== undefined ? settingsData.classAnnouncementPush : true,
          noticeNotificationEmail: settingsData.noticeNotificationEmail !== undefined ? settingsData.noticeNotificationEmail : true,
          noticeNotificationPush: settingsData.noticeNotificationPush !== undefined ? settingsData.noticeNotificationPush : true,
          eventReminderEmail: settingsData.eventReminderEmail !== undefined ? settingsData.eventReminderEmail : true,
          eventReminderPush: settingsData.eventReminderPush !== undefined ? settingsData.eventReminderPush : true,
          messageNotificationEmail: settingsData.messageNotificationEmail !== undefined ? settingsData.messageNotificationEmail : true,
          messageNotificationPush: settingsData.messageNotificationPush !== undefined ? settingsData.messageNotificationPush : true,
          messageNotificationSMS: settingsData.messageNotificationSMS !== undefined ? settingsData.messageNotificationSMS : false,
          complaintResponseEmail: settingsData.complaintResponseEmail !== undefined ? settingsData.complaintResponseEmail : true,
          complaintResponsePush: settingsData.complaintResponsePush !== undefined ? settingsData.complaintResponsePush : true,
          feePaymentConfirmationEmail: settingsData.feePaymentConfirmationEmail !== undefined ? settingsData.feePaymentConfirmationEmail : false,
          feePaymentConfirmationPush: settingsData.feePaymentConfirmationPush !== undefined ? settingsData.feePaymentConfirmationPush : false,
          feePaymentConfirmationSMS: settingsData.feePaymentConfirmationSMS !== undefined ? settingsData.feePaymentConfirmationSMS : false,
          admissionConfirmationEmail: settingsData.admissionConfirmationEmail !== undefined ? settingsData.admissionConfirmationEmail : true,
          admissionConfirmationPush: settingsData.admissionConfirmationPush !== undefined ? settingsData.admissionConfirmationPush : true,
          admissionConfirmationSMS: settingsData.admissionConfirmationSMS !== undefined ? settingsData.admissionConfirmationSMS : false,
          teacherAssignmentEmail: settingsData.teacherAssignmentEmail !== undefined ? settingsData.teacherAssignmentEmail : true,
          teacherAssignmentPush: settingsData.teacherAssignmentPush !== undefined ? settingsData.teacherAssignmentPush : false,
          teacherAssignmentSMS: settingsData.teacherAssignmentSMS !== undefined ? settingsData.teacherAssignmentSMS : false,
          classScheduleEmail: settingsData.classScheduleEmail !== undefined ? settingsData.classScheduleEmail : false,
          classSchedulePush: settingsData.classSchedulePush !== undefined ? settingsData.classSchedulePush : false,
          classScheduleSMS: settingsData.classScheduleSMS !== undefined ? settingsData.classScheduleSMS : false,

          // Advanced settings
          debugMode: settingsData.debugMode || false,
          apiDocumentation: settingsData.apiDocumentation || true,
          enableCSP: settingsData.enableCSP || true,
          enableXFrameOptions: settingsData.enableXFrameOptions || true,
          enableXContentTypeOptions: settingsData.enableXContentTypeOptions || true,
          enableHSTS: settingsData.enableHSTS || false,
          enableReferrerPolicy: settingsData.enableReferrerPolicy || true,
          customCSS: settingsData.customCSS || '',
          customJS: settingsData.customJS || ''
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSaveMessage('সেটিংস লোড করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      const stats = await settingsQueries.getSystemStats();
      setSystemStats(prev => ({
        ...prev,
        activeUsers: stats.activeUsers || 1247,
        storage: {
          ...prev.storage,
          used: stats.storageUsed || 156,
          total: stats.storageTotal || 500
        }
      }));
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  // Load pending users (admin, teacher, and super_admin applications)
  const loadPendingUsers = async () => {
    if (userData?.role !== 'super_admin') return;

    try {
      setLoadingPendingUsers(true);
      // Get all pending users (isActive: false)
      const allPending = await userQueries.getPendingUsers();
      
      // Filter admin, teacher, and super_admin roles that need approval
      const pendingApplications = allPending.filter(
        u => (u.role === 'admin' || u.role === 'teacher' || u.role === 'super_admin') && !u.isActive
      ) as PendingUser[];

      setPendingUsers(pendingApplications);
      console.log(`Loaded ${pendingApplications.length} pending applications (admin/teacher/super_admin)`);
    } catch (error) {
      console.error('Error loading pending users:', error);
      alert('অনুমোদনের জন্য অপেক্ষমান ব্যবহারকারী লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingPendingUsers(false);
    }
  };

  // Load approved users (admin, teacher, and super_admin)
  const loadApprovedUsers = async () => {
    if (userData?.role !== 'super_admin') return;

    try {
      setLoadingApprovedUsers(true);
      // Get all active users
      const allActive = await userQueries.getActiveUsers();
      
      // Filter admin, teacher, and super_admin roles
      const approved = allActive.filter(
        u => u.role === 'admin' || u.role === 'teacher' || u.role === 'super_admin'
      );

      setApprovedUsers(approved);
      console.log(`Loaded ${approved.length} approved users (admin/teacher/super_admin)`);
    } catch (error) {
      console.error('Error loading approved users:', error);
      alert('অনুমোদনপ্রাপ্ত ব্যবহারকারী লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingApprovedUsers(false);
    }
  };

  // Set up real-time listener for users
  useEffect(() => {
    if (activeTab === 'users' && userData?.role === 'super_admin') {
      loadPendingUsers();
      loadApprovedUsers();

      // Set up real-time listener for users
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as User));

        // Update pending users
        const pending = allUsers.filter(
          u => (u.role === 'admin' || u.role === 'teacher' || u.role === 'super_admin') && !u.isActive
        ) as PendingUser[];
        setPendingUsers(pending);

        // Update approved users
        const approved = allUsers.filter(
          u => (u.role === 'admin' || u.role === 'teacher' || u.role === 'super_admin') && u.isActive
        );
        setApprovedUsers(approved);
      }, (error) => {
        console.error('Error listening to users:', error);
      });

      return () => unsubscribe();
    }
  }, [activeTab, userData]);

  // Approve user
  const handleApproveUser = async (userId: string) => {
    if (userData?.role !== 'super_admin') {
      alert('আপনার অনুমোদনের অনুমতি নেই।');
      return;
    }

    setUpdatingUser(prev => new Set(prev).add(userId));

    try {
      // Get current school name from settings
      const currentSettings = await settingsQueries.getSettings();
      const schoolName = currentSettings?.schoolName || SCHOOL_NAME;
      const schoolCode = currentSettings?.schoolCode || SCHOOL_ID;

      // Update user with correct school name and activate
      await userQueries.updateUser(userId, {
        isActive: true,
        schoolName: schoolName,
        schoolId: schoolCode
      });
      
      // Remove from pending list
      setPendingUsers(prev => prev.filter(u => u.uid !== userId));
      
      alert('ব্যবহারকারী অনুমোদন করা হয়েছে। এখন তারা লগইন করতে পারবে।');
    } catch (error) {
      console.error('Error approving user:', error);
      alert('ব্যবহারকারী অনুমোদন করতে সমস্যা হয়েছে।');
    } finally {
      setUpdatingUser(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Reject user (delete application)
  const handleRejectUser = async (userId: string) => {
    if (userData?.role !== 'super_admin') {
      alert('আপনার বাতিল করার অনুমতি নেই।');
      return;
    }

    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই আবেদনটি বাতিল করতে চান?')) {
      return;
    }

    setUpdatingUser(prev => new Set(prev).add(userId));

    try {
      await userQueries.deleteUser(userId);
      
      // Remove from pending list
      setPendingUsers(prev => prev.filter(u => u.uid !== userId));
      
      alert('আবেদন বাতিল করা হয়েছে।');
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('আবেদন বাতিল করতে সমস্যা হয়েছে।');
    } finally {
      setUpdatingUser(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Filter approved users
  const filteredApprovedUsers = approvedUsers.filter(user => {
    // Role filter
    if (userFilter !== 'all' && user.role !== userFilter) {
      return false;
    }

    // Search filter
    if (userSearchQuery.trim()) {
      const query = userSearchQuery.toLowerCase();
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.schoolName?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleLogout = async () => {
    if (!auth) {
      console.error('Auth not initialized');
      return;
    }

    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to initialize all default templates
  const initializeDefaultTemplates = () => {
    const defaultTemplates = [
      // ভর্তি (Admission)
      {
        id: 'template-admission',
        name: 'ভর্তি',
        category: 'Admission',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} এর {className} শ্রেণিতে ভর্তি সম্পন্ন হয়েছে। স্বাগতম {schoolName} এ। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{className}', '{schoolName}']
      },
      // সেশন (Session)
      {
        id: 'template-session',
        name: 'সেশন',
        category: 'Session',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} এর জন্য নতুন সেশন {session} শুরু হয়েছে। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{session}', '{schoolName}']
      },
      // টিউশন ফি (Tuition Fee)
      {
        id: 'template-tuition-fee',
        name: 'টিউশন ফি',
        category: 'Tuition Fee',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} এর {className} শ্রেণির মাসিক টিউশন ফি {amount} টাকা বাকি আছে। অনুগ্রহ করে পরিশোধ করুন। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{className}', '{amount}', '{schoolName}']
      },
      // টিউশন ফি পেমেন্ট নিশ্চিতকরণ (Tuition Fee Payment Confirmation)
      {
        id: 'template-tuition-payment-confirmation',
        name: 'টিউশন ফি পেমেন্ট নিশ্চিতকরণ',
        category: 'Payment',
        message: `আস সালামু আলাইকুম,
{studentName} (রোল: {rollNumber}) এর {monthText} টিউশন ফি {totalAmount} টাকা সফলভাবে গ্রহণ করা হয়েছে।
তারিখ: {date}
ভাউচার: {voucherNumber}
ধন্যবাদ,
{schoolName}`,
        variables: ['{studentName}', '{rollNumber}', '{monthText}', '{totalAmount}', '{date}', '{voucherNumber}', '{schoolName}']
      },
      // টিউশন ফি পেমেন্ট (দরিদ্র তহবিল সহ)
      {
        id: 'template-tuition-payment-with-fund',
        name: 'টিউশন ফি পেমেন্ট (দরিদ্র তহবিল সহ)',
        category: 'Payment',
        message: `আস সালামু আলাইকুম,
{studentName} (রোল: {rollNumber}) এর {monthText} টিউশন ফি {totalAmount} টাকা সফলভাবে গ্রহণ করা হয়েছে।
প্রদত্ত: {paidAmount} টাকা
দরিদ্র তহবিল থেকে: {donationAmount} টাকা
তারিখ: {date}
ভাউচার: {voucherNumber}
ধন্যবাদ,
{schoolName}`,
        variables: ['{studentName}', '{rollNumber}', '{monthText}', '{totalAmount}', '{paidAmount}', '{donationAmount}', '{date}', '{voucherNumber}', '{schoolName}']
      },
      // উপস্থিতি (Attendance)
      {
        id: 'template-attendance',
        name: 'উপস্থিতি',
        category: 'Attendance',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} আজ {date} তারিখে {className} শ্রেণিতে অনুপস্থিত ছিলেন। অনুগ্রহ করে জানান কেন অনুপস্থিত ছিলেন। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{date}', '{className}', '{schoolName}']
      },
      // বিশেষ ছুটি (Special Holiday/Event)
      {
        id: 'template-special-holiday',
        name: 'বিশেষ ছুটি',
        category: 'Event',
        message: 'আস সালামু আলাইকুম- {guardianName}, {date} তারিখে {schoolName} এ বিশেষ ছুটি থাকবে। - {schoolName}',
        variables: ['{guardianName}', '{date}', '{schoolName}']
      },
      // পরীক্ষা (Exam)
      {
        id: 'template-exam',
        name: 'পরীক্ষা',
        category: 'Exam',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} এর {className} শ্রেণির পরীক্ষার রুটিন প্রকাশিত হয়েছে। পরীক্ষা শুরু হবে {examDate} তারিখে। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{className}', '{examDate}', '{schoolName}']
      },
      // পরীক্ষার ফি (Exam Fee)
      {
        id: 'template-exam-fee',
        name: 'পরীক্ষার ফি',
        category: 'Exam Fee',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} এর {className} শ্রেণির পরীক্ষার ফি {amount} টাকা বাকি আছে। অনুগ্রহ করে পরিশোধ করুন। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{className}', '{amount}', '{schoolName}']
      },
      // ফলাফল (Result)
      {
        id: 'template-result',
        name: 'ফলাফল',
        category: 'Exam',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} এর {className} শ্রেণির {examName} পরীক্ষার ফলাফল প্রকাশিত হয়েছে। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{className}', '{examName}', '{schoolName}']
      },
      // ফলাফলের তারিখ (Result Date)
      {
        id: 'template-result-date',
        name: 'ফলাফলের তারিখ',
        category: 'Exam',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} এর {className} শ্রেণির {examName} পরীক্ষার ফলাফল {resultDate} তারিখে প্রকাশিত হবে। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{className}', '{examName}', '{resultDate}', '{schoolName}']
      },
      // বকেয়া রিমাইন্ডার (Outstanding Fee Reminder)
      {
        id: 'template-outstanding-fee-reminder',
        name: 'বকেয়া রিমাইন্ডার',
        category: 'Reminder',
        message: 'আস সালামু আলাইকুম- {guardianName}, {studentName} এর {className} শ্রেণির {feeType} ফি {amount} টাকা বাকি আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। - {schoolName}',
        variables: ['{guardianName}', '{studentName}', '{className}', '{feeType}', '{amount}', '{schoolName}']
      },
      // শিক্ষক বেতন (Teacher Salary)
      {
        id: 'template-teacher-salary',
        name: 'শিক্ষক বেতন',
        category: 'Salary Payment',
        message: 'আস সালামু আলাইকুম- {teacherName}, আপনার {month} মাসের বেতন {amount} টাকা সফলভাবে পরিশোধ হয়েছে। রসিদ নং: {receiptNumber}। ধন্যবাদ - {schoolName}',
        variables: ['{teacherName}', '{month}', '{amount}', '{receiptNumber}', '{schoolName}']
      }
    ];

    // Merge with existing templates, update if exists, add if new
    setSmsTemplates(prevTemplates => {
      const existingMap = new Map(prevTemplates.map(t => [t.id, t]));
      
      // Update existing templates or add new ones
      defaultTemplates.forEach(template => {
        existingMap.set(template.id, template);
      });
      
      return Array.from(existingMap.values());
    });

    setSaveMessage('সব ডিফল্ট টেম্পলেট যোগ/আপডেট করা হয়েছে। এখন "সংরক্ষণ করুন" বাটনে ক্লিক করুন!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Helper function to recursively remove undefined values
  const removeUndefinedValues = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return undefined;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = removeUndefinedValues(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    return obj;
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setSaving(true);
    setSaveMessage('');

    try {
      // Get form data from controlled components
      // Don't use default values - use what user entered or empty string
      const schoolName = formData.schoolName || '';
      const schoolCode = formData.schoolCode || '';
      const board = formData.board || '';
      const schoolAddress = formData.schoolAddress || 'ঢাকা, বাংলাদেশ';
      const schoolPhone = formData.schoolPhone || '+8801712345678';
      const schoolEmail = formData.schoolEmail || 'info@iqraschool.edu.bd';
      const principalName = formData.principalName || 'ড. মোহাম্মদ আলী';
      const schoolType = formData.schoolType || 'মাদ্রাসা';
      const academicYear = formData.academicYear || new Date().getFullYear().toString();
      const systemLanguage = formData.systemLanguage || 'bn';
      const schoolDescription = formData.schoolDescription || 'একটি আধুনিক ইসলামিক শিক্ষা প্রতিষ্ঠান যা ধর্মীয় এবং আধুনিক শিক্ষার সমন্বয়ে শিক্ষার্থীদের বিকাশে কাজ করে।';
      const schoolLogo = formData.schoolLogo || '';
      const establishmentYear = formData.establishmentYear || '';

      // Security settings
      const minPasswordLength = formData.minPasswordLength || 8;
      const maxPasswordAge = formData.maxPasswordAge || 90;
      const sessionTimeout = formData.sessionTimeout || 30;
      const maxActiveSessions = formData.maxActiveSessions || 5;

      // Database settings
      const backupFrequency = formData.backupFrequency || 'daily';
      const backupRetention = formData.backupRetention || 30;

      // System settings
      const cacheExpiry = formData.cacheExpiry || 24;
      const maxUploadSize = formData.maxUploadSize || 10;
      const apiRateLimit = formData.apiRateLimit || 100;
      const apiTimeout = formData.apiTimeout || 30;

      // Appearance settings
      const theme = formData.theme || 'light';
      const primaryColor = formData.primaryColor || 'blue';
      const compactMode = formData.compactMode || false;
      const sidebarCollapsed = formData.sidebarCollapsed || false;
      const darkMode = formData.darkMode || false;
      const rtlSupport = formData.rtlSupport || false;
      const galleryPageEnabled = formData.galleryPageEnabled !== undefined ? formData.galleryPageEnabled : true;
      const aboutPageEnabled = formData.aboutPageEnabled !== undefined ? formData.aboutPageEnabled : true;
      const contactPageEnabled = formData.contactPageEnabled !== undefined ? formData.contactPageEnabled : true;
      const contactPageTitle = formData.contactPageTitle || 'যোগাযোগ করুন';
      const contactPageSubtitle = formData.contactPageSubtitle || 'আমাদের সাথে যোগাযোগ করে আপনার প্রশ্নের উত্তর পান এবং আমাদের সম্পর্কে আরও জানুন';
      const contactPhones = formData.contactPhones || [];
      const contactEmails = formData.contactEmails || [];
      const contactAddress = formData.contactAddress || [];
      const contactHours = formData.contactHours || [];
      const contactDepartments = formData.contactDepartments || [];
      const contactMapEmbedCode = formData.contactMapEmbedCode || '';
      const contactMapAddress = formData.contactMapAddress || '';
      const contactFormSubjects = formData.contactFormSubjects || [];
      const contactSocialMedia = {
        facebook: formData.contactSocialMediaFacebook || '',
        twitter: formData.contactSocialMediaTwitter || '',
        instagram: formData.contactSocialMediaInstagram || '',
        youtube: formData.contactSocialMediaYoutube || ''
      };

      // Notification settings
      const smtpServer = formData.smtpServer || 'smtp.gmail.com';
      const smtpPort = formData.smtpPort || 587;
      const smtpEmail = formData.smtpEmail || 'noreply@iqraschool.edu.bd';
      const smtpPassword = formData.smtpPassword || '';
      const studentRegistrationEmail = formData.studentRegistrationEmail !== undefined ? formData.studentRegistrationEmail : true;
      const studentRegistrationPush = formData.studentRegistrationPush !== undefined ? formData.studentRegistrationPush : false;
      const studentRegistrationSMS = formData.studentRegistrationSMS !== undefined ? formData.studentRegistrationSMS : false;
      const paymentReminderEmail = formData.paymentReminderEmail !== undefined ? formData.paymentReminderEmail : true;
      const paymentReminderPush = formData.paymentReminderPush !== undefined ? formData.paymentReminderPush : true;
      const paymentReminderSMS = formData.paymentReminderSMS !== undefined ? formData.paymentReminderSMS : false;
      const attendanceReportEmail = formData.attendanceReportEmail !== undefined ? formData.attendanceReportEmail : false;
      const attendanceReportPush = formData.attendanceReportPush !== undefined ? formData.attendanceReportPush : true;
      const attendanceReportSMS = formData.attendanceReportSMS !== undefined ? formData.attendanceReportSMS : false;
      const systemAlertEmail = formData.systemAlertEmail !== undefined ? formData.systemAlertEmail : true;
      const systemAlertPush = formData.systemAlertPush !== undefined ? formData.systemAlertPush : true;
      const examScheduleEmail = formData.examScheduleEmail !== undefined ? formData.examScheduleEmail : true;
      const examSchedulePush = formData.examSchedulePush !== undefined ? formData.examSchedulePush : false;
      const examScheduleSMS = formData.examScheduleSMS !== undefined ? formData.examScheduleSMS : false;
      const examResultsEmail = formData.examResultsEmail !== undefined ? formData.examResultsEmail : true;
      const examResultsPush = formData.examResultsPush !== undefined ? formData.examResultsPush : true;
      const examResultsSMS = formData.examResultsSMS !== undefined ? formData.examResultsSMS : false;
      const homeworkAssignmentEmail = formData.homeworkAssignmentEmail !== undefined ? formData.homeworkAssignmentEmail : true;
      const homeworkAssignmentPush = formData.homeworkAssignmentPush !== undefined ? formData.homeworkAssignmentPush : true;
      const homeworkReminderEmail = formData.homeworkReminderEmail !== undefined ? formData.homeworkReminderEmail : true;
      const homeworkReminderPush = formData.homeworkReminderPush !== undefined ? formData.homeworkReminderPush : true;
      const classAnnouncementEmail = formData.classAnnouncementEmail !== undefined ? formData.classAnnouncementEmail : true;
      const classAnnouncementPush = formData.classAnnouncementPush !== undefined ? formData.classAnnouncementPush : true;
      const noticeNotificationEmail = formData.noticeNotificationEmail !== undefined ? formData.noticeNotificationEmail : true;
      const noticeNotificationPush = formData.noticeNotificationPush !== undefined ? formData.noticeNotificationPush : true;
      const eventReminderEmail = formData.eventReminderEmail !== undefined ? formData.eventReminderEmail : true;
      const eventReminderPush = formData.eventReminderPush !== undefined ? formData.eventReminderPush : true;
      const messageNotificationEmail = formData.messageNotificationEmail !== undefined ? formData.messageNotificationEmail : true;
      const messageNotificationPush = formData.messageNotificationPush !== undefined ? formData.messageNotificationPush : true;
      const messageNotificationSMS = formData.messageNotificationSMS !== undefined ? formData.messageNotificationSMS : false;
      const complaintResponseEmail = formData.complaintResponseEmail !== undefined ? formData.complaintResponseEmail : true;
      const complaintResponsePush = formData.complaintResponsePush !== undefined ? formData.complaintResponsePush : true;
      const feePaymentConfirmationEmail = formData.feePaymentConfirmationEmail !== undefined ? formData.feePaymentConfirmationEmail : false;
      const feePaymentConfirmationPush = formData.feePaymentConfirmationPush !== undefined ? formData.feePaymentConfirmationPush : false;
      const feePaymentConfirmationSMS = formData.feePaymentConfirmationSMS !== undefined ? formData.feePaymentConfirmationSMS : false;
      const admissionConfirmationEmail = formData.admissionConfirmationEmail !== undefined ? formData.admissionConfirmationEmail : true;
      const admissionConfirmationPush = formData.admissionConfirmationPush !== undefined ? formData.admissionConfirmationPush : true;
      const admissionConfirmationSMS = formData.admissionConfirmationSMS !== undefined ? formData.admissionConfirmationSMS : false;
      const teacherAssignmentEmail = formData.teacherAssignmentEmail !== undefined ? formData.teacherAssignmentEmail : true;
      const teacherAssignmentPush = formData.teacherAssignmentPush !== undefined ? formData.teacherAssignmentPush : false;
      const teacherAssignmentSMS = formData.teacherAssignmentSMS !== undefined ? formData.teacherAssignmentSMS : false;
      const classScheduleEmail = formData.classScheduleEmail !== undefined ? formData.classScheduleEmail : false;
      const classSchedulePush = formData.classSchedulePush !== undefined ? formData.classSchedulePush : false;
      const classScheduleSMS = formData.classScheduleSMS !== undefined ? formData.classScheduleSMS : false;

      // Advanced settings
      const debugMode = formData.debugMode || false;
      const apiDocumentation = formData.apiDocumentation || true;
      const enableCSP = formData.enableCSP || true;
      const enableXFrameOptions = formData.enableXFrameOptions || true;
      const enableXContentTypeOptions = formData.enableXContentTypeOptions || true;
      const enableHSTS = formData.enableHSTS || false;
      const enableReferrerPolicy = formData.enableReferrerPolicy || true;
      const customCSS = formData.customCSS || '';
      const customJS = formData.customJS || '';

      const settingsToSave: Partial<SystemSettings> = {
        // General settings
        schoolName,
        schoolCode,
        board,
        schoolAddress,
        schoolPhone,
        schoolEmail,
        principalName,
        schoolType,
        academicYear,
        systemLanguage,
        schoolDescription,
        schoolLogo: schoolLogo || undefined,
        establishmentYear: establishmentYear || undefined,

        // Security settings
        minPasswordLength,
        maxPasswordAge,
        sessionTimeout,
        maxActiveSessions,

        // Database settings
        backupFrequency,
        backupRetention,

        // System settings
        cacheExpiry,
        maxUploadSize,
        apiRateLimit,
        apiTimeout,

        // Appearance settings
        theme,
        primaryColor,
        compactMode,
        sidebarCollapsed,
        darkMode,
        rtlSupport,

        // Public pages settings
        galleryPageEnabled,
        aboutPageEnabled,
        contactPageEnabled,

        // Contact page content
        contactPageTitle,
        contactPageSubtitle,
        contactPhones,
        contactEmails,
        contactAddress,
        contactHours,
        contactDepartments,
        contactMapEmbedCode,
        contactMapAddress,
        contactSocialMedia,
        contactFormSubjects,

        // Notification settings
        smtpServer,
        smtpPort,
        smtpEmail,
        smtpPassword,
        studentRegistrationEmail,
        studentRegistrationPush,
        studentRegistrationSMS,
        paymentReminderEmail,
        paymentReminderPush,
        paymentReminderSMS,
        attendanceReportEmail,
        attendanceReportPush,
        attendanceReportSMS,
        systemAlertEmail,
        systemAlertPush,
        examScheduleEmail,
        examSchedulePush,
        examScheduleSMS,
        examResultsEmail,
        examResultsPush,
        examResultsSMS,
        homeworkAssignmentEmail,
        homeworkAssignmentPush,
        homeworkReminderEmail,
        homeworkReminderPush,
        classAnnouncementEmail,
        classAnnouncementPush,
        noticeNotificationEmail,
        noticeNotificationPush,
        eventReminderEmail,
        eventReminderPush,
        messageNotificationEmail,
        messageNotificationPush,
        messageNotificationSMS,
        complaintResponseEmail,
        complaintResponsePush,
        feePaymentConfirmationEmail,
        feePaymentConfirmationPush,
        feePaymentConfirmationSMS,
        admissionConfirmationEmail,
        admissionConfirmationPush,
        admissionConfirmationSMS,
        teacherAssignmentEmail,
        teacherAssignmentPush,
        teacherAssignmentSMS,
        classScheduleEmail,
        classSchedulePush,
        classScheduleSMS,

        // Advanced settings
        debugMode,
        apiDocumentation,
        enableCSP,
        enableXFrameOptions,
        enableXContentTypeOptions,
        enableHSTS,
        enableReferrerPolicy,
        customCSS,
        customJS,

        // Integrations settings - remove undefined values
        integrations: integrations.map(i => {
          // Clean config object to remove undefined values
          const cleanConfig = Object.fromEntries(
            Object.entries(i.config).filter(([_, value]) => value !== undefined)
          );
          return {
            id: i.id,
            name: i.name,
            status: i.status,
            config: cleanConfig
          };
        }),

        // SMS Templates
        smsTemplates: smsTemplates.length > 0 ? smsTemplates : undefined,

        updatedBy: user.email || 'admin'
      };

      // Remove undefined values from settingsToSave recursively (Firestore doesn't allow undefined)
      const cleanSettings = removeUndefinedValues(settingsToSave) as Partial<SystemSettings>;

      console.log('Saving settings:', cleanSettings);
      await settingsQueries.saveSettings(cleanSettings, user.email || 'admin');

      setSaveMessage('সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setSaveMessage(''), 3000);

      // Reload settings to reflect changes
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('সেটিংস সংরক্ষণ করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const result = await settingsQueries.createBackup();
      setSaveMessage(result);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error creating backup:', error);
      setSaveMessage('ব্যাকআপ তৈরি করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const data = await settingsQueries.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSaveMessage('ডেটা সফলভাবে এক্সপোর্ট করা হয়েছে');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setSaveMessage('ডেটা এক্সপোর্ট করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await settingsQueries.clearCache();
      setSaveMessage('ক্যাশে সফলভাবে পরিষ্কার করা হয়েছে');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error clearing cache:', error);
      setSaveMessage('ক্যাশে পরিষ্কার করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAcademicYear = () => {
    if (!newAcademicYear.trim()) {
      setSaveMessage('একাডেমিক বর্ষ লিখুন');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    // Check if year already exists
    if (customAcademicYears.includes(newAcademicYear)) {
      setSaveMessage('এই একাডেমিক বর্ষটি ইতিমধ্যে যোগ করা হয়েছে');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    // Add to custom years list
    setCustomAcademicYears([...customAcademicYears, newAcademicYear]);
    setNewAcademicYear('');
    setShowAddYearModal(false);
    setSaveMessage('একাডেমিক বর্ষ সফলভাবে যোগ করা হয়েছে');
    setTimeout(() => setSaveMessage(''), 3000);
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
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: true },
  ];

  const settingsTabs = [
    { id: 'general', label: 'সাধারণ', icon: Settings, description: 'বেসিক সিস্টেম কনফিগারেশন' },
    { id: 'users', label: 'ব্যবহারকারী', icon: UserIcon, description: 'ব্যবহারকারী ম্যানেজমেন্ট এবং রোল' },
    { id: 'publicPages', label: 'পাবলিক পেজ', icon: Globe, description: 'গ্যালারী, পরিচিতি, যোগাযোগ পেজ নিয়ন্ত্রণ' },
    { id: 'notifications', label: 'নোটিফিকেশন', icon: Bell, description: 'ইমেইল এবং পুশ নোটিফিকেশন' },
    { id: 'integrations', label: 'ইন্টিগ্রেশন', icon: Wifi, description: 'তৃতীয় পক্ষের সার্ভিস ইন্টিগ্রেশন' },
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
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </a>
          ))}
          
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
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
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">সেটিংস</h1>
                  <p className="text-sm text-gray-600 leading-tight">সিস্টেম সেটিংস পরিচালনা করুন</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 h-full">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="সেটিংস খুঁজুন..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                  />
                </div>
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                
                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                      {((authUserData as any)?.photoURL || userData?.photoURL || user?.photoURL) && !imageError ? (
                        <img
                          src={(authUserData as any)?.photoURL || userData?.photoURL || user?.photoURL || ''}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={() => {
                            setImageError(true);
                          }}
                        />
                      ) : (
                        <span className="text-white font-medium text-sm">
                          {(user?.email?.charAt(0) || userData?.email?.charAt(0) || authUserData?.email?.charAt(0) || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </button>

                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowUserMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                              {((authUserData as any)?.photoURL || userData?.photoURL || user?.photoURL) && !imageError ? (
                                <img
                                  src={(authUserData as any)?.photoURL || userData?.photoURL || user?.photoURL || ''}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                  onError={() => {
                                    setImageError(true);
                                  }}
                                />
                              ) : (
                                <span className="text-white font-medium">
                                  {(user?.email?.charAt(0) || userData?.email?.charAt(0) || authUserData?.email?.charAt(0) || 'U').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {(userData as any)?.name || authUserData?.displayName || user?.displayName || user?.email?.split('@')[0] || 'অ্যাডমিন'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user?.email || (userData as any)?.email || authUserData?.email || ''}
                              </p>
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                {(userData as any)?.role === 'super_admin' ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/admin/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <UserCircle className="w-4 h-4 mr-3" />
                            প্রোফাইল
                          </Link>
                          <Link
                            href="/admin/settings"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Settings className="w-4 h-4 mr-3" />
                            সেটিংস
                          </Link>
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              auth.signOut();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            লগআউট
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
            {/* Save Message */}
            {saveMessage && (
              <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
                saveMessage.includes('সফলভাবে') || saveMessage.includes('successfully')
                  ? 'bg-green-100 border border-green-400 text-green-700'
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
                {saveMessage.includes('সফলভাবে') || saveMessage.includes('successfully') ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <span>{saveMessage}</span>
              </div>
            )}

            {/* Loading Overlay */}
            {saving && (
              <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-white rounded-lg p-6 flex items-center space-x-3 shadow-xl border border-gray-200">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-700 font-medium">সংরক্ষণ হচ্ছে...</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Settings Navigation */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">সেটিংস মেনু</h3>
                  <nav className="space-y-1">
                    {settingsTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <tab.icon className="w-4 h-4 mr-3" />
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Settings Content */}
              <div className="lg:col-span-3 space-y-6">

                {/* Main Settings Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  {activeTab === 'general' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">সাধারণ সেটিংস</h3>
                          <p className="text-sm text-gray-600 mt-1">বেসিক সিস্টেম কনফিগারেশন</p>
                        </div>
                        <button
                          onClick={handleSaveSettings}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>সংরক্ষণ</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              স্কুলের নাম *
                            </label>
                            <input
                              type="text"
                              value={formData.schoolName}
                              onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="স্কুলের পুরো নাম (যেমন: ইকরা নূরানী একাডেমি)"
                              required
                            />
                            {!formData.schoolName && (
                              <p className="mt-1 text-sm text-yellow-600">
                                ⚠️ স্কুলের নাম সেট করুন, অন্যথায় "আমার স্কুল" দেখাবে
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              স্কুলের কোড
                            </label>
                            <input
                              type="text"
                              value={formData.schoolCode}
                              onChange={(e) => setFormData({...formData, schoolCode: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="যেমন: AMAR-2026"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                একাডেমিক বর্ষ
                              </label>
                              <button
                                onClick={() => setShowAddYearModal(true)}
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                              >
                                <Plus className="w-4 h-4" />
                                <span>নতুন যোগ করুন</span>
                              </button>
                            </div>
                            <select
                              value={formData.academicYear}
                              onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">একাডেমিক বর্ষ নির্বাচন করুন</option>
                              <option value="2031">২০৩১</option>
                              <option value="2030">২০৩০</option>
                              <option value="2029">২০২৯</option>
                              <option value="2028">২০২৮</option>
                              <option value="2027">২০২৭</option>
                              <option value="2026">২০২৬</option>
                              <option value="2025">২০২৫</option>
                              <option value="2024">২০২৪</option>
                              <option value="2023">২০২৩</option>
                              <option value="2022">২০২২</option>
                              <option value="2021">২০২১</option>
                              <option value="2020">২০২০</option>
                              <option value="2019">২০১৯</option>
                              <option value="2018">২০১৮</option>
                              <option value="2017">২০১৭</option>
                              <option value="2016">২০১৬</option>
                              {/* Custom academic years */}
                              {customAcademicYears.map((year) => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              প্রিন্সিপালের নাম
                            </label>
                            <input
                              type="text"
                              value={formData.principalName}
                              onChange={(e) => setFormData({...formData, principalName: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="প্রিন্সিপালের পুরো নাম"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              স্কুলের ধরন
                            </label>
                            <select 
                              value={formData.schoolType}
                              onChange={(e) => setFormData({...formData, schoolType: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="মাদ্রাসা">মাদ্রাসা</option>
                              <option value="স্কুল">স্কুল</option>
                              <option value="কলেজ">কলেজ</option>
                              <option value="বিশ্ববিদ্যালয়">বিশ্ববিদ্যালয়</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              বোর্ড
                            </label>
                            <input
                              type="text"
                              value={formData.board}
                              onChange={(e) => setFormData({...formData, board: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                              placeholder="যেমন: ঢাকা, চট্টগ্রাম, রাজশাহী"
                            />
                            {formData.board && formData.board.trim() && (
                              <select
                                value={formData.board}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                              >
                                <option value={formData.board}>{formData.board}</option>
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              সিস্টেম ল্যাংগুয়েজ
                            </label>
                            <select 
                              value={formData.systemLanguage}
                              onChange={(e) => setFormData({...formData, systemLanguage: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="bn">বাংলা</option>
                              <option value="en">English</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            স্কুলের ঠিকানা
                          </label>
                          <input
                            type="text"
                            value={formData.schoolAddress}
                            onChange={(e) => setFormData({...formData, schoolAddress: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="যেমন: ঢাকা, বাংলাদেশ"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            প্রতিষ্ঠার সাল
                          </label>
                          <input
                            type="text"
                            value={formData.establishmentYear}
                            onChange={(e) => setFormData({...formData, establishmentYear: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="যেমন: ২০১৮"
                          />
                          <p className="text-xs text-gray-500 mt-1">বাংলা বা ইংরেজি অংকে সাল লিখুন</p>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            মোবাইল নাম্বার
                          </label>
                          <input
                            type="text"
                            value={formData.schoolPhone}
                            onChange={(e) => setFormData({...formData, schoolPhone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="যেমন: +8801712345678"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ইমেইল
                          </label>
                          <input
                            type="email"
                            value={formData.schoolEmail}
                            onChange={(e) => setFormData({...formData, schoolEmail: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="যেমন: info@iqraschool.edu.bd"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          স্কুলের বর্ণনা
                        </label>
                        <textarea
                          rows={4}
                          value={formData.schoolDescription}
                          onChange={(e) => setFormData({...formData, schoolDescription: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="স্কুলের বর্ণনা লিখুন..."
                        />
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          স্কুল লোগো (ফাইল এক্সপোর্টের জন্য)
                        </label>
                        <div className="space-y-4">
                          {formData.schoolLogo && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-600 mb-2">বর্তমান লোগো:</p>
                              <div className="relative inline-block">
                                <img 
                                  src={formData.schoolLogo} 
                                  alt="School Logo" 
                                  className="max-w-xs max-h-32 object-contain border border-gray-300 rounded-lg p-2 bg-white"
                                />
                                <button
                                  onClick={() => setFormData({...formData, schoolLogo: ''})}
                                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 -mt-2 -mr-2"
                                  title="লোগো সরান"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                          <ImageKitUploader
                            type="school"
                            schoolId={SCHOOL_ID}
                            onUploadSuccess={(file) => {
                              if (file && file.url) {
                                setFormData({...formData, schoolLogo: file.url});
                              }
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500">
                            ফাইল এক্সপোর্ট (PDF, Excel, ইত্যাদি) করার সময় এই লোগো ব্যবহার করা হবে।
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">ব্যবহারকারী ম্যানেজমেন্ট</h3>
                          <p className="text-sm text-gray-600 mt-1">অনুমোদনের জন্য অপেক্ষমান এবং অনুমোদনপ্রাপ্ত ব্যবহারকারী (অ্যাডমিন, শিক্ষক, সুপার অ্যাডমিন)</p>
                        </div>
                        <button 
                          onClick={() => {
                            loadPendingUsers();
                            loadApprovedUsers();
                          }}
                          disabled={loadingPendingUsers || loadingApprovedUsers}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${(loadingPendingUsers || loadingApprovedUsers) ? 'animate-spin' : ''}`} />
                          <span>রিফ্রেশ</span>
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-yellow-700 mb-1">অপেক্ষমান আবেদন</p>
                              <p className="text-2xl font-bold text-yellow-900">{pendingUsers.length}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-600" />
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-700 mb-1">অনুমোদনপ্রাপ্ত</p>
                              <p className="text-2xl font-bold text-green-900">{approvedUsers.length}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                        </div>
                      </div>

                      {/* Pending Users Section */}
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">অপেক্ষমান আবেদনসমূহ</h4>

                      {userData?.role !== 'super_admin' ? (
                        <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
                          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
                          <h4 className="text-lg font-semibold text-yellow-900 mb-2">অনুমতি নেই</h4>
                          <p className="text-sm text-yellow-700">
                            শুধুমাত্র সুপার অ্যাডমিন এই পেজটি দেখতে পারেন এবং আবেদন অনুমোদন করতে পারেন।
                          </p>
                        </div>
                      ) : loadingPendingUsers ? (
                        <div className="text-center py-12">
                          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                          <p className="text-gray-600">আবেদনসমূহ লোড হচ্ছে...</p>
                        </div>
                      ) : pendingUsers.length === 0 ? (
                        <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                          <h4 className="text-lg font-semibold text-green-900 mb-2">কোনো অপেক্ষমান আবেদন নেই</h4>
                          <p className="text-sm text-green-700">
                            বর্তমানে অনুমোদনের জন্য অপেক্ষমান কোনো অ্যাডমিন, শিক্ষক বা সুপার অ্যাডমিনের আবেদন নেই।
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {pendingUsers.map((pendingUser) => (
                            <div 
                              key={pendingUser.uid} 
                              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-3">
                                    <div className={`w-10 h-10 rounded-full ${
                                      pendingUser.role === 'admin' ? 'bg-blue-100' : 
                                      pendingUser.role === 'super_admin' ? 'bg-red-100' : 
                                      'bg-green-100'
                                    } flex items-center justify-center`}>
                                      <UserIcon className={`w-5 h-5 ${
                                        pendingUser.role === 'admin' ? 'text-blue-600' : 
                                        pendingUser.role === 'super_admin' ? 'text-red-600' : 
                                        'text-green-600'
                                      }`} />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-lg">{pendingUser.name}</h4>
                                      <p className="text-sm text-gray-600">
                                        {pendingUser.role === 'admin' ? 'অ্যাডমিন' : 
                                         pendingUser.role === 'teacher' ? 'শিক্ষক' : 
                                         pendingUser.role === 'super_admin' ? 'সুপার অ্যাডমিন' : 
                                         pendingUser.role}
                                      </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      pendingUser.role === 'admin' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : pendingUser.role === 'super_admin'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {pendingUser.role === 'admin' ? 'অ্যাডমিন' : 
                                       pendingUser.role === 'teacher' ? 'শিক্ষক' : 
                                       pendingUser.role === 'super_admin' ? 'সুপার অ্যাডমিন' : 
                                       pendingUser.role}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                      <Mail className="w-4 h-4" />
                                      <span>{pendingUser.email}</span>
                                    </div>
                                    {pendingUser.phone && (
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Smartphone className="w-4 h-4" />
                                        <span>{pendingUser.phone}</span>
                                      </div>
                                    )}
                                    {pendingUser.schoolName && (
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Building className="w-4 h-4" />
                                        <span>{pendingUser.schoolName}</span>
                                      </div>
                                    )}
                                    {pendingUser.createdAt && (
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                          আবেদনের তারিখ: {pendingUser.createdAt.toDate?.().toLocaleDateString('bn-BD') || 'অজানা'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                  <button
                                    onClick={() => handleApproveUser(pendingUser.uid)}
                                    disabled={updatingUser.has(pendingUser.uid)}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {updatingUser.has(pendingUser.uid) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                    <span>অনুমোদন</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectUser(pendingUser.uid)}
                                    disabled={updatingUser.has(pendingUser.uid)}
                                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {updatingUser.has(pendingUser.uid) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                    <span>বাতিল</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      </div>

                      {/* Approved Users Section */}
                      <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900">অনুমোদনপ্রাপ্ত ব্যবহারকারী</h4>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={async () => {
                                if (!confirm('আপনি কি সব অনুমোদনপ্রাপ্ত ব্যবহারকারীর স্কুলের নাম আপডেট করতে চান?')) {
                                  return;
                                }
                                try {
                                  const currentSettings = await settingsQueries.getSettings();
                                  const schoolName = currentSettings?.schoolName || SCHOOL_NAME;
                                  const schoolCode = currentSettings?.schoolCode || SCHOOL_ID;

                                  // Update all approved users
                                  const updatePromises = approvedUsers.map(user => 
                                    userQueries.updateUser(user.uid, {
                                      schoolName: schoolName,
                                      schoolId: schoolCode
                                    })
                                  );

                                  await Promise.all(updatePromises);
                                  alert('সব ব্যবহারকারীর স্কুলের নাম আপডেট করা হয়েছে!');
                                  loadApprovedUsers();
                                } catch (error) {
                                  console.error('Error updating school names:', error);
                                  alert('স্কুলের নাম আপডেট করতে সমস্যা হয়েছে');
                                }
                              }}
                              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                              title="সব ব্যবহারকারীর স্কুলের নাম আপডেট করুন"
                            >
                              স্কুলের নাম আপডেট করুন
                            </button>
                            <div className="relative">
                              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="খুঁজুন..."
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <select
                              value={userFilter}
                              onChange={(e) => setUserFilter(e.target.value as any)}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="all">সকল</option>
                              <option value="super_admin">সুপার অ্যাডমিন</option>
                              <option value="admin">অ্যাডমিন</option>
                              <option value="teacher">শিক্ষক</option>
                            </select>
                          </div>
                        </div>

                        {loadingApprovedUsers ? (
                          <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                            <p className="text-gray-600">অনুমোদনপ্রাপ্ত ব্যবহারকারী লোড হচ্ছে...</p>
                          </div>
                        ) : filteredApprovedUsers.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                            <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              {userSearchQuery || userFilter !== 'all' 
                                ? 'কোনো ব্যবহারকারী পাওয়া যায়নি' 
                                : 'কোনো অনুমোদনপ্রাপ্ত ব্যবহারকারী নেই'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {userSearchQuery || userFilter !== 'all'
                                ? 'আপনার অনুসন্ধানের সাথে মিলে যায় এমন কোনো ব্যবহারকারী নেই'
                                : 'এখনও কোনো ব্যবহারকারী অনুমোদন দেওয়া হয়নি'}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ব্যবহারকারী</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ইমেইল</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ফোন</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ভূমিকা</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">স্কুল</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অনুমোদনের তারিখ</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থা</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {filteredApprovedUsers.map((approvedUser) => (
                                    <tr key={approvedUser.uid} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className={`w-10 h-10 rounded-full ${
                                            approvedUser.role === 'admin' ? 'bg-blue-100' : 
                                            approvedUser.role === 'super_admin' ? 'bg-red-100' : 
                                            'bg-green-100'
                                          } flex items-center justify-center mr-3`}>
                                            <UserIcon className={`w-5 h-5 ${
                                              approvedUser.role === 'admin' ? 'text-blue-600' : 
                                              approvedUser.role === 'super_admin' ? 'text-red-600' : 
                                              'text-green-600'
                                            }`} />
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">
                                              {approvedUser.name || 'নাম নেই'}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{approvedUser.email}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{approvedUser.phone || '-'}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          approvedUser.role === 'admin' 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : approvedUser.role === 'super_admin'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                          {approvedUser.role === 'admin' ? 'অ্যাডমিন' : 
                                           approvedUser.role === 'teacher' ? 'শিক্ষক' : 
                                           approvedUser.role === 'super_admin' ? 'সুপার অ্যাডমিন' : 
                                           approvedUser.role}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{approvedUser.schoolName || '-'}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                          {approvedUser.createdAt 
                                            ? (approvedUser.createdAt instanceof Timestamp 
                                                ? approvedUser.createdAt.toDate().toLocaleDateString('bn-BD')
                                                : new Date(approvedUser.createdAt).toLocaleDateString('bn-BD'))
                                            : '-'}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          সক্রিয়
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'publicPages' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">পাবলিক পেজ নিয়ন্ত্রণ</h3>
                          <p className="text-sm text-gray-600 mt-1">গ্যালারী, পরিচিতি, যোগাযোগ পেজ সক্রিয়/নিষ্ক্রিয় করুন</p>
                        </div>
                        <button 
                          onClick={handleSaveSettings}
                          disabled={saving}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Gallery Page */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-lg mb-1">গ্যালারী</h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  স্কুলের বিভিন্ন ছবি, ইভেন্ট এবং স্মৃতিচারণ গ্যালারী প্রদর্শন করুন
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <span>URL:</span>
                                  <code className="bg-gray-100 px-2 py-1 rounded">/gallery</code>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.galleryPageEnabled}
                                  onChange={(e) => setFormData({...formData, galleryPageEnabled: e.target.checked})}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>
                          <div className={`mt-4 p-3 rounded-lg text-sm ${
                            formData.galleryPageEnabled 
                              ? 'bg-green-50 text-green-800 border border-green-200' 
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {formData.galleryPageEnabled ? (
                              <span className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>গ্যালারী পেজ সক্রিয় - ব্যবহারকারীরা এই পেজ দেখতে পারবে</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-2">
                                <XCircle className="w-4 h-4" />
                                <span>গ্যালারী পেজ নিষ্ক্রিয় - ব্যবহারকারীরা এই পেজ দেখতে পারবে না</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* About Page */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Info className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-lg mb-1">পরিচিতি</h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  স্কুলের সম্পর্কে তথ্য, মিশন, ভিশন এবং ইতিহাস প্রদর্শন করুন
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <span>URL:</span>
                                  <code className="bg-gray-100 px-2 py-1 rounded">/about</code>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.aboutPageEnabled}
                                  onChange={(e) => setFormData({...formData, aboutPageEnabled: e.target.checked})}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>
                          <div className={`mt-4 p-3 rounded-lg text-sm ${
                            formData.aboutPageEnabled 
                              ? 'bg-green-50 text-green-800 border border-green-200' 
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {formData.aboutPageEnabled ? (
                              <span className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>পরিচিতি পেজ সক্রিয় - ব্যবহারকারীরা এই পেজ দেখতে পারবে</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-2">
                                <XCircle className="w-4 h-4" />
                                <span>পরিচিতি পেজ নিষ্ক্রিয় - ব্যবহারকারীরা এই পেজ দেখতে পারবে না</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Contact Page */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Phone className="w-6 h-6 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-lg mb-1">যোগাযোগ</h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  যোগাযোগের তথ্য, ঠিকানা, ফোন নম্বর এবং যোগাযোগ ফরম প্রদর্শন করুন
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <span>URL:</span>
                                  <code className="bg-gray-100 px-2 py-1 rounded">/contact</code>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.contactPageEnabled}
                                  onChange={(e) => setFormData({...formData, contactPageEnabled: e.target.checked})}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>
                          <div className={`mt-4 p-3 rounded-lg text-sm ${
                            formData.contactPageEnabled 
                              ? 'bg-green-50 text-green-800 border border-green-200' 
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {formData.contactPageEnabled ? (
                              <span className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>যোগাযোগ পেজ সক্রিয় - ব্যবহারকারীরা এই পেজ দেখতে পারবে</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-2">
                                <XCircle className="w-4 h-4" />
                                <span>যোগাযোগ পেজ নিষ্ক্রিয় - ব্যবহারকারীরা এই পেজ দেখতে পারবে না</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Links to Control Page for all enabled pages */}
                        <div className="mt-6 space-y-3">
                          {(formData.contactPageEnabled || formData.galleryPageEnabled || formData.aboutPageEnabled) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">পেজ কন্টেন্ট সম্পাদনা করুন</h4>
                                  <p className="text-sm text-gray-600">যোগাযোগ, গ্যালারী এবং পরিচিতি পেজের সকল কন্টেন্ট আলাদা আলাদা ট্যাবে সম্পাদনা করুন</p>
                                </div>
                                <button
                                  onClick={() => router.push('/admin/public-pages-control')}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                                >
                                  <Settings className="w-4 h-4" />
                                  <span>নিয়ন্ত্রণ পেজে যান</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Contact Page Content Editor - Removed - now in separate control page */}
                        {false && formData.contactPageEnabled && (
                          <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                              <Phone className="w-6 h-6 text-green-600" />
                              <span>যোগাযোগ পেজ কন্টেন্ট সম্পাদনা</span>
                            </h3>

                            <div className="space-y-6">
                              {/* Header Section */}
                              <div className="bg-white rounded-lg p-5 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-4">হেডার সেকশন</h4>
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      পেজ শিরোনাম
                                    </label>
                                    <input
                                      type="text"
                                      value={formData.contactPageTitle}
                                      onChange={(e) => setFormData({...formData, contactPageTitle: e.target.value})}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="যোগাযোগ করুন"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      সাবটাইটেল
                                    </label>
                                    <textarea
                                      value={formData.contactPageSubtitle}
                                      onChange={(e) => setFormData({...formData, contactPageSubtitle: e.target.value})}
                                      rows={2}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="আমাদের সাথে যোগাযোগ করে আপনার প্রশ্নের উত্তর পান..."
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Contact Info Cards */}
                              <div className="bg-white rounded-lg p-5 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-4">যোগাযোগের তথ্য (৪টি কার্ড)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Phone */}
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">ফোন নম্বর (প্রতিটি নতুন লাইনে একটি)</label>
                                    <textarea
                                      value={Array.isArray(formData.contactPhones) ? formData.contactPhones.join('\n') : ''}
                                      onChange={(e) => setFormData({...formData, contactPhones: e.target.value.split('\n').filter(p => p.trim())})}
                                      rows={3}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="+৮৮০ ১৭১১ ২৩৪৫৬৭&#10;+৮৮০ ১৯১১ ২৩৪৫৬৭"
                                    />
                                  </div>
                                  {/* Email */}
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">ইমেইল ঠিকানা (প্রতিটি নতুন লাইনে একটি)</label>
                                    <textarea
                                      value={Array.isArray(formData.contactEmails) ? formData.contactEmails.join('\n') : ''}
                                      onChange={(e) => setFormData({...formData, contactEmails: e.target.value.split('\n').filter(e => e.trim())})}
                                      rows={3}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="info@iqraschool.edu&#10;admission@iqraschool.edu"
                                    />
                                  </div>
                                  {/* Address */}
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">ঠিকানা (প্রতিটি নতুন লাইনে একটি)</label>
                                    <textarea
                                      value={Array.isArray(formData.contactAddress) ? formData.contactAddress.join('\n') : ''}
                                      onChange={(e) => setFormData({...formData, contactAddress: e.target.value.split('\n').filter(a => a.trim())})}
                                      rows={3}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="রামপুরা, ঢাকা-১২১৯&#10;বাংলাদেশ"
                                    />
                                  </div>
                                  {/* Hours */}
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">সময়সূচী (প্রতিটি নতুন লাইনে একটি)</label>
                                    <textarea
                                      value={Array.isArray(formData.contactHours) ? formData.contactHours.join('\n') : ''}
                                      onChange={(e) => setFormData({...formData, contactHours: e.target.value.split('\n').filter(h => h.trim())})}
                                      rows={3}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="রবি-বৃহ: সকাল ৮টা - বিকাল ৫টা&#10;শুক্র: সকাল ৮টা - দুপুর ১২টা"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Departments */}
                              <div className="bg-white rounded-lg p-5 border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-semibold text-gray-900">বিভাগীয় যোগাযোগ</h4>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newDepts = [...(formData.contactDepartments || []), { name: '', phone: '', email: '', description: '' }];
                                      setFormData({...formData, contactDepartments: newDepts});
                                    }}
                                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                                  >
                                    <Plus className="w-4 h-4" />
                                    <span>বিভাগ যোগ করুন</span>
                                  </button>
                                </div>
                                <div className="space-y-4">
                                  {(formData.contactDepartments || []).map((dept, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-gray-700">বিভাগ #{index + 1}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newDepts = formData.contactDepartments?.filter((_, i) => i !== index) || [];
                                            setFormData({...formData, contactDepartments: newDepts});
                                          }}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">নাম</label>
                                          <input
                                            type="text"
                                            value={dept.name}
                                            onChange={(e) => {
                                              const newDepts = [...(formData.contactDepartments || [])];
                                              newDepts[index].name = e.target.value;
                                              setFormData({...formData, contactDepartments: newDepts});
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="ভর্তি বিভাগ"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">ফোন</label>
                                          <input
                                            type="text"
                                            value={dept.phone}
                                            onChange={(e) => {
                                              const newDepts = [...(formData.contactDepartments || [])];
                                              newDepts[index].phone = e.target.value;
                                              setFormData({...formData, contactDepartments: newDepts});
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="+৮৮০ ১৭১১ ২৩৪৫৬৭"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">ইমেইল</label>
                                          <input
                                            type="email"
                                            value={dept.email}
                                            onChange={(e) => {
                                              const newDepts = [...(formData.contactDepartments || [])];
                                              newDepts[index].email = e.target.value;
                                              setFormData({...formData, contactDepartments: newDepts});
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="admission@iqraschool.edu"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">বিবরণ</label>
                                          <input
                                            type="text"
                                            value={dept.description}
                                            onChange={(e) => {
                                              const newDepts = [...(formData.contactDepartments || [])];
                                              newDepts[index].description = e.target.value;
                                              setFormData({...formData, contactDepartments: newDepts});
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="নতুন শিক্ষার্থী ভর্তি সংক্রান্ত..."
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {(!formData.contactDepartments || formData.contactDepartments.length === 0) && (
                                    <p className="text-sm text-gray-500 text-center py-4">কোনো বিভাগ যোগ করা হয়নি</p>
                                  )}
                                </div>
                              </div>

                              {/* Map Section */}
                              <div className="bg-white rounded-lg p-5 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-4">মানচিত্র</h4>
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      মানচিত্র এমবেড কোড (HTML iframe)
                                    </label>
                                    <textarea
                                      value={formData.contactMapEmbedCode}
                                      onChange={(e) => setFormData({...formData, contactMapEmbedCode: e.target.value})}
                                      rows={4}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                                      placeholder="<iframe src=&quot;...&quot;></iframe>"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Google Maps বা অন্য কোনো মানচিত্রের iframe কোড এখানে দিন</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      ঠিকানা (মানচিত্রের নিচে প্রদর্শিত হবে)
                                    </label>
                                    <input
                                      type="text"
                                      value={formData.contactMapAddress}
                                      onChange={(e) => setFormData({...formData, contactMapAddress: e.target.value})}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="রামপুরা, ঢাকা-১২১৯"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Social Media */}
                              <div className="bg-white rounded-lg p-5 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-4">সামাজিক যোগাযোগ</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                      <span>Facebook URL</span>
                                    </label>
                                    <input
                                      type="url"
                                      value={formData.contactSocialMediaFacebook}
                                      onChange={(e) => setFormData({...formData, contactSocialMediaFacebook: e.target.value})}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="https://facebook.com/yourpage"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter URL</label>
                                    <input
                                      type="url"
                                      value={formData.contactSocialMediaTwitter}
                                      onChange={(e) => setFormData({...formData, contactSocialMediaTwitter: e.target.value})}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="https://twitter.com/yourhandle"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Instagram URL</label>
                                    <input
                                      type="url"
                                      value={formData.contactSocialMediaInstagram}
                                      onChange={(e) => setFormData({...formData, contactSocialMediaInstagram: e.target.value})}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="https://instagram.com/yourhandle"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
                                    <input
                                      type="url"
                                      value={formData.contactSocialMediaYoutube}
                                      onChange={(e) => setFormData({...formData, contactSocialMediaYoutube: e.target.value})}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="https://youtube.com/channel/yourchannel"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Form Subjects */}
                              <div className="bg-white rounded-lg p-5 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-4">ফরম বিষয়সমূহ</h4>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    বিষয়সমূহ (প্রতিটি নতুন লাইনে একটি)
                                  </label>
                                  <textarea
                                    value={Array.isArray(formData.contactFormSubjects) ? formData.contactFormSubjects.join('\n') : ''}
                                    onChange={(e) => setFormData({...formData, contactFormSubjects: e.target.value.split('\n').filter(s => s.trim())})}
                                    rows={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="ভর্তি সংক্রান্ত&#10;শিক্ষা সংক্রান্ত&#10;ফি সংক্রান্ত&#10;সাধারণ তথ্য&#10;অভিযোগ&#10;পরামর্শ"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">এই বিষয়সমূহ যোগাযোগ ফরমের ড্রপডাউন অপশনে দেখাবে</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info Box */}
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">কিভাবে কাজ করে?</p>
                            <ul className="list-disc list-inside space-y-1 text-blue-700">
                              <li>পেজ সক্রিয় থাকলে, ব্যবহারকারীরা নেভিগেশন মেনু থেকে এবং সরাসরি URL-এ প্রবেশ করতে পারবে</li>
                              <li>পেজ নিষ্ক্রিয় থাকলে, ব্যবহারকারীরা সেই পেজ অ্যাক্সেস করতে পারবে না</li>
                              <li>সেটিংস পরিবর্তন করার পর "সংরক্ষণ করুন" বাটনে ক্লিক করুন</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'notifications' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">নোটিফিকেশন সেটিংস</h3>
                          <p className="text-sm text-gray-600 mt-1">ইমেইল এবং পুশ নোটিফিকেশন কনফিগারেশন</p>
                        </div>
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>টেস্ট নোটিফিকেশন</span>
                        </button>
                      </div>

                      <div className="space-y-6">
                        {/* Push Notification Setup */}
                        <PushNotificationSetup />

                        {/* Email Settings */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-3">ইমেইল কনফিগারেশন</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                SMTP সার্ভার
                              </label>
                              <input
                                type="text"
                                value={formData.smtpServer}
                                onChange={(e) => setFormData({...formData, smtpServer: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                SMTP পোর্ট
                              </label>
                              <input
                                type="number"
                                value={formData.smtpPort}
                                onChange={(e) => setFormData({...formData, smtpPort: parseInt(e.target.value) || 587})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                ইমেইল ঠিকানা
                              </label>
                              <input
                                type="email"
                                value={formData.smtpEmail}
                                onChange={(e) => setFormData({...formData, smtpEmail: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                পাসওয়ার্ড
                              </label>
                              <div className="relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={formData.smtpPassword}
                                  onChange={(e) => setFormData({...formData, smtpPassword: e.target.value})}
                                  placeholder="পাসওয়ার্ড লিখুন"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Notification Types */}
                        <div className="p-6 bg-white rounded-lg border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-4 text-lg">নোটিফিকেশন টাইপস</h4>
                          <p className="text-sm text-gray-600 mb-6">প্রতিটি নোটিফিকেশন টাইপের জন্য ইমেইল এবং পুশ নোটিফিকেশন অন/অফ করতে পারেন। অন করা থাকলে নোটিফিকেশন পাঠানো হবে।</p>
                          
                          <div className="space-y-4">
                            {/* Student Registration */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">নতুন শিক্ষার্থী নিবন্ধন</p>
                                <p className="text-sm text-gray-600">নতুন শিক্ষার্থী নিবন্ধন হলে নোটিফিকেশন পাঠানো হবে</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.studentRegistrationEmail}
                                    onChange={(e) => setFormData({...formData, studentRegistrationEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.studentRegistrationPush}
                                    onChange={(e) => setFormData({...formData, studentRegistrationPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.studentRegistrationSMS}
                                    onChange={(e) => setFormData({...formData, studentRegistrationSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* Payment Reminder */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">পেমেন্ট অনুস্মারক</p>
                                <p className="text-sm text-gray-600">ফি পেমেন্টের অনুস্মারক নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.paymentReminderEmail}
                                    onChange={(e) => setFormData({...formData, paymentReminderEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.paymentReminderPush}
                                    onChange={(e) => setFormData({...formData, paymentReminderPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.paymentReminderSMS}
                                    onChange={(e) => setFormData({...formData, paymentReminderSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* Attendance Report */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">উপস্থিতি রিপোর্ট</p>
                                <p className="text-sm text-gray-600">দৈনিক বা সাপ্তাহিক উপস্থিতি রিপোর্ট</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.attendanceReportEmail}
                                    onChange={(e) => setFormData({...formData, attendanceReportEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.attendanceReportPush}
                                    onChange={(e) => setFormData({...formData, attendanceReportPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.attendanceReportSMS}
                                    onChange={(e) => setFormData({...formData, attendanceReportSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* System Alert */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">সিস্টেম অ্যালার্ট</p>
                                <p className="text-sm text-gray-600">সিস্টেমের গুরুত্বপূর্ণ অ্যালার্ট এবং ঘোষণা</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.systemAlertEmail}
                                    onChange={(e) => setFormData({...formData, systemAlertEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.systemAlertPush}
                                    onChange={(e) => setFormData({...formData, systemAlertPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                              </div>
                            </div>

                            {/* Exam Schedule */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">পরীক্ষার সময়সূচী</p>
                                <p className="text-sm text-gray-600">পরীক্ষার সময়সূচী এবং তারিখের নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.examScheduleEmail}
                                    onChange={(e) => setFormData({...formData, examScheduleEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.examSchedulePush}
                                    onChange={(e) => setFormData({...formData, examSchedulePush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.examScheduleSMS}
                                    onChange={(e) => setFormData({...formData, examScheduleSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* Exam Results */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">পরীক্ষার ফলাফল</p>
                                <p className="text-sm text-gray-600">পরীক্ষার ফলাফল প্রকাশ হলে নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.examResultsEmail}
                                    onChange={(e) => setFormData({...formData, examResultsEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.examResultsPush}
                                    onChange={(e) => setFormData({...formData, examResultsPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.examResultsSMS}
                                    onChange={(e) => setFormData({...formData, examResultsSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* Homework Assignment */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">বাড়ির কাজ নির্ধারণ</p>
                                <p className="text-sm text-gray-600">নতুন বাড়ির কাজ নির্ধারণ হলে নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.homeworkAssignmentEmail}
                                    onChange={(e) => setFormData({...formData, homeworkAssignmentEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.homeworkAssignmentPush}
                                    onChange={(e) => setFormData({...formData, homeworkAssignmentPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                              </div>
                            </div>

                            {/* Homework Reminder */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">বাড়ির কাজ অনুস্মারক</p>
                                <p className="text-sm text-gray-600">বাড়ির কাজ জমা দেওয়ার অনুস্মারক</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.homeworkReminderEmail}
                                    onChange={(e) => setFormData({...formData, homeworkReminderEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.homeworkReminderPush}
                                    onChange={(e) => setFormData({...formData, homeworkReminderPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                              </div>
                            </div>

                            {/* Class Announcement */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">ক্লাস ঘোষণা</p>
                                <p className="text-sm text-gray-600">ক্লাসের গুরুত্বপূর্ণ ঘোষণা এবং বিজ্ঞপ্তি</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.classAnnouncementEmail}
                                    onChange={(e) => setFormData({...formData, classAnnouncementEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.classAnnouncementPush}
                                    onChange={(e) => setFormData({...formData, classAnnouncementPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                              </div>
                            </div>

                            {/* Notice Notification */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">নোটিশ</p>
                                <p className="text-sm text-gray-600">নতুন নোটিশ প্রকাশ হলে নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.noticeNotificationEmail}
                                    onChange={(e) => setFormData({...formData, noticeNotificationEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.noticeNotificationPush}
                                    onChange={(e) => setFormData({...formData, noticeNotificationPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                              </div>
                            </div>

                            {/* Event Reminder */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">ইভেন্ট অনুস্মারক</p>
                                <p className="text-sm text-gray-600">আসন্ন ইভেন্ট এবং অনুষ্ঠানের অনুস্মারক</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.eventReminderEmail}
                                    onChange={(e) => setFormData({...formData, eventReminderEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.eventReminderPush}
                                    onChange={(e) => setFormData({...formData, eventReminderPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                              </div>
                            </div>

                            {/* Message Notification */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">বার্তা</p>
                                <p className="text-sm text-gray-600">নতুন বার্তা পাওয়ার নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.messageNotificationEmail}
                                    onChange={(e) => setFormData({...formData, messageNotificationEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.messageNotificationPush}
                                    onChange={(e) => setFormData({...formData, messageNotificationPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.messageNotificationSMS}
                                    onChange={(e) => setFormData({...formData, messageNotificationSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* Complaint Response */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">অভিযোগের উত্তর</p>
                                <p className="text-sm text-gray-600">অভিযোগের উত্তর পাওয়ার নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.complaintResponseEmail}
                                    onChange={(e) => setFormData({...formData, complaintResponseEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.complaintResponsePush}
                                    onChange={(e) => setFormData({...formData, complaintResponsePush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                              </div>
                            </div>

                            {/* Fee Payment Confirmation */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">ফি পেমেন্ট নিশ্চিতকরণ</p>
                                <p className="text-sm text-gray-600">ফি পেমেন্ট সফল হলে নিশ্চিতকরণ নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.feePaymentConfirmationEmail}
                                    onChange={(e) => setFormData({...formData, feePaymentConfirmationEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.feePaymentConfirmationPush}
                                    onChange={(e) => setFormData({...formData, feePaymentConfirmationPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.feePaymentConfirmationSMS}
                                    onChange={(e) => setFormData({...formData, feePaymentConfirmationSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* Admission Confirmation */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">ভর্তি নিশ্চিতকরণ</p>
                                <p className="text-sm text-gray-600">ভর্তি সফল হলে নিশ্চিতকরণ নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.admissionConfirmationEmail}
                                    onChange={(e) => setFormData({...formData, admissionConfirmationEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.admissionConfirmationPush}
                                    onChange={(e) => setFormData({...formData, admissionConfirmationPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.admissionConfirmationSMS}
                                    onChange={(e) => setFormData({...formData, admissionConfirmationSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* Teacher Assignment */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">শিক্ষক নির্ধারণ</p>
                                <p className="text-sm text-gray-600">নতুন শিক্ষক বা বিষয় নির্ধারণ হলে নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.teacherAssignmentEmail}
                                    onChange={(e) => setFormData({...formData, teacherAssignmentEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.teacherAssignmentPush}
                                    onChange={(e) => setFormData({...formData, teacherAssignmentPush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.teacherAssignmentSMS}
                                    onChange={(e) => setFormData({...formData, teacherAssignmentSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>

                            {/* Class Schedule */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">ক্লাস সময়সূচী</p>
                                <p className="text-sm text-gray-600">ক্লাস সময়সূচী পরিবর্তন হলে নোটিফিকেশন</p>
                              </div>
                              <div className="flex items-center space-x-6 ml-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.classScheduleEmail}
                                    onChange={(e) => setFormData({...formData, classScheduleEmail: e.target.checked})}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Mail className="w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">ইমেইল</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.classSchedulePush}
                                    onChange={(e) => setFormData({...formData, classSchedulePush: e.target.checked})}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-gray-700">পুশ</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.classScheduleSMS}
                                    onChange={(e) => setFormData({...formData, classScheduleSMS: e.target.checked})}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <Phone className="w-5 h-5 text-orange-600" />
                                  <span className="text-sm font-medium text-gray-700">এসএমএস</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Save Button */}
                          <div className="mt-6 flex justify-end">
                            <button
                              onClick={handleSaveSettings}
                              disabled={saving}
                              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Save className="w-5 h-5" />
                              <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সমস্ত পরিবর্তন সংরক্ষণ করুন'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'integrations' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">তৃতীয় পক্ষের ইন্টিগ্রেশন</h3>
                          <p className="text-sm text-gray-600 mt-1">বাহ্যিক সার্ভিস এবং API কনফিগারেশন</p>
                        </div>
                        <button 
                          onClick={() => setShowIntegrationModal(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>নতুন ইন্টিগ্রেশন</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Integration Cards */}
                        {integrations.map((integration) => {
                          const IconComponent = integration.icon;
                          return (
                            <div 
                              key={integration.id} 
                              className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                  <IconComponent className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                                  <p className="text-sm text-gray-600 mt-0.5">{integration.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  integration.status === 'connected'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {integration.status === 'connected' ? 'সংযুক্ত' : 'সংযুক্ত নেই'}
                                </span>
                                <button 
                                  onClick={() => {
                                    setEditingIntegration(integration.id);
                                    setShowIntegrationModal(true);
                                  }}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="সম্পাদনা করুন"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* API Settings */}
                        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <Key className="w-5 h-5 mr-2 text-purple-600" />
                            API কনফিগারেশন
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                API Rate Limit (per minute)
                              </label>
                              <input
                                type="number"
                                value={formData.apiRateLimit}
                                onChange={(e) => setFormData({ ...formData, apiRateLimit: parseInt(e.target.value) || 100 })}
                                min="10"
                                max="1000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                API Timeout (seconds)
                              </label>
                              <input
                                type="number"
                                value={formData.apiTimeout}
                                onChange={(e) => setFormData({ ...formData, apiTimeout: parseInt(e.target.value) || 30 })}
                                min="5"
                                max="300"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>সমস্ত পরিবর্তন সংরক্ষণ করুন</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Academic Year Modal */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50">
          {/* Blur Background using CSS */}
          <div
            className="absolute inset-0 bg-black bg-opacity-30"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              background: 'rgba(0, 0, 0, 0.3)'
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">নতুন একাডেমিক বর্ষ যোগ করুন</h3>
                <button
                  onClick={() => setShowAddYearModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    একাডেমিক বর্ষ
                  </label>
                  <input
                    type="text"
                    value={newAcademicYear}
                    onChange={(e) => setNewAcademicYear(e.target.value)}
                    placeholder="যেমন: ২০২৫"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    বাংলায় লিখুন, যেমন: ২০২৫, ২০২৬, ২০২৭
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddYearModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleAddAcademicYear}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>যোগ করুন</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Modal */}
      {showIntegrationModal && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-30"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              background: 'rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => {
              setShowIntegrationModal(false);
              setEditingIntegration(null);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingIntegration ? 'ইন্টিগ্রেশন সম্পাদনা করুন' : 'নতুন ইন্টিগ্রেশন যোগ করুন'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {editingIntegration 
                      ? integrations.find(i => i.id === editingIntegration)?.name 
                      : 'একটি নতুন তৃতীয় পক্ষের সার্ভিস কনফিগার করুন'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowIntegrationModal(false);
                    setEditingIntegration(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {editingIntegration ? (
                  (() => {
                    const integration = integrations.find(i => i.id === editingIntegration);
                    if (!integration) return null;
                    
                    return (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ইন্টিগ্রেশন নাম
                          </label>
                          <input
                            type="text"
                            value={integration.name}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                          />
                        </div>

                        {integration.id === 'google-classroom' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={integration.config.apiKey}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, apiKey: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Google Classroom API Key"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Client ID
                              </label>
                              <input
                                type="text"
                                value={integration.config.clientId}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, clientId: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Google OAuth Client ID"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Client Secret
                              </label>
                              <input
                                type="password"
                                value={integration.config.clientSecret}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, clientSecret: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Google OAuth Client Secret"
                              />
                            </div>
                          </>
                        )}

                        {integration.id === 'sms-gateway' && (
                          <>
                            {/* Tabs */}
                            <div className="flex space-x-1 border-b border-gray-200 mb-6">
                              <button
                                type="button"
                                onClick={() => setSmsGatewayTab('config')}
                                className={`px-4 py-2 font-medium text-sm transition-colors ${
                                  smsGatewayTab === 'config'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                কনফিগারেশন
                              </button>
                              <button
                                type="button"
                                onClick={() => setSmsGatewayTab('templates')}
                                className={`px-4 py-2 font-medium text-sm transition-colors ${
                                  smsGatewayTab === 'templates'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                টেম্পলেট
                              </button>
                            </div>

                            {/* Configuration Tab */}
                            {smsGatewayTab === 'config' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Provider
                                  </label>
                                  <select
                                    value={integration.config.provider === 'custom' ? 'custom' : integration.config.provider}
                                    onChange={(e) => {
                                      const providerValue = e.target.value;
                                      const updated = integrations.map(i => 
                                        i.id === editingIntegration 
                                          ? { 
                                              ...i, 
                                              config: { 
                                                ...i.config, 
                                                provider: providerValue,
                                                customProvider: providerValue === 'custom' ? (i.config.customProvider || '') : undefined
                                              } 
                                            }
                                          : i
                                      );
                                      setIntegrations(updated);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Select Provider</option>
                                    <option value="bulksmsbd">BulkSMS BD</option>
                                    <option value="twilio">Twilio</option>
                                    <option value="nexmo">Nexmo/Vonage</option>
                                    <option value="textlocal">TextLocal</option>
                                    <option value="msg91">MSG91</option>
                                    <option value="custom">Custom Provider</option>
                                  </select>
                                </div>
                                {integration.config.provider === 'custom' && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Custom Provider Name
                                    </label>
                                    <input
                                      type="text"
                                      value={integration.config.customProvider || ''}
                                      onChange={(e) => {
                                        const updated = integrations.map(i => 
                                          i.id === editingIntegration 
                                            ? { ...i, config: { ...i.config, customProvider: e.target.value } }
                                            : i
                                        );
                                        setIntegrations(updated);
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Enter custom provider name"
                                    />
                                  </div>
                                )}
                                {integration.config.provider === 'bulksmsbd' && (
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                    <p className="text-sm text-blue-800">
                                      <strong>API Endpoint:</strong> http://bulksmsbd.net/api/smsapi
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                      <strong>Note:</strong> আপনার IP address whitelist করতে হবে BulkSMS BD dashboard থেকে
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    API Key
                                  </label>
                                  <input
                                    type="password"
                                    value={integration.config.apiKey}
                                    onChange={(e) => {
                                      const updated = integrations.map(i => 
                                        i.id === editingIntegration 
                                          ? { ...i, config: { ...i.config, apiKey: e.target.value } }
                                          : i
                                      );
                                      setIntegrations(updated);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder={integration.config.provider === 'bulksmsbd' ? 'BulkSMS BD API Key' : 'SMS Gateway API Key'}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sender ID
                                  </label>
                                  <input
                                    type="text"
                                    value={integration.config.senderId}
                                    onChange={(e) => {
                                      const updated = integrations.map(i => 
                                        i.id === editingIntegration 
                                          ? { ...i, config: { ...i.config, senderId: e.target.value } }
                                          : i
                                      );
                                      setIntegrations(updated);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder={integration.config.provider === 'bulksmsbd' ? '8809648904800 (with country code)' : 'Sender ID or Phone Number'}
                                  />
                                  {integration.config.provider === 'bulksmsbd' && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Sender ID must include country code (e.g., 8809648904800)
                                    </p>
                                  )}
                                </div>
                              </>
                            )}

                            {/* Templates Tab */}
                            {smsGatewayTab === 'templates' && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <h3 className="text-lg font-semibold text-gray-900">SMS টেম্পলেট</h3>
                                  <div className="flex space-x-2">
                                    <button
                                      type="button"
                                      onClick={initializeDefaultTemplates}
                                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                                      title="সব ডিফল্ট টেম্পলেট একবারে যোগ করুন"
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span>ডিফল্ট টেম্পলেট যোগ করুন</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingTemplate(null);
                                        setShowTemplateModal(true);
                                      }}
                                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span>নতুন টেম্পলেট</span>
                                    </button>
                                  </div>
                                </div>

                                {smsTemplates.length === 0 ? (
                                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 mb-2">কোন টেম্পলেট নেই</p>
                                    <p className="text-sm text-gray-500">একটি নতুন SMS টেম্পলেট তৈরি করুন</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {smsTemplates.map((template) => (
                                      <div
                                        key={template.id}
                                        className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                              <h4 className="font-semibold text-gray-900">{template.name}</h4>
                                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                {template.category}
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">{template.message}</p>
                                            {template.variables.length > 0 && (
                                              <div className="mt-2 flex flex-wrap gap-1">
                                                {template.variables.map((variable) => (
                                                  <span
                                                    key={variable}
                                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                                  >
                                                    {variable}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex space-x-2 ml-4">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingTemplate(template);
                                                setShowTemplateModal(true);
                                              }}
                                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                              title="সম্পাদনা করুন"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (confirm(`আপনি কি "${template.name}" টেম্পলেটটি মুছে ফেলতে চান?`)) {
                                                  setSmsTemplates(smsTemplates.filter(t => t.id !== template.id));
                                                }
                                              }}
                                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                              title="মুছে ফেলুন"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Available Variables Info */}
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">উপলব্ধ ভেরিয়েবল:</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                    <code className="text-blue-600">{'{studentName}'}</code>
                                    <code className="text-blue-600">{'{className}'}</code>
                                    <code className="text-blue-600">{'{rollNumber}'}</code>
                                    <code className="text-blue-600">{'{guardianName}'}</code>
                                    <code className="text-blue-600">{'{guardianPhone}'}</code>
                                    <code className="text-blue-600">{'{schoolName}'}</code>
                                    <code className="text-blue-600">{'{date}'}</code>
                                    <code className="text-blue-600">{'{time}'}</code>
                                    <code className="text-blue-600">{'{amount}'}</code>
                                    <code className="text-blue-600">{'{feeType}'}</code>
                                    <code className="text-blue-600">{'{receiptNumber}'}</code>
                                    <code className="text-blue-600">{'{teacherName}'}</code>
                                    <code className="text-blue-600">{'{month}'}</code>
                                    <code className="text-blue-600">{'{months}'}</code>
                                    <code className="text-blue-600">{'{session}'}</code>
                                    <code className="text-blue-600">{'{examDate}'}</code>
                                    <code className="text-blue-600">{'{examName}'}</code>
                                    <code className="text-blue-600">{'{resultDate}'}</code>
                                    <code className="text-blue-600">{'{examFee}'}</code>
                                    <code className="text-blue-600">{'{tuitionFee}'}</code>
                                    <code className="text-blue-600">{'{admissionFee}'}</code>
                                    <code className="text-blue-600">{'{sessionFee}'}</code>
                                    <code className="text-blue-600">{'{teachingSalary}'}</code>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">
                                    <strong>Note:</strong> {'{month}'} একক মাসের জন্য, {'{months}'} একাধিক মাসের জন্য (যেমন: জানুয়ারি, ফেব্রুয়ারি, মার্চ, এপ্রিল, মে, জুন)
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    টেম্পলেটে এই ভেরিয়েবলগুলো ব্যবহার করুন, এবং SMS পাঠানোর সময় এটি স্বয়ংক্রিয়ভাবে রিপ্লেস হবে
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {integration.id === 'payment-gateway' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Provider
                              </label>
                              <select
                                value={integration.config.provider === 'custom' ? 'custom' : integration.config.provider}
                                onChange={(e) => {
                                  const providerValue = e.target.value;
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { 
                                          ...i, 
                                          config: { 
                                            ...i.config, 
                                            provider: providerValue,
                                            customProvider: providerValue === 'custom' ? (i.config.customProvider || '') : undefined
                                          } 
                                        }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Provider</option>
                                <option value="stripe">Stripe</option>
                                <option value="paypal">PayPal</option>
                                <option value="razorpay">Razorpay</option>
                                <option value="sslcommerz">SSLCommerz</option>
                                <option value="bKash">bKash</option>
                                <option value="custom">Custom Provider</option>
                              </select>
                            </div>
                            {integration.config.provider === 'custom' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Custom Provider Name
                                </label>
                                <input
                                  type="text"
                                  value={integration.config.customProvider || ''}
                                  onChange={(e) => {
                                    const updated = integrations.map(i => 
                                      i.id === editingIntegration 
                                        ? { ...i, config: { ...i.config, customProvider: e.target.value } }
                                        : i
                                    );
                                    setIntegrations(updated);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter custom provider name"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Merchant ID
                              </label>
                              <input
                                type="text"
                                value={integration.config.merchantId}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, merchantId: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Merchant ID"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={integration.config.apiKey}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, apiKey: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="API Key"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Secret Key
                              </label>
                              <input
                                type="password"
                                value={integration.config.secretKey}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, secretKey: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Secret Key"
                              />
                            </div>
                          </>
                        )}

                        {integration.id === 'cloud-storage' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Provider
                              </label>
                              <select
                                value={integration.config.provider === 'custom' ? 'custom' : integration.config.provider}
                                onChange={(e) => {
                                  const providerValue = e.target.value;
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { 
                                          ...i, 
                                          config: { 
                                            ...i.config, 
                                            provider: providerValue,
                                            customProvider: providerValue === 'custom' ? (i.config.customProvider || '') : undefined
                                          } 
                                        }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Provider</option>
                                <option value="aws-s3">AWS S3</option>
                                <option value="google-cloud">Google Cloud Storage</option>
                                <option value="azure">Azure Blob Storage</option>
                                <option value="dropbox">Dropbox</option>
                                <option value="custom">Custom Provider</option>
                              </select>
                            </div>
                            {integration.config.provider === 'custom' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Custom Provider Name
                                </label>
                                <input
                                  type="text"
                                  value={integration.config.customProvider || ''}
                                  onChange={(e) => {
                                    const updated = integrations.map(i => 
                                      i.id === editingIntegration 
                                        ? { ...i, config: { ...i.config, customProvider: e.target.value } }
                                        : i
                                    );
                                    setIntegrations(updated);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter custom provider name"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bucket Name
                              </label>
                              <input
                                type="text"
                                value={integration.config.bucketName}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, bucketName: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Bucket Name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Access Key
                              </label>
                              <input
                                type="password"
                                value={integration.config.accessKey}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, accessKey: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Access Key"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Secret Key
                              </label>
                              <input
                                type="password"
                                value={integration.config.secretKey}
                                onChange={(e) => {
                                  const updated = integrations.map(i => 
                                    i.id === editingIntegration 
                                      ? { ...i, config: { ...i.config, secretKey: e.target.value } }
                                      : i
                                  );
                                  setIntegrations(updated);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Secret Key"
                              />
                            </div>
                          </>
                        )}

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="integration-status"
                            checked={integration.status === 'connected'}
                            onChange={(e) => {
                              const updated = integrations.map(i => 
                                i.id === editingIntegration 
                                  ? { ...i, status: e.target.checked ? 'connected' : 'disconnected' }
                                  : i
                              );
                              setIntegrations(updated);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="integration-status" className="text-sm font-medium text-gray-700">
                            ইন্টিগ্রেশন সক্রিয় করুন
                          </label>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600">নতুন ইন্টিগ্রেশন যোগ করার অপশন শীঘ্রই আসছে...</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={() => {
                      setShowIntegrationModal(false);
                      setEditingIntegration(null);
                    }}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    বাতিল
                  </button>
                  {editingIntegration && (
                    <button
                      onClick={() => {
                        // Save integration config
                        setShowIntegrationModal(false);
                        setEditingIntegration(null);
                        setSaveMessage('ইন্টিগ্রেশন কনফিগারেশন সংরক্ষণ করা হয়েছে');
                        setTimeout(() => setSaveMessage(''), 3000);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>সংরক্ষণ করুন</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-30"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              background: 'rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => {
              setShowTemplateModal(false);
              setEditingTemplate(null);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingTemplate ? 'টেম্পলেট সম্পাদনা করুন' : 'নতুন SMS টেম্পলেট'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    SMS টেম্পলেট তৈরি করুন এবং ভেরিয়েবল ব্যবহার করুন
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    টেম্পলেট নাম *
                  </label>
                  <input
                    type="text"
                    value={editingTemplate?.name || ''}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, name: e.target.value });
                      } else {
                        setEditingTemplate({
                          id: Date.now().toString(),
                          name: e.target.value,
                          message: '',
                          category: 'general'
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="যেমন: ফি রিমাইন্ডার, উপস্থিতি নোটিশ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ক্যাটাগরি
                  </label>
                  <input
                    type="text"
                    list="category-options"
                    value={editingTemplate?.category || ''}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, category: e.target.value });
                      } else {
                        setEditingTemplate({
                          id: Date.now().toString(),
                          name: '',
                          message: '',
                          category: e.target.value
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ক্যাটাগরি নির্বাচন করুন বা নতুন নাম লিখুন"
                  />
                  <datalist id="category-options">
                    {/* Fee Sub-categories */}
                    <option value="Tuition Fee">Tuition Fee - মাসিক বা নিয়মিত টিউশন ফি সংক্রান্ত বার্তা</option>
                    <option value="Exam Fee">Exam Fee - পরীক্ষার ফি পরিশোধ বা রিমাইন্ডার বার্তা</option>
                    <option value="Admission Fee">Admission Fee - ভর্তি বা পুনঃভর্তি ফি সংক্রান্ত বার্তা</option>
                    <option value="Library Fee">Library Fee - লাইব্রেরি ফি বাকি বা পরিশোধ বার্তা</option>
                    <option value="Transport Fee">Transport Fee - বাস/গাড়ি সার্ভিস ফি সংক্রান্ত বার্তা</option>
                    <option value="Miscellaneous Fee">Miscellaneous Fee - অন্যান্য ফি (যেমন পোশাক, ইভেন্ট, ফাইন ইত্যাদি)</option>
                    
                    {/* Other Categories */}
                    <option value="Attendance">Attendance - উপস্থিতি, অনুপস্থিতি বা দেরিতে আসা সংক্রান্ত বার্তা</option>
                    <option value="Exam">Exam - পরীক্ষা রুটিন, ফলাফল বা নম্বর সংক্রান্ত বার্তা</option>
                    <option value="Event">Event - অনুষ্ঠান, সভা, ছুটি বা বিশেষ নোটিস সংক্রান্ত বার্তা</option>
                    <option value="Admission">Admission - ভর্তি বা নতুন ছাত্র-ছাত্রী সংক্রান্ত বার্তা</option>
                    <option value="Emergency">Emergency - জরুরি ঘোষণা বা নিরাপত্তা বার্তা</option>
                    <option value="Reminder">Reminder - স্মরণ করিয়ে দেওয়া বার্তা (যেমন ফর্ম জমা)</option>
                    <option value="Congratulations">Congratulations - অভিনন্দন বা শুভেচ্ছা বার্তা</option>
                    <option value="General">General - সাধারণ তথ্য বা নোটিস বার্তা</option>
                    <option value="Fee Payment">Fee Payment - ফি পরিশোধের নিশ্চিতকরণ বার্তা</option>
                    <option value="Salary Payment">Salary Payment - বেতন পরিশোধের নিশ্চিতকরণ বার্তা</option>
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    ড্রপডাউন থেকে নির্বাচন করুন অথবা নতুন ক্যাটাগরি নাম লিখুন
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMS বার্তা
                  </label>
                  <textarea
                    ref={messageTextareaRef}
                    value={editingTemplate?.message || ''}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, message: e.target.value });
                      } else {
                        setEditingTemplate({
                          id: Date.now().toString(),
                          name: '',
                          message: e.target.value,
                          category: 'general'
                        });
                      }
                    }}
                    onSelect={(e) => {
                      // Store cursor position for variable insertion
                      const textarea = e.target as HTMLTextAreaElement;
                      textarea.setAttribute('data-selection-start', textarea.selectionStart.toString());
                      textarea.setAttribute('data-selection-end', textarea.selectionEnd.toString());
                    }}
                    onKeyUp={(e) => {
                      // Update cursor position on key press
                      const textarea = e.target as HTMLTextAreaElement;
                      textarea.setAttribute('data-selection-start', textarea.selectionStart.toString());
                      textarea.setAttribute('data-selection-end', textarea.selectionEnd.toString());
                    }}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="যেমন: প্রিয় {guardianName}, {studentName} এর {className} শ্রেণির ফি {amount} টাকা বাকি আছে। অনুগ্রহ করে পরিশোধ করুন। - {schoolName}"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ভেরিয়েবল ব্যবহার করুন: {'{studentName}'}, {'{className}'}, {'{rollNumber}'}, {'{guardianName}'}, {'{amount}'}, {'{date}'}, {'{schoolName}'}, {'{month}'}, {'{months}'}, {'{session}'}, {'{examDate}'}, {'{examName}'}, {'{resultDate}'}, {'{examFee}'}, {'{tuitionFee}'}, {'{admissionFee}'}, {'{sessionFee}'}, {'{teachingSalary}'} ইত্যাদি
                  </p>
                </div>

                {/* Variable Helper */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">দ্রুত যোগ করুন:</h4>
                  <div className="flex flex-wrap gap-2">
                    {['{studentName}', '{className}', '{rollNumber}', '{guardianName}', '{guardianPhone}', '{amount}', '{date}', '{schoolName}', '{feeType}', '{receiptNumber}', '{teacherName}', '{month}', '{months}', '{session}', '{examDate}', '{examName}', '{resultDate}', '{examFee}', '{tuitionFee}', '{admissionFee}', '{sessionFee}', '{teachingSalary}'].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => {
                          const textarea = messageTextareaRef.current;
                          if (!textarea) return;

                          const currentMessage = editingTemplate?.message || '';
                          
                          // Get cursor position from textarea or use stored selection
                          const selectionStart = parseInt(textarea.getAttribute('data-selection-start') || String(textarea.selectionStart || currentMessage.length));
                          const selectionEnd = parseInt(textarea.getAttribute('data-selection-end') || String(textarea.selectionEnd || currentMessage.length));
                          
                          // Insert variable at cursor position
                          const beforeCursor = currentMessage.substring(0, selectionStart);
                          const afterCursor = currentMessage.substring(selectionEnd);
                          const newMessage = beforeCursor + variable + afterCursor;
                          
                          if (editingTemplate) {
                            setEditingTemplate({
                              ...editingTemplate,
                              message: newMessage
                            });
                          } else {
                            setEditingTemplate({
                              id: Date.now().toString(),
                              name: '',
                              message: newMessage,
                              category: 'general'
                            });
                          }
                          
                          // Set cursor position after the inserted variable
                          setTimeout(() => {
                            textarea.focus();
                            const newCursorPos = selectionStart + variable.length;
                            textarea.setSelectionRange(newCursorPos, newCursorPos);
                          }, 0);
                        }}
                        className="px-3 py-1 text-xs bg-white text-blue-700 border border-blue-300 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {editingTemplate?.message && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">প্রিভিউ:</h4>
                      <button
                        type="button"
                        onClick={async () => {
                          setLoadingPreview(true);
                          try {
                            const students = await studentQueries.getAllStudents(true);
                            if (students.length > 0) {
                              const randomStudent = students[Math.floor(Math.random() * students.length)];
                              setPreviewStudent(randomStudent);
                            } else {
                              setPreviewStudent(null);
                            }
                          } catch (error) {
                            console.error('Error loading student:', error);
                            setPreviewStudent(null);
                          } finally {
                            setLoadingPreview(false);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        disabled={loadingPreview}
                      >
                        {loadingPreview ? 'লোড হচ্ছে...' : 'রিয়েল ডাটা দেখুন'}
                      </button>
                    </div>
                    {previewStudent ? (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {editingTemplate.message
                          .replace(/{studentName}/g, previewStudent.displayName || previewStudent.name || 'মোহাম্মদ রহিম')
                          .replace(/{className}/g, previewStudent.class || '১০ম শ্রেণি')
                          .replace(/{rollNumber}/g, previewStudent.rollNumber?.toString() || '০১')
                          .replace(/{guardianName}/g, previewStudent.guardianName || 'মোহাম্মদ আলী')
                          .replace(/{guardianPhone}/g, previewStudent.guardianPhone || '০১৭১২৩৪৫৬৭৮')
                          .replace(/{amount}/g, '৫০০০')
                          .replace(/{date}/g, new Date().toLocaleDateString('bn-BD'))
                          .replace(/{schoolName}/g, formData.schoolName || 'ইকরা স্কুল')
                          .replace(/{message}/g, 'সংদেশ')
                          .replace(/{achievement}/g, 'সাফল্য')
                          .replace(/{feeType}/g, 'টিউশন')
                          .replace(/{receiptNumber}/g, 'RCP-2024-001')
                          .replace(/{teacherName}/g, 'মোহাম্মদ আলী')
                          .replace(/{month}/g, 'জানুয়ারি')
                          .replace(/{months}/g, 'জানুয়ারি, ফেব্রুয়ারি, মার্চ, এপ্রিল, মে, জুন')
                          .replace(/{session}/g, '২০২৪-২০২৫')
                          .replace(/{examDate}/g, '১৫ জানুয়ারি, ২০২৫')
                          .replace(/{examName}/g, 'অর্ধবার্ষিক পরীক্ষা')
                          .replace(/{resultDate}/g, '৩০ জানুয়ারি, ২০২৫')}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {editingTemplate.message
                          .replace(/{studentName}/g, 'মোহাম্মদ রহিম')
                          .replace(/{className}/g, '১০ম শ্রেণি')
                          .replace(/{rollNumber}/g, '০১')
                          .replace(/{guardianName}/g, 'মোহাম্মদ আলী')
                          .replace(/{guardianPhone}/g, '০১৭১২৩৪৫৬৭৮')
                          .replace(/{amount}/g, '৫০০০')
                          .replace(/{date}/g, new Date().toLocaleDateString('bn-BD'))
                          .replace(/{schoolName}/g, formData.schoolName || 'ইকরা স্কুল')
                          .replace(/{message}/g, 'সংদেশ')
                          .replace(/{achievement}/g, 'সাফল্য')
                          .replace(/{feeType}/g, 'টিউশন')
                          .replace(/{receiptNumber}/g, 'RCP-2024-001')
                          .replace(/{teacherName}/g, 'মোহাম্মদ আলী')
                          .replace(/{month}/g, 'জানুয়ারি')
                          .replace(/{months}/g, 'জানুয়ারি, ফেব্রুয়ারি, মার্চ, এপ্রিল, মে, জুন')
                          .replace(/{session}/g, '২০২৪-২০২৫')
                          .replace(/{examDate}/g, '১৫ জানুয়ারি, ২০২৫')
                          .replace(/{examName}/g, 'অর্ধবার্ষিক পরীক্ষা')
                          .replace(/{resultDate}/g, '৩০ জানুয়ারি, ২০২৫')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowTemplateModal(false);
                      setEditingTemplate(null);
                    }}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={() => {
                      if (!editingTemplate?.name || !editingTemplate?.message) {
                        alert('টেম্পলেট নাম এবং বার্তা অবশ্যই প্রয়োজন');
                        return;
                      }

                      // Extract variables from message
                      const variableRegex = /\{([^}]+)\}/g;
                      const variables: string[] = [];
                      let match;
                      while ((match = variableRegex.exec(editingTemplate.message)) !== null) {
                        if (!variables.includes(match[0])) {
                          variables.push(match[0]);
                        }
                      }

                      if (editingTemplate.id && smsTemplates.find(t => t.id === editingTemplate.id)) {
                        // Update existing template
                        setSmsTemplates(smsTemplates.map(t => 
                          t.id === editingTemplate.id 
                            ? { ...editingTemplate, variables }
                            : t
                        ));
                      } else {
                        // Add new template
                        setSmsTemplates([...smsTemplates, { ...editingTemplate, variables, id: Date.now().toString() }]);
                      }

                      setShowTemplateModal(false);
                      setEditingTemplate(null);
                      setSaveMessage('টেম্পলেট সংরক্ষণ করা হয়েছে। সেটিংস সংরক্ষণ করুন');
                      setTimeout(() => setSaveMessage(''), 3000);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>সংরক্ষণ করুন</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Management Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50">
          {/* Blur Background using CSS */}
          <div
            className="absolute inset-0 bg-black bg-opacity-30"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              background: 'rgba(0, 0, 0, 0.3)'
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    নতুন ফি যোগ করুন
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    ফি এর বিস্তারিত তথ্য কনফিগার করুন
                  </p>
                </div>
                <button
                  onClick={() => setShowFeeModal(false)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8">
                {/* Tuition Fee Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                    টিউশন
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Monthly Fee */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover:shadow-lg transition-all cursor-pointer">
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-900 mb-2">মাসিক ফি</h4>
                        <div className="relative mb-4">
                          <input
                            type="text"
                            defaultValue="৬০০"
                            onChange={(e) => {
                              const englishValue = convertBengaliToEnglish(e.target.value);
                              setFeeAmounts({...feeAmounts, monthlyFee: englishValue});
                            }}
                            className="w-full text-center text-2xl font-bold text-blue-700 bg-white border-2 border-blue-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="পরিমাণ লিখুন"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 font-bold">৳</span>
                        </div>
                        <p className="text-sm text-blue-600">প্রতি মাসে</p>
                      </div>
                    </div>
{/* Session Fee */}
<div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover:shadow-lg transition-all cursor-pointer">
  <div className="text-center">
    <h4 className="font-semibold text-gray-900 mb-2">সেশন ফি</h4>
    <div className="relative mb-4">
      <input
        type="text"
        defaultValue="১০০০"
        onChange={(e) => {
          const englishValue = convertBengaliToEnglish(e.target.value);
          setFeeAmounts({...feeAmounts, sessionFee: englishValue});
        }}
        className="w-full text-center text-2xl font-bold text-green-700 bg-white border-2 border-green-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        placeholder="পরিমাণ লিখুন"
      />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 font-bold">৳</span>
    </div>
    <p className="text-sm text-green-600">প্রতি সেশনে</p>
  </div>
</div>

{/* Admission Fee */}
<div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 hover:shadow-lg transition-all cursor-pointer">
  <div className="text-center">
    <h4 className="font-semibold text-gray-900 mb-2">ভর্তি ফি</h4>
    <div className="relative mb-4">
      <input
        type="text"
        defaultValue="১২০০"
        onChange={(e) => {
          const englishValue = convertBengaliToEnglish(e.target.value);
          setFeeAmounts({...feeAmounts, admissionFee: englishValue});
        }}
        className="w-full text-center text-2xl font-bold text-purple-700 bg-white border-2 border-purple-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        placeholder="পরিমাণ লিখুন"
      />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-600 font-bold">৳</span>
    </div>
    <p className="text-sm text-purple-600">ভর্তির সময়</p>
  </div>
</div>
</div>
</div>

{/* Exam Fee Section */}
<div className="mb-8">
<h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
<span className="w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
পরীক্ষা ফি
</h3>

<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
{/* First Term Exam Fee */}
<div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-lg transition-all cursor-pointer">
  <div className="text-center">
    <h4 className="font-semibold text-gray-900 mb-2">প্রথম টার্ম</h4>
    <div className="relative mb-4">
      <input
        type="text"
        defaultValue="২০০"
        onChange={(e) => {
          const englishValue = convertBengaliToEnglish(e.target.value);
          setFeeAmounts({...feeAmounts, firstTermExamFee: englishValue});
        }}
        className="w-full text-center text-2xl font-bold text-orange-700 bg-white border-2 border-orange-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        placeholder="পরিমাণ লিখুন"
      />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-600 font-bold">৳</span>
    </div>
    <p className="text-sm text-orange-600">প্রথম টার্ম পরীক্ষা</p>
  </div>
</div>

{/* Second Term Exam Fee */}
<div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-lg transition-all cursor-pointer">
  <div className="text-center">
    <h4 className="font-semibold text-gray-900 mb-2">দ্বিতীয় টার্ম</h4>
    <div className="relative mb-4">
      <input
        type="text"
        defaultValue="২৫০"
        onChange={(e) => {
          const englishValue = convertBengaliToEnglish(e.target.value);
          setFeeAmounts({...feeAmounts, secondTermExamFee: englishValue});
        }}
        className="w-full text-center text-2xl font-bold text-orange-700 bg-white border-2 border-orange-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        placeholder="পরিমাণ লিখুন"
      />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-600 font-bold">৳</span>
    </div>
    <p className="text-sm text-orange-600">দ্বিতীয় টার্ম পরীক্ষা</p>
  </div>
</div>

{/* Annual Exam Fee */}
<div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-lg transition-all cursor-pointer">
  <div className="text-center">
    <h4 className="font-semibold text-gray-900 mb-2">বার্ষিক</h4>
    <div className="relative mb-4">
      <input
        type="text"
        defaultValue="৪০০"
        onChange={(e) => {
          const englishValue = convertBengaliToEnglish(e.target.value);
          setFeeAmounts({...feeAmounts, annualExamFee: englishValue});
        }}
        className="w-full text-center text-2xl font-bold text-orange-700 bg-white border-2 border-orange-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        placeholder="পরিমাণ লিখুন"
      />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-600 font-bold">৳</span>
    </div>
    <p className="text-sm text-orange-600">বার্ষিক পরীক্ষা</p>
  </div>
</div>

{/* Monthly Exam Fee */}
<div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-lg transition-all cursor-pointer">
  <div className="text-center">
    <h4 className="font-semibold text-gray-900 mb-2">মাসিক টেস্ট</h4>
    <div className="relative mb-4">
      <input
        type="text"
        defaultValue="১০০"
        onChange={(e) => {
          const englishValue = convertBengaliToEnglish(e.target.value);
          setFeeAmounts({...feeAmounts, monthlyExamFee: englishValue});
        }}
        className="w-full text-center text-2xl font-bold text-orange-700 bg-white border-2 border-orange-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        placeholder="পরিমাণ লিখুন"
      />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-600 font-bold">৳</span>
    </div>
    <p className="text-sm text-orange-600">মাসিক টেস্ট</p>
  </div>
</div>
</div>
</div>

{/* Action Buttons */}
<div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
<button
onClick={() => setShowFeeModal(false)}
className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
>
বাতিল
</button>
<button
onClick={handleFeeSubmit}
className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
>
<Save className="w-4 h-4" />
<span>ফি সংরক্ষণ করুন</span>
</button>
</div>
</div>
</div>
</div>
</div>
)}

{/* Class-specific Fee Modal */}
{showClassFeeModal && (
<div className="fixed inset-0 z-50">
<div
className="absolute inset-0 bg-black bg-opacity-30"
style={{
backdropFilter: 'blur(4px)',
WebkitBackdropFilter: 'blur(4px)',
background: 'rgba(0, 0, 0, 0.3)'
}}
/>
<div className="absolute inset-0 flex items-center justify-center p-4">
<div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
<div>
<h2 className="text-2xl font-bold text-gray-900">
ক্লাস-স্পেসিফিক ফি যোগ করুন
</h2>
<p className="text-sm text-gray-600 mt-1">
নির্দিষ্ট ক্লাসের জন্য ফি কনফিগার করুন
</p>
</div>
<button
onClick={() => setShowClassFeeModal(false)}
className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
>
<X className="w-5 h-5 text-gray-600" />
</button>
</div>

<div className="p-8">
<div className="space-y-6">
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    ক্লাস নির্বাচন করুন
  </label>
  <select
    value={classFeeFormData.classId}
    onChange={(e) => {
      const selectedClass = classes.find(cls => cls.classId === e.target.value);
      setClassFeeFormData({
        ...classFeeFormData,
        classId: e.target.value,
        className: selectedClass ? selectedClass.className : ''
      });
    }}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
  >
    <option value="">ক্লাস নির্বাচন করুন</option>
    {classes.map((cls) => (
      <option key={cls.classId} value={cls.classId}>
        {cls.className} - সেকশন {cls.section}
      </option>
    ))}
  </select>
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    ফি এর নাম
  </label>
  <input
    type="text"
    value={classFeeFormData.feeName}
    onChange={(e) => setClassFeeFormData({...classFeeFormData, feeName: e.target.value})}
    placeholder="ফি এর নাম লিখুন"
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
  />
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    পরিমাণ (টাকা)
  </label>
  <input
    type="text"
    value={classFeeFormData.amount}
    onChange={(e) => {
      const englishValue = convertBengaliToEnglish(e.target.value);
      setClassFeeFormData({...classFeeFormData, amount: englishValue});
    }}
    placeholder="ফি এর পরিমাণ"
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
  />
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    বর্ণনা
  </label>
  <input
    type="text"
    value={classFeeFormData.description}
    onChange={(e) => setClassFeeFormData({...classFeeFormData, description: e.target.value})}
    placeholder="ফি সম্পর্কে বিস্তারিত"
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
  />
</div>
</div>

<div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
<button
  onClick={() => setShowClassFeeModal(false)}
  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
>
  বাতিল
</button>
<button
  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
>
  <Save className="w-4 h-4" />
  <span>ফি সংরক্ষণ করুন</span>
</button>
</div>
</div>
</div>
</div>
</div>
</div>
)}
</div>
);
}

export default SettingsPage;
           