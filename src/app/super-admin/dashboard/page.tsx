'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Home, 
  Building2, 
  Users, 
  Settings, 
  BarChart3,
  Shield,
  Database,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Building,
  BookOpen,
  ClipboardList,
  Calendar,
  CreditCard,
  Gift,
  Award,
  BookOpen as BookOpenIcon,
  FileText,
  Users as UsersIcon,
  MessageSquare,
  Bell,
  Sparkles,
  AlertCircle,
  Package,
  Globe,
  Clock
} from 'lucide-react';

function SuperAdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const authContext = useAuth();
  const userData = authContext?.userData || null;
  const authLoading = authContext?.loading || false;

  useEffect(() => {
    // Redirect from /super-admin/dashboard to /admin/dashboard
    if (pathname === '/super-admin/dashboard') {
      router.replace('/admin/dashboard');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems: Array<{
    icon: any;
    label: string;
    href?: string;
    active?: boolean;
    isLogout?: boolean;
  }> = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: pathname === '/admin/dashboard' },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: pathname?.startsWith('/admin/students') },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: pathname?.startsWith('/admin/teachers') },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: pathname?.startsWith('/admin/parents') },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: pathname?.startsWith('/admin/classes') },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: pathname?.startsWith('/admin/attendance') },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: pathname?.startsWith('/admin/events') },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: pathname?.startsWith('/admin/accounting') },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: pathname?.startsWith('/admin/donation') },
    { icon: Award, label: 'পরীক্ষা', href: '/admin/exams', active: pathname?.startsWith('/admin/exams') },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: pathname?.startsWith('/admin/subjects') },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: pathname?.startsWith('/admin/homework') },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: pathname?.startsWith('/admin/support') },
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: pathname?.startsWith('/admin/message') },
    { icon: Bell, label: 'নোটিশ', href: '/admin/notice', active: pathname?.startsWith('/admin/notice') },
    { icon: Clock, label: 'Routine', href: '/admin/routine', active: pathname?.startsWith('/admin/routine') },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: pathname?.startsWith('/admin/generate') },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: pathname?.startsWith('/admin/complaint') },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: pathname?.startsWith('/admin/inventory') },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: pathname?.startsWith('/admin/public-pages-control') },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: pathname?.startsWith('/admin/settings') },
    { icon: LogOut, label: 'লগআউট', isLogout: true },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-700 to-purple-900 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-purple-600 bg-purple-800">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center transform rotate-45">
                <div className="w-6 h-6 bg-orange-500 rounded-full transform -rotate-45"></div>
              </div>
            </div>
            <span className="text-lg font-bold text-white">সুপার এডমিন</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-purple-200 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => {
            if (item.isLogout) {
              return (
                <button
                  key={item.label}
                  onClick={handleLogout}
                  className="flex items-center w-full px-6 py-3 text-sm font-medium text-red-300 hover:bg-red-600 hover:text-white transition-colors"
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              );
            }
            return (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-purple-600 text-white border-r-2 border-yellow-400'
                    : 'text-purple-200 hover:bg-purple-600 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:pl-0">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <h1 className="ml-4 lg:ml-0 text-xl font-semibold text-gray-900">সুপার এডমিন ড্যাশবোর্ড</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  স্বাগতম, <span className="font-medium">{userData?.name || user?.email}</span>
                </div>
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">মোট স্কুল</p>
                  <p className="text-2xl font-bold text-gray-900">২৫</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">মোট ব্যবহারকারী</p>
                  <p className="text-2xl font-bold text-gray-900">১২,৫৪৫</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">সক্রিয় এডমিন</p>
                  <p className="text-2xl font-bold text-gray-900">৭৮</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">সিস্টেম আপটাইম</p>
                  <p className="text-2xl font-bold text-gray-900">৯৯.৯%</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">সাম্প্রতিক স্কুল কার্যকলাপ</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">নতুন স্কুল যোগ</p>
                      <p className="text-sm text-gray-600">আদর্শ উচ্চ বিদ্যালয় - ঢাকা</p>
                      <p className="text-xs text-gray-500">১ ঘন্টা আগে</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">সিস্টেম আপডেট</p>
                      <p className="text-sm text-gray-600">ভার্সন ২.১.৩ ডিপ্লয় সম্পন্ন</p>
                      <p className="text-xs text-gray-500">৩ ঘন্টা আগে</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">নিরাপত্তা স্ক্যান</p>
                      <p className="text-sm text-gray-600">সব সিস্টেম নিরাপদ</p>
                      <p className="text-xs text-gray-500">৬ ঘন্টা আগে</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">সিস্টেম পারফরম্যান্স</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">ডেটাবেস পারফরম্যান্স</p>
                      <p className="text-sm text-gray-600">চমৎকার</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      ৯৮%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">সার্ভার লোড</p>
                      <p className="text-sm text-gray-600">স্বাভাবিক</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      ৪৫%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">মেমরি ব্যবহার</p>
                      <p className="text-sm text-gray-600">অপটিমাল</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      ৬২%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboardWrapper() {
  const authContext = useAuth();
  const userData = authContext?.userData || null;
  const authLoading = authContext?.loading || false;
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Check if user has admin or super_admin role
  if (userData && userData.role !== 'admin' && userData.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">অ্যাক্সেস অস্বীকৃত</h1>
          <p className="text-gray-600">আপনার এই পেজে অ্যাক্সেসের অনুমতি নেই।</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <SuperAdminDashboard />
    </ProtectedRoute>
  );
}