 'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { studentQueries, accountingQueries, feeQueries, settingsQueries } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { exportTuitionFeeCollectionToPDF, exportTuitionFeeCollectionToDOCX } from '@/lib/export-utils';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
  UserCheck,
  GraduationCap,
  Building,
  CreditCard,
  TrendingUp,
  Search,
  Bell,
  Plus,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  Wallet,
  Package,
  Loader2,
  Save,
  Calculator,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap as StudentIcon,
  CheckCircle,
  Clock,
  Filter,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Globe,
  MessageSquare,
  FileText,
  Award,
  AlertCircle,
  Sparkles,
  Gift,
  BookOpen as BookOpenIcon,
  Users as UsersIcon2
} from 'lucide-react';

// Helper function to convert numbers to Bengali numerals
const toBengaliNumerals = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '০';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formatted = num.toLocaleString('en-US');
  return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

function CollectSalaryPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [realTimeSummary, setRealTimeSummary] = useState<Record<string, {
    totalPaid: number;
    totalDue: number;
    paidStudents: number;
    totalStudents: number;
    totalDonation: number;
  }>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    month: '',
    voucherNumber: '',
    monthlyFee: '0',
    paidAmount: '0',
    donation: '0',
    paymentMethod: 'নগদ',
    date: new Date().toISOString().split('T')[0],
    collectedBy: '',
    numberOfMonths: 1 // Default to 1 month
  });

  // Donation tracking state
  const [donationSummary, setDonationSummary] = useState<Record<string, {
    totalDonation: number;
    donationFromStudents: number;
  }>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  const router = useRouter();
  const { userData } = useAuth();

  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadSchoolSettings();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load school settings and logo
  const loadSchoolSettings = async () => {
    try {
      // Load from system settings first (main source)
      const settingsData = await settingsQueries.getSettings();
      
      if (settingsData) {
        setSchoolSettings(settingsData);
        // Try different logo fields
        if ((settingsData as any).schoolLogo) {
          setSchoolLogo((settingsData as any).schoolLogo);
        } else if ((settingsData as any).websiteLogo) {
          setSchoolLogo((settingsData as any).websiteLogo);
        }
      } else {
        // Fallback to schools collection
        const schoolId = SCHOOL_ID;
        const settingsRef = doc(db, 'schools', schoolId);
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setSchoolSettings(data);
          if (data.logo) {
            setSchoolLogo(data.logo);
          }
        }
      }
    } catch (error) {
      console.error('Error loading school settings:', error);
    }
  };

  // Fetch students from Firebase
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        console.log('🔄 Starting student data fetch...');
        const studentsData = await studentQueries.getAllStudents();
        console.log('✅ Students fetched:', studentsData.length);
        setStudents(studentsData);

        // Fetch existing transactions to get payment status
        const schoolId = SCHOOL_ID;
        const existingTransactions = await accountingQueries.getAllTransactions(schoolId);
        console.log('✅ Transactions fetched:', existingTransactions.length);

        // Initialize payment data for each student
        const initialPaymentData = await Promise.all(studentsData.map(async (student) => {
          console.log('🔍 Processing student:', student.name || student.displayName, 'ID:', student.uid);

          // Find transactions for this student - include both tuition_fee and salary categories
          const studentTransactions = existingTransactions.filter(t =>
            t.studentId === student.uid &&
            (t.category === 'tuition_fee' || t.category === 'salary') &&
            t.status === 'completed'
          );

          console.log('💰 Student transactions found:', studentTransactions.length, studentTransactions.map(t => ({
            month: t.month,
            paidAmount: t.paidAmount,
            donation: t.donation,
            category: t.category
          })));

          // Initialize payment status and amounts for each month
          const payments = months.map(() => false);
          const paymentAmounts = months.map(() => ({ paid: 0, donation: 0 }));
          const collectionInfo = months.map(() => ({ collectedBy: '', collectionDate: '' }));

          // Update with actual payment data
          studentTransactions.forEach(transaction => {
            if (transaction.month) {
              const monthIndex = months.indexOf(transaction.month);
              if (monthIndex !== -1) {
                payments[monthIndex] = true;
                paymentAmounts[monthIndex] = {
                  paid: transaction.paidAmount || transaction.amount || 0,
                  donation: transaction.donation || 0
                };
                collectionInfo[monthIndex] = {
                  collectedBy: transaction.collectedBy || transaction.recordedBy || '',
                  collectionDate: transaction.collectionDate || transaction.date || ''
                };
                console.log(`✅ Updated ${transaction.month} - Paid: ${transaction.paidAmount}, Donation: ${transaction.donation}`);
              }
            }
          });

          // Get the actual monthly fee for this student's class from database
          let monthlyFee = 500; // Default fallback

          // Try to get the actual fee from fee management system
          try {
            console.log(`🔍 Looking up fee for student: ${student.name || student.displayName}, class: ${student.class}`);

            // Get all active fees first to see what's available
            const allFees = await feeQueries.getActiveFees(schoolId);
            console.log('📋 All active fees in system:', allFees.map(f => ({
              name: f.feeName,
              amount: f.amount,
              classes: f.applicableClasses
            })));

            const feeStructure = await accountingQueries.getClassFeeStructure(student.class || 'N/A', schoolId);

            if (feeStructure && feeStructure.tuitionFee > 0) {
              monthlyFee = feeStructure.tuitionFee;
              console.log(`✅ SUCCESS: Using database fee for ${student.class}: ${monthlyFee}`);
            } else {
              console.log(`⚠️ No valid fee found for ${student.class}, using default: ${monthlyFee}`);
            }
          } catch (error) {
            console.error(`❌ Error getting fee for ${student.class}:`, error);
          }

          // Calculate totals from actual amounts
          const totalPaid = paymentAmounts.reduce((sum, payment) => sum + (payment.paid || 0), 0);
          const totalDonation = paymentAmounts.reduce((sum, payment) => sum + (payment.donation || 0), 0);

          // Apply same logic as class-wise summary: donations offset pending amounts
          const expectedAnnualAmount = 12 * monthlyFee;
          const totalDue = Math.max(0, expectedAnnualAmount - totalPaid - totalDonation);

          console.log('📊 Final student data:', {
            name: student.name || student.displayName,
            totalPaid,
            totalDonation,
            totalDue,
            monthlyFee,
            payments: payments.map((paid, idx) => ({ month: months[idx], paid, amount: paymentAmounts[idx] }))
          });

          return {
            studentId: student.uid,
            studentName: student.name || student.displayName,
            className: student.class || 'N/A',
            rollNumber: student.rollNumber || student.studentId || 'N/A',
            monthlyFee,
            payments,
            paymentAmounts,
            collectionInfo,
            totalPaid,
            totalDonation,
            totalDue
          };
        }));

        console.log('🎯 Final payment data initialized for', initialPaymentData.length, 'students');
        setPaymentData(initialPaymentData);

      } catch (error) {
        console.error('❌ Error fetching students:', error);
      }
    };

    if (user) {
      fetchStudents();
    }
  }, [user]);

  // Real-time filtering
  useEffect(() => {
    let filtered = paymentData;

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(student => student.className === selectedClass);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.className.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [paymentData, selectedClass, searchTerm]);

  // Real-time listener for payment updates
  useEffect(() => {
    if (!user) return;

    const schoolId = SCHOOL_ID;
    const unsubscribe = accountingQueries.subscribeToTransactions(
      schoolId,
      (transactions) => {
        console.log('🔄 Real-time transactions received:', transactions.length);
        console.log('📋 All transactions:', transactions.map(t => ({
          id: t.id,
          studentId: t.studentId,
          studentName: t.studentName,
          category: t.category,
          month: t.month,
          status: t.status,
          paidAmount: t.paidAmount,
          donation: t.donation,
          amount: t.amount
        })));

        // Update payment data based on real-time transactions
        setPaymentData(prevData =>
          prevData.map(student => {
            console.log('🔍 Processing student:', student.studentName, 'ID:', student.studentId);

            // Find transactions for this student - include both completed and pending transactions
            const studentTransactions = transactions.filter(t => {
              const matches = t.studentId === student.studentId &&
                             (t.category === 'tuition_fee' || t.category === 'salary');
              console.log('🔎 Transaction check:', {
                transactionStudentId: t.studentId,
                studentId: student.studentId,
                transactionCategory: t.category,
                matches: matches,
                transaction: t
              });
              return matches;
            });

            console.log('✅ Student transactions found:', studentTransactions.length, studentTransactions);

            // Update payment status and amounts for each month
            const updatedPayments = [...student.payments];
            const updatedPaymentAmounts = [...student.paymentAmounts];
            const updatedCollectionInfo = [...(student.collectionInfo || months.map(() => ({ collectedBy: '', collectionDate: '' })))];

            studentTransactions.forEach(transaction => {
              if (transaction.month) {
                const monthIndex = months.indexOf(transaction.month);
                console.log('📅 Updating month:', transaction.month, 'Index:', monthIndex, 'Transaction:', transaction);

                if (monthIndex !== -1 && transaction.status === 'completed') {
                  updatedPayments[monthIndex] = true;
                  updatedPaymentAmounts[monthIndex] = {
                    paid: transaction.paidAmount || transaction.amount || 0,
                    donation: transaction.donation || 0
                  };
                  updatedCollectionInfo[monthIndex] = {
                    collectedBy: transaction.collectedBy || transaction.recordedBy || '',
                    collectionDate: transaction.collectionDate || transaction.date || ''
                  };
                  console.log('💰 Updated payment amounts for month:', monthIndex, updatedPaymentAmounts[monthIndex]);
                }
              }
            });

            // Calculate totals from actual amounts
            const totalPaid = updatedPaymentAmounts.reduce((sum, payment) => sum + (payment.paid || 0), 0);
            const totalDonation = updatedPaymentAmounts.reduce((sum, payment) => sum + (payment.donation || 0), 0);

            // Apply same logic as class-wise summary: donations offset pending amounts
            const expectedAnnualAmount = 12 * student.monthlyFee;
            const totalDue = Math.max(0, expectedAnnualAmount - totalPaid - totalDonation);

            console.log('📊 Final student update:', student.studentName, {
              totalPaid,
              totalDonation,
              totalDue,
              payments: updatedPayments,
              paymentAmounts: updatedPaymentAmounts,
              collectionInfo: updatedCollectionInfo
            });

            return {
              ...student,
              payments: updatedPayments,
              paymentAmounts: updatedPaymentAmounts,
              collectionInfo: updatedCollectionInfo,
              totalPaid,
              totalDonation,
              totalDue
            };
          })
        );
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for class-wise summary updates
  useEffect(() => {
    if (!user) return;

    const schoolId = SCHOOL_ID;

    const unsubscribe = accountingQueries.subscribeToTransactions(
      schoolId,
      (transactions) => {
        console.log('Updating real-time summary from transactions:', transactions.length);

        // Calculate real-time summary for each class (NO ASYNC/AWAIT HERE)
        const summary: Record<string, {
          totalPaid: number;
          totalDue: number;
          paidStudents: number;
          totalStudents: number;
          totalDonation: number;
        }> = {};

        // Group transactions by class
        const classTransactions = new Map<string, any[]>();

        transactions.filter(t => t.category === 'tuition_fee' && t.status === 'completed')
          .forEach(transaction => {
            if (transaction.className && transaction.studentId && transaction.paidAmount !== undefined) {
              if (!classTransactions.has(transaction.className)) {
                classTransactions.set(transaction.className, []);
              }
              classTransactions.get(transaction.className)!.push(transaction);
            }
          });

        // Calculate summary for each class
        classTransactions.forEach((classTrans, className) => {
          const uniqueStudents = new Set(classTrans.map(t => t.studentId));
          const totalPaid = classTrans.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
          const totalDonation = classTrans.reduce((sum, t) => sum + (t.donation || 0), 0);
          const paidStudents = uniqueStudents.size;

          // Get actual monthly fee for this class
          const classStudents = paymentData.filter(s => s.className === className);
          const totalStudents = classStudents.length || 1;

          // Use the monthly fee from the first student in this class (already loaded from database)
          const firstStudent = classStudents[0];
          const monthlyFee = firstStudent ? firstStudent.monthlyFee : 500; // Default to 500 for nursery

          console.log(`Class: ${className}, Monthly Fee: ${monthlyFee}, Students: ${totalStudents}`);

          // Calculate expected amount correctly
          const expectedAnnualAmount = totalStudents * monthlyFee * 12;

          // Donations should reduce the pending amount, not add to total
          // Pending = Expected - Paid - Donations (since donations offset tuition fees)
          const totalDue = Math.max(0, expectedAnnualAmount - totalPaid - totalDonation);

          console.log(`Class: ${className}`);
          console.log(`- Expected Annual: ${expectedAnnualAmount}`);
          console.log(`- Total Paid: ${totalPaid}`);
          console.log(`- Total Donation: ${totalDonation}`);
          console.log(`- Pending (Expected - Paid - Donation): ${totalDue}`);
          console.log(`- Total (Paid + Pending + Donation): ${totalPaid + totalDue + totalDonation}`);

          summary[className] = {
            totalPaid,
            totalDue,
            paidStudents,
            totalStudents,
            totalDonation
          };
        });

        console.log('Real-time summary updated:', summary);
        setRealTimeSummary(summary);
      }
    );

    return () => unsubscribe();
  }, [user, paymentData]);

  // Auto-calculation effect for donation amount
  useEffect(() => {
    const monthlyFee = parseFloat(formData.monthlyFee) || 0;
    const paidAmount = parseFloat(formData.paidAmount) || 0;
    const numberOfMonths = formData.numberOfMonths ?? 1; // Use nullish coalescing
    
    // Calculate total expected amount for multiple months
    const totalExpectedAmount = monthlyFee * numberOfMonths;

    if (paidAmount < totalExpectedAmount) {
      const donationAmount = totalExpectedAmount - paidAmount;
      setFormData(prev => ({ ...prev, donation: donationAmount.toString() }));
    } else {
      setFormData(prev => ({ ...prev, donation: '0' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paidAmount, formData.monthlyFee, formData.numberOfMonths]);

  const openPaymentDialog = async (student: any, monthIndex: number) => {
    setSelectedStudent(student);
    setSelectedMonth(monthIndex);

    // Get next voucher number for current session year (synchronous fallback)
    const currentYear = new Date().getFullYear().toString();
    const nextVoucherNumber = `${currentYear}-${Date.now().toString().slice(-3)}`;

    // Get class fee structure from fee management system
    const schoolId = SCHOOL_ID;

    console.log('🔍=== FEE MANAGEMENT CONNECTION DEBUG ===');
    console.log('Student name:', student.studentName);
    console.log('Student class:', student.className);
    console.log('Student class type:', typeof student.className);
    console.log('Student class length:', student.className?.length);

    // Fetch the latest fee structure for this student's class
    let studentMonthlyFee = 500; // Start with default

    try {
      console.log('📞 Calling getClassFeeStructure for:', student.className);

      // Get all active fees first to debug
      const allFees = await feeQueries.getActiveFees(schoolId);
      console.log('📋 All active fees in system:', allFees.map(f => ({
        name: f.feeName,
        amount: f.amount,
        classes: f.applicableClasses,
        type: f.feeType
      })));

      const feeStructure = await accountingQueries.getClassFeeStructure(student.className || 'N/A', schoolId);

      if (feeStructure) {
        studentMonthlyFee = feeStructure.tuitionFee;
        console.log(`✅ SUCCESS: Found fee for ${student.className}: ৳${studentMonthlyFee}`);
        console.log('Fee structure:', feeStructure);
      } else {
        console.log(`⚠️ No fee structure returned for ${student.className}`);
        studentMonthlyFee = 500; // Use proper default
      }
    } catch (error) {
      console.error(`❌ Error getting fee for ${student.className}:`, error);
      console.error('Error details:', error);
      studentMonthlyFee = 500; // Use proper default
    }

    console.log('🎯 FINAL DECISION:');
    console.log('- Student:', student.studentName);
    console.log('- Class:', student.className);
    console.log('- Monthly Fee:', studentMonthlyFee);
    console.log('- Payment Month:', months[monthIndex]);

    // Fetch latest user name from Firestore
    let latestCollectorName = userData?.name || user?.displayName || user?.email?.split('@')[0] || 'Admin User';
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userDocData = userDoc.data();
          latestCollectorName = userDocData.name || user?.displayName || user?.email?.split('@')[0] || 'Admin User';
        }
      } catch (error) {
        console.error('Error fetching latest user name:', error);
      }
    }

    setFormData({
      year: currentYear,
      month: months[monthIndex],
      voucherNumber: nextVoucherNumber,
      monthlyFee: studentMonthlyFee.toString(),
      paidAmount: studentMonthlyFee.toString(), // Default to full amount
      donation: '0',
      paymentMethod: 'নগদ',
      date: new Date().toISOString().split('T')[0],
      collectedBy: latestCollectorName,
      numberOfMonths: 1 // Default to 1 month
    });

    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedStudent(null);
    setSelectedMonth(0);
  };

  const togglePayment = (studentId: string, monthIndex: number) => {
    setPaymentData(prevData =>
      prevData.map(student => {
        if (student.studentId === studentId) {
          const updatedPayments = [...student.payments];
          updatedPayments[monthIndex] = !updatedPayments[monthIndex];

          // Update totals
          const paidCount = updatedPayments.filter(Boolean).length;
          const totalPaid = paidCount * student.monthlyFee;
          const totalDue = (12 - paidCount) * student.monthlyFee;

          return {
            ...student,
            payments: updatedPayments,
            totalPaid,
            totalDue
          };
        }
        return student;
      })
    );
  };

  const handleSubmitPayment = async () => {
    try {
      const numberOfMonths = formData.numberOfMonths || 1;
      const monthlyFee = parseFloat(formData.monthlyFee) || 0;
      const totalPaidAmount = parseFloat(formData.paidAmount) || 0;
      const totalDonation = parseFloat(formData.donation) || 0;
      
      // Calculate per-month amounts
      const paidPerMonth = totalPaidAmount / numberOfMonths;
      const donationPerMonth = totalDonation / numberOfMonths;
      
      console.log(`Saving payment for ${numberOfMonths} month(s):`, selectedStudent.studentName);
      console.log('Starting month:', formData.month, 'Index:', selectedMonth);

      // Get month names array
      const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

      // Save payment records for each month
      for (let i = 0; i < numberOfMonths; i++) {
        const currentMonthIndex = (selectedMonth + i) % 12;
        const currentMonth = months[currentMonthIndex];
        
        const paymentRecord = {
          type: 'income' as const,
          category: 'tuition_fee',
          amount: paidPerMonth + donationPerMonth,
          description: numberOfMonths > 1 
            ? `${currentMonth} মাসের টিউশন ফি (${numberOfMonths} মাসের অগ্রিম পেমেন্ট) - ${selectedStudent.studentName}`
            : `${currentMonth} মাসের টিউশন ফি - ${selectedStudent.studentName}`,
          date: formData.date,
          status: 'completed' as const,
          schoolId: SCHOOL_ID,
          recordedBy: user?.email || 'admin',
          paymentMethod: formData.paymentMethod as 'cash' | 'bank_transfer' | 'check' | 'online' | 'other',
          studentId: selectedStudent.studentId,
          studentName: selectedStudent.studentName,
          className: selectedStudent.className,
          rollNumber: selectedStudent.rollNumber || 'N/A',
          month: currentMonth,
          monthIndex: currentMonthIndex,
          voucherNumber: `${formData.voucherNumber}${numberOfMonths > 1 ? `-${i + 1}` : ''}`,
          tuitionFee: monthlyFee,
          paidAmount: paidPerMonth,
          donation: donationPerMonth,
          totalAmount: paidPerMonth + donationPerMonth,
          paymentDate: formData.date,
          collectionDate: new Date().toISOString(),
          collectedBy: formData.collectedBy,
          isAdvancePayment: numberOfMonths > 1,
          advancePaymentMonths: numberOfMonths,
          advancePaymentIndex: i + 1
        };

        console.log(`Saving payment record for month ${i + 1}/${numberOfMonths}:`, currentMonth);
        
        // Save to Firebase
        const transactionId = await accountingQueries.createTransaction(paymentRecord);
        
        // Send notification to parent
        try {
          const { sendFeePaymentNotification } = await import('@/lib/fee-notification-helper');
          await sendFeePaymentNotification({
            studentId: selectedStudent.studentId,
            studentName: selectedStudent.studentName,
            feeType: 'tuition_fee',
            feeName: 'টিউশন ফি',
            amount: paidPerMonth + donationPerMonth,
            paymentDate: formData.date,
            voucherNumber: `${formData.voucherNumber}${numberOfMonths > 1 ? `-${i + 1}` : ''}`,
            paymentMethod: formData.paymentMethod,
            collectedBy: formData.collectedBy,
            transactionId: transactionId,
            className: selectedStudent.className,
            month: currentMonth
          });
        } catch (notifError) {
          console.error('Error sending fee payment notification (non-critical):', notifError);
        }
      }
      
      console.log(`All ${numberOfMonths} payment records saved successfully`);

      // Update local payment status immediately for all months
      setPaymentData(prevData =>
        prevData.map(student => {
          if (student.studentId === selectedStudent.studentId) {
            console.log(`Updating local payment status for ${numberOfMonths} month(s):`, student.studentName);
            const updatedPayments = [...student.payments];
            const updatedPaymentAmounts = [...student.paymentAmounts];

            // Mark all months as paid
            const updatedCollectionInfo = [...(student.collectionInfo || months.map(() => ({ collectedBy: '', collectionDate: '' })))];
            for (let i = 0; i < numberOfMonths; i++) {
              const currentMonthIndex = (selectedMonth + i) % 12;
              updatedPayments[currentMonthIndex] = true;
              updatedPaymentAmounts[currentMonthIndex] = {
                paid: paidPerMonth,
                donation: donationPerMonth
              };
              updatedCollectionInfo[currentMonthIndex] = {
                collectedBy: formData.collectedBy,
                collectionDate: new Date().toISOString()
              };
              console.log(`✅ Marked month ${currentMonthIndex} as paid`);
            }

            // Calculate totals from actual amounts
            const totalPaid = updatedPaymentAmounts.reduce((sum, payment) => sum + (payment.paid || 0), 0);
            const totalDonation = updatedPaymentAmounts.reduce((sum, payment) => sum + (payment.donation || 0), 0);

            // Apply same logic as class-wise summary: donations offset pending amounts
            const expectedAnnualAmount = 12 * student.monthlyFee;
            const totalDue = Math.max(0, expectedAnnualAmount - totalPaid - totalDonation);

            console.log('Updated payments:', updatedPayments);
            console.log('Updated payment amounts:', updatedPaymentAmounts);
            console.log('New totals - Paid:', totalPaid, 'Donation:', totalDonation, 'Due:', totalDue);

            return {
              ...student,
              payments: updatedPayments,
              paymentAmounts: updatedPaymentAmounts,
              collectionInfo: updatedCollectionInfo,
              totalPaid,
              totalDonation,
              totalDue
            };
          }
          return student;
        })
      );

      // Close dialog
      closeDialog();

      // Show success dialog
      setSuccessDialogOpen(true);

      // Note: SMS notifications are handled by sendFeePaymentNotification function above
      // which checks settings before sending SMS

    } catch (error) {
      console.error('Error saving payment:', error);
      alert('পেমেন্ট সংরক্ষণ করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const studentsData = await studentQueries.getAllStudents();
      setStudents(studentsData);

      // Fetch existing transactions to get payment status
      const schoolId = SCHOOL_ID;
      const existingTransactions = await accountingQueries.getAllTransactions(schoolId);

      // Initialize payment data for each student
      const initialPaymentData = studentsData.map(student => {
        // Find transactions for this student
        const studentTransactions = existingTransactions.filter((t: any) =>
          t.studentId === student.uid && t.category === 'tuition_fee' && t.status === 'completed'
        );

        // Initialize payment status and amounts for each month
        const payments = months.map(() => false);
        const paymentAmounts = months.map(() => ({ paid: 0, donation: 0 }));

        // Update with actual payment data
        studentTransactions.forEach((transaction: any) => {
          if (transaction.month) {
            const monthIndex = months.indexOf(transaction.month);
            if (monthIndex !== -1) {
              payments[monthIndex] = true;
              paymentAmounts[monthIndex] = {
                paid: transaction.paidAmount || 0,
                donation: transaction.donation || 0
              };
            }
          }
        });

        // Calculate totals from actual amounts
        const totalPaid = paymentAmounts.reduce((sum, payment) => sum + (payment.paid || 0), 0);
        const totalDonation = paymentAmounts.reduce((sum, payment) => sum + (payment.donation || 0), 0);
        const monthlyFee = 1500; // Default monthly fee
        const totalDue = (12 * monthlyFee) - totalPaid;

        return {
          studentId: student.uid,
          studentName: student.name || student.displayName,
          className: student.class || 'N/A',
          rollNumber: student.rollNumber || student.studentId || 'N/A',
          monthlyFee,
          payments,
          paymentAmounts,
          totalPaid,
          totalDonation,
          totalDue
        };
      });

      setPaymentData(initialPaymentData);

      // Note: Sample fees are only created manually in fees management page

      // Reset search and filter
      setSearchTerm('');
      setSelectedClass('all');

    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('ডেটা রিফ্রেশ করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };



  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const uniqueClasses = Array.from(new Set(paymentData.map(s => s.className)));

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (filteredStudents.length === 0) {
      alert('ডাউনলোড করার জন্য কোনো ডাটা নেই');
      return;
    }

    try {
      setIsExporting(true);
      const filename = `টিউশন_ফি_সংগ্রহ_${new Date().toISOString().split('T')[0]}.pdf`;
      await exportTuitionFeeCollectionToPDF(filteredStudents, filename, schoolLogo, schoolSettings);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('PDF ডাউনলোড করতে সমস্যা হয়েছে');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle DOCX download
  const handleDownloadDOCX = async () => {
    if (filteredStudents.length === 0) {
      alert('ডাউনলোড করার জন্য কোনো ডাটা নেই');
      return;
    }

    try {
      setIsExporting(true);
      const filename = `টিউশন_ফি_সংগ্রহ_${new Date().toISOString().split('T')[0]}.docx`;
      await exportTuitionFeeCollectionToDOCX(filteredStudents, filename);
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert('DOCX ডাউনলোড করতে সমস্যা হয়েছে');
    } finally {
      setIsExporting(false);
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
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: true },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon2, label: 'সাপোর্ট', href: '/admin/support', active: false },
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
            onClick={() => auth.signOut()}
            className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-screen lg:ml-64">
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">টিউশন ফি আদায়</h1>
                  <p className="text-sm text-gray-600 leading-tight">শিক্ষার্থীদের মাসিক টিউশন ফি সংগ্রহ করুন</p>
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
            {/* Back Button - Before class cards */}
            <div className="mb-6">
              <button
                onClick={() => router.push('/admin/accounting')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>হিসাবে ফিরে যান</span>
              </button>
            </div>

            {/* Class-wise Fee Summary - Real-time */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {uniqueClasses.map(className => {
                const classStudents = filteredStudents.filter(student => student.className === className);
                const realTimeData = realTimeSummary[className];

                // Use real-time data if available, otherwise fall back to local calculation
                const totalPaid = realTimeData?.totalPaid || classStudents.reduce((sum, student) => sum + student.totalPaid, 0);
                const totalDue = realTimeData?.totalDue || classStudents.reduce((sum, student) => sum + student.totalDue, 0);
                const paidStudents = realTimeData?.paidStudents || classStudents.filter(student => student.totalPaid > 0).length;
                const totalStudents = realTimeData?.totalStudents || classStudents.length;

                return (
                  <div key={className} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{className}</h3>
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">{totalStudents}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">মোট আদায়:</span>
                        <span className="font-medium text-green-600">৳{toBengaliNumerals(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">মোট বকেয়া:</span>
                        <span className="font-medium text-orange-600">৳{toBengaliNumerals(totalDue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">অনুদান থেকে সংগ্রহ:</span>
                        <span className="font-medium text-purple-600">৳{toBengaliNumerals(realTimeData?.totalDonation || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">পরিশোধিত:</span>
                        <span className="font-medium text-blue-600">{paidStudents}/{totalStudents}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="শিক্ষার্থী খুঁজুন..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-6 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
                    >
                      <option value="all">সকল ক্লাস</option>
                      {uniqueClasses.map(className => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isExporting || filteredStudents.length === 0}
                    className="px-6 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        প্রক্রিয়াকরণ...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        PDF ডাউনলোড
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleDownloadDOCX}
                    disabled={isExporting || filteredStudents.length === 0}
                    className="px-6 py-3 bg-purple-600 text-white text-lg rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        প্রক্রিয়াকরণ...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        DOCX ডাউনলোড
                      </>
                    )}
                  </button>
                  <button className="px-6 py-3 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 flex items-center gap-3">
                    <Plus className="w-5 h-5" />
                    নতুন শিক্ষার্থী যোগ
                  </button>
                </div>
              </div>
            </div>

            {/* Fee Collection Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        নাম
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        শ্রেণি-শাখা
                      </th>
                      {months.map((month, index) => (
                        <th key={index} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">
                          {month}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-xs font-medium text-green-600 uppercase tracking-wider">
                        প্রদত্ত পরিমাণ
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-purple-600 uppercase tracking-wider">
                        মোট অনুদান
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentStudents.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 font-medium text-sm">
                                {student.studentName.charAt(0)}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {student.className}
                        </td>
                        {student.payments.map((isPaid: boolean, monthIndex: number) => {
                          const collection = student.collectionInfo?.[monthIndex];
                          return (
                            <td key={monthIndex} className="px-2 py-3 whitespace-nowrap text-center relative group">
                              <button
                                onClick={() => openPaymentDialog(student, monthIndex)}
                                className={`w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                                  isPaid
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                                title={isPaid && collection?.collectedBy 
                                  ? `${collection.collectedBy} - ${collection.collectionDate ? new Date(collection.collectionDate).toLocaleDateString('bn-BD') : ''}`
                                  : ''}
                              >
                                {isPaid ? '✓' : '✗'}
                              </button>
                              {isPaid && collection?.collectedBy && (
                                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                  <div>{collection.collectedBy}</div>
                                  {collection.collectionDate && (
                                    <div className="text-gray-300">
                                      {new Date(collection.collectionDate).toLocaleDateString('bn-BD')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-green-600">৳{toBengaliNumerals(student.totalPaid)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-purple-600">৳{toBengaliNumerals(student.totalDonation || 0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">কোনো শিক্ষার্থী পাওয়া যায়নি</h3>
                  <p className="text-gray-500">আপনার অনুসন্ধানের জন্য কোনো শিক্ষার্থী খুঁজে পাওয়া যায়নি</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredStudents.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Pagination Info */}
                <div className="text-sm text-gray-700">
                  <span>
                    দেখানো হচ্ছে {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} এর মধ্যে {filteredStudents.length} শিক্ষার্থী
                  </span>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    পূর্ববর্তী
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => goToPage(pageNumber)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage === pageNumber
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    পরবর্তী
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Payment Dialog */}
        {dialogOpen && selectedStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100 opacity-100 animate-in zoom-in-95 duration-300">
              {/* Dialog Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">টিউশন ফি সংগ্রহ করুন: {selectedStudent.studentName}</h2>
                  <p className="text-sm text-gray-600">রোল: {(selectedStudent.rollNumber || selectedStudent.studentId || 'N/A').replace(/^STD0*/i, '')} | শ্রেণি: {selectedStudent.className}</p>
                </div>
                <button
                  onClick={closeDialog}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Dialog Body */}
              <div className="p-6 space-y-4">
                {/* First Row: বছর, মাস and মাসের সংখ্যা */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বছর</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="২০২৫">২০২৫</option>
                      <option value="২০২৪">২০২৪</option>
                      <option value="২০২৩">২০২৩</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">মাস</label>
                    <input
                      type="text"
                      value={formData.month}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      মাসের সংখ্যা
                      <span className="text-xs text-gray-500 ml-1">(অগ্রিম পেমেন্ট)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.numberOfMonths}
                      onChange={(e) => {
                        const months = parseInt(e.target.value) || 1;
                        const monthlyFee = parseFloat(formData.monthlyFee) || 0;
                        setFormData({
                          ...formData, 
                          numberOfMonths: months,
                          paidAmount: (monthlyFee * months).toString()
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Second Row: ভাউচার নম্বর and মাসিক ফি */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ভাউচার নম্বর</label>
                    <input
                      type="text"
                      value={formData.voucherNumber}
                      onChange={(e) => setFormData({...formData, voucherNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">মাসিক ফি</label>
                    <input
                      type="number"
                      value={formData.monthlyFee}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>

                {/* Total Amount Info Box */}
                {formData.numberOfMonths > 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {formData.numberOfMonths} মাসের মোট টিউশন ফি
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {formData.monthlyFee} টাকা × {formData.numberOfMonths} মাস
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-900">
                          {parseFloat(formData.monthlyFee) * formData.numberOfMonths} টাকা
                        </p>
                        <p className="text-xs text-blue-700">অগ্রিম পেমেন্ট</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Third Row: প্রদত্ত পরিমাণ and অনুদান থেকে সংগ্রহ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      প্রদত্ত পরিমাণ*
                      {formData.numberOfMonths > 1 && (
                        <span className="text-xs text-blue-600 ml-1">
                          ({formData.numberOfMonths} মাসের জন্য)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({...formData, paidAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">অনুদান থেকে সংগ্রহ</label>
                    <input
                      type="number"
                      value={formData.donation}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>

                {/* Collector Name - Read Only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">আদায়কারি*</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                    {formData.collectedBy || 'লোড হচ্ছে...'}
                  </div>
                </div>

                {/* Payment Method - Full Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পেমেন্ট পদ্ধতি</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="নগদ">নগদ</option>
                    <option value="ব্যাংক ট্রান্সফার">ব্যাংক ট্রান্সফার</option>
                    <option value="চেক">চেক</option>
                    <option value="অনলাইন">অনলাইন</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                </div>

                {/* Date - Full Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">তারিখ*</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Calculation Summary */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    হিসাবের সারাংশ
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">মাসিক ফি:</span>
                      <span className="font-medium">৳{toBengaliNumerals(parseFloat(formData.monthlyFee || '0'))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">প্রদত্ত পরিমাণ:</span>
                      <span className="font-medium">৳{toBengaliNumerals(parseFloat(formData.paidAmount || '0'))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">অনুদান:</span>
                      <span className="font-medium">৳{toBengaliNumerals(parseFloat(formData.donation || '0'))}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-gray-900">মোট পরিমাণ:</span>
                      <span className="text-green-600">৳{toBengaliNumerals(parseFloat(formData.paidAmount) + parseFloat(formData.donation))}</span>
                    </div>
                  </div>

                  {/* Special display when donation is used */}
                  {parseFloat(formData.donation) > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-yellow-600 text-xs font-bold">!</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            অনুদান থেকে ৳{toBengaliNumerals(parseFloat(formData.donation))} সংগ্রহ করা হচ্ছে
                          </p>
                          <p className="text-xs text-yellow-700">
                            প্রদত্ত পরিমাণ মাসিক ফি থেকে কম বলে অনুদান থেকে বাকি অংশ সংগ্রহ করা হচ্ছে
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={closeDialog}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSubmitPayment}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  সংরক্ষণ করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Dialog */}
        {successDialogOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 ease-out scale-100 opacity-100 animate-in zoom-in-95 duration-300">
              {/* Success Dialog Header */}
              <div className="flex items-center justify-center p-6 border-b border-gray-200">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>

              {/* Success Dialog Body */}
              <div className="p-6 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">সংরক্ষণ সফল!</h3>
                <p className="text-gray-600 mb-4">পেমেন্ট সফলভাবে সংরক্ষণ করা হয়েছে</p>

                {/* Success Animation */}
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  টিউশন ফি সংগ্রহের ডাটা সংরক্ষিত হয়েছে
                </p>
              </div>

              {/* Success Dialog Footer */}
              <div className="flex justify-center p-6 border-t border-gray-200">
                <button
                  onClick={() => setSuccessDialogOpen(false)}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CollectSalaryPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <CollectSalaryPage />
    </ProtectedRoute>
  );
}
