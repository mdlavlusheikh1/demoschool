'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { classQueries, feeQueries } from '@/lib/database-queries';
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
  Edit,
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

interface Fee {
  id?: string;
  feeName: string;
  feeNameEn: string;
  amount: number;
  description: string;
  applicableClasses: string[];
  feeType: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'exam' | 'admission';
  dueDate?: string;
  lateFee?: number;
  isActive: boolean;
  schoolId: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

function EditFeePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [fee, setFee] = useState<Fee | null>(null);
  const [classesLoading, setClassesLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const router = useRouter();
  const params = useParams();
  const feeId = params.id as string;

  useEffect(() => {
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
  }, [router, feeId]);

  const loadData = async () => {
    setClassesLoading(true);
    setFeeLoading(true);
    try {
      const [classesData, feeData] = await Promise.all([
        classQueries.getAllClasses(),
        feeQueries.getFeeById(feeId)
      ]);

      setClasses(classesData);
      if (feeData) {
        setFee(feeData);
      } else {
        setError('ফি পাওয়া যায়নি');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('ডেটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setClassesLoading(false);
      setFeeLoading(false);
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

  const handleClassSelection = (classId: string, checked: boolean) => {
    if (!fee) return;

    setFee(prev => prev ? {
      ...prev,
      applicableClasses: checked
        ? [...prev.applicableClasses, classId]
        : prev.applicableClasses.filter(id => id !== classId)
    } : null);
  };

  const handleSelectAllClasses = (checked: boolean) => {
    if (!fee) return;

    setFee(prev => prev ? {
      ...prev,
      applicableClasses: checked ? classes.map(c => c.classId || '').filter(id => id !== '') : []
    } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee) return;

    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!fee.feeName.trim()) {
        throw new Error('ফি এর নাম লিখুন');
      }
      if (!fee.feeNameEn.trim()) {
        throw new Error('ফি এর ইংরেজি নাম লিখুন');
      }
      if (fee.amount <= 0) {
        throw new Error('ফি এর পরিমাণ ০ এর বেশি হতে হবে');
      }
      if (fee.applicableClasses.length === 0) {
        throw new Error('অন্তত একটি ক্লাস নির্বাচন করুন');
      }

      // Update fee in Firebase
      await feeQueries.updateFee(feeId, {
        feeName: fee.feeName,
        feeNameEn: fee.feeNameEn,
        amount: fee.amount,
        description: fee.description,
        applicableClasses: fee.applicableClasses,
        feeType: fee.feeType,
        isActive: fee.isActive
      });

      console.log('✅ Fee updated successfully');

      setSuccess('ফি সফলভাবে আপডেট করা হয়েছে!');
      setTimeout(() => {
        router.push('/admin/accounting/fees');
      }, 1500);

    } catch (error: any) {
      console.error('Error updating fee:', error);
      setError(error.message || 'ফি আপডেট করতে সমস্যা হয়েছে');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (feeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-700">ফি লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ফি পাওয়া যায়নি</h2>
          <p className="text-gray-600 mb-4">আপনি যে ফিটি এডিট করতে চান সেটি পাওয়া যায়নি।</p>
          <button
            onClick={() => router.push('/admin/accounting/fees')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            ফিরে যান
          </button>
        </div>
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">ফি এডিট করুন</h1>
                  <p className="text-sm text-gray-600 leading-tight">ফি এর তথ্য আপডেট করুন</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
                <button
                  onClick={() => router.push('/admin/accounting/fees')}
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">ফি এডিট করুন</h2>
                  <p className="text-gray-600">ফি এর তথ্য আপডেট করুন এবং সেভ করুন</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    fee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {fee.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>
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

            {/* Edit Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Fee Names */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ফি এর নাম *
                      </label>
                      <input
                        type="text"
                        value={fee.feeName}
                        onChange={(e) => setFee(prev => prev ? {...prev, feeName: e.target.value} : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ফি এর নাম লিখুন"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ফি এর ইংরেজি নাম *
                      </label>
                      <input
                        type="text"
                        value={fee.feeNameEn}
                        onChange={(e) => setFee(prev => prev ? {...prev, feeNameEn: e.target.value} : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Like: Tuition Fee"
                        required
                      />
                    </div>
                  </div>

                  {/* Amount and Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ফি এর পরিমাণ (টাকা) *
                      </label>
                      <input
                        type="number"
                        value={fee.amount}
                        onChange={(e) => setFee(prev => prev ? {...prev, amount: parseInt(e.target.value) || 0} : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="১৫০০"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ফি এর ধরন
                      </label>
                      <select
                        value={fee.feeType}
                        onChange={(e) => setFee(prev => prev ? {...prev, feeType: e.target.value as any} : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {feeTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      বিবরণ
                    </label>
                    <textarea
                      value={fee.description}
                      onChange={(e) => setFee(prev => prev ? {...prev, description: e.target.value} : null)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ফি সম্পর্কিত বিস্তারিত তথ্য লিখুন..."
                    />
                  </div>

                  {/* Applicable Classes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      প্রযোজ্য ক্লাস ({fee.applicableClasses.length} টি নির্বাচিত)
                    </label>

                    {/* Select All Option */}
                    <div className="mb-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={fee.applicableClasses.length === classes.length}
                          onChange={(e) => handleSelectAllClasses(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">সকল ক্লাস নির্বাচন করুন</span>
                      </label>
                    </div>

                    {/* Class Selection */}
                    {classesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span>ক্লাস লোড হচ্ছে...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {classes.map((classItem) => (
                          <label key={classItem.classId || classItem.className} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              checked={fee.applicableClasses.includes(classItem.classId || '')}
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
                    )}
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={fee.isActive}
                      onChange={(e) => setFee(prev => prev ? {...prev, isActive: e.target.checked} : null)}
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
                      onClick={() => router.push('/admin/accounting/fees')}
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
                          <span>আপডেট হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4" />
                          <span>ফি আপডেট করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function EditFeePageWrapper() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Block unauthorized access - only admin and super_admin can access
    if (!loading && userData?.role) {
      const role = userData.role;
      
      if (role === 'teacher') {
        router.push('/teacher/accounting/fees/[id]/edit');
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
      <EditFeePage />
    </ProtectedRoute>
  );
}
