'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import { classQueries, settingsQueries, Class } from '@/lib/database-queries';
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
  Save,
  X as XIcon,
  CheckCircle,
  Heart,
  Globe,
  FileText,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  AlertCircle,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
  Wallet,
  FolderOpen,
  UserPlus,
  Wrench,
} from 'lucide-react';

function ClassesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    className: '',
    section: '',
    teacherId: '',
    teacherName: '',
    academicYear: new Date().getFullYear().toString(),
    totalStudents: 0,
    isActive: true
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string>('');
  const [deletingClassName, setDeletingClassName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
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
        // Load settings first, then classes
        await loadSettings();
        await loadClasses();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Reload classes when settings change
  useEffect(() => {
    if (settings && user) {
      console.log('🔄 Settings updated, reloading classes...');
      loadClasses();
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      const settingsData = await settingsQueries.getSettings();
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadClasses = async () => {
    setClassesLoading(true);
    try {
      // Force fresh data by adding timestamp to prevent caching
      const timestamp = new Date().getTime();
      console.log(`🔄 Loading classes at ${timestamp}`);

      const schoolId = settings?.schoolCode || 'AMAR-2026'; // Use school ID from settings
      const classesData = await classQueries.getClassesBySchool(schoolId); // Load classes for specific school
      setClasses(classesData);

      console.log(`✅ Loaded ${classesData.length} active classes for school ${schoolId}:`, classesData.map(c => `${c.className} - ${c.section}`));
    } catch (error) {
      console.error('❌ Error loading classes:', error);
      setError('ক্লাস লোড করতে সমস্যা হয়েছে');
    } finally {
      setClassesLoading(false);
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

  const handleAddClass = () => {
    setEditingClass(null);
    setFormData({
      className: '',
      section: '',
      teacherId: '',
      teacherName: '',
      academicYear: new Date().getFullYear().toString(),
      totalStudents: 0,
      isActive: true
    });
    setError('');
    setShowModal(true);
  };

  const handleEditClass = (classItem: Class) => {
    router.push(`/admin/classes/edit?id=${classItem.classId}`);
  };

  const handleViewClass = (classItem: Class) => {
    router.push(`/admin/classes/view?id=${classItem.classId}`);
  };

  const handleDeleteClass = (classItem: Class) => {
    if (!classItem.classId) return;
    setDeletingClassId(classItem.classId);
    setDeletingClassName(`${classItem.className} - ${classItem.section}`);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingClassId) return;

    setIsDeleting(true);
    try {
      await classQueries.updateClass(deletingClassId, { isActive: false });

      // Clear browser cache and reload fresh data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      await loadClasses();
      setDeleteDialogOpen(false);
      setDeletingClassId('');
      setDeletingClassName('');

      console.log('✅ Class successfully deactivated and cache cleared');
    } catch (error) {
      console.error('❌ Error deleting class:', error);
      setError('ক্লাস মুছে ফেলতে সমস্যা হয়েছে');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingClassId('');
    setDeletingClassName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const classData = {
        ...formData,
        schoolId: settings?.schoolCode || 'AMAR-2026',
        schoolName: settings?.schoolName || 'আমার স্কুল',
        classId: editingClass?.classId || ''
      };

      if (editingClass && editingClass.classId) {
        await classQueries.updateClass(editingClass.classId, classData);
      } else {
        await classQueries.createClass(classData);
      }

      setShowModal(false);
      await loadClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      setError('ক্লাস সেভ করতে সমস্যা হয়েছে');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredClasses = classes.filter(classItem =>
    classItem.isActive && (
      classItem.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.section.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
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
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
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
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">ক্লাস ব্যবস্থাপনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">সকল ক্লাসের তথ্য দেখুন এবং পরিচালনা করুন</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 h-full">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ক্লাস খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                  />
                </div>
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
          {/* Page Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">ক্লাস তালিকা</h2>
              <p className="text-gray-600">মোট {filteredClasses.length} টি ক্লাস</p>
            </div>
            <button
              onClick={() => router.push('/admin/classes/add')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ক্লাস যোগ করুন</span>
            </button>
          </div>



          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Loading State */}
          {classesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">কোন ক্লাস নেই</h3>
              <p className="mt-1 text-sm text-gray-500">নতুন ক্লাস যোগ করুন</p>
            </div>
          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredClasses.map((classItem) => (
                <div key={classItem.classId} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{classItem.className}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      classItem.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {classItem.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <GraduationCap className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="font-medium">শিক্ষক:</span>
                      <span className="ml-1">{classItem.teacherName}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <BookOpen className="w-4 h-4 mr-2 text-green-500" />
                      <span className="font-medium">সেকশন:</span>
                      <span className="ml-1">{classItem.section}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2 text-purple-500" />
                      <span className="font-medium">শিক্ষার্থী:</span>
                      <span className="ml-1">{classItem.totalStudents} জন</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2 text-orange-500" />
                      <span className="font-medium">শিক্ষাবর্ষ:</span>
                      <span className="ml-1">{classItem.academicYear}</span>
                    </div>

                    {/* School Information */}
                    <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium">স্কুল আইডি:</span>
                        <span className="ml-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded text-xs">
                          {settings?.schoolCode || 'AMAR-2026'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-medium">স্কুলের নাম:</span>
                        <span className="ml-1 text-indigo-600 font-medium">
                          {settings?.schoolName || 'আমার স্কুল'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewClass(classItem)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-100 flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>দেখুন</span>
                    </button>
                    <button
                      onClick={() => handleEditClass(classItem)}
                      className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm hover:bg-green-100 flex items-center justify-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>সম্পাদনা</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClass(classItem)}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-100 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingClass ? 'ক্লাস সম্পাদনা করুন' : 'নতুন ক্লাস যোগ করুন'}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ক্লাসের নাম *
                    </label>
                    <input
                      type="text"
                      value={formData.className}
                      onChange={(e) => setFormData({...formData, className: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      সেকশন *
                    </label>
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({...formData, section: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      শিক্ষকের নাম *
                    </label>
                    <input
                      type="text"
                      value={formData.teacherName}
                      onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      শিক্ষাবর্ষ
                    </label>
                    <input
                      type="text"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      মোট শিক্ষার্থী
                    </label>
                    <input
                      type="text"
                      value={formData.totalStudents}
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
                        setFormData({...formData, totalStudents: parseInt(englishNumber) || 0});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="৩০"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">
                      সক্রিয়
                    </label>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{editingClass ? 'আপডেট' : 'সেভ'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <DeleteConfirmationDialog
            isOpen={deleteDialogOpen}
            onClose={handleCancelDelete}
            onConfirm={handleConfirmDelete}
            isLoading={isDeleting}
            itemName={deletingClassName}
            title="ক্লাস ডিলিট করুন"
            message="আপনি কি এই ক্লাসটি মুছে ফেলতে চান? এটি স্থায়ীভাবে মুছে যাবে এবং এই ক্লাসের সকল ডেটা হারিয়ে যাবে।"
          />
        </div>
      </div>
    </div>
  );
}

export default function ClassesPageWrapper() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Block unauthorized access - only admin and super_admin can access
    if (!loading && userData?.role) {
      const role = userData.role;
      
      if (role === 'teacher') {
        router.push('/teacher/classes');
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
      <ClassesPage />
    </ProtectedRoute>
  );
}
