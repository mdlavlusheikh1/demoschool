'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { accountingQueries, teacherQueries, FinancialTransaction, User } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
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
  TrendingDown,
  Search,
  Bell,
  Plus,
  Save,
  ArrowLeft,
  DollarSign,
  Receipt,
  Wallet,
  Loader2,
  Edit,
  Trash2,
  FileText,
  Building,
  GraduationCap,
  Zap,
  Home as HomeIcon,
  AlertCircle,
  CheckCircle,
  Filter,
  Package,
  Globe
} from 'lucide-react';

interface ExpenseFormData {
  category: string;
  subcategory: string;
  amount: string;
  description: string;
  paymentMethod: string;
  date: string;
  month: string;
  reference: string;
  notes: string;
  teacherId?: string;
}

const MONTHS = [
  { value: 'january', label: 'জানুয়ারি' },
  { value: 'february', label: 'ফেব্রুয়ারি' },
  { value: 'march', label: 'মার্চ' },
  { value: 'april', label: 'এপ্রিল' },
  { value: 'may', label: 'মে' },
  { value: 'june', label: 'জুন' },
  { value: 'july', label: 'জুলাই' },
  { value: 'august', label: 'আগস্ট' },
  { value: 'september', label: 'সেপ্টেম্বর' },
  { value: 'october', label: 'অক্টোবর' },
  { value: 'november', label: 'নভেম্বর' },
  { value: 'december', label: 'ডিসেম্বর' }
];

const EXPENSE_CATEGORIES = [
  { value: 'teacher_salary', label: 'শিক্ষক বেতন', icon: GraduationCap },
  { value: 'utility_bills', label: 'ইউটিলিটি বিল', icon: Zap },
  { value: 'rent', label: 'ভাড়া', icon: HomeIcon },
  { value: 'maintenance', label: 'রক্ষণাবেক্ষণ', icon: Building },
  { value: 'office_supplies', label: 'অফিস সরঞ্জাম', icon: FileText },
  { value: 'other', label: 'অন্যান্য', icon: Receipt }
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'নগদ' },
  { value: 'bank_transfer', label: 'ব্যাংক ট্রান্সফার' },
  { value: 'check', label: 'চেক' },
  { value: 'online', label: 'অনলাইন' },
  { value: 'other', label: 'অন্যান্য' }
];

function ExpensesPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expenses, setExpenses] = useState<FinancialTransaction[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  const getCurrentMonth = () => {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    return months[new Date().getMonth()];
  };

  const [formData, setFormData] = useState<ExpenseFormData>({
    category: 'teacher_salary',
    subcategory: '',
    amount: '',
    description: '',
    paymentMethod: 'cash',
    date: new Date().toISOString().split('T')[0],
    month: getCurrentMonth(),
    reference: '',
    notes: '',
    teacherId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadExpenses();
        loadTeachers();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadTeachers = async () => {
    try {
      setLoadingTeachers(true);
      // Query teachers from users collection (where they're actually stored based on admin/teachers page)
      // Try with orderBy first
      let usersQuery;
      let teachersData: User[] = [];
      
      try {
        usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'teacher'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
        const usersSnapshot = await getDocs(usersQuery);
        teachersData = usersSnapshot.docs.map(doc => ({ 
          uid: doc.id, 
          ...doc.data() 
        } as User));
      } catch (orderByError: any) {
        // If orderBy fails (missing index), try without orderBy
        if (orderByError.code === 'failed-precondition' || orderByError.message?.includes('index')) {
          console.log('Index error, trying without orderBy...');
          usersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'teacher'),
            where('isActive', '==', true)
          );
          const usersSnapshot = await getDocs(usersQuery);
          teachersData = usersSnapshot.docs.map(doc => ({ 
            uid: doc.id, 
            ...doc.data() 
          } as User));
          // Sort manually
          teachersData.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
          });
        } else {
          throw orderByError;
        }
      }

      // If no teachers found in users collection, try teachers collection as fallback
      if (teachersData.length === 0) {
        console.log('No teachers in users collection, trying teachers collection...');
        teachersData = await teacherQueries.getAllTeachers(true);
      }
      
      setTeachers(teachersData);
      console.log('Loaded teachers:', teachersData.length, teachersData.map(t => t.name || t.displayName || t.email));
    } catch (error) {
      console.error('Error loading teachers from users collection:', error);
      // Fallback to teacherQueries if users query fails
      try {
        console.log('Falling back to teacherQueries.getAllTeachers...');
        const fallbackTeachers = await teacherQueries.getAllTeachers(true);
        setTeachers(fallbackTeachers);
        console.log('Fallback loaded teachers:', fallbackTeachers.length);
      } catch (fallbackError) {
        console.error('Fallback teacher loading also failed:', fallbackError);
        setTeachers([]);
      }
    } finally {
      setLoadingTeachers(false);
    }
  };

  const loadExpenses = async () => {
    try {
      setDataLoading(true);
      const schoolId = SCHOOL_ID;
      const allTransactions = await accountingQueries.getAllTransactions(schoolId);
      const expenseTransactions = allTransactions.filter(
        (t: FinancialTransaction) => t.type === 'expense' && t.status === 'completed'
      );
      // Sort by date descending
      expenseTransactions.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      setExpenses(expenseTransactions);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) {
      newErrors.category = 'ক্যাটেগরি নির্বাচন করুন';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'সঠিক পরিমাণ লিখুন';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'বিবরণ লিখুন';
    }

    if (!formData.date) {
      newErrors.date = 'তারিখ নির্বাচন করুন';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'পেমেন্ট পদ্ধতি নির্বাচন করুন';
    }

    // Require teacher selection for teacher salary category
    if (formData.category === 'teacher_salary' && !formData.teacherId) {
      newErrors.teacherId = 'শিক্ষক নির্বাচন করুন';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const schoolId = SCHOOL_ID;
      const amount = parseFloat(formData.amount);

      // Prepare expense data
      const expenseData: any = {
        type: 'expense',
        category: formData.category,
        amount: amount,
        paidAmount: amount,
        description: formData.description,
        paymentMethod: formData.paymentMethod as 'cash' | 'bank_transfer' | 'check' | 'online' | 'other',
        status: 'completed',
        date: formData.date,
        month: formData.month,
        schoolId: schoolId,
        recordedBy: user?.email || userData?.email || 'admin'
      };

      // Add optional fields only if they have values (not undefined or empty)
      if (formData.subcategory && formData.subcategory.trim() !== '') {
        expenseData.subcategory = formData.subcategory;
      }
      
      if (formData.reference && formData.reference.trim() !== '') {
        expenseData.reference = formData.reference;
      }
      
      if (formData.notes && formData.notes.trim() !== '') {
        expenseData.notes = formData.notes;
      }
      
      if (formData.category === 'teacher_salary' && formData.teacherId && formData.teacherId.trim() !== '') {
        expenseData.teacherId = formData.teacherId;
      }

      // Filter out any undefined or null values to prevent Firestore errors
      const cleanedExpenseData: any = {};
      Object.keys(expenseData).forEach(key => {
        if (expenseData[key] !== undefined && expenseData[key] !== null) {
          cleanedExpenseData[key] = expenseData[key];
        }
      });

      console.log('💾 Saving expense with data:', cleanedExpenseData);

      await accountingQueries.createTransaction(cleanedExpenseData);

      // Reset form
      setFormData({
        category: 'teacher_salary',
        subcategory: '',
        amount: '',
        description: '',
        paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        teacherId: ''
      });

      setSuccessMessage('ব্যয় সফলভাবে যোগ করা হয়েছে!');
      setTimeout(() => {
        setSuccessMessage('');
        setShowAddForm(false);
      }, 2000);

      // Reload expenses
      await loadExpenses();
    } catch (error) {
      console.error('Error creating expense:', error);
      setErrors({ submit: 'ব্যয় যোগ করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = searchTerm === '' || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExpenses = filteredExpenses.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getCategoryLabel = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const getCategoryIcon = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : Receipt;
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">ব্যয় ব্যবস্থাপনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">বিভিন্ন ব্যয় রেকর্ড এবং পরিচালনা করুন</p>
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
                onClick={() => router.push('/admin/accounting')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>হিসাবে ফিরে যান</span>
              </button>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {errors.submit}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">মোট ব্যয়</p>
                    <p className="text-2xl font-bold text-red-600">
                      ৳{expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">মোট রেকর্ড</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {expenses.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">এই মাসের ব্যয়</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ৳{expenses
                        .filter(e => {
                          const expenseDate = new Date(e.date);
                          const now = new Date();
                          return expenseDate.getMonth() === now.getMonth() &&
                                 expenseDate.getFullYear() === now.getFullYear();
                        })
                        .reduce((sum, e) => sum + (e.amount || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="ব্যয় খুঁজুন..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    />
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">সকল ক্যাটেগরি</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddForm ? 'ফর্ম লুকান' : 'নতুন ব্যয় যোগ করুন'}</span>
                </button>
              </div>
            </div>

            {/* Add Expense Form Dialog */}
            {showAddForm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100 opacity-100">
                  {/* Dialog Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">নতুন ব্যয় যোগ করুন</h2>
                      <p className="text-sm text-gray-600 mt-1">ব্যয়ের তথ্য পূরণ করুন এবং সংরক্ষণ করুন</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setErrors({});
                      }}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Dialog Body */}
                  <div className="p-6">
                    <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ক্যাটেগরি *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            category: e.target.value,
                            teacherId: e.target.value !== 'teacher_salary' ? '' : formData.teacherId
                          });
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.category ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        {EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-red-600 text-sm mt-1">{errors.category}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        উপ-ক্যাটেগরি
                      </label>
                      <input
                        type="text"
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="উদাহরণ: বিদ্যুৎ বিল, পানির বিল"
                      />
                    </div>

                    {/* Teacher Selection - Show only when category is teacher_salary */}
                    {formData.category === 'teacher_salary' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          শিক্ষক নির্বাচন করুন *
                        </label>
                        {loadingTeachers ? (
                          <div className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">শিক্ষক লোড হচ্ছে...</span>
                          </div>
                        ) : (
                          <select
                            value={formData.teacherId}
                            onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.teacherId ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            <option value="">শিক্ষক নির্বাচন করুন</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.uid} value={teacher.uid}>
                                {teacher.name || teacher.displayName || teacher.email}
                              </option>
                            ))}
                          </select>
                        )}
                        {errors.teacherId && (
                          <p className="text-red-600 text-sm mt-1">{errors.teacherId}</p>
                        )}
                        {teachers.length === 0 && !loadingTeachers && (
                          <p className="text-orange-600 text-sm mt-1">কোনো শিক্ষক পাওয়া যায়নি</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        পরিমাণ (৳) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.amount ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                      />
                      {errors.amount && (
                        <p className="text-red-600 text-sm mt-1">{errors.amount}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        পেমেন্ট পদ্ধতি *
                      </label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.paymentMethod ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        {PAYMENT_METHODS.map(method => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                      {errors.paymentMethod && (
                        <p className="text-red-600 text-sm mt-1">{errors.paymentMethod}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        তারিখ *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.date ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.date && (
                        <p className="text-red-600 text-sm mt-1">{errors.date}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        মাস *
                      </label>
                      <select
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {MONTHS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        রেফারেন্স/ইনভয়েস নম্বর
                      </label>
                      <input
                        type="text"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ইনভয়েস/বিল নম্বর"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      বিবরণ *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="ব্যয়ের বিস্তারিত বিবরণ"
                    />
                    {errors.description && (
                      <p className="text-red-600 text-sm mt-1">{errors.description}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      নোট
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="অতিরিক্ত নোট (ঐচ্ছিক)"
                    />
                  </div>
                    </form>
                  </div>

                  {/* Dialog Footer */}
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 sticky bottom-0 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setErrors({});
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors font-medium"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      form="expense-form"
                      disabled={isSubmitting}
                      className="px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>সংরক্ষণ হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>সংরক্ষণ করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Expenses List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">ব্যয়ের তালিকা</h3>
              </div>
              <div className="overflow-x-auto">
                {dataLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-600">ব্যয় লোড হচ্ছে...</p>
                  </div>
                ) : currentExpenses.length > 0 ? (
                  <>
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">তারিখ</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ক্যাটেগরি</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">বিবরণ</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">রেফারেন্স</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">পেমেন্ট</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">পরিমাণ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentExpenses.map((expense) => {
                          const CategoryIcon = getCategoryIcon(expense.category);
                          return (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <CategoryIcon className="w-4 h-4 mr-2 text-gray-500" />
                                  <span className="text-sm text-gray-900">{getCategoryLabel(expense.category)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{expense.description}</div>
                                {expense.subcategory && (
                                  <div className="text-xs text-gray-500">{expense.subcategory}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {expense.reference || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {expense.paymentMethod === 'cash' ? 'নগদ' :
                                 expense.paymentMethod === 'bank_transfer' ? 'ব্যাংক ট্রান্সফার' :
                                 expense.paymentMethod === 'check' ? 'চেক' :
                                 expense.paymentMethod === 'online' ? 'অনলাইন' : 'অন্যান্য'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <span className="text-sm font-medium text-red-600">
                                  ৳{(expense.amount || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {filteredExpenses.length > itemsPerPage && (
                      <div className="mt-6 flex items-center justify-between bg-gray-50 px-6 py-4">
                        <div className="text-sm text-gray-700">
                          দেখানো হচ্ছে {startIndex + 1}-{Math.min(endIndex, filteredExpenses.length)} এর মধ্যে {filteredExpenses.length} ব্যয়
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={goToPrevious}
                            disabled={currentPage === 1}
                            className={`px-3 py-2 text-sm font-medium rounded-lg border ${
                              currentPage === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                            }`}
                          >
                            পূর্ববর্তী
                          </button>
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
                                  className={`px-3 py-2 text-sm font-medium rounded-lg border ${
                                    currentPage === pageNumber
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                                  }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={goToNext}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-2 text-sm font-medium rounded-lg border ${
                              currentPage === totalPages
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                            }`}
                          >
                            পরবর্তী
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">কোনো ব্যয় রেকর্ড নেই</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ExpensesPage />
    </ProtectedRoute>
  );
}

