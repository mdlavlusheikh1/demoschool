'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { examQueries } from '@/lib/database-queries';
import { feeQueries } from '@/lib/queries/fee-queries';
import { studentQueries } from '@/lib/queries/student-queries';
import { SCHOOL_ID } from '@/lib/constants';
import {
  Home,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  Search,
  Bell,
  Plus,
  Save,
  ArrowLeft,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  RefreshCw,
  GraduationCap,
  FileText,
  Award,
  Building,
  Package,
  Globe,
  MessageSquare,
  Sparkles,
  Gift
} from 'lucide-react';

interface ClassFee {
  className: string;
  tuitionFee: number;
  isActive: boolean;
}

interface AdmissionFee {
  feeName: string;
  amount: number;
  description: string;
  isActive: boolean;
}

interface ExamFee {
  feeName: string;
  amount: number;
  description: string;
  applicableClasses: string[];
  isActive: boolean;
}

function FeesPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tuition');

  // Tuition fees state
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Admission fees state
  const [admissionFees, setAdmissionFees] = useState<AdmissionFee[]>([
    { feeName: 'ভর্তি ফি', amount: 2000, description: 'নতুন শিক্ষার্থীদের ভর্তি ফি', isActive: true },
    { feeName: 'সেশন ফি', amount: 1000, description: 'বার্ষিক সেশন ফি', isActive: true },
    { feeName: 'রেজিস্ট্রেশন ফি', amount: 500, description: 'শিক্ষার্থী রেজিস্ট্রেশন ফি', isActive: true }
  ]);

  // Exam fees state - Class-specific exam fees
  const [examFees, setExamFees] = useState<{
    monthly: { [className: string]: number };
    quarterly: { [className: string]: number };
    halfYearly: { [className: string]: number };
    annual: { [className: string]: number };
  }>({
    monthly: {},
    quarterly: {},
    halfYearly: {},
    annual: {}
  });

  // Exam fees document ID for Firebase
  const [examFeesDocId, setExamFeesDocId] = useState<string>('');

  // Existing exams from exam management page
  const [existingExams, setExistingExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  // Exam-specific fees by class
  const [examClassFees, setExamClassFees] = useState<{[examId: string]: {[className: string]: number}}>({});

  // Dialog states for class-wise fee setting
  const [showClassFeeDialog, setShowClassFeeDialog] = useState(false);
  const [selectedExamForFee, setSelectedExamForFee] = useState<any>(null);
  const [dialogClassFees, setDialogClassFees] = useState<{[className: string]: number}>({});
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // Dialog state for fee collection
  const [showFeeCollectionDialog, setShowFeeCollectionDialog] = useState(false);
  const [selectedExamForCollection, setSelectedExamForCollection] = useState<any>(null);
  const [studentsForCollection, setStudentsForCollection] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Exam selection for focused view
  const [selectedExam, setSelectedExam] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth is not initialized');
      router.push('/auth/login');
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadData();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadData = async () => {
    try {
      console.log('Loading all fees data...');

      // Lazy load query modules to reduce initial bundle size
      const studentQueriesModule = await import('@/lib/queries/student-queries');
      const classQueriesModule = await import('@/lib/queries/class-queries');

      const { studentQueries } = studentQueriesModule;
      const { classQueries } = classQueriesModule;

      // Get all students to see what classes exist (cached for 5 minutes)
      const studentsData = await studentQueries.getAllStudents();
      setStudents(studentsData);

      // Get all ACTIVE classes from Firebase classes collection (only source)
      let firebaseClasses: string[] = [];
      try {
        const classesData = await classQueries.getAllClasses();
        console.log('Raw classes data:', classesData);

        // Only include active classes from the main classes collection
        firebaseClasses = classesData
          .filter((classItem: any) => {
            console.log('Filtering class item:', classItem);
            return classItem && classItem.isActive === true;
          })
          .map((classItem: any) => {
            console.log('Mapping class item:', classItem);
            const className = classItem?.className || classItem?.name || '';
            console.log('Extracted class name:', className);
            return className;
          })
          .filter((className: string) => {
            console.log('Filtering class name:', className, 'Boolean check:', Boolean(className));
            return Boolean(className);
          });

        console.log('Active Firebase classes:', firebaseClasses);
      } catch (error) {
        console.log('No classes collection found or error fetching:', error);
        // No fallback - if no classes added, show empty
        firebaseClasses = [];
      }

      // Use only Firebase classes from class management system
      const combinedClasses = firebaseClasses;

      // Set available classes for dialog
      setAvailableClasses(firebaseClasses);

      console.log('Active Firebase classes (only source):', firebaseClasses);
      console.log('Combined classes:', combinedClasses);

      // Get existing fees for these classes
      const schoolId = SCHOOL_ID;
      const existingFees = await feeQueries.getActiveFees(schoolId);

      console.log('Existing fees:', existingFees);

      // Create class fee structure - only for active classes
      const feesStructure: ClassFee[] = combinedClasses.map((className: string) => {
        // Find existing fee for this class
        const existingFee = existingFees.find(fee =>
          fee.applicableClasses.includes(className) &&
          fee.feeType === 'monthly'
        );

        return {
          className,
          tuitionFee: existingFee ? existingFee.amount : 500, // Default to 500
          isActive: existingFee ? existingFee.isActive : true
        };
      });

      setClassFees(feesStructure);

      // Load exam fees from Firebase
      await loadExamFeesFromFirebase();

      // Load admission fees from Firebase
      await loadAdmissionFeesFromFirebase();

      // Load existing exams from exam management
      await loadExistingExams();

      // Load exam-specific fees from Firebase
      await loadExamClassFees();

      console.log('All fees loaded successfully');

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('ডেটা লোড করতে সমস্যা হয়েছে');
    }
  };

  // Add real-time listener for classes collection
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time listener for classes...');

    const unsubscribe = onSnapshot(
      collection(db, 'classes'),
      (snapshot) => {
        console.log('Classes collection updated, reloading data...');
        loadData(); // Reload data when classes collection changes
      },
      (error) => {
        console.error('Error listening to classes collection:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const loadExamFeesFromFirebase = async () => {
    try {
      const schoolId = SCHOOL_ID;

      // Try to get existing exam fees document
      const examFeesRef = doc(db, 'examFees', schoolId);
      const examFeesSnap = await getDoc(examFeesRef);

      if (examFeesSnap.exists()) {
        const examFeesData = examFeesSnap.data();
        console.log('Loaded exam fees from Firebase:', examFeesData);

        setExamFees({
          monthly: examFeesData.monthly || {},
          quarterly: examFeesData.quarterly || {},
          halfYearly: examFeesData.halfYearly || {},
          annual: examFeesData.annual || {}
        });

        setExamFeesDocId(examFeesSnap.id);
      } else {
        console.log('No exam fees found in Firebase, using defaults');
        // Keep default empty state
      }
    } catch (error) {
      console.error('Error loading exam fees from Firebase:', error);
    }
  };

  const loadAdmissionFeesFromFirebase = async () => {
    try {
      const schoolId = SCHOOL_ID;

      // Try to get existing admission fees document
      const admissionFeesRef = doc(db, 'admissionFees', schoolId);
      const admissionFeesSnap = await getDoc(admissionFeesRef);

      if (admissionFeesSnap.exists()) {
        const admissionFeesData = admissionFeesSnap.data();
        console.log('Loaded admission fees from Firebase:', admissionFeesData);

        if (admissionFeesData.fees && Array.isArray(admissionFeesData.fees)) {
          setAdmissionFees(admissionFeesData.fees);
        }
      } else {
        console.log('No admission fees found in Firebase, using defaults');
        // Keep default state
      }
    } catch (error) {
      console.error('Error loading admission fees from Firebase:', error);
    }
  };

  const loadExistingExams = async () => {
    try {
      setLoadingExams(true);
      const schoolId = SCHOOL_ID;
      const examsData = await examQueries.getAllExams(schoolId);
      setExistingExams(examsData);
      console.log('Loaded existing exams:', examsData);
    } catch (error) {
      console.error('Error loading existing exams:', error);
    } finally {
      setLoadingExams(false);
    }
  };

  const loadExamClassFees = async () => {
    try {
      const schoolId = SCHOOL_ID;

      // Try to get existing exam-specific fees document
      const examSpecificFeesRef = doc(db, 'examSpecificFees', schoolId);
      const examSpecificFeesSnap = await getDoc(examSpecificFeesRef);

      if (examSpecificFeesSnap.exists()) {
        const examSpecificFeesData = examSpecificFeesSnap.data();
        console.log('Loaded exam-specific fees from Firebase:', examSpecificFeesData);

        if (examSpecificFeesData.fees) {
          setExamClassFees(examSpecificFeesData.fees);
        }
      } else {
        console.log('No exam-specific fees found in Firebase, using defaults');
        // Keep default empty state
      }
    } catch (error) {
      console.error('Error loading exam-specific fees from Firebase:', error);
    }
  };

  const loadStudentsForFeeCollection = async (exam: any) => {
    setLoadingStudents(true);
    try {
      // Get students from the classes that have fees set for this exam
      const examFees = examClassFees[exam.id] || {};
      const classesWithFees = Object.keys(examFees).filter(className => examFees[className] > 0);

      if (classesWithFees.length === 0) {
        setStudentsForCollection([]);
        return;
      }

      // Get all students and filter by classes
      const allStudents = await studentQueries.getAllStudents();
      const relevantStudents = allStudents.filter(student =>
        student.class && classesWithFees.includes(student.class)
      );

      setStudentsForCollection(relevantStudents);
    } catch (error) {
      console.error('Error loading students for fee collection:', error);
      setStudentsForCollection([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const updateClassFee = (className: string, newAmount: number) => {
    setClassFees(prev => prev.map(fee =>
      fee.className === className
        ? { ...fee, tuitionFee: newAmount }
        : fee
    ));
  };

  const saveAllFees = async () => {
    setSaving(true);
    setMessage('');

    try {
      const schoolId = SCHOOL_ID;

      // Delete all existing fees first
      await feeQueries.deleteAllFees(schoolId);
      console.log('🗑️ Deleted existing fees');

      // Create new fees for each class
      for (const classFee of classFees) {
        if (classFee.tuitionFee > 0) {
          await feeQueries.createFee({
            feeName: `টিউশন ফি - ${classFee.className}`,
            feeNameEn: `Tuition Fee - ${classFee.className}`,
            amount: classFee.tuitionFee,
            description: `${classFee.className} ক্লাসের মাসিক টিউশন ফি`,
            applicableClasses: [classFee.className],
            feeType: 'monthly',
            isActive: classFee.isActive,
            schoolId,
            createdBy: user?.uid || 'system'
          });

          console.log(`✅ Created fee for ${classFee.className}: ৳${classFee.tuitionFee}`);
        }
      }

      setMessage('✅ সকল ক্লাসের ফি সফলভাবে সংরক্ষণ করা হয়েছে!');
      console.log('✅ All class fees saved successfully');

    } catch (error) {
      console.error('❌ Error saving fees:', error);
      setMessage('❌ ফি সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const saveExamFees = async () => {
    try {
      const schoolId = SCHOOL_ID;

      // Save exam fees to Firebase
      const examFeesData = {
        monthly: examFees.monthly,
        quarterly: examFees.quarterly,
        halfYearly: examFees.halfYearly,
        annual: examFees.annual,
        schoolId,
        updatedBy: user?.uid || 'system',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'examFees', schoolId), examFeesData);

      console.log('✅ Exam fees saved to Firebase:', examFeesData);
      setMessage('✅ পরীক্ষার ফি সফলভাবে সংরক্ষণ করা হয়েছে!');

    } catch (error) {
      console.error('❌ Error saving exam fees:', error);
      setMessage('❌ পরীক্ষার ফি সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  const saveAdmissionFees = async () => {
    try {
      const schoolId = SCHOOL_ID;

      // Save admission fees to Firebase
      const admissionFeesData = {
        fees: admissionFees,
        schoolId,
        updatedBy: user?.uid || 'system',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'admissionFees', schoolId), admissionFeesData);

      console.log('✅ Admission fees saved to Firebase:', admissionFeesData);
      setMessage('✅ ভর্তি ফি সফলভাবে সংরক্ষণ করা হয়েছে!');

    } catch (error) {
      console.error('❌ Error saving admission fees:', error);
      setMessage('❌ ভর্তি ফি সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  const saveExamClassFees = async () => {
    try {
      const schoolId = SCHOOL_ID;

      // Save exam-specific fees to Firebase
      const examSpecificFeesData = {
        fees: examClassFees,
        schoolId,
        updatedBy: user?.uid || 'system',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'examSpecificFees', schoolId), examSpecificFeesData);

      console.log('✅ Exam-specific fees saved to Firebase:', examSpecificFeesData);
      setMessage('✅ পরীক্ষার ফি সফলভাবে সংরক্ষণ করা হয়েছে!');

    } catch (error) {
      console.error('❌ Error saving exam-specific fees:', error);
      setMessage('❌ পরীক্ষার ফি সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: true },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Award, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: BookOpen, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: false },
    { icon: Users, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Bell, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: Bell, label: 'নোটিশ', href: '/admin/notice', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
            onClick={() => auth?.signOut()}
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">ক্লাস অনুসারে ফি ম্যানেজমেন্ট</h1>
                  <p className="text-sm text-gray-600 leading-tight">প্রত্যেক ক্লাসের জন্য আলাদা টিউশন ফি সেট করুন</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={() => router.push('/admin/accounting')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>হিসাবে ফিরে যান</span>
              </button>
            </div>

            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ফি ম্যানেজমেন্ট সিস্টেম</h2>
              <p className="text-gray-600">সকল ধরনের ফি ম্যানেজ করুন</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('tuition')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === 'tuition'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>ক্লাসভিত্তিক টিউশন ফি</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('admission')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === 'admission'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>ভর্তি ও সেশন ফি</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('exam')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === 'exam'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>পরীক্ষার ফি</span>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Message */}
                {message && (
                  <div className={`mb-4 p-4 rounded-lg flex items-center ${
                    message.includes('✅')
                      ? 'bg-green-100 border border-green-400 text-green-700'
                      : 'bg-red-100 border border-red-400 text-red-700'
                  }`}>
                    {message.includes('✅') ? (
                      <CheckCircle className="w-5 h-5 mr-2" />
                    ) : (
                      <AlertCircle className="w-5 h-5 mr-2" />
                    )}
                    {message}
                  </div>
                )}

                {/* Tuition Fees Tab */}
                {activeTab === 'tuition' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">ক্লাসভিত্তিক টিউশন ফি নির্ধারণ</h3>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{classFees.length}</p>
                        <p className="text-sm text-gray-600">মোট ক্লাস</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      {classFees.map((classFee, index) => (
                        <div key={classFee.className} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ক্লাস: {classFee.className}
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">মাসিক ফি:</span>
                              <input
                                type="number"
                                value={classFee.tuitionFee}
                                onChange={(e) => updateClassFee(classFee.className, parseInt(e.target.value) || 0)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                                placeholder="ফি পরিমাণ"
                              />
                              <span className="text-sm text-gray-600">টাকা</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={classFee.isActive}
                              onChange={(e) => {
                                setClassFees(prev => prev.map(fee =>
                                  fee.className === classFee.className
                                    ? { ...fee, isActive: e.target.checked }
                                    : fee
                                ));
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-600">সক্রিয়</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {classFees.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">কোনো ক্লাস পাওয়া যায়নি</p>
                        <p className="text-sm">প্রথমে কিছু শিক্ষার্থী যোগ করুন</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <button
                        onClick={loadData}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>রিফ্রেশ</span>
                      </button>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push('/admin/accounting/collect-salary')}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                          <span>টিউশন ফি আদায়</span>
                        </button>

                        <button
                          onClick={saveAllFees}
                          disabled={saving || classFees.length === 0}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সকল ফি সংরক্ষণ করুন'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* All Classes Display */}
                {activeTab === 'exam' && availableClasses.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">সকল ক্লাস</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableClasses.map((className) => (
                        <div key={className} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{className}</h3>
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              সক্রিয়
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>ক্লাস নাম: {className}</p>
                            <p>স্ট্যাটাস: সক্রিয়</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admission Fees Tab */}
                {activeTab === 'admission' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">ভর্তি ও সেশন ফি নির্ধারণ</h3>
                    </div>

                    <div className="space-y-4 mb-6">
                      {admissionFees.map((fee, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ফি: {fee.feeName}
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">পরিমাণ:</span>
                              <input
                                type="number"
                                value={fee.amount}
                                onChange={(e) => {
                                  const newFees = [...admissionFees];
                                  newFees[index].amount = parseInt(e.target.value) || 0;
                                  setAdmissionFees(newFees);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                                placeholder="ফি পরিমাণ"
                              />
                              <span className="text-sm text-gray-600">টাকা</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{fee.description}</p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={fee.isActive}
                              onChange={(e) => {
                                const newFees = [...admissionFees];
                                newFees[index].isActive = e.target.checked;
                                setAdmissionFees(newFees);
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-600">সক্রিয়</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={loadData}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>রিফ্রেশ</span>
                      </button>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push('/admin/accounting/collect-admission-fee')}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                          <span>ভর্তি ফি আদায়</span>
                        </button>

                        <button
                          onClick={saveAdmissionFees}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>ভর্তি ফি সংরক্ষণ করুন</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exam Fees Tab */}
                {activeTab === 'exam' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">ফি সংগ্রহ করুন: বিদ্যমান পরীক্ষাসমূহ এবং ফি</h3>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{existingExams.length}</p>
                        <p className="text-sm text-gray-600">মোট পরীক্ষা</p>
                      </div>
                    </div>

                    {/* Exam Selection Dropdown */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">পরীক্ষা নির্বাচন করুন</h2>
                      <div className="flex items-center space-x-4">
                        <label htmlFor="examSelect" className="text-sm font-medium text-gray-700">
                          পরীক্ষা নির্বাচন করুন:
                        </label>
                        <select
                          id="examSelect"
                          value={selectedExam}
                          onChange={(e) => setSelectedExam(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">সকল পরীক্ষা</option>
                          {existingExams.map((exam) => (
                            <option key={exam.id} value={exam.id}>{exam.name}</option>
                          ))}
                        </select>
                      </div>
                      {selectedExam && (
                        <p className="text-sm text-gray-600 mt-2">
                          নির্বাচিত পরীক্ষা: <strong>{existingExams.find(e => e.id === selectedExam)?.name}</strong> - এই পরীক্ষার জন্য ক্লাস অনুসারে ফি নির্ধারণ করুন।
                        </p>
                      )}
                    </div>

                    {loadingExams ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                        <p className="text-gray-600">পরীক্ষা লোড হচ্ছে...</p>
                      </div>
                    ) : existingExams.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">কোনো পরীক্ষা পাওয়া যায়নি</p>
                        <p className="text-sm">প্রথমে পরীক্ষা পরিচালনা পৃষ্ঠায় কিছু পরীক্ষা যোগ করুন</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Define examsToShow outside */}
                        {(() => {
                          const examsToShow = selectedExam ? existingExams.filter(exam => exam.id === selectedExam) : existingExams;

                          if (selectedExam && examsToShow.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-lg font-medium">পরীক্ষা পাওয়া যায়নি</p>
                                <p className="text-sm">নির্বাচিত পরীক্ষা খুঁজে পাওয়া যায়নি</p>
                              </div>
                            );
                          }

                          return (
                            <>
                              {/* Group exams by exam type */}
                              {[
                                { types: ['প্রথম সাময়িক'], label: 'প্রথম সাময়িক পরীক্ষা', color: 'bg-blue-50 border-blue-200' },
                                { types: ['দ্বিতীয় সাময়িক'], label: 'দ্বিতীয় সাময়িক পরীক্ষা', color: 'bg-green-50 border-green-200' },
                                { types: ['তৃতীয় সাময়িক'], label: 'তৃতীয় সাময়িক পরীক্ষা', color: 'bg-teal-50 border-teal-200' },
                                { types: ['সাময়িক'], label: 'সাময়িক পরীক্ষা', color: 'bg-cyan-50 border-cyan-200' },
                                { types: ['বার্ষিক'], label: 'বার্ষিক পরীক্ষা', color: 'bg-purple-50 border-purple-200' },
                                { types: ['মাসিক'], label: 'মাসিক পরীক্ষা', color: 'bg-indigo-50 border-indigo-200' },
                                { types: ['নির্বাচনী'], label: 'নির্বাচনী পরীক্ষা', color: 'bg-orange-50 border-orange-200' },
                                { types: ['পরীক্ষামূলক', 'অন্যান্য'], label: 'অন্যান্য পরীক্ষা', color: 'bg-gray-50 border-gray-200' }
                              ].map(({ types, label, color }) => {
                                const examsOfType = examsToShow.filter(exam => exam.examType && types.includes(exam.examType));

                                if (examsOfType.length === 0) return null;

                                return (
                                  <div key={label} className={`border rounded-lg p-4 ${color}`}>
                                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                                      <Award className="w-5 h-5 mr-2" />
                                      {label} ({examsOfType.length})
                                    </h4>

                                    <div className="space-y-3">
                                      {examsOfType.map((exam) => (
                                  <div key={exam.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <h5 className="text-lg font-medium text-gray-900">{exam.name}</h5>
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                          <div>
                                            <span className="font-medium">ক্লাস:</span> {exam.class || 'সাধারণ'}
                                          </div>
                                          <div>
                                            <span className="font-medium">তারিখ:</span> {new Date(exam.startDate).toLocaleDateString('bn-BD')} - {new Date(exam.endDate).toLocaleDateString('bn-BD')}
                                          </div>
                                          <div>
                                            <span className="font-medium">স্ট্যাটাস:</span>
                                            <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                              exam.status === 'সক্রিয়' ? 'bg-green-100 text-green-800' :
                                              exam.status === 'সম্পন্ন' ? 'bg-blue-100 text-blue-800' :
                                              'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              {exam.status}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <button
                                              onClick={() => {
                                                setSelectedExamForFee(exam);
                                                setDialogClassFees(examClassFees[exam.id] || {});
                                                setShowClassFeeDialog(true);
                                              }}
                                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                            >
                                              ক্লাস অনুসারে ফি
                                            </button>
                                            <button
                                              onClick={async () => {
                                                setSelectedExamForCollection(exam);
                                                await loadStudentsForFeeCollection(exam);
                                                setShowFeeCollectionDialog(true);
                                              }}
                                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                              disabled={!examClassFees[exam.id] || Object.keys(examClassFees[exam.id]).length === 0}
                                            >
                                              ফি সংগ্রহ করুন
                                            </button>
                                          </div>
                                        </div>

                                        {/* Fee Amount Input Fields */}
                                        <div className="mt-3">
                                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {availableClasses.map((className) => {
                                              const currentFee = examClassFees[exam.id]?.[className] || 0;
                                              return (
                                                <div key={className} className="flex items-center space-x-2">
                                                  <label className="text-xs text-gray-600 min-w-0 flex-1">{className}:</label>
                                                  <div className="flex items-center space-x-1">
                                                    <input
                                                      type="number"
                                                      value={currentFee}
                                                      onChange={(e) => {
                                                        const amount = parseInt(e.target.value) || 0;
                                                        setExamClassFees(prev => ({
                                                          ...prev,
                                                          [exam.id]: {
                                                            ...prev[exam.id],
                                                            [className]: amount
                                                          }
                                                        }));
                                                      }}
                                                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                      placeholder="0"
                                                      min="0"
                                                    />
                                                    <span className="text-xs text-gray-500">৳</span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* Show current fees for this exam */}
                                        {examClassFees[exam.id] && Object.keys(examClassFees[exam.id]).length > 0 && (
                                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <h5 className="text-sm font-medium text-blue-900 mb-2">নির্ধারিত ফি:</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                                              {Object.entries(examClassFees[exam.id])
                                                .filter(([_, fee]) => fee > 0)
                                                .map(([className, fee]) => (
                                                  <div key={className} className="flex justify-between items-center bg-white px-2 py-1 rounded border">
                                                    <span className="text-gray-700">{className}:</span>
                                                    <span className="font-semibold text-blue-600">৳{fee}</span>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center space-x-2 ml-4">
                                        <button
                                          onClick={() => {
                                            setSelectedExamForFee(exam);
                                            setDialogClassFees(examClassFees[exam.id] || {});
                                            setShowClassFeeDialog(true);
                                          }}
                                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                        >
                                          ক্লাস অনুসারে ফি
                                        </button>
                                        <button
                                          onClick={async () => {
                                            setSelectedExamForCollection(exam);
                                            await loadStudentsForFeeCollection(exam);
                                            setShowFeeCollectionDialog(true);
                                          }}
                                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                          disabled={!examClassFees[exam.id] || Object.keys(examClassFees[exam.id]).length === 0}
                                        >
                                          ফি সংগ্রহ করুন
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Show exams without examType or unmatched types */}
                        {(() => {
                          const examsToShow = selectedExam ? existingExams.filter(exam => exam.id === selectedExam) : existingExams;
                          const unmatchedExams = examsToShow.filter(exam =>
                            !exam.examType ||
                            ![
                              'প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'তৃতীয় সাময়িক', 'সাময়িক',
                              'বার্ষিক', 'মাসিক', 'নির্বাচনী', 'পরীক্ষামূলক', 'অন্যান্য'
                            ].includes(exam.examType)
                          );

                          if (unmatchedExams.length === 0) return null;

                          return (
                            <div key="unmatched" className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                                <Award className="w-5 h-5 mr-2" />
                                অন্যান্য পরীক্ষা ({unmatchedExams.length})
                              </h4>

                              <div className="space-y-3">
                                {unmatchedExams.map((exam) => (
                                  <div key={exam.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <h5 className="text-lg font-medium text-gray-900">{exam.name}</h5>
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                          <div>
                                            <span className="font-medium">ক্লাস:</span> {exam.class || 'সাধারণ'}
                                          </div>
                                          <div>
                                            <span className="font-medium">তারিখ:</span> {new Date(exam.startDate).toLocaleDateString('bn-BD')} - {new Date(exam.endDate).toLocaleDateString('bn-BD')}
                                          </div>
                                          <div>
                                            <span className="font-medium">স্ট্যাটাস:</span>
                                            <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                              exam.status === 'সক্রিয়' ? 'bg-green-100 text-green-800' :
                                              exam.status === 'সম্পন্ন' ? 'bg-blue-100 text-blue-800' :
                                              'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              {exam.status}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Show current fees for this exam */}
                                        {examClassFees[exam.id] && Object.keys(examClassFees[exam.id]).length > 0 && (
                                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <h5 className="text-sm font-medium text-yellow-900 mb-2">নির্ধারিত ফি:</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                                              {Object.entries(examClassFees[exam.id])
                                                .filter(([_, fee]) => fee > 0)
                                                .map(([className, fee]) => (
                                                  <div key={className} className="flex justify-between items-center bg-white px-2 py-1 rounded border">
                                                    <span className="text-gray-700">{className}:</span>
                                                    <span className="font-semibold text-yellow-600">৳{fee}</span>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center space-x-2 ml-4">
                                        <button
                                          onClick={() => router.push(`/admin/exams/results?examId=${exam.id}`)}
                                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                        >
                                          ফলাফল দেখুন
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                            </>
                          );
                        })()}

                        {/* Dedicated section for selected exam */}
                        {(() => {
                          const examsToShow = selectedExam ? existingExams.filter(exam => exam.id === selectedExam) : existingExams;
                          return selectedExam && examsToShow.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">নির্বাচিত পরীক্ষার জন্য ক্লাস অনুসারে ফি নির্ধারণ</h2>
                                <button
                                  onClick={async () => {
                                    await saveExamClassFees();
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                                >
                                  <Save className="w-4 h-4" />
                                  <span>সংরক্ষণ করুন</span>
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableClasses.map((className) => {
                                  const currentFee = examClassFees[selectedExam]?.[className] || 0;
                                  return (
                                    <div key={className} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-medium text-gray-900">{className}</h3>
                                        <span className="text-sm text-gray-600">ক্লাস</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="number"
                                          value={currentFee}
                                          onChange={(e) => {
                                            const amount = parseInt(e.target.value) || 0;
                                            setExamClassFees(prev => ({
                                              ...prev,
                                              [selectedExam]: {
                                                ...prev[selectedExam],
                                                [className]: amount
                                              }
                                            }));
                                          }}
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="ফি পরিমাণ"
                                          min="0"
                                        />
                                        <span className="text-gray-600">৳</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-6">
                      <button
                        onClick={() => {
                          loadData();
                          loadExistingExams();
                          loadExamClassFees();
                        }}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>রিফ্রেশ</span>
                      </button>

                      <div className="flex space-x-3">
                        <button
                          onClick={saveExamClassFees}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>পরীক্ষার ফি সংরক্ষণ করুন</span>
                        </button>


                        <button
                          onClick={() => router.push('/admin/accounting/collect-exam-fee')}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <span>পরীক্ষা ফি আদায়</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs">ℹ</span>
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">ফি ম্যানেজমেন্ট সিস্টেম:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>ক্লাসভিত্তিক টিউশন ফি:</strong> প্রত্যেক ক্লাসের জন্য আলাদা মাসিক ফি নির্ধারণ করুন</li>
                    <li>• <strong>ভর্তি ও সেশন ফি:</strong> নতুন শিক্ষার্থীদের ভর্তি এবং বার্ষিক সেশন ফি ম্যানেজ করুন</li>
                    <li>• <strong>পরীক্ষার ফি:</strong> প্রত্যেক পরীক্ষার জন্য নির্দিষ্ট ক্লাস নির্বাচন করে ফি নির্ধারণ করুন</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Class-wise Fee Setting Dialog */}
      {showClassFeeDialog && selectedExamForFee && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  ক্লাস অনুসারে ফি নির্ধারণ: {selectedExamForFee.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  পরীক্ষা: {selectedExamForFee.name} | ধরন: {selectedExamForFee.examType || 'সাধারণ'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowClassFeeDialog(false);
                  setSelectedExamForFee(null);
                  setDialogClassFees({});
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">প্রত্যেক ক্লাসের জন্য ফি নির্ধারণ করুন</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableClasses.length > 0 ? availableClasses.map((className: string) => (
                    <div key={className} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">{className.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{className} শ্রেণি</p>
                          <p className="text-sm text-gray-500">Class {className}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={dialogClassFees[className] || 0}
                          onChange={(e) => {
                            const amount = parseInt(e.target.value) || 0;
                            setDialogClassFees(prev => ({
                              ...prev,
                              [className]: amount
                            }));
                          }}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                          min="0"
                        />
                        <span className="text-gray-600 font-medium">৳</span>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">কোনো ক্লাস পাওয়া যায়নি</p>
                      <p className="text-sm">প্রথমে ক্লাস ম্যানেজমেন্টে কিছু ক্লাস যোগ করুন</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">সারাংশ</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">মোট ক্লাস:</span>
                    <span className="ml-2 font-semibold">{availableClasses.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ফি নির্ধারিত:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {Object.values(dialogClassFees).filter(fee => fee > 0).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">সর্বোচ্চ ফি:</span>
                    <span className="ml-2 font-semibold">৳{Math.max(...Object.values(dialogClassFees), 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">সর্বনিম্ন ফি:</span>
                    <span className="ml-2 font-semibold">৳{Math.min(...Object.values(dialogClassFees).filter(fee => fee > 0), 0) || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowClassFeeDialog(false);
                  setSelectedExamForFee(null);
                  setDialogClassFees({});
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                onClick={async () => {
                  // Save the dialog fees to the main state
                  setExamClassFees(prev => ({
                    ...prev,
                    [selectedExamForFee.id]: dialogClassFees
                  }));

                  // Save to Firebase immediately
                  await saveExamClassFees();

                  setShowClassFeeDialog(false);
                  setSelectedExamForFee(null);
                  setDialogClassFees({});
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold text-base shadow-lg hover:shadow-xl"
              >
                <CheckCircle className="w-4 h-4" />
                <span>ফি সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Collection Dialog */}
      {showFeeCollectionDialog && selectedExamForCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  ফি সংগ্রহ করুন: {selectedExamForCollection.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  পরীক্ষা: {selectedExamForCollection.name} | ধরন: {selectedExamForCollection.examType || 'সাধারণ'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFeeCollectionDialog(false);
                  setSelectedExamForCollection(null);
                  setStudentsForCollection([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-6">
              {loadingStudents ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                  <p className="text-gray-600">শিক্ষার্থীদের তথ্য লোড হচ্ছে...</p>
                </div>
              ) : studentsForCollection.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
                  <p className="text-sm">এই পরীক্ষার জন্য কোনো ক্লাসে ফি নির্ধারণ করা হয়নি</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">শিক্ষার্থীদের তালিকা</h3>
                    <div className="text-sm text-gray-600">
                      মোট শিক্ষার্থী: {studentsForCollection.length}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studentsForCollection.map((student) => {
                      const examFees = examClassFees[selectedExamForCollection.id] || {};
                      const studentFee = examFees[student.class] || 0;

                      return (
                        <div key={student.uid} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {student.name?.charAt(0)?.toUpperCase() || 'S'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{student.name || student.displayName}</h4>
                              <p className="text-sm text-gray-600">ক্লাস: {student.class}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">পরীক্ষার ফি:</span>
                              <span className="font-semibold text-blue-600">৳{studentFee}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">স্ট্যাটাস:</span>
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                অপেক্ষমান
                              </span>
                            </div>
                          </div>

                          <button
                            className="w-full mt-3 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            disabled={studentFee === 0}
                          >
                            {studentFee === 0 ? 'ফি নির্ধারণ করা হয়নি' : 'ফি সংগ্রহ করুন'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowFeeCollectionDialog(false);
                  setSelectedExamForCollection(null);
                  setStudentsForCollection([]);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function FeesPageWrapper() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Block unauthorized access - only admin and super_admin can access
    if (!loading && userData?.role) {
      const role = userData.role;
      
      if (role === 'teacher') {
        router.push('/teacher/accounting/fees');
        return;
      }
      
      if (role === 'parent') {
        router.push('/parent/dashboard');
        return;
      }
      
      if (role === 'student') {
        router.push('/student/dashboard');
        return;
      }
      
      // Only allow admin and super_admin
      if (role !== 'admin' && role !== 'super_admin') {
        router.push('/');
        return;
      }
    }
  }, [userData, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (

    <ProtectedRoute requireAuth={true}>
      <FeesPage />
    </ProtectedRoute>
  );
}
