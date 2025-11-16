'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { classQueries, accountingQueries, feeQueries } from '@/lib/database-queries';
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
  UserCheck,
  GraduationCap,
  Building,
  CreditCard,
  TrendingUp,
  Search,
  Bell,
  Plus,
  Save,
  ArrowLeft,
  DollarSign,
  FileText,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  X as XIcon,
  Package,
  Globe
} from 'lucide-react';

interface Class {
  classId?: string;
  className: string;
  section: string;
  teacherName: string;
  academicYear: string;
  totalStudents: number;
  isActive: boolean;
  schoolId: string;
  schoolName: string;
}

interface FeeConfig {
  feeName: string;
  feeNameEn: string;
  amount: number;
  description: string;
  applicableClasses: string[];
  feeType: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'exam' | 'admission';
  dueDate?: string;
  lateFee?: number;
  isActive: boolean;
  createdAt: string;
  schoolId: string;
}

function AddFeePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [feeConfig, setFeeConfig] = useState<FeeConfig>({
    feeName: '',
    feeNameEn: '',
    amount: 0,
    description: '',
    applicableClasses: [],
    feeType: 'monthly',
    dueDate: '',
    lateFee: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    schoolId: SCHOOL_ID
  });

  const [examFeeBreakdown, setExamFeeBreakdown] = useState({
    showBreakdown: false,
    selectedMonth: '',
    মাসিক_পরীক্ষা: 0,
    প্রথম_সাময়িক: 0,
    দ্বিতীয়_সাময়িক: 0,
    বার্ষিক: 0
  });

  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadClasses();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, auth]);

  // Show exam fee breakdown when exam type is selected
  useEffect(() => {
    setExamFeeBreakdown(prev => ({
      ...prev,
      showBreakdown: feeConfig.feeType === 'exam'
    }));
  }, [feeConfig.feeType]);

  const loadClasses = async () => {
    setClassesLoading(true);
    try {
      const classesData = await classQueries.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
      setError('ক্লাস লোড করতে সমস্যা হয়েছে');
    } finally {
      setClassesLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await auth.signOut();
      }
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleClassSelection = (classId: string, checked: boolean) => {
    setFeeConfig(prev => ({
      ...prev,
      applicableClasses: checked
        ? [...prev.applicableClasses, classId]
        : prev.applicableClasses.filter(id => id !== classId)
    }));
  };

  const handleSelectAllClasses = (checked: boolean) => {
    setFeeConfig(prev => ({
      ...prev,
      applicableClasses: checked ? classes.map(c => c.classId || '').filter(id => id !== '') : []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!feeConfig.feeName.trim()) {
        throw new Error('ফি এর নাম লিখুন');
      }
      if (!feeConfig.feeNameEn.trim()) {
        throw new Error('ফি এর ইংরেজি নাম লিখুন');
      }

      // For exam fees, check if at least one exam type has an amount
      if (feeConfig.feeType === 'exam') {
        const totalExamAmount = examFeeBreakdown.মাসিক_পরীক্ষা +
                               examFeeBreakdown.প্রথম_সাময়িক +
                               examFeeBreakdown.দ্বিতীয়_সাময়িক +
                               examFeeBreakdown.বার্ষিক;
        if (totalExamAmount <= 0) {
          throw new Error('পরীক্ষা ফি এর জন্য অন্তত একটি পরীক্ষার পরিমাণ নির্ধারণ করুন');
        }
      } else {
        // For non-exam fees, require main amount
        if (feeConfig.amount <= 0) {
          throw new Error('ফি এর পরিমাণ ০ এর বেশি হতে হবে');
        }
      }

      if (feeConfig.applicableClasses.length === 0) {
        throw new Error('অন্তত একটি ক্লাস নির্বাচন করুন');
      }

      const schoolId = SCHOOL_ID;
      const currentUser = user?.uid || 'system';

      // Save fee to Firebase
      const feeData: any = {
        feeName: feeConfig.feeName,
        feeNameEn: feeConfig.feeNameEn,
        amount: feeConfig.amount,
        description: feeConfig.description,
        applicableClasses: feeConfig.applicableClasses,
        feeType: feeConfig.feeType,
        isActive: feeConfig.isActive,
        schoolId,
        createdBy: currentUser
      };

      const feeId = await feeQueries.createFee(feeData);

      console.log('✅ Fee saved successfully with ID:', feeId);

      // Generate fee collections for all applicable students
      if (feeId) {
        try {
          const collectionCount = await feeQueries.generateFeeCollectionsForFee(feeId, feeConfig.dueDate);
          console.log(`✅ Generated ${collectionCount} fee collections for students`);
        } catch (collectionError) {
          console.warn('⚠️ Fee saved but failed to generate collections:', collectionError);
        }
      }

      setSuccess('ফি সফলভাবে যোগ করা হয়েছে!');
      setTimeout(() => {
        setShowDialog(false);
        setFeeConfig({
          feeName: '',
          feeNameEn: '',
          amount: 0,
          description: '',
          applicableClasses: [],
          feeType: 'monthly',
          dueDate: '',
          lateFee: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          schoolId: SCHOOL_ID
        });
        // Redirect to fees management page to show the created fee
        router.push('/admin/accounting/fees');
      }, 1500);

    } catch (error: any) {
      console.error('Error saving fee:', error);
      setError(error.message || 'ফি সেভ করতে সমস্যা হয়েছে');
    } finally {
      setFormLoading(false);
    }
  };

  const feeTypes = [
    { value: 'monthly', label: 'মাসিক' },
    { value: 'quarterly', label: 'ত্রৈমাসিক' },
    { value: 'yearly', label: 'বার্ষিক' },
    { value: 'one-time', label: 'এককালীন' },
    { value: 'exam', label: 'পরীক্ষা' },
    { value: 'admission', label: 'ভর্তি' }
  ];

  const predefinedFeeNames = [
    { value: 'টিউশন ফি', label: 'টিউশন ফি', enLabel: 'Tuition Fee' },
    { value: 'সেশন ফি', label: 'সেশন ফি', enLabel: 'Session Fee' },
    { value: 'ভর্তি ফি', label: 'ভর্তি ফি', enLabel: 'Admission Fee' },
    { value: 'পরীক্ষা ফি', label: 'পরীক্ষা ফি', enLabel: 'Exam Fee' },
    { value: 'ল্যাবরেটরি ফি', label: 'ল্যাবরেটরি ফি', enLabel: 'Laboratory Fee' },
    { value: 'লাইব্রেরি ফি', label: 'লাইব্রেরি ফি', enLabel: 'Library Fee' },
    { value: 'ক্রীড়া ফি', label: 'ক্রীড়া ফি', enLabel: 'Sports Fee' },
    { value: 'পরিবহন ফি', label: 'পরিবহন ফি', enLabel: 'Transport Fee' },
    { value: 'হোস্টেল ফি', label: 'হোস্টেল ফি', enLabel: 'Hostel Fee' },
    { value: 'ডেভেলপমেন্ট ফি', label: 'ডেভেলপমেন্ট ফি', enLabel: 'Development Fee' },
    { value: 'কম্পিউটার ফি', label: 'কম্পিউটার ফি', enLabel: 'Computer Fee' },
    { value: 'স্কাউট ফি', label: 'স্কাউট ফি', enLabel: 'Scout Fee' },
    { value: 'রেড ক্রিসেন্ট ফি', label: 'রেড ক্রিসেন্ট ফি', enLabel: 'Red Crescent Fee' },
    { value: 'বিজ্ঞান ফি', label: 'বিজ্ঞান ফি', enLabel: 'Science Fee' },
    { value: 'সঙ্গীত ফি', label: 'সঙ্গীত ফি', enLabel: 'Music Fee' },
    { value: 'শিল্পকলা ফি', label: 'শিল্পকলা ফি', enLabel: 'Fine Arts Fee' },
    { value: 'অন্যান্য', label: 'অন্যান্য', enLabel: 'Other' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: true },
    { icon: Settings, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Home, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: BookOpen, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: Users, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Calendar, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: Settings, label: 'Generate', href: '/admin/generate', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Users, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col ${
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
      <div className="flex-1">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200 h-16">
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">নতুন ফি যোগ করুন</h1>
                  <p className="text-sm text-gray-600 leading-tight">ফি এর বিস্তারিত তথ্য কনফিগার করুন</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
                <button
                  onClick={() => router.push('/admin/accounting/fee-collection')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ফিরে যান</span>
                </button>
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
        <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">ফি কনফিগারেশন</h2>
                  <p className="text-gray-600">নতুন ফি যোগ করুন এবং ক্লাস অনুসারে কনফিগার করুন</p>
                </div>
                <button
                  onClick={() => setShowDialog(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>নতুন ফি যোগ করুন</span>
                </button>
              </div>
            </div>

            {/* Success/Error Messages */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                {success}
              </div>
            )}

            {/* Classes Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">প্রযোজ্য ক্লাস ({classes.length} টি ক্লাস)</h3>
              {classesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>ক্লাস লোড হচ্ছে...</span>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>কোনো ক্লাস পাওয়া যায়নি</p>
                  <p className="text-sm">প্রথমে ক্লাস যোগ করুন</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map((classItem) => (
                    <div key={classItem.classId} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{classItem.className}</h4>
                          <p className="text-sm text-gray-600">সেকশন: {classItem.section}</p>
                          <p className="text-sm text-gray-600">শিক্ষক: {classItem.teacherName}</p>
                          <p className="text-sm text-gray-600">শিক্ষার্থী: {classItem.totalStudents} জন</p>
                        </div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fee Configuration Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">ফি এর বিস্তারিত তথ্য কনফিগার করুন</h3>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Fee Names */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ফি এর নাম *
                    </label>
                    <select
                      value={feeConfig.feeName}
                      onChange={(e) => {
                        const selectedFee = predefinedFeeNames.find(fee => fee.value === e.target.value);
                        setFeeConfig({
                          ...feeConfig,
                          feeName: e.target.value,
                          feeNameEn: selectedFee ? selectedFee.enLabel : ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">ফি এর নাম নির্বাচন করুন</option>
                      {predefinedFeeNames.map(fee => (
                        <option key={fee.value} value={fee.value}>{fee.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ফি এর ইংরেজি নাম *
                    </label>
                    <input
                      type="text"
                      value={feeConfig.feeNameEn}
                      onChange={(e) => setFeeConfig({...feeConfig, feeNameEn: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Like: Tuition Fee"
                      required
                    />
                  </div>
                </div>

                {/* Amount and Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!examFeeBreakdown.showBreakdown && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ফি এর পরিমাণ (টাকা) *
                      </label>
                      <input
                        type="number"
                        value={feeConfig.amount}
                        onChange={(e) => setFeeConfig({...feeConfig, amount: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="১৫০০"
                        min="0"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ফি এর ধরন
                    </label>
                    <select
                      value={feeConfig.feeType}
                      onChange={(e) => setFeeConfig({...feeConfig, feeType: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {feeTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Exam Fee Breakdown - Show only when exam type is selected */}
                {examFeeBreakdown.showBreakdown && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      পরীক্ষা ফি বিভাজন
                    </h4>
                    <p className="text-sm text-blue-700 mb-4">
                      বিভিন্ন পরীক্ষার জন্য পৃথক ফি নির্ধারণ করুন
                    </p>

                    {/* Month Selection and Monthly Exam */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          মাস নির্বাচন করুন
                        </label>
                        <select
                          value={examFeeBreakdown.selectedMonth}
                          onChange={(e) => setExamFeeBreakdown(prev => ({
                            ...prev,
                            selectedMonth: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">মাস নির্বাচন করুন</option>
                          <option value="জানুয়ারি">জানুয়ারি</option>
                          <option value="ফেব্রুয়ারি">ফেব্রুয়ারি</option>
                          <option value="মার্চ">মার্চ</option>
                          <option value="এপ্রিল">এপ্রিল</option>
                          <option value="মে">মে</option>
                          <option value="জুন">জুন</option>
                          <option value="জুলাই">জুলাই</option>
                          <option value="আগস্ট">আগস্ট</option>
                          <option value="সেপ্টেম্বর">সেপ্টেম্বর</option>
                          <option value="অক্টোবর">অক্টোবর</option>
                          <option value="নভেম্বর">নভেম্বর</option>
                          <option value="ডিসেম্বর">ডিসেম্বর</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          মাসিক পরীক্ষা
                        </label>
                        <input
                          type="number"
                          value={examFeeBreakdown.মাসিক_পরীক্ষা}
                          onChange={(e) => setExamFeeBreakdown(prev => ({
                            ...prev,
                            মাসিক_পরীক্ষা: parseInt(e.target.value) || 0
                          }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="৩০০"
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Term and Annual Exams */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          প্রথম সাময়িক পরীক্ষা
                        </label>
                        <input
                          type="number"
                          value={examFeeBreakdown.প্রথম_সাময়িক}
                          onChange={(e) => setExamFeeBreakdown(prev => ({
                            ...prev,
                            প্রথম_সাময়িক: parseInt(e.target.value) || 0
                          }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="৫০০"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          দ্বিতীয় সাময়িক পরীক্ষা
                        </label>
                        <input
                          type="number"
                          value={examFeeBreakdown.দ্বিতীয়_সাময়িক}
                          onChange={(e) => setExamFeeBreakdown(prev => ({
                            ...prev,
                            দ্বিতীয়_সাময়িক: parseInt(e.target.value) || 0
                          }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="৫০০"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          বার্ষিক পরীক্ষা
                        </label>
                        <input
                          type="number"
                          value={examFeeBreakdown.বার্ষিক}
                          onChange={(e) => setExamFeeBreakdown(prev => ({
                            ...prev,
                            বার্ষিক: parseInt(e.target.value) || 0
                          }))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="৮০০"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    বিবরণ
                  </label>
                  <textarea
                    value={feeConfig.description}
                    onChange={(e) => setFeeConfig({...feeConfig, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ফি সম্পর্কিত বিস্তারিত তথ্য লিখুন..."
                  />
                </div>

                {/* Applicable Classes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    প্রযোজ্য ক্লাস ({feeConfig.applicableClasses.length} টি নির্বাচিত)
                  </label>

                  {/* Select All Option */}
                  <div className="mb-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={feeConfig.applicableClasses.length === classes.length}
                        onChange={(e) => handleSelectAllClasses(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">সকল ক্লাস নির্বাচন করুন</span>
                    </label>
                  </div>

                  {/* Class Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {classes.map((classItem) => (
                      <label key={classItem.classId || classItem.className} className="flex items-center p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={feeConfig.applicableClasses.includes(classItem.classId || '')}
                          onChange={(e) => handleClassSelection(classItem.classId || '', e.target.checked)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{classItem.className}</div>
                          <div className="text-xs text-gray-600">
                            সেকশন: {classItem.section} | শিক্ষক: {classItem.teacherName}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={feeConfig.isActive}
                    onChange={(e) => setFeeConfig({...feeConfig, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    ফি সক্রিয় রাখুন
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDialog(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>সেভ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>ফি সংরক্ষণ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function AddFeePageWrapper() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Block unauthorized access - only admin and super_admin can access
    if (!loading && userData?.role) {
      const role = userData.role;
      
      if (role === 'teacher') {
        router.push('/teacher/accounting/add-fee');
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
      <AddFeePage />
    </ProtectedRoute>
  );
}
