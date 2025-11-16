'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { studentQueries, accountingQueries, examQueries, feeQueries, settingsQueries, User, Exam, Class, FinancialTransaction } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { useAlert } from '@/hooks/useAlert';
import AlertDialog from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { exportExamFeeCollectionToPDF, exportExamFeeCollectionToDOCX } from '@/lib/export-utils';
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
  Search,
  Bell,
  Plus,
  UserPlus,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Eye,
  MoreVertical,
  Phone,
  MapPin,
  DollarSign,
  AlertCircle,
  Calculator,
  Globe,
  Download,
  MessageSquare,
  Sparkles,
  Gift,
  FileText,
  Award,
  Bell as BellIcon,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
  GraduationCap,
  Building,
  Package as PackageIcon,
  CreditCard as CreditCardIcon
} from 'lucide-react';

function CollectExamFeePage() {
  const { isOpen, alertOptions, showSuccess, showError, showWarning, closeAlert } = useAlert();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search and filter states
  const [studentNameSearch, setStudentNameSearch] = useState<string>('');
  const [rollNumberSearch, setRollNumberSearch] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('সকল ক্লাস');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('সকল সেকশন');

  // Student data states
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<User[]>([]);

  // Form states
  const [selectedExamType, setSelectedExamType] = useState<'monthly' | 'quarterly' | 'halfYearly' | 'annual' | ''>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fee structure states
  const [feeStructure, setFeeStructure] = useState<{[key: string]: any}>({});
  const [loadingFees, setLoadingFees] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Dialog states
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<any>(null);
  const [dialogExamId, setDialogExamId] = useState<string>('');

  // Exam selection dialog states
  const [showExamSelectionDialog, setShowExamSelectionDialog] = useState(false);
  const [examFeesData, setExamFeesData] = useState<any>({});
  const [existingExams, setExistingExams] = useState<Exam[]>([]);
  const [loadingExamFeesData, setLoadingExamFeesData] = useState(false);
  const [selectedExamTypeForDialog, setSelectedExamTypeForDialog] = useState<string>('');

  // Dialog form states
  const [totalFee, setTotalFee] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Exam types for dialog
  const examTypes = [
    { value: 'monthly', label: 'মাসিক পরীক্ষা', disabled: false },
    { value: 'quarterly', label: 'ত্রৈমাসিক পরীক্ষা', disabled: false },
    { value: 'halfYearly', label: 'অর্ধবার্ষিক পরীক্ষা', disabled: false },
    { value: 'annual', label: 'বার্ষিক পরীক্ষা', disabled: false }
  ];

  // Month options for monthly exams
  const monthOptions = [
    { value: '1', label: 'জানুয়ারি' },
    { value: '2', label: 'ফেব্রুয়ারি' },
    { value: '3', label: 'মার্চ' },
    { value: '4', label: 'এপ্রিল' },
    { value: '5', label: 'মে' },
    { value: '6', label: 'জুন' },
    { value: '7', label: 'জুলাই' },
    { value: '8', label: 'আগস্ট' },
    { value: '9', label: 'সেপ্টেম্বর' },
    { value: '10', label: 'অক্টোবর' },
    { value: '11', label: 'নভেম্বর' },
    { value: '12', label: 'ডিসেম্বর' }
  ];

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Exam fee states
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

  // Fee collection status
  const [feeCollections, setFeeCollections] = useState<any[]>([]);
  const [loadingFeeCollections, setLoadingFeeCollections] = useState(false);

  // Exam fees from exam fee management
  const [examFeesFromManagement, setExamFeesFromManagement] = useState<{
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

  const router = useRouter();
  const { userData } = useAuth();

  // Use the correct school ID: AMAR-2026
  const schoolId = SCHOOL_ID;

  // Class name mapping utility
  const getClassKey = (className: string): string => {
    const classMap: { [key: string]: string } = {
      'প্লে': 'Play',
      'নার্সারি': 'Nursery',
      'প্রথম': '1',
      'দ্বিতীয়': '2',
      'তৃতীয়': '3',
      'চতুর্থ': '4',
      'পঞ্চম': '5',
      'ষষ্ঠ': '6',
      'সপ্তম': '7',
      'অষ্টম': '8',
      'নবম': '9',
      'দশম': '10'
    };

    // If it's already an English number, return as is
    if (!isNaN(Number(className))) {
      return className;
    }

    // Otherwise, map from Bengali to English
    return classMap[className] || className;
  };

  // Helper function to fetch latest user name from Firestore
  const getLatestCollectorName = async (): Promise<string> => {
    let collectorName = userData?.name || user?.displayName || user?.email?.split('@')[0] || 'Admin User';
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userDocData = userDoc.data();
          collectorName = userDocData.name || user?.displayName || user?.email?.split('@')[0] || 'Admin User';
        }
      } catch (error) {
        console.error('Error fetching latest user name:', error);
      }
    }
    return collectorName;
  };

  // Available classes and sections - will be loaded from Firebase
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<string[]>(['সকল সেকশন']);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    let transactionUnsubscribe: (() => void) | undefined;
    let feeCollectionUnsubscribe: (() => void) | undefined;
    
    const authUnsubscribe = onAuthStateChanged(auth!, (user) => {
      if (user) {
        console.log('🔐 User authenticated, loading data...');
        setUser(user);


        loadStudents();
        loadClasses();
        loadFeeStructure();
        loadExamFees();
        loadExamFeesFromManagement();
        loadExamFeesData();
        loadFeeCollections();
        loadSchoolSettings();
        
        // Set up real-time listeners
        const schoolId = SCHOOL_ID;
        
        // Listen to transactions
        const transactionsRef = collection(db, 'financialTransactions');
        const transactionsQuery = query(
          transactionsRef,
          where('schoolId', '==', schoolId),
          where('category', '==', 'exam_fee'),
          orderBy('date', 'desc')
        );
        
        transactionUnsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
          console.log('🔄 Exam fee transaction updated, reloading data...');
          loadFeeCollections();
          loadExamFeesData();
        }, (error) => {
          console.error('❌ Error listening to transactions:', error);
        });
        
        // Listen to fee collections
        const feeCollectionsRef = collection(db, 'feeCollections');
        const feeCollectionsQuery = query(
          feeCollectionsRef,
          where('schoolId', '==', schoolId),
          orderBy('paymentDate', 'desc')
        );
        
        feeCollectionUnsubscribe = onSnapshot(feeCollectionsQuery, (snapshot) => {
          console.log('🔄 Fee collection updated, reloading students...');
          loadStudents();
        }, (error) => {
          console.error('❌ Error listening to fee collections:', error);
        });
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (transactionUnsubscribe) {
        transactionUnsubscribe();
      }
      if (feeCollectionUnsubscribe) {
        feeCollectionUnsubscribe();
      }
    };
  }, [router]);


  const loadSchoolSettings = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      if (settings) {
        setSchoolSettings(settings);
        if ((settings as any).logo || (settings as any).schoolLogo) {
          setSchoolLogo((settings as any).logo || (settings as any).schoolLogo);
        }
      }
    } catch (error) {
      console.error('Error loading school settings:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const studentsData = await studentQueries.getAllStudents();
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  // Load fee structure from Firebase - Class-wise fee management
  const loadFeeStructure = async () => {
    setLoadingFees(true);
    try {
      // Try to load from localStorage first
      const savedFees = localStorage.getItem('iqra_class_wise_fees');
      if (savedFees) {
        const parsedFees = JSON.parse(savedFees);
        setFeeStructure(parsedFees);
      }

      // Load from Firebase - Class-wise fee management collection

      // Try to load from classWiseFees collection first
      const classWiseFeesRef = doc(db, 'classWiseFees', schoolId);
      const classWiseFeesSnap = await getDoc(classWiseFeesRef);

      if (classWiseFeesSnap.exists()) {
        const feesData = classWiseFeesSnap.data();
        setFeeStructure(feesData);
        localStorage.setItem('iqra_class_wise_fees', JSON.stringify(feesData));
        console.log('✅ Class-wise fee structure loaded from Firebase:', feesData);
      } else {
        // Try alternative collection name
        const feeManagementRef = doc(db, 'feeManagement', schoolId);
        const feeManagementSnap = await getDoc(feeManagementRef);

        if (feeManagementSnap.exists()) {
          const feesData = feeManagementSnap.data();
          setFeeStructure(feesData);
          localStorage.setItem('iqra_class_wise_fees', JSON.stringify(feesData));
          console.log('✅ Fee management loaded from Firebase:', feesData);
        } else {
          // Try to load from allClasses collection for class-specific fees
          const allClassesRef = collection(db, 'allClasses');
          const allClassesSnap = await getDocs(allClassesRef);

          if (!allClassesSnap.empty) {
            const classFeesData: any = { examFees: {} };

            allClassesSnap.forEach((doc: any) => {
              const classData = doc.data();
              if (classData.className && classData.examFee) {
                classFeesData.examFees[classData.className] = classData.examFee;
              }
            });

            if (Object.keys(classFeesData.examFees).length > 0) {
              setFeeStructure(classFeesData);
              localStorage.setItem('iqra_class_wise_fees', JSON.stringify(classFeesData));
              console.log('✅ Class fees loaded from allClasses:', classFeesData);
            } else {
              useDefaultFees();
            }
          } else {
            useDefaultFees();
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading class-wise fee structure:', error);
      useDefaultFees();
    } finally {
      setLoadingFees(false);
    }
  };

  // Use default class-wise fees
  const useDefaultFees = () => {
    const defaultFees = {
      examFees: {
        'প্লে': 100,
        'নার্সারি': 150,
        'প্রথম': 200,
        'দ্বিতীয়': 250,
        'তৃতীয়': 300,
        'চতুর্থ': 350,
        'পঞ্চম': 400,
        'ষষ্ঠ': 450,
        'সপ্তম': 500,
        'অষ্টম': 550,
        'নবম': 600,
        'দশম': 700
      }
    };
    setFeeStructure(defaultFees);
    localStorage.setItem('iqra_class_wise_fees', JSON.stringify(defaultFees));
    console.log('📝 Using default class-wise fee structure:', defaultFees);
  };

  // Load exam fees from Firebase using queries (legacy - keeping for compatibility)
  const loadExamFees = async () => {
    try {
      const schoolId = SCHOOL_ID;
      const examFeesData = await accountingQueries.getExamFees(schoolId);

      console.log('Loaded legacy exam fees from Firebase:', examFeesData);

      // Transform the data to match the expected structure
      const transformedFees = {
        monthly: (examFeesData as any)?.monthly || {},
        quarterly: (examFeesData as any)?.quarterly || {},
        halfYearly: (examFeesData as any)?.halfYearly || {},
        annual: (examFeesData as any)?.annual || {}
      };
      
      setExamFees(transformedFees);
      console.log('📊 Legacy exam fees loaded:', transformedFees);
    } catch (error) {
      console.error('Error loading legacy exam fees from Firebase:', error);
      // Keep default empty state
    }
  };

  // Load exam fees from exam fee management system
  const loadExamFeesFromManagement = async () => {
    try {
      const schoolId = SCHOOL_ID;
      const examFeesData = await accountingQueries.getExamFees(schoolId);

      console.log('📋 Loaded exam fees from management system:', examFeesData);

      // Filter out empty entries (only keep fees > 0)
      const filteredFees = {
        monthly: {},
        quarterly: {},
        halfYearly: {},
        annual: {}
      };

      Object.entries(examFeesData).forEach(([examType, classFees]) => {
        const validFees = Object.fromEntries(
          Object.entries(classFees).filter(([_, fee]) => {
            const feeValue = typeof fee === 'string' ? parseFloat(fee) : fee;
            return feeValue && feeValue > 0;
          })
        );

        if (examType === 'monthly') filteredFees.monthly = validFees;
        else if (examType === 'quarterly') filteredFees.quarterly = validFees;
        else if (examType === 'halfYearly') filteredFees.halfYearly = validFees;
        else if (examType === 'annual') filteredFees.annual = validFees;
      });

      setExamFeesFromManagement(filteredFees);
      console.log('✅ Filtered exam fees from management:', filteredFees);
    } catch (error) {
      console.error('❌ Error loading exam fees from management:', error);
    }
  };


  // Load fee collections from Firebase
  const loadFeeCollections = async () => {
    setLoadingFeeCollections(true);
    try {
      const schoolId = SCHOOL_ID;
      const collections = await feeQueries.getAllFeeCollections(schoolId);
      setFeeCollections(collections);
      console.log('📋 Fee collections loaded:', collections.length);
    } catch (error) {
      console.error('Error loading fee collections:', error);
    } finally {
      setLoadingFeeCollections(false);
    }
  };

  const loadExamFeesData = async () => {
    setLoadingExamFeesData(true);
    try {
      // Use standardized school ID
      const schoolId = SCHOOL_ID;

      console.log('🔍 Loading exams and fees for school:', schoolId);

      // Load existing exams from exam management - try both school IDs
      let examsData = await examQueries.getAllExams(schoolId);
      console.log(`📋 Loaded ${examsData.length} exams with schoolId: ${schoolId}`);
      
      // Filter out deleted exams (check both boolean and string values)
      examsData = examsData.filter((exam) => {
        const isDeleted = (exam as any).deleted === true || (exam as any).deleted === 'true';
        console.log(`📋 Exam ${exam.id}: deleted=${(exam as any).deleted}, isDeleted=${isDeleted}`);
        return !isDeleted;
      });
      console.log(`📋 After filtering deleted: ${examsData.length} active exams`);

      // Load exam-specific fees from Firebase - try both school IDs
      let examSpecificFeesData: any = {};
      
      const examSpecificFeesRef = doc(db, 'examSpecificFees', schoolId);
      const examSpecificFeesSnap = await getDoc(examSpecificFeesRef);

      if (examSpecificFeesSnap.exists()) {
        examSpecificFeesData = examSpecificFeesSnap.data();
        console.log('✅ Loaded exam-specific fees from Firebase:', examSpecificFeesData);
      } else {
        console.log('❌ No exam-specific fees found');
      }

      // Set exam fees data
      if (examSpecificFeesData.fees) {
        setExamFeesData(examSpecificFeesData.fees);
        console.log('📊 Set exam fees data:', Object.keys(examSpecificFeesData.fees).length, 'exams');
      } else {
        setExamFeesData({});
        console.log('📊 No fees data available');
      }
      console.log('📋 Loaded existing exams from general query:', examsData.length, examsData.map((e: any) => ({ id: e.id, name: e.name })));

      // Also try to load the specific exam ID: Cod5O47LZQ4of18vNZJx
      let specificExam: any = null;
      try {
        specificExam = await examQueries.getExamById('Cod5O47LZQ4of18vNZJx');
        console.log('🎯 Loaded specific exam:', specificExam);
      } catch (error) {
        console.log('❌ Could not load specific exam, trying alternative methods...');

        // Try to load from Firebase directly
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const examRef = doc(db, 'exams', 'Cod5O47LZQ4of18vNZJx');
          const examSnap = await getDoc(examRef);

          if (examSnap.exists()) {
            specificExam = { id: examSnap.id, ...examSnap.data() };
            console.log('✅ Loaded specific exam from Firebase directly:', specificExam);
          } else {
            console.log('❌ Specific exam not found in Firebase');
          }
        } catch (firebaseError) {
          console.error('❌ Firebase error loading specific exam:', firebaseError);
        }
      }

      // Combine exams, ensuring the specific exam is included and prioritized
      let allExams = [...examsData];

      // Add specific exam at the beginning if it exists and isn't already in the list
      if (specificExam) {
        const existingIndex = allExams.findIndex((exam: any) => exam.id === 'Cod5O47LZQ4of18vNZJx');
        if (existingIndex === -1) {
          allExams = [specificExam, ...allExams];
          console.log('✅ Added specific exam to the beginning of the list');
        } else {
          // Move existing exam to the beginning
          const existingExam = allExams[existingIndex];
          allExams.splice(existingIndex, 1);
          allExams = [existingExam, ...allExams];
          console.log('✅ Moved existing specific exam to the beginning');
        }
      }

      // Also try to load more exams from different sources
      try {
        const { collection, getDocs, query, where, doc, getDoc } = await import('firebase/firestore');

        // First, try to load the specific exam document
        try {
          const specificExamRef = doc(db, 'exams', 'Cod5O47LZQ4of18vNZJx');
          const specificExamSnap = await getDoc(specificExamRef);

          if (specificExamSnap.exists()) {
            const specificExamData: any = { id: specificExamSnap.id, ...specificExamSnap.data() };
            console.log('🎯 Found specific exam document:', specificExamData);

            // Add to exams list if not already present
            if (!allExams.find((exam: any) => exam.id === 'Cod5O47LZQ4of18vNZJx')) {
              allExams.push(specificExamData);
              console.log('✅ Added specific exam document to list');
            }
          } else {
            console.log('❌ Specific exam document not found');
          }
        } catch (specificError: any) {
          console.error('❌ Error loading specific exam document:', specificError instanceof Error ? specificError.message : String(specificError));
        }

        // Load all exams from /exams collection
        const examsRef = collection(db, 'exams');
        const examsSnap = await getDocs(examsRef);

        if (!examsSnap.empty) {
          const allExamDocs = examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('📚 Loaded ALL exams from /exams collection:', allExamDocs.length);

          // Show detailed information about each exam
          allExamDocs.forEach((exam: any) => {
            console.log(`📋 Exam ID: ${exam.id}`);
            console.log(`   Name: ${exam.name || 'N/A'}`);
            console.log(`   Type: ${exam.examType || 'N/A'}`);
            console.log(`   Class: ${exam.class || 'N/A'}`);
            console.log(`   School ID: ${exam.schoolId || 'N/A'}`);
            console.log(`   Status: ${exam.status || 'N/A'}`);
            console.log('   ---');
          });

          // Merge with existing exams, avoiding duplicates
          allExamDocs.forEach((examDoc: any) => {
            if (!allExams.find((exam: any) => exam.id === examDoc.id)) {
              allExams.push(examDoc);
              console.log(`✅ Added exam: ${examDoc.name || examDoc.id}`);
            }
          });

          console.log('✅ Final merged exams, total:', allExams.length);
        } else {
          console.log('❌ No exams found in /exams collection');
        }

        // Also try school-specific query as backup
        try {
          const schoolQuery = query(examsRef, where('schoolId', '==', schoolId));
          const schoolExamsSnap = await getDocs(schoolQuery);

          if (!schoolExamsSnap.empty) {
            const schoolExams = schoolExamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('🏫 Loaded school-specific exams:', schoolExams.length);

            schoolExams.forEach((schoolExam: any) => {
              if (!allExams.find((exam: any) => exam.id === schoolExam.id)) {
                allExams.push(schoolExam);
                console.log(`✅ Added school exam: ${schoolExam.name || schoolExam.id}`);
              }
            });
          }
        } catch (schoolError) {
          console.log('ℹ️ School-specific query failed:', schoolError instanceof Error ? schoolError.message : String(schoolError));
        }

      } catch (error) {
        console.log('ℹ️ Could not load additional exams from Firebase:', error instanceof Error ? error.message : String(error));
      }

      // Final cleanup and deduplication
      const uniqueExams = allExams.filter((exam, index, self) =>
        index === self.findIndex(e => e.id === exam.id)
      );

      console.log('🎉 Final exam list:', uniqueExams.length, 'unique exams');
      console.log('📝 Exam names:', uniqueExams.map((e: any) => ({ id: e.id, name: e.name, type: e.examType })));

      setExistingExams(uniqueExams);

      // Also load exam fees from management system for the dialog
      await loadExamFeesFromManagementForDialog();

    } catch (error) {
      console.error('Error loading exam fees data:', error);
      setExamFeesData({});
      setExistingExams([]);
    } finally {
      setLoadingExamFeesData(false);
    }
  };

  // Load exam fees from management for dialog display
  const loadExamFeesFromManagementForDialog = async () => {
    try {
      const schoolId = SCHOOL_ID;

      // Load exam fees directly from Firebase examFees collection
      const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');

      console.log(`🔍 Loading exam fees from /examFees/${schoolId}...`);

      // Try to load from the specific examFees document first
      const examFeesRef = doc(db, 'examFees', schoolId);
      const examFeesSnap = await getDoc(examFeesRef);

      let examFeesData = {};

      if (examFeesSnap.exists()) {
        examFeesData = examFeesSnap.data();
        console.log(`✅ Loaded exam fees from /examFees/${schoolId}:`, examFeesData);

        // Show detailed breakdown of loaded fees
        Object.entries(examFeesData).forEach(([examType, classFees]) => {
          console.log(`📊 ${examType} fees:`, classFees);
        });
      } else {
        console.log(`❌ No exam fees document found in /examFees/${schoolId}, trying alternative methods...`);

        // Try to load from examFees collection (if it's a collection, not a document)
        try {
          const examFeesCollectionRef = collection(db, 'examFees');
          const examFeesCollectionSnap = await getDocs(examFeesCollectionRef);

          if (!examFeesCollectionSnap.empty) {
            console.log('📚 Found examFees as collection with', examFeesCollectionSnap.docs.length, 'documents');

            // Look for AMAR-2026 document in the collection
            const iqraDoc = examFeesCollectionSnap.docs.find(doc => doc.id === schoolId);
            if (iqraDoc) {
              examFeesData = iqraDoc.data();
              console.log('✅ Loaded exam fees from examFees collection document:', examFeesData);
            } else {
              console.log(`❌ ${schoolId} document not found in examFees collection`);
            }
          } else {
            console.log('❌ examFees collection is empty');
          }
        } catch (collectionError) {
          console.error('❌ Error loading from examFees collection:', collectionError);
        }
      }

      // Store the raw exam fees data for dialog use
      setExamFeesData(examFeesData as {[key: string]: {[className: string]: number}});

      // Also try to load exam-specific fees structure
      console.log('🔍 Looking for exam-specific fee structure...');
      try {
        const examSpecificFeesRef = doc(db, 'examSpecificFees', schoolId);
        const examSpecificFeesSnap = await getDoc(examSpecificFeesRef);

        if (examSpecificFeesSnap.exists()) {
          const examSpecificData = examSpecificFeesSnap.data();
          console.log('✅ Found exam-specific fees:', examSpecificData);

          if (examSpecificData.fees) {
            // Merge exam-specific fees with general fees
            const mergedFees = { ...examFeesData } as {[key: string]: {[className: string]: number}};
            Object.entries(examSpecificData.fees).forEach(([examId, examFeeData]) => {
              if (examFeeData && typeof examFeeData === 'object') {
                mergedFees[examId] = examFeeData as {[className: string]: number};
              }
            });
            examFeesData = mergedFees;
            console.log('✅ Merged exam-specific fees:', examFeesData);
          }
        } else {
          console.log('ℹ️ No exam-specific fees found');
        }
      } catch (specificError) {
        console.log('ℹ️ Could not load exam-specific fees:', specificError instanceof Error ? specificError.message : String(specificError));
      }

      // Filter out empty entries (only keep fees > 0)
      const filteredFees = {
        monthly: {},
        quarterly: {},
        halfYearly: {},
        annual: {}
      };

      Object.entries(examFeesData).forEach(([examType, classFees]) => {
        if (classFees && typeof classFees === 'object') {
          const validFees = Object.fromEntries(
            Object.entries(classFees).filter(([_, fee]) => {
              const feeValue = typeof fee === 'string' ? parseFloat(fee) : fee;
              return feeValue && feeValue > 0;
            })
          );

          if (examType === 'monthly') filteredFees.monthly = validFees;
          else if (examType === 'quarterly') filteredFees.quarterly = validFees;
          else if (examType === 'halfYearly') filteredFees.halfYearly = validFees;
          else if (examType === 'annual') filteredFees.annual = validFees;
        }
      });

      setExamFeesFromManagement(filteredFees);
      console.log(`✅ Filtered exam fees for dialog from /examFees/${schoolId}:`, filteredFees);

      // Also update the main examFees state for consistency - convert new field names to old structure for compatibility
      const legacyExamFees = {
        monthly: {},
        quarterly: {},
        halfYearly: {},
        annual: {}
      };

      // Map new field names back to old structure for this page's compatibility
      Object.entries(examFeesData).forEach(([fieldName, classFees]) => {
        if (fieldName === 'First Term Examination Fee') {
          legacyExamFees.quarterly = classFees as { [className: string]: number };
        } else if (fieldName === 'Second Term Examination Fee') {
          legacyExamFees.quarterly = { ...legacyExamFees.quarterly, ...classFees as { [className: string]: number } };
        } else if (fieldName === 'Annual Examination Fee') {
          legacyExamFees.annual = classFees as { [className: string]: number };
        } else if (fieldName === 'Monthly Examination Fee') {
          legacyExamFees.monthly = classFees as { [className: string]: number };
        }
      });

      setExamFees(legacyExamFees);

      console.log(`🎉 Exam fees loaded successfully from /examFees/${schoolId}`);

    } catch (error) {
      console.error('❌ Error loading exam fees for dialog:', error);
      // Try alternative loading method - convert new field names to old structure for compatibility
      try {
        const schoolId = SCHOOL_ID;
        const examFeesData = await accountingQueries.getExamFees(schoolId);

        // Convert new field names back to old structure for this page's compatibility
        const legacyExamFees = {
          monthly: {},
          quarterly: {},
          halfYearly: {},
          annual: {}
        };

        // Map new field names back to old structure
        Object.entries(examFeesData).forEach(([fieldName, classFees]) => {
          if (fieldName === 'First Term Examination Fee') {
            legacyExamFees.quarterly = classFees as { [className: string]: number };
          } else if (fieldName === 'Second Term Examination Fee') {
            legacyExamFees.quarterly = { ...legacyExamFees.quarterly, ...classFees as { [className: string]: number } };
          } else if (fieldName === 'Annual Examination Fee') {
            legacyExamFees.annual = classFees as { [className: string]: number };
          } else if (fieldName === 'Monthly Examination Fee') {
            legacyExamFees.monthly = classFees as { [className: string]: number };
          }
        });

        setExamFees(legacyExamFees);
        console.log('📋 Loaded exam fees using alternative method:', legacyExamFees);
      } catch (fallbackError) {
        console.error('❌ Fallback method also failed:', fallbackError);
      }
    }
  };

  // Load classes from Firebase - Simplified version
  const loadClasses = async () => {
    setLoadingClasses(true);
    console.log('🔄 Loading classes...');

    try {
      // Try to load from localStorage first for immediate display
      const savedClasses = localStorage.getItem('iqra_classes');
      if (savedClasses) {
        const parsedClasses = JSON.parse(savedClasses);
        console.log('💾 Loaded from localStorage:', parsedClasses.length, 'classes');
        setClasses(parsedClasses);
      }

      // Load from Firebase with error handling
      try {
        const { classQueries } = await import('@/lib/queries/class-queries');

        // Try to get classes by school ID first
        const schoolClasses = await classQueries.getClassesBySchool(SCHOOL_ID);
        console.log('📋 Classes found by school ID:', schoolClasses.length);

        if (schoolClasses.length > 0) {
          setClasses(schoolClasses);
          localStorage.setItem('iqra_classes', JSON.stringify(schoolClasses));
          console.log('✅ Classes loaded from Firebase');
        } else {
          // Try to get all classes if no school-specific classes found
          const allClasses = await classQueries.getAllClasses();
          console.log('📋 All classes in database:', allClasses.length);

          if (allClasses.length > 0) {
            setClasses(allClasses);
            localStorage.setItem('iqra_classes', JSON.stringify(allClasses));
          } else {
            setClasses([]);
          }
        }
      } catch (firebaseError) {
        console.error('❌ Firebase error:', firebaseError);
        setClasses([]);
      }
    } catch (error) {
      console.error('💥 Critical error loading classes:', error);
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };


  // Filter and sort students based on search and filter criteria
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student => {
      // Student name search
      const nameMatch = studentNameSearch === '' ||
        student.name?.toLowerCase().includes(studentNameSearch.toLowerCase()) ||
        student.displayName?.toLowerCase().includes(studentNameSearch.toLowerCase());

      // Roll number search
      const rollMatch = rollNumberSearch === '' ||
        student.studentId?.toLowerCase().includes(rollNumberSearch.toLowerCase()) ||
        student.rollNumber?.toLowerCase().includes(rollNumberSearch.toLowerCase());

      // Class filter
      const classMatch = selectedClassFilter === 'সকল ক্লাস' ||
        (student as any).classId === selectedClassFilter ||
        (student as any).class === selectedClassFilter ||
        classes.find(c => c.classId === selectedClassFilter)?.className === (student as any).class;

      // Section filter
      const sectionMatch = selectedSectionFilter === 'সকল সেকশন' ||
        student.section === selectedSectionFilter;

      return nameMatch && rollMatch && classMatch && sectionMatch;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = (a.name || a.displayName || '').toLowerCase();
          bValue = (b.name || b.displayName || '').toLowerCase();
          break;
        case 'class':
          aValue = (a.class || (a as any).className || '').toLowerCase();
          bValue = (b.class || (b as any).className || '').toLowerCase();
          break;
        case 'roll':
          aValue = (a.rollNumber || a.studentId || '').toLowerCase();
          bValue = (b.rollNumber || b.studentId || '').toLowerCase();
          break;
        case 'section':
          aValue = (a.section || '').toLowerCase();
          bValue = (b.section || '').toLowerCase();
          break;
        default:
          aValue = (a.name || a.displayName || '').toLowerCase();
          bValue = (b.name || b.displayName || '').toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [students, studentNameSearch, rollNumberSearch, selectedClassFilter, selectedSectionFilter, sortBy, sortOrder, classes]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
      }
    }

    return pages;
  };

  // Handle student selection
  const handleStudentToggle = (student: User) => {
    setSelectedStudents(prev =>
      prev.find(s => s.uid === student.uid)
        ? prev.filter(s => s.uid !== student.uid)
        : [...prev, student]
    );
  };

  // Handle select all students
  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents);
    }
  };

  // Handle fee collection for selected students
  const handleFeeCollection = async () => {
    if (selectedStudents.length === 0) {
      showWarning('অনুগ্রহ করে কোনো শিক্ষার্থী নির্বাচন করুন।');
      return;
    }

    if (!selectedExamType) {
      showWarning('অনুগ্রহ করে পরীক্ষার ধরন নির্বাচন করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      // Fetch latest collector name once before processing
      const collectorName = await getLatestCollectorName();

      const transactionPromises = selectedStudents.map(student => {
        // Get the exam fee amount for this student's class
        const examFeeAmount = calculateExamFee(selectedExamType, student);

        const transactionData: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
          type: 'income' as const,
          category: 'exam_fee',
          amount: examFeeAmount,
          description: `${selectedExamType === 'monthly' ? 'মাসিক' :
                        selectedExamType === 'quarterly' ? 'ত্রৈমাসিক' :
                        selectedExamType === 'halfYearly' ? 'অর্ধবার্ষিক' : 'বার্ষিক'} পরীক্ষার ফি - ${student.name || student.displayName}`,
          date: new Date().toISOString().split('T')[0],
          status: 'completed' as const,
          schoolId: SCHOOL_ID,
          recordedBy: user?.email || 'admin',
          paymentMethod: 'cash' as const,
          studentId: student.uid,
          studentName: student.name || student.displayName,
          className: student.class || 'N/A',
          voucherNumber: `EX-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
          notes: `${selectedExamType === 'monthly' ? 'মাসিক' :
                  selectedExamType === 'quarterly' ? 'ত্রৈমাসিক' :
                  selectedExamType === 'halfYearly' ? 'অর্ধবার্ষিক' : 'বার্ষিক'} পরীক্ষার ফি সংগ্রহ`,
          paymentDate: new Date().toISOString().split('T')[0],
          collectionDate: new Date().toISOString(),
          collectedBy: collectorName,
          // Add month fields conditionally for monthly exams
          ...(selectedExamType === 'monthly' && {
            month: selectedMonth,
            monthIndex: parseInt(selectedMonth) - 1
          })
        };

        return accountingQueries.createTransaction(transactionData);
      });

      const transactionIds = await Promise.all(transactionPromises);

      // Send notifications to parents for each student
      try {
        const { sendFeePaymentNotification } = await import('@/lib/fee-notification-helper');
        for (let i = 0; i < selectedStudents.length; i++) {
          const student = selectedStudents[i];
          const transactionId = transactionIds[i];
          const examFeeAmount = calculateExamFee(selectedExamType, student);
          const monthText = selectedExamType === 'monthly' && selectedMonth 
            ? ` (${monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth})` 
            : '';
          
          await sendFeePaymentNotification({
            studentId: student.uid,
            studentName: student.name || student.displayName || 'Unknown',
            feeType: 'exam_fee',
            feeName: `${selectedExamType === 'monthly' ? 'মাসিক' : selectedExamType === 'quarterly' ? 'ত্রৈমাসিক' : selectedExamType === 'halfYearly' ? 'অর্ধবার্ষিক' : 'বার্ষিক'} পরীক্ষার ফি${monthText}`,
            amount: examFeeAmount,
            paymentDate: new Date().toISOString().split('T')[0],
            voucherNumber: `EX-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
            paymentMethod: 'cash',
            collectedBy: collectorName,
            transactionId: transactionId,
            className: student.class || 'N/A',
            month: selectedExamType === 'monthly' && selectedMonth ? monthOptions.find(m => m.value === selectedMonth)?.label : undefined
          });
        }
      } catch (notifError) {
        console.error('Error sending fee payment notifications (non-critical):', notifError);
      }

      // Create fee collection records for each student
      const feeCollectionPromises = selectedStudents.map((student, index) => {
        const examFeeAmount = calculateExamFee(selectedExamType, student);

        return feeQueries.createFeeCollection({
          feeId: `exam-${selectedExamType}-${student.class}`,
          feeName: `${selectedExamType === 'monthly' ? 'মাসিক' :
                    selectedExamType === 'quarterly' ? 'ত্রৈমাসিক' :
                    selectedExamType === 'halfYearly' ? 'অর্ধবার্ষিক' : 'বার্ষিক'} পরীক্ষার ফি`,
          studentId: student.uid,
          studentName: student.name || student.displayName || '',
          classId: student.class || 'unknown',
          className: student.class || 'N/A',
          amount: examFeeAmount,
          lateFee: 0,
          totalAmount: examFeeAmount,
          paymentDate: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          status: 'paid',
          paymentMethod: 'cash',
          transactionId: transactionIds[index],
          collectedBy: collectorName,
          schoolId: SCHOOL_ID
        });
      });

      await Promise.all(feeCollectionPromises);

      // Clear selections
      setSelectedStudents([]);
      // Reload fee collections to update status
      loadFeeCollections();

      showSuccess(`সফলভাবে ${selectedStudents.length} জন শিক্ষার্থীর পরীক্ষার ফি সংগ্রহ করা হয়েছে!`);
    } catch (error) {
      console.error('Error saving exam fees:', error);
      showError('ফি সংগ্রহ করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dialog handlers
  const closeDialog = () => {
    setShowFeeDialog(false);
    setSelectedStudentForFee(null);
    setDialogExamId('');
    setSelectedMonth('');
    setTotalFee('0');
    setPaidAmount('0');
    setCollectionDate(new Date().toISOString().split('T')[0]);
  };

  // Calculate exam fee for a specific exam and student
  const calculateFeeForExam = (exam: any, student: User) => {
    if (!exam || !student) {
      console.log('❌ No exam or student provided for fee calculation');
      return 0;
    }

    const studentClass = student.class || 'প্রথম';
    console.log('🔍 Calculating fee for exam:', exam.name, 'examType:', exam.examType, 'examId:', exam.id, 'student:', student.name, 'class:', studentClass);

    // Method 1: Try examFeesData (examSpecificFees) - PRIORITY
    if (exam.id && examFeesData[exam.id]) {
      console.log('📋 Found exam in examFeesData (examSpecificFees):', exam.id, examFeesData[exam.id]);

      if (examFeesData[exam.id][studentClass]) {
        const fee = examFeesData[exam.id][studentClass];
        console.log('✅ Found exam-specific fee:', exam.id, studentClass, fee);
        return typeof fee === 'string' ? parseFloat(fee) : fee;
      } else {
        console.log('⚠️ No fee found for class:', studentClass, 'in exam:', exam.id, 'available classes:', Object.keys(examFeesData[exam.id] || {}));
      }
    } else {
      console.log('⚠️ No exam found in examFeesData for exam ID:', exam.id, 'available exams:', Object.keys(examFeesData));
    }

    // Method 2: Try unified structure (fees stored in exam document)
    if (exam.fees && typeof exam.fees === 'object') {
      console.log('📋 Found fees in exam document (unified structure):', exam.fees);

      // Try exact class name match
      if (exam.fees[studentClass]) {
        const fee = exam.fees[studentClass];
        console.log('✅ Found fee in exam.fees (exact match):', studentClass, fee);
        return typeof fee === 'string' ? parseFloat(fee) : fee;
      }

      // Try class name variations
      const classVariations = [
        studentClass.trim(),
        studentClass.toLowerCase(),
        studentClass.toUpperCase()
      ];

      for (const variation of classVariations) {
        if (exam.fees[variation]) {
          const fee = exam.fees[variation];
          console.log('✅ Found fee in exam.fees (variation match):', variation, fee);
          return typeof fee === 'string' ? parseFloat(fee) : fee;
        }
      }

      console.log('⚠️ Available classes in exam.fees:', Object.keys(exam.fees));
    }

    // Method 3: Try with class key mapping
    const classKey = getClassKey(studentClass);
    if (exam.fees && exam.fees[classKey]) {
      const fee = exam.fees[classKey];
      console.log('✅ Found fee with class key:', classKey, fee);
      return typeof fee === 'string' ? parseFloat(fee) : fee;
    }

    // Method 3: Try exam type lookup in examFeesData (type-based fees)
    if (examFeesData[exam.examType] && examFeesData[exam.examType][studentClass]) {
      const fee = examFeesData[exam.examType][studentClass];
      console.log('✅ Found type-based fee:', exam.examType, studentClass, fee);
      return typeof fee === 'string' ? parseFloat(fee) : fee;
    }

    if (examFeesData[exam.examType] && examFeesData[exam.examType][classKey]) {
      const fee = examFeesData[exam.examType][classKey];
      console.log('✅ Found type-based fee with class key:', exam.examType, classKey, fee);
      return typeof fee === 'string' ? parseFloat(fee) : fee;
    }

    // Method 4: Map Bengali exam types to English for management system lookup
    const englishExamType = exam.examType === 'প্রথম সাময়িক' ? 'quarterly' :
                            exam.examType === 'দ্বিতীয় সাময়িক' ? 'quarterly' :
                            exam.examType === 'তৃতীয় সাময়িক' ? 'halfYearly' :
                            exam.examType === 'সাময়িক' ? 'quarterly' :
                            exam.examType === 'বার্ষিক' ? 'annual' :
                            exam.examType === 'মাসিক' ? 'monthly' :
                            exam.examType === 'ত্রৈমাসিক' ? 'quarterly' :
                            exam.examType === 'অর্ধবার্ষিক' ? 'halfYearly' : 'quarterly';

    console.log('🔄 Mapped exam type:', exam.examType, '→', englishExamType);

    // Method 5: Try English exam type in management system
    const examTypeFeesFromManagement = examFeesFromManagement[englishExamType];
    if (examTypeFeesFromManagement) {
      console.log('🔍 Looking in management system for:', englishExamType, examTypeFeesFromManagement);

      if (examTypeFeesFromManagement[studentClass]) {
        const fee = examTypeFeesFromManagement[studentClass];
        console.log('✅ Found fee from management system:', englishExamType, studentClass, fee);
        return typeof fee === 'string' ? parseFloat(fee) : fee;
      }

      if (examTypeFeesFromManagement[classKey]) {
        const fee = examTypeFeesFromManagement[classKey];
        console.log('✅ Found fee from management system with class key:', englishExamType, classKey, fee);
        return typeof fee === 'string' ? parseFloat(fee) : fee;
      }
    }

    // Method 6: Try to find exam-specific fees in examFeesData by searching all keys
    for (const [key, fees] of Object.entries(examFeesData)) {
      if (fees && typeof fees === 'object' && (fees as any)[studentClass]) {
        const fee = (fees as any)[studentClass];
        console.log('✅ Found fee by searching all keys:', key, studentClass, fee);
        return typeof fee === 'string' ? parseFloat(fee) : fee;
      }
      if (fees && typeof fees === 'object' && (fees as any)[classKey]) {
        const fee = (fees as any)[classKey];
        console.log('✅ Found fee by searching all keys with class key:', key, classKey, fee);
        return typeof fee === 'string' ? parseFloat(fee) : fee;
      }
    }

    // Method 7: Final fallback to class-wise fees
    if (feeStructure?.examFees?.[studentClass]) {
      const fee = feeStructure.examFees[studentClass];
      console.log('✅ Found fee from class-wise structure:', studentClass, fee);
      return typeof fee === 'string' ? parseFloat(fee) : fee;
    }

    // Method 8: Ultimate fallback - different default values for different exam types
    const examTypeDefaults: {[key: string]: {[className: string]: number}} = {
      'quarterly': {
        'প্লে': 200,
        'নার্সারি': 250,
        'প্রথম': 300,
        'দ্বিতীয়': 350,
        'তৃতীয়': 400,
        'চতুর্থ': 450,
        'পঞ্চম': 500,
        'ষষ্ঠ': 550,
        'সপ্তম': 600,
        'অষ্টম': 650,
        'নবম': 700,
        'দশম': 800
      },
      'halfYearly': {
        'প্লে': 400,
        'নার্সারি': 500,
        'প্রথম': 600,
        'দ্বিতীয়': 700,
        'তৃতীয়': 800,
        'চতুর্থ': 900,
        'পঞ্চম': 1000,
        'ষষ্ঠ': 1100,
        'সপ্তম': 1200,
        'অষ্টম': 1300,
        'নবম': 1400,
        'দশম': 1500
      },
      'annual': {
        'প্লে': 800,
        'নার্সারি': 1000,
        'প্রথম': 1200,
        'দ্বিতীয়': 1400,
        'তৃতীয়': 1600,
        'চতুর্থ': 1800,
        'পঞ্চম': 2000,
        'ষষ্ঠ': 2200,
        'সপ্তম': 2400,
        'অষ্টম': 2600,
        'নবম': 2800,
        'দশম': 3000
      }
    };

    const examTypeDefaultsForExam = examTypeDefaults[englishExamType] || examTypeDefaults['quarterly'];
    const fee = examTypeDefaultsForExam[studentClass] || 150;

    console.log('📝 Using exam-type-specific default fee:', englishExamType, studentClass, fee);
    return fee;
  };

  // Calculate exam fee based on exam type and student class (legacy function)
  const calculateExamFee = (examType: 'monthly' | 'quarterly' | 'halfYearly' | 'annual' | '', student: User) => {
    if (!examType || !student) return 0;

    const studentClass = student.class || 'প্রথম';

    // First try to get fee from exam fee management system
    const examTypeFeesFromManagement = examFeesFromManagement[examType];
    if (examTypeFeesFromManagement && Object.keys(examTypeFeesFromManagement).length > 0) {
      const fee = examTypeFeesFromManagement[studentClass] || 0;

      if (fee > 0) {
        console.log('✅ Found fee from exam management:', {
          examType,
          studentClass,
          fee,
          source: 'exam_fee_management'
        });
        return fee;
      }
    }

    // Fallback to old exam fees system
    const examTypeFees = examFees[examType];
    if (examTypeFees && Object.keys(examTypeFees).length > 0) {
      const fee = examTypeFees[studentClass] || 0;

      if (fee > 0) {
        console.log('📋 Using fee from old system:', {
          examType,
          studentClass,
          fee,
          source: 'old_exam_fees'
        });
        return fee;
      }
    }

    // Final fallback to class-wise fee structure
    const classWiseFee = feeStructure?.examFees?.[studentClass] || 0;

    console.log('🔍 calculateExamFee result:', {
      examType,
      studentClass,
      fee: classWiseFee,
      source: 'class_wise_fallback',
      managementFees: examTypeFeesFromManagement,
      oldFees: examTypeFees
    });

    return classWiseFee;
  };

  // Check if student has paid exam fees
  const hasStudentPaidFees = (studentId: string) => {
    return feeCollections.some(collection =>
      collection.studentId === studentId &&
      collection.status === 'paid' &&
      collection.feeName.includes('পরীক্ষার ফি')
    );
  };

  // Get collection info for a student
  const getStudentCollectionInfo = (studentId: string) => {
    const studentCollections = feeCollections.filter(collection =>
      collection.studentId === studentId &&
      collection.status === 'paid' &&
      collection.feeName.includes('পরীক্ষার ফি')
    );
    
    if (studentCollections.length === 0) return null;
    
    // Get the most recent collection
    const latestCollection = studentCollections.sort((a, b) => {
      const dateA = new Date(a.paymentDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.paymentDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    })[0];
    
    return {
      collectedBy: latestCollection.collectedBy || latestCollection.recordedBy || '',
      collectionDate: latestCollection.paymentDate || latestCollection.createdAt || '',
      collectionCount: studentCollections.length
    };
  };

  const handleDialogFormSubmit = async () => {
    if (!selectedStudentForFee || !dialogExamId || !paidAmount) {
      showWarning('অনুগ্রহ করে সকল তথ্য পূরণ করুন।');
      return;
    }

    const selectedExam = existingExams.find(ex => ex.id === dialogExamId);
    if (!selectedExam) {
      showWarning('অনুগ্রহ করে একটি পরীক্ষা নির্বাচন করুন।');
      return;
    }

    // Check if month is selected for monthly exams
    if (selectedExam.examType === 'মাসিক' && !selectedMonth) {
      showWarning('অনুগ্রহ করে মাস নির্বাচন করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the actual paid amount entered by user
      const actualPaidAmount = parseFloat(paidAmount) || 0;
      const examFeeAmount = examFeesData[dialogExamId]?.[selectedStudentForFee.class] || 0;

      console.log('💰 Saving transaction - Expected:', examFeeAmount, 'Paid:', actualPaidAmount);

      // Get month name for monthly exams
      const getMonthName = (monthValue: string) => {
        const month = monthOptions.find(m => m.value === monthValue);
        return month ? month.label : '';
      };

      // Fetch latest collector name
      const collectorName = await getLatestCollectorName();

      // Create transaction record
      const transactionData: any = {
        type: 'income' as const,
        category: 'exam_fee',
        amount: actualPaidAmount, // ← Use actual paid amount
        description: `${selectedExam.name}${selectedExam.examType === 'মাসিক' && selectedMonth ? ` (${getMonthName(selectedMonth)})` : ''} পরীক্ষার ফি - ${selectedStudentForFee.name || selectedStudentForFee.displayName}`,
        date: collectionDate,
        status: 'completed' as const,
        schoolId: SCHOOL_ID,
        recordedBy: user?.email || 'admin',
        paymentMethod: 'cash' as const,
        studentId: selectedStudentForFee.uid,
        studentName: selectedStudentForFee.name || selectedStudentForFee.displayName || 'Unknown',
        className: selectedStudentForFee.class || 'N/A',
        voucherNumber: `EX-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        notes: `${selectedExam.name}${selectedExam.examType === 'মাসিক' && selectedMonth ? ` (${getMonthName(selectedMonth)})` : ''} পরীক্ষার ফি সংগ্রহ`,
        paymentDate: collectionDate,
        collectionDate: new Date().toISOString(),
        collectedBy: collectorName
      };

      // Only add month fields for monthly exams
      if (selectedExam.examType === 'মাসিক') {
        transactionData.month = selectedMonth;
        transactionData.monthIndex = parseInt(selectedMonth) - 1;
      }

      const transactionId = await accountingQueries.createTransaction(transactionData as any);

      // Create fee collection record
      await feeQueries.createFeeCollection({
        feeId: `exam-${selectedExam.id}-${selectedStudentForFee.class}${selectedExam.examType === 'মাসিক' && selectedMonth ? `-${selectedMonth}` : ''}`, // Include month for monthly exams
        feeName: `${selectedExam.name}${selectedExam.examType === 'মাসিক' && selectedMonth ? ` (${getMonthName(selectedMonth)})` : ''} পরীক্ষার ফি`,
        studentId: selectedStudentForFee.uid,
        studentName: selectedStudentForFee.name || selectedStudentForFee.displayName,
        classId: selectedStudentForFee.classId || selectedStudentForFee.class || 'unknown',
        className: selectedStudentForFee.class || 'N/A',
        amount: actualPaidAmount, // ← Use actual paid amount
        lateFee: 0,
        totalAmount: actualPaidAmount, // ← Use actual paid amount
        paymentDate: collectionDate,
        dueDate: collectionDate, // Same as payment date for collected fees
        status: 'paid',
        paymentMethod: 'cash',
        transactionId: transactionId,
        collectedBy: collectorName,
        schoolId: SCHOOL_ID
      });

      // Send notification to parent
      try {
        const { sendFeePaymentNotification } = await import('@/lib/fee-notification-helper');
        await sendFeePaymentNotification({
          studentId: selectedStudentForFee.uid,
          studentName: selectedStudentForFee.name || selectedStudentForFee.displayName || 'Unknown',
          feeType: 'exam_fee',
          feeName: `${selectedExam.name}${selectedExam.examType === 'মাসিক' && selectedMonth ? ` (${getMonthName(selectedMonth)})` : ''} পরীক্ষার ফি`,
          amount: actualPaidAmount,
          paymentDate: collectionDate,
          voucherNumber: transactionData.voucherNumber,
          paymentMethod: 'cash',
          collectedBy: collectorName,
          transactionId: transactionId,
          className: selectedStudentForFee.class || 'N/A',
          month: selectedExam.examType === 'মাসিক' && selectedMonth ? getMonthName(selectedMonth) : undefined
        });
      } catch (notifError) {
        console.error('Error sending fee payment notification (non-critical):', notifError);
      }

      closeDialog();
      // Reload fee collections to update status
      loadFeeCollections();
      showSuccess('সফলভাবে পরীক্ষার ফি সংগ্রহ করা হয়েছে!');

      // Note: SMS notifications are handled by sendFeePaymentNotification function above
      // which checks settings before sending SMS
    } catch (error) {
      console.error('Error saving exam fee:', error);
      showError('ফি সংগ্রহ করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
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
    { icon: BellIcon, label: 'নোটিশ', href: '/admin/notice', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCardIcon, label: 'হিসাব', href: '/admin/accounting', active: true },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: PackageIcon, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">পরীক্ষার ফি আদায়</h1>
                  <p className="text-sm text-gray-600 leading-tight">শিক্ষার্থীদের পরীক্ষার ফি সংগ্রহ করুন</p>
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
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={() => router.push('/admin/accounting/fee-collection-center')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ফি আদায় কেন্দ্রে ফিরে যান</span>
              </button>
            </div>

            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">সকল শিক্ষার্থী</h2>
                  <p className="text-gray-600">আপনার সকল শ্রেণির ছাত্র-ছাত্রীদের তালিকা দেখুন এবং পরীক্ষার ফি সংগ্রহ করুন।</p>
                </div>

                <div className="flex items-center space-x-3 flex-wrap">
                  <button
                    onClick={async () => {
                      if (filteredStudents.length === 0) {
                        showWarning('কোনো শিক্ষার্থী নেই', 'এক্সপোর্ট করার জন্য কমপক্ষে একজন শিক্ষার্থী প্রয়োজন');
                        return;
                      }
                      setIsExporting(true);
                      try {
                        // Add payment status, fee amount, and exam type to students before exporting
                        const studentsWithStatus = filteredStudents.map(student => {
                          const studentClass = student.class || 'প্রথম';
                          // Get fee from feeStructure (class-wise fees)
                          const feeAmount = feeStructure?.examFees?.[studentClass] || 200;
                          // Add default exam type
                          const examType = (student as any).examType || 'পরীক্ষার ফি';
                          
                          return {
                            ...student,
                            hasPaid: hasStudentPaidFees(student.uid),
                            status: hasStudentPaidFees(student.uid) ? 'সংগৃহীত' : 'অপেক্ষমান',
                            feeAmount: feeAmount,
                            examType: examType
                          };
                        });
                        await exportExamFeeCollectionToPDF(studentsWithStatus, 'exam_fee_collection.pdf', schoolLogo, schoolSettings);
                      } catch (error) {
                        showError('PDF এক্সপোর্ট করতে সমস্যা হয়েছে');
                        console.error('Error exporting PDF:', error);
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    disabled={isExporting || filteredStudents.length === 0}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>PDF ডাউনলোড</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (filteredStudents.length === 0) {
                        showWarning('কোনো শিক্ষার্থী নেই', 'এক্সপোর্ট করার জন্য কমপক্ষে একজন শিক্ষার্থী প্রয়োজন');
                        return;
                      }
                      setIsExporting(true);
                      try {
                        // Add payment status, fee amount, and exam type to students before exporting
                        const studentsWithStatus = filteredStudents.map(student => {
                          const studentClass = student.class || 'প্রথম';
                          // Get fee from feeStructure (class-wise fees)
                          const feeAmount = feeStructure?.examFees?.[studentClass] || 200;
                          // Add default exam type
                          const examType = (student as any).examType || 'পরীক্ষার ফি';
                          
                          return {
                            ...student,
                            hasPaid: hasStudentPaidFees(student.uid),
                            status: hasStudentPaidFees(student.uid) ? 'সংগৃহীত' : 'অপেক্ষমান',
                            feeAmount: feeAmount,
                            examType: examType
                          };
                        });
                        await exportExamFeeCollectionToDOCX(studentsWithStatus, 'exam_fee_collection.docx');
                      } catch (error) {
                        showError('DOCX এক্সপোর্ট করতে সমস্যা হয়েছে');
                        console.error('Error exporting DOCX:', error);
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    disabled={isExporting || filteredStudents.length === 0}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>DOCX ডাউনলোড</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExamSelectionDialog(true);
                      loadExamFeesData();
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>পরীক্ষা নির্বাচন করুন</span>
                  </button>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                    <UserPlus className="w-4 h-4" />
                    <span>শিক্ষার্থী যোগ করুন</span>
                  </button>
                </div>
              </div>
            </div>


            {/* Search and Filter Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Student Name Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="ছাত্রের নাম দিয়ে খুঁজুন"
                    value={studentNameSearch}
                    onChange={(e) => setStudentNameSearch(e.target.value)}
                    className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>

                {/* Roll Number Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="রোল দিয়ে খুঁজুন"
                    value={rollNumberSearch}
                    onChange={(e) => setRollNumberSearch(e.target.value)}
                    className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>

                {/* Class Filter */}
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingClasses}
                >
                  <option value="সকল ক্লাস">সকল ক্লাস</option>
                  {loadingClasses ? (
                    <option value="" disabled>ক্লাস লোড হচ্ছে...</option>
                  ) : (
                    classes.map((classItem) => (
                      <option key={classItem.classId} value={classItem.classId}>
                        {classItem.className} {classItem.section ? `(${classItem.section})` : ''}
                      </option>
                    ))
                  )}
                </select>

                {/* Section Filter */}
                <select
                  value={selectedSectionFilter}
                  onChange={(e) => setSelectedSectionFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              {/* Sorting Controls */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">সাজান:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="name">নাম</option>
                  <option value="class">শ্রেণি</option>
                  <option value="roll">রোল নম্বর</option>
                  <option value="section">শাখা</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                  title={sortOrder === 'asc' ? 'আরোহী' : 'অবরোহী'}
                >
                  {sortOrder === 'asc' ? '↑ আরোহী' : '↓ অবরোহী'}
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      সকল নির্বাচন করুন ({filteredStudents.length} জন শিক্ষার্থী)
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600">পরীক্ষার ফি সংগ্রহ</span>
                  </div>
                </div>

                {selectedStudents.length > 0 && (
                  <div className="flex items-center space-x-3 mt-4">
                    <span className="text-sm text-gray-600">
                      {selectedStudents.length} জন নির্বাচিত
                    </span>
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedExamType}
                        onChange={(e) => setSelectedExamType(e.target.value as 'monthly' | 'quarterly' | 'halfYearly' | 'annual' | '')}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">পরীক্ষার ধরন নির্বাচন করুন</option>
                        <option value="monthly">মাসিক পরীক্ষা</option>
                        <option value="quarterly">ত্রৈমাসিক পরীক্ষা</option>
                        <option value="halfYearly">অর্ধবার্ষিক পরীক্ষা</option>
                        <option value="annual">বার্ষিক পরীক্ষা</option>
                      </select>
                      <button
                        onClick={handleFeeCollection}
                        disabled={isSubmitting || !selectedExamType}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>সংগ্রহ করছে...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>ফি সংগ্রহ করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Table Content */}
              <div className="divide-y divide-gray-200">
                {paginatedStudents.map((student) => (
                  <div key={student.uid} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedStudents.some(s => s.uid === student.uid)}
                        onChange={() => handleStudentToggle(student)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />

                      {/* Profile Image */}
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center overflow-hidden">
                        {student.profileImage ? (
                          <img
                            src={student.profileImage}
                            alt={student.displayName || student.name || 'Student'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {student.displayName?.split(' ')[0]?.charAt(0) || student.name?.split(' ')[0]?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>

                      {/* Student Info */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                        {/* Admission No */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {student.studentId || 'ADMS-2025-8751'}
                          </p>
                          <p className="text-xs text-gray-500">রোল</p>
                        </div>

                        {/* Student Name */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {student.displayName || student.name || 'Unknown Student'}
                          </p>
                          <p className="text-xs text-gray-500">শিক্ষার্থীর নাম</p>
                        </div>

                        {/* Class */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {student.class || 'প্রথম'}
                          </p>
                          <p className="text-xs text-gray-500">ক্লাস</p>
                        </div>

                        {/* Fee Collection Status */}
                        <div>
                          <div className="flex flex-col items-center space-y-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              hasStudentPaidFees(student.uid) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {hasStudentPaidFees(student.uid) ? 'সংগৃহীত' : 'অপেক্ষমান'}
                            </span>
                            {(() => {
                              const collectionInfo = getStudentCollectionInfo(student.uid);
                              return collectionInfo ? (
                                <div className="text-xs text-gray-600 text-center">
                                  <div className="font-medium">{collectionInfo.collectedBy}</div>
                                  {collectionInfo.collectionDate && (
                                    <div className="text-gray-500">
                                      {new Date(collectionInfo.collectionDate).toLocaleDateString('bn-BD', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </div>
                                  )}
                                  {collectionInfo.collectionCount && collectionInfo.collectionCount > 1 && (
                                    <div className="text-blue-600">
                                      ({collectionInfo.collectionCount} বার)
                                    </div>
                                  )}
                                </div>
                              ) : null;
                            })()}
                          </div>
                          <p className="text-xs text-gray-500">ফি স্ট্যাটাস</p>
                        </div>

                        {/* Guardian Name */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {student.guardianName || 'মোহাম্মদ আলী'}
                          </p>
                          <p className="text-xs text-gray-500">অভিভাবকের নাম</p>
                        </div>

                        {/* Current Location */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {student.address || 'চান্দাইকোনা'}
                          </p>
                          <p className="text-xs text-gray-500">বর্তমান ঠিকানা</p>
                        </div>

                        {/* Fee Collection Button */}
                        <div className="flex items-center">
                          <button
                            onClick={() => {
                              console.log('👤 Opening dialog for student:', student);
                              setSelectedStudentForFee(student);

                              // Auto-load first available exam if exists
                              if (existingExams.length > 0) {
                                const firstExam = existingExams[0];
                                setDialogExamId(firstExam.id!);

                                // Auto-calculate fee for this exam and student using the proper function
                                const examFeeAmount = calculateFeeForExam(firstExam, student);
                                setTotalFee(examFeeAmount.toString());
                                setPaidAmount(examFeeAmount.toString());

                                console.log('✅ Auto-loaded exam:', firstExam.name, 'Student:', student.name, 'Class:', student.class, 'Fee:', examFeeAmount);
                              } else {
                                setDialogExamId('');
                                setTotalFee('0');
                                setPaidAmount('0');
                              }

                              setShowFeeDialog(true);
                            }}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center space-x-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>ফি সংগ্রহ করুন</span>
                          </button>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">কোন শিক্ষার্থী পাওয়া যায়নি</h3>
                  <p className="mt-1 text-sm text-gray-500">অনুসন্ধান ফিল্টার পরিবর্তন করুন</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center text-sm text-gray-700">
                  <span className="mr-2">দেখানো হচ্ছে</span>
                  <span className="font-medium">{startIndex + 1}</span>
                  <span className="mx-1">থেকে</span>
                  <span className="font-medium">{Math.min(endIndex, filteredStudents.length)}</span>
                  <span className="mx-1">পর্যন্ত</span>
                  <span className="font-medium">{filteredStudents.length}</span>
                  <span className="ml-1">জন শিক্ষার্থী</span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    আগের
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:hover:bg-gray-100"
                  >
                    পরের
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fee Collection Dialog - Clean & Simple */}
      {showFeeDialog && selectedStudentForFee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">ফি সংগ্রহ করুন</h2>
                <p className="text-sm text-gray-600">
                  {selectedStudentForFee.displayName || selectedStudentForFee.name || 'Unknown Student'}
                </p>
              </div>
              <button
                onClick={closeDialog}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-4 space-y-4">
              {/* Student Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">রোল:</span> {(selectedStudentForFee.rollNumber || selectedStudentForFee.studentId || 'N/A').replace(/^STD0*/i, '')}</p>
                  <p><span className="font-medium">ক্লাস:</span> {selectedStudentForFee.class || 'প্রথম'}</p>
                </div>
              </div>

              {/* Exam Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  পরীক্ষা নির্বাচন করুন
                </label>
                <select
                  value={dialogExamId}
                  onChange={(e) => {
                    const examId = e.target.value;
                    setDialogExamId(examId);
                    const exam = existingExams.find(ex => ex.id === examId);

                    if (exam && selectedStudentForFee) {
                      console.log('🔍 Calculating fee for exam:', exam.name, 'student:', selectedStudentForFee.name, 'class:', selectedStudentForFee.class);

                      // Calculate fee for this exam and student using the proper function
                      const fee = calculateFeeForExam(exam, selectedStudentForFee);

                      console.log('💰 Calculated fee:', fee, 'for exam:', exam.name);
                      setTotalFee(fee.toString());
                      setPaidAmount(fee.toString());
                    } else {
                      console.log('❌ No exam or student selected for fee calculation');
                      setTotalFee('0');
                      setPaidAmount('0');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">পরীক্ষা নির্বাচন করুন</option>
                  {existingExams.length === 0 ? (
                    <option value="" disabled>কোনো পরীক্ষা পাওয়া যায়নি</option>
                  ) : (
                    existingExams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} ({exam.examType})
                      </option>
                    ))
                  )}
                </select>
                {existingExams.length === 0 && (
                  <p className="mt-2 text-sm text-red-600">
                    ⚠️ কোনো পরীক্ষা পাওয়া যায়নি। অনুগ্রহ করে প্রথমে <a href="/admin/exams/exam-fee-management" className="underline font-medium">পরীক্ষার ফি ম্যানেজমেন্ট</a> পেজে গিয়ে পরীক্ষার ফি সেট করুন।
                  </p>
                )}
              </div>

              {/* Fee Display */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">মোট ফি:</span>
                  <span className="text-lg font-bold text-blue-600">৳{totalFee}</span>
                </div>
              </div>

              {/* Paid Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  প্রদত্ত পরিমাণ
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ফি পরিমাণ লিখুন"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  তারিখ
                </label>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={closeDialog}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                বাতিল
              </button>
              <button
                onClick={handleDialogFormSubmit}
                disabled={!dialogExamId || !paidAmount || paidAmount === '0'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                সংগ্রহ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Selection Dialog */}
      {showExamSelectionDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  পরীক্ষা নির্বাচন করুন
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  ফি ম্যানেজমেন্ট থেকে পরীক্ষা এবং তাদের ফি দেখুন
                </p>
              </div>
              <button
                onClick={() => setShowExamSelectionDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-6">
              {loadingExamFeesData ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                  <p className="text-gray-600">পরীক্ষার তথ্য লোড হচ্ছে...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Exam Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      পরীক্ষার ধরন নির্বাচন করুন
                    </label>
                    <select
                      value={selectedExamTypeForDialog}
                      onChange={(e) => setSelectedExamTypeForDialog(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">পরীক্ষার ধরন নির্বাচন করুন</option>
                      <option value="প্রথম সাময়িক">প্রথম সাময়িক পরীক্ষা</option>
                      <option value="দ্বিতীয় সাময়িক">দ্বিতীয় সাময়িক পরীক্ষা</option>
                      <option value="তৃতীয় সাময়িক">তৃতীয় সাময়িক পরীক্ষা</option>
                      <option value="সাময়িক">সাময়িক পরীক্ষা</option>
                      <option value="বার্ষিক">বার্ষিক পরীক্ষা</option>
                      <option value="মাসিক">মাসিক পরীক্ষা</option>
                      <option value="নির্বাচনী">নির্বাচনী পরীক্ষা</option>
                      <option value="পরীক্ষামূলক">পরীক্ষামূলক পরীক্ষা</option>
                      <option value="অন্যান্য">অন্যান্য পরীক্ষা</option>
                    </select>
                  </div>

                  {/* Show exams of selected type */}
                  {selectedExamTypeForDialog && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedExamTypeForDialog === 'প্রথম সাময়িক' && 'প্রথম সাময়িক পরীক্ষা'}
                          {selectedExamTypeForDialog === 'দ্বিতীয় সাময়িক' && 'দ্বিতীয় সাময়িক পরীক্ষা'}
                          {selectedExamTypeForDialog === 'তৃতীয় সাময়িক' && 'তৃতীয় সাময়িক পরীক্ষা'}
                          {selectedExamTypeForDialog === 'সাময়িক' && 'সাময়িক পরীক্ষা'}
                          {selectedExamTypeForDialog === 'বার্ষিক' && 'বার্ষিক পরীক্ষা'}
                          {selectedExamTypeForDialog === 'মাসিক' && 'মাসিক পরীক্ষা'}
                          {selectedExamTypeForDialog === 'নির্বাচনী' && 'নির্বাচনী পরীক্ষা'}
                          {selectedExamTypeForDialog === 'পরীক্ষামূলক' && 'পরীক্ষামূলক পরীক্ষা'}
                          {selectedExamTypeForDialog === 'অন্যান্য' && 'অন্যান্য পরীক্ষা'}
                        </h3>

                        {/* Show fee management summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <Calculator className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-800 font-medium">
                              ফি ম্যানেজমেন্ট থেকে লোড করা হয়েছে
                            </span>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        let examsOfType = [];

                        if (selectedExamTypeForDialog === 'অন্যান্য') {
                          // For "অন্যান্য", show exams that don't match other types
                          examsOfType = existingExams.filter(exam =>
                            !exam.examType ||
                            ![
                              'প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'তৃতীয় সাময়িক', 'সাময়িক',
                              'বার্ষিক', 'মাসিক', 'নির্বাচনী', 'পরীক্ষামূলক'
                            ].includes(exam.examType)
                          );
                        } else {
                          // For specific types, filter by exact match
                          examsOfType = existingExams.filter(exam => exam.examType === selectedExamTypeForDialog);
                        }

                        if (examsOfType.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500">
                              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-lg font-medium">এই ধরনের কোনো পরীক্ষা পাওয়া যায়নি</p>
                              <p className="text-sm">প্রথমে পরীক্ষা ম্যানেজমেন্টে এই ধরনের পরীক্ষা যোগ করুন</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {examsOfType.map((exam) => {
                              const examFees = exam.id ? (examFeesData[exam.id] as {[className: string]: number}) || {} : {};
                              const hasFeesForThisExam = Object.values(examFees).some(fee => fee > 0);

                              return (
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
                                      {hasFeesForThisExam && (
                                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                          <h6 className="text-sm font-medium text-gray-700 mb-2">নির্ধারিত ফি:</h6>
                                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {Object.entries(examFees)
                                              .filter(([_, fee]) => fee > 0)
                                              .map(([className, fee]) => (
                                                <div key={className} className="flex justify-between items-center bg-white px-2 py-1 rounded border">
                                                  <span className="text-gray-700 text-sm">{className}:</span>
                                                  <span className="font-semibold text-blue-600 text-sm">৳{fee}</span>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center space-x-2 ml-4">
                                      <button
                                        onClick={() => {
                                          setShowExamSelectionDialog(false);
                                          showSuccess(`ফি সংগ্রহ শুরু করুন: ${exam.name}`);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                        disabled={!hasFeesForThisExam}
                                      >
                                        {hasFeesForThisExam ? 'ফি সংগ্রহ করুন' : 'ফি নির্ধারণ করা হয়নি'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Show message if no exam type selected */}
                  {!selectedExamTypeForDialog && (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">পরীক্ষার ধরন নির্বাচন করুন</p>
                      <p className="text-sm">উপরের ড্রপডাউন থেকে পরীক্ষার ধরন বেছে নিন</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowExamSelectionDialog(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={isOpen}
        onClose={closeAlert}
        {...alertOptions}
      />
    </div>
  );
}

export default function CollectExamFeePageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <CollectExamFeePage />
    </ProtectedRoute>
  );
}
