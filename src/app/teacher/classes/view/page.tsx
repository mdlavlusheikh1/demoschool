'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { classQueries, Class } from '@/lib/database-queries';
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
  Edit,
  Trash2,
  Eye,
  Clock,
  MapPin,
  Package,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Globe,
  FileText,
  BookOpen as BookOpenIcon,
  Award
} from 'lucide-react';

function ClassViewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classData, setClassData] = useState<Class | null>(null);
  const [classLoading, setClassLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('id');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        if (classId) {
          loadClassData(classId);
        }
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, classId]);

  const loadClassData = async (id: string) => {
    setClassLoading(true);
    try {
      const classes = await classQueries.getAllClasses();
      const foundClass = classes.find(c => c.classId === id);
      setClassData(foundClass || null);
    } catch (error) {
      console.error('Error loading class:', error);
    } finally {
      setClassLoading(false);
    }
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
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: true },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Award, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: Bell, label: 'নোটিশ', href: '/admin/notice', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: Calendar, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: Users, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Settings, label: 'উৎপাদন', href: '/admin/production', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Settings, label: 'Generate', href: '/admin/generate', active: false },
    { icon: Users, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-800 p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">ই</span>
            </div>
            <span className={`text-lg font-bold text-gray-900 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'}`}>
              সুপার অ্যাডমিন
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`text-gray-500 hover:text-gray-700 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
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
      <div className="flex-1 flex flex-col overflow-hidden">
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">ক্লাস দেখুন</h1>
                  <p className="text-sm text-gray-600 leading-tight">ক্লাসের বিস্তারিত তথ্য</p>
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
        <div className="flex-1 p-4 lg:p-6 bg-gray-50 overflow-y-auto">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/admin/classes')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>ক্লাস তালিকায় ফিরে যান</span>
            </button>
          </div>

          {/* Loading State */}
          {classLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !classData ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">ক্লাস পাওয়া যায়নি</h3>
              <p className="mt-1 text-sm text-gray-500">অনুরোধকৃত ক্লাসটি খুঁজে পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Class Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{classData.className}</h2>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    classData.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {classData.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <GraduationCap className="w-5 h-5 mr-3 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">শিক্ষক</p>
                        <p className="text-lg font-semibold text-gray-900">{classData.teacherName}</p>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <BookOpen className="w-5 h-5 mr-3 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">সেকশন</p>
                        <p className="text-lg font-semibold text-gray-900">{classData.section}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <Users className="w-5 h-5 mr-3 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">মোট শিক্ষার্থী</p>
                        <p className="text-lg font-semibold text-gray-900">{classData.totalStudents} জন</p>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <Clock className="w-5 h-5 mr-3 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">শিক্ষাবর্ষ</p>
                        <p className="text-lg font-semibold text-gray-900">{classData.academicYear}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* School Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">স্কুল তথ্য</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">স্কুল আইডি</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded">
                        {SCHOOL_ID}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">স্কুলের নাম</p>
                    <p className="text-lg font-semibold text-indigo-600">আমার স্কুল নুরানী একাডেমী</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => router.push(`/admin/classes/edit?id=${classData.classId}`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Edit className="w-5 h-5" />
                  <span>সম্পাদনা করুন</span>
                </button>
                <button
                  onClick={() => router.push('/admin/classes')}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ফিরে যান
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClassViewPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ClassViewPage />
    </ProtectedRoute>
  );
}
