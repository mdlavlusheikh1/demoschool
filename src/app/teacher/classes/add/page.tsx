'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { classQueries, settingsQueries } from '@/lib/database-queries';
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
  Package,
  Save,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Globe,
  FileText,
  BookOpen as BookOpenIcon,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  Users as UsersIcon
} from 'lucide-react';

function AddClassPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newClass, setNewClass] = useState({
    className: '',
    section: '',
    teacherId: '',
    teacherName: '',
    academicYear: new Date().getFullYear().toString(),
    totalStudents: 0,
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      console.error('Auth not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Load settings data
        await loadSettings();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      console.log('Loading settings...');
      const settingsData = await settingsQueries.getSettings();
      console.log('Settings data:', settingsData);

      if (settingsData) {
        setSettings(settingsData);

        // Set academic year from settings or default to current year
        const currentYear = settingsData.academicYear || new Date().getFullYear().toString();
        setNewClass(prev => ({ ...prev, academicYear: currentYear }));

        // Extract academic years from settings (both predefined and custom)
        const years = [
          '2031', '2030', '2029', '2028', '2027', '2026', '2025', '2024',
          '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'
        ];
        setAcademicYears(years);
      } else {
        console.log('No settings data found, using defaults');
        // Use default values if no settings exist
        setNewClass(prev => ({ ...prev, academicYear: new Date().getFullYear().toString() }));

        const years = [
          '2031', '2030', '2029', '2028', '2027', '2026', '2025', '2024',
          '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'
        ];
        setAcademicYears(years);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use fallback values on error
      setNewClass(prev => ({ ...prev, academicYear: new Date().getFullYear().toString() }));

      const years = [
        '2031', '2030', '2029', '2028', '2027', '2026', '2025', '2024',
        '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'
      ];
      setAcademicYears(years);
    } finally {
      setSettingsLoading(false);
    }
  };

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

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setNewClass({ ...newClass, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!newClass.className.trim()) {
      newErrors.className = 'ক্লাসের নাম প্রয়োজনীয়';
    }

    // Section is now optional - removed validation

    // Teacher name is now optional - removed validation

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveClass = async () => {
    if (!validateForm()) {
      return;
    }

    // Wait for settings to load if not already loaded
    if (!settings) {
      setSaveMessage('সেটিংস লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...');
      await loadSettings();
      if (!settings) {
        setSaveMessage('সেটিংস লোড করতে ত্রুটি হয়েছে');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
    }

    setIsSaving(true);
    try {
      const classData = {
        ...newClass,
        classId: '', // Will be auto-generated by Firestore
        schoolId: settings.schoolCode,
        schoolName: settings.schoolName
      };

      await classQueries.createClass(classData);
      setShowSuccess(true);
      setSaveMessage('');

      // Clear any cached data to ensure fresh load
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (cacheError) {
          console.warn('Cache clearing failed:', cacheError);
        }
      }

      setTimeout(() => {
        router.push('/admin/classes');
      }, 2000);
    } catch (error) {
      console.error('Error saving class:', error);
      setSaveMessage('ক্লাস যোগ করতে ত্রুটি হয়েছে');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
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
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: Users, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">ক্লাস যোগ করুন</h1>
                  <p className="text-sm text-gray-600 leading-tight">নতুন ক্লাসের তথ্য যোগ করুন</p>
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>ক্লাস তালিকায় ফিরে যান</span>
            </button>
          </div>

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

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">নতুন ক্লাস যোগ করুন</h2>
            <p className="text-gray-600">ক্লাসের সমস্ত তথ্য পূরণ করুন</p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">ক্লাসের তথ্য</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাসের নাম *</label>
                <input
                  type="text"
                  value={newClass.className}
                  onChange={(e) => handleInputChange('className', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.className ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="যেমন: ক্লাস ৯ - এ"
                />
                {errors.className && (
                  <p className="text-red-600 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.className}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">সেকশন</label>
                <select
                  value={newClass.section}
                  onChange={(e) => handleInputChange('section', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">সেকশন নির্বাচন করুন (ঐচ্ছিক)</option>
                  <option value="এ">এ</option>
                  <option value="বি">বি</option>
                  <option value="সি">সি</option>
                  <option value="ডি">ডি</option>
                  <option value="ই">ই</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">শিক্ষকের নাম</label>
                <input
                  type="text"
                  value={newClass.teacherName}
                  onChange={(e) => handleInputChange('teacherName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="শিক্ষকের পুরো নাম (ঐচ্ছিক)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">শিক্ষাবর্ষ</label>
                <select
                  value={newClass.academicYear}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">শিক্ষাবর্ষ নির্বাচন করুন</option>
                  {academicYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">মোট শিক্ষার্থী</label>
                <input
                  type="text"
                  value={newClass.totalStudents}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow Bengali numerals and convert to English for storage
                    const englishNumber = value.replace(/[০-৯]/g, (match) => {
                      const bengaliToEnglish: {[key: string]: string} = {
                        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
                        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
                      };
                      return bengaliToEnglish[match] || match;
                    });
                    handleInputChange('totalStudents', parseInt(englishNumber) || 0);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="৩০"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">স্কুল আইডি</label>
                <input
                  type="text"
                  value={settings?.schoolCode || 'AMAR-2026'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-sm text-gray-500 mt-1">স্কুল আইডি বেসিক সিস্টেম কনফিগারেশন থেকে সংযুক্ত</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">স্কুলের নাম</label>
                <input
                  type="text"
                  value={settings?.schoolName || 'আমার স্কুল'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-sm text-gray-500 mt-1">স্কুলের নাম বেসিক সিস্টেম কনফিগারেশন থেকে সংযুক্ত</p>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newClass.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    ক্লাসটি সক্রিয় করুন
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Success Notification */}
          {showSuccess && (
            <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>ক্লাস সফলভাবে যোগ করা হয়েছে!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push('/admin/classes')}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isSaving}
            >
              বাতিল
            </button>
            <button
              onClick={handleSaveClass}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>সংরক্ষণ হচ্ছে...</span>
                </div>
              ) : (
                'সংরক্ষণ করুন'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddClassPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AddClassPage />
    </ProtectedRoute>
  );
}
