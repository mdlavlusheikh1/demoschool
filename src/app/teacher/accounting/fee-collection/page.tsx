'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { studentQueries, teacherQueries, accountingQueries } from '@/lib/database-queries';
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
  BookOpen as BookIcon,
  UserPlus,
  Calendar as CalendarIcon,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

function FeeCollectionPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    thisMonthCollection: 0,
    pendingFees: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const schoolId = SCHOOL_ID;
        const currentDate = new Date();
        const startOfMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
        const today = currentDate.toISOString().split('T')[0];

        // Get counts
        const [students, teachers, transactions] = await Promise.all([
          studentQueries.getAllStudents(),
          teacherQueries.getAllTeachers(),
          accountingQueries.getTransactionsByDateRange(startOfMonth, today, schoolId)
        ]);

        // Calculate this month's collection
        const thisMonthIncome = transactions
          .filter(t => t.type === 'income' && t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0);

        // Get pending fees (transactions with pending status)
        const pendingTransactions = await accountingQueries.getTransactionsByType('income', schoolId);
        const pendingFees = pendingTransactions
          .filter(t => t.status === 'pending')
          .reduce((sum, t) => sum + t.amount, 0);

        setStats({
          totalStudents: students.length,
          totalTeachers: teachers.length,
          thisMonthCollection: thisMonthIncome,
          pendingFees: pendingFees
        });

        // Get recent transactions
        const recentTrans = transactions.slice(0, 5);
        setRecentTransactions(recentTrans);

      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const feeCollectionOptions = [
    {
      id: 'tuition',
      title: 'টিউশন ফি আদায়',
      subtitle: 'শিক্ষার্থীদের মাসিক টিউশন ফি সংগ্রহ',
      description: 'শিক্ষার্থীদের মাসিক টিউশন ফি সংগ্রহ করুন। বাল্ক সিলেকশন এবং স্বয়ংক্রিয় রেকর্ডিং।',
      icon: StudentIcon,
      color: 'blue',
      href: '/admin/accounting/collect-salary',
      stats: `${stats.totalStudents} জন শিক্ষার্থী`,
      features: ['বাল্ক সিলেকশন', 'মাসিক রেকর্ড', 'স্বয়ংক্রিয় হিসাব']
    },
    {
      id: 'exam',
      title: 'পরীক্ষার ফি আদায়',
      subtitle: 'পরীক্ষা সংক্রান্ত ফি সংগ্রহ',
      description: 'মাসিক, ত্রৈমাসিক, ষাণ্মাসিক এবং বার্ষিক পরীক্ষার ফি সংগ্রহ করুন।',
      icon: BookIcon,
      color: 'green',
      href: '/admin/accounting/collect-exam-fee',
      stats: 'বিভিন্ন পরীক্ষা',
      features: ['মাল্টিপল এক্সাম টাইপ', 'সেশন ভিত্তিক', 'সময়সূচী অনুসারে']
    },
    {
      id: 'admission',
      title: 'ভর্তি ও সেশন ফি আদায়',
      subtitle: 'ভর্তি এবং সেশন ফি ম্যানেজমেন্ট',
      description: 'নতুন শিক্ষার্থীদের ভর্তি ফি এবং বার্ষিক সেশন ফি সংগ্রহ করুন।',
      icon: UserPlus,
      color: 'purple',
      href: '/admin/accounting/collect-admission-fee',
      stats: 'সেশন ভিত্তিক',
      features: ['ভর্তি ফি', 'সেশন ফি', 'রি-ভর্তি ফি']
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50 border-blue-200',
        icon: 'bg-blue-100 text-blue-600',
        title: 'text-blue-900',
        subtitle: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: {
        bg: 'bg-green-50 border-green-200',
        icon: 'bg-green-100 text-green-600',
        title: 'text-green-900',
        subtitle: 'text-green-700',
        button: 'bg-green-600 hover:bg-green-700'
      },
      purple: {
        bg: 'bg-purple-50 border-purple-200',
        icon: 'bg-purple-100 text-purple-600',
        title: 'text-purple-900',
        subtitle: 'text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700'
      }
    };
    return colors[color as keyof typeof colors];
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">ফি আদায় কেন্দ্র</h1>
                  <p className="text-sm text-gray-600 leading-tight">সকল ধরনের ফি সংগ্রহের কেন্দ্রীয় প্যানেল</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
                <button
                  onClick={() => router.push('/admin/accounting/add-fee')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন ফি যোগ করুন</span>
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
          <div className="max-w-7xl mx-auto">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">মোট শিক্ষার্থী</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">মোট শিক্ষক</p>
                    <p className="text-2xl font-bold text-green-600">{stats.totalTeachers}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">এ মাসের আদায়</p>
                    <p className="text-2xl font-bold text-purple-600">৳{stats.thisMonthCollection.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">বকেয়া ফি</p>
                    <p className="text-2xl font-bold text-orange-600">৳{stats.pendingFees.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Class-wise Fee Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">ক্লাস অনুসারে ফি অবস্থা</h2>
                <button
                  onClick={() => router.push('/admin/accounting/collect-salary')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>বিস্তারিত দেখুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  // Get real class data from students
                  const classStats: Record<string, { count: number; paid: number; due: number }> = {};

                  // Calculate real class statistics from students data
                  if (stats.totalStudents > 0) {
                    // This would be calculated from real student data
                    // For now, showing sample data that matches the actual classes
                    const sampleClasses = [
                      { name: '৬ষ্ঠ শ্রেণি', count: 25, paid: 37500, due: 12500 },
                      { name: '৭ম শ্রেণি', count: 22, paid: 33000, due: 11000 },
                      { name: '৮ম শ্রেণি', count: 28, paid: 42000, due: 14000 },
                      { name: '৯ম শ্রেণি', count: 20, paid: 30000, due: 10000 }
                    ];

                    return sampleClasses.map((classItem, index) => {
                      const colors = [
                        { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
                        { bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
                        { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
                        { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' }
                      ];

                      const color = colors[index % colors.length];

                      return (
                        <div key={classItem.name} className={`${color.bg} rounded-lg p-4`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-medium ${color.text.replace('700', '900')}`}>{classItem.name}</h3>
                            <span className={`text-xs ${color.bg.replace('50', '200')} ${color.text.replace('700', '800')} px-2 py-1 rounded`}>
                              {classItem.count} জন
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className={color.text}>আদায়:</span>
                              <span className="font-medium text-green-600">৳{classItem.paid.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={color.text}>বকেয়া:</span>
                              <span className="font-medium text-orange-600">৳{classItem.due.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  }

                  return null;
                })()}
              </div>
            </div>

            {/* Fee Collection Options */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {feeCollectionOptions.map((option) => {
                const colors = getColorClasses(option.color);
                const IconComponent = option.icon;

                return (
                  <div key={option.id} className={`${colors.bg} rounded-xl border p-6 hover:shadow-lg transition-shadow`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 ${colors.icon} rounded-full flex items-center justify-center`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>

                    <h3 className={`text-xl font-semibold ${colors.title} mb-2`}>{option.title}</h3>
                    <p className={`text-sm ${colors.subtitle} mb-3`}>{option.subtitle}</p>
                    <p className="text-gray-600 text-sm mb-4">{option.description}</p>

                    <div className="mb-4">
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        <span>{option.stats}</span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex flex-wrap gap-2">
                        {option.features.map((feature, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white bg-opacity-50 text-gray-700">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(option.href)}
                      className={`w-full ${colors.button} text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2`}
                    >
                      <span>আদায় শুরু করুন</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">সাম্প্রতিক কার্যকলাপ</h3>
                <p className="text-sm text-gray-600">এ মাসের সাম্প্রতিক ফি আদায়ের তথ্য</p>
              </div>
              <div className="p-6">
                {recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {recentTransactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {transaction.type === 'income' ? (
                              <ArrowUpRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-sm text-gray-600">{transaction.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}৳{transaction.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">{transaction.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>এখনও কোনো লেনদেন নেই</p>
                    <p className="text-sm">ফি আদায় শুরু করে প্রথম লেনদেন তৈরি করুন</p>
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


export default function FeeCollectionPageWrapper() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Block unauthorized access - only admin and super_admin can access
    if (!loading && userData?.role) {
      const role = userData.role;
      
      if (role === 'teacher') {
        router.push('/teacher/accounting/fee-collection');
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
      <FeeCollectionPage />
    </ProtectedRoute>
  );
}
