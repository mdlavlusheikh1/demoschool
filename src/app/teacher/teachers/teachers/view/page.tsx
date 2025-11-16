'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { teacherQueries, User as TeacherUser } from '@/lib/database-queries';
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
  Edit,
  Trash2,
  Eye,
  Package,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  Award,
  Calendar as CalendarIcon,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Info,
  Camera,
  Globe,
  BookOpen as BookOpenIcon,
  MessageSquare,
  Gift,
  Sparkles,
  Users as UsersIcon
} from 'lucide-react';

function TeacherViewPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get('id');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        if (teacherId) {
          loadTeacher(teacherId);
        }
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, teacherId]);

  const loadTeacher = async (id: string) => {
    setTeacherLoading(true);
    setError('');

    try {
      const teacherData = await teacherQueries.getTeacherById(id);
      if (teacherData) {
        setTeacher(teacherData);
      } else {
        setError('শিক্ষক পাওয়া যায়নি');
      }
    } catch (error) {
      console.error('Error loading teacher:', error);
      setError('শিক্ষক লোড করতে সমস্যা হয়েছে');
    } finally {
      setTeacherLoading(false);
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

  const handleEdit = () => {
    if (teacher) {
      router.push(`/admin/teachers/edit?id=${teacher.uid}`);
    }
  };

  const handleDelete = async () => {
    if (!teacher) return;

    if (confirm('আপনি কি নিশ্চিত যে আপনি এই শিক্ষককে মুছে ফেলতে চান?')) {
      try {
        await teacherQueries.deleteTeacher(teacher.uid);
        alert('শিক্ষক সফলভাবে মুছে ফেলা হয়েছে');
        router.push('/admin/teachers');
      } catch (error) {
        console.error('Error deleting teacher:', error);
        alert('শিক্ষক মুছে ফেলতে সমস্যা হয়েছে');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white shadow-sm border-b border-gray-200 h-16">
            <div className="h-full px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-full">
                <div className="flex items-center h-full">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
                  >
                    <ArrowLeft className="w-5 h-5 mr-1" />
                    ফিরে যান
                  </button>
                  <div className="flex flex-col justify-center h-full">
                    <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষক দেখুন</h1>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 lg:p-6 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">শিক্ষক পাওয়া যায়নি</h3>
              <p className="mt-1 text-sm text-gray-500">এই শিক্ষকের তথ্য পাওয়া যাচ্ছে না</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/admin/teachers')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  শিক্ষক তালিকায় ফিরে যান
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: true },
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
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-1" />
                  ফিরে যান
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষক দেখুন</h1>
                  <p className="text-sm text-gray-600 leading-tight">{teacher.displayName || teacher.name}</p>
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
          {/* Loading State */}
          {teacherLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">শিক্ষকের তথ্য লোড হচ্ছে...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Teacher Information */}
          {!teacherLoading && teacher && (
            <div className="space-y-6">
              {/* Header with Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center overflow-hidden">
                      {teacher.profileImage ? (
                        <img
                          src={teacher.profileImage}
                          alt={teacher.displayName || teacher.name || 'Teacher'}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-white font-bold text-2xl">
                          {(teacher.displayName || teacher.name || 'T').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{teacher.displayName || teacher.name}</h2>
                      <p className="text-gray-600">{teacher.subject} শিক্ষক</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          teacher.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {teacher.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                        <span className="text-sm text-gray-500">কর্মচারী আইডি: {teacher.employeeId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleEdit}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>সম্পাদনা করুন</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>মুছে ফেলুন</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Information Tabs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    ব্যক্তিগত তথ্য
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">ইমেইল</p>
                        <p className="font-medium">{teacher.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">ফোন নম্বর</p>
                        <p className="font-medium">{teacher.phoneNumber || teacher.phone || 'N/A'}</p>
                      </div>
                    </div>

                    {teacher.dateOfBirth && (
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">জন্ম তারিখ</p>
                          <p className="font-medium">{new Date(teacher.dateOfBirth).toLocaleDateString('bn-BD')}</p>
                        </div>
                      </div>
                    )}

                    {teacher.gender && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">লিঙ্গ</p>
                          <p className="font-medium">{teacher.gender === 'male' ? 'পুরুষ' : teacher.gender === 'female' ? 'মহিলা' : 'অন্যান্য'}</p>
                        </div>
                      </div>
                    )}

                    {teacher.maritalStatus && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">বৈবাহিক অবস্থা</p>
                          <p className="font-medium">
                            {teacher.maritalStatus === 'single' ? 'অবিবাহিত' :
                             teacher.maritalStatus === 'married' ? 'বিবাহিত' :
                             teacher.maritalStatus === 'divorced' ? 'তালাকপ্রাপ্ত' :
                             teacher.maritalStatus === 'widowed' ? 'বিধবা/বিপত্নীক' : teacher.maritalStatus}
                          </p>
                        </div>
                      </div>
                    )}

                    {teacher.fatherName && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">পিতার নাম</p>
                          <p className="font-medium">{teacher.fatherName}</p>
                        </div>
                      </div>
                    )}

                    {teacher.motherName && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">মাতার নাম</p>
                          <p className="font-medium">{teacher.motherName}</p>
                        </div>
                      </div>
                    )}

                    {teacher.nationalId && (
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">জাতীয় পরিচয়পত্র নম্বর</p>
                          <p className="font-medium">{teacher.nationalId}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Professional Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2" />
                    পেশাগত তথ্য
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <GraduationCap className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">বিষয়</p>
                        <p className="font-medium">{teacher.subject || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Award className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">যোগ্যতা</p>
                        <p className="font-medium">{teacher.qualification || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">অভিজ্ঞতা</p>
                        <p className="font-medium">{teacher.experience || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">যোগদানের তারিখ</p>
                        <p className="font-medium">{teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString('bn-BD') : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">কর্মচারী আইডি</p>
                        <p className="font-medium">{teacher.employeeId || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Building className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">বিভাগ</p>
                        <p className="font-medium">{teacher.department || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">পদবী</p>
                        <p className="font-medium">{teacher.designation || 'N/A'}</p>
                      </div>
                    </div>

                    {teacher.salary && (
                      <div className="flex items-center">
                        <span className="w-4 h-4 text-gray-400 mr-3">৳</span>
                        <div>
                          <p className="text-sm text-gray-600">বেতন</p>
                          <p className="font-medium">৳{teacher.salary.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    ঠিকানা তথ্য
                  </h3>

                  <div className="space-y-4">
                    {teacher.address && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">বর্তমান ঠিকানা</p>
                        <p className="font-medium">{teacher.address}</p>
                      </div>
                    )}

                    {teacher.city && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">শহর</p>
                          <p className="font-medium">{teacher.city}</p>
                        </div>
                      </div>
                    )}

                    {teacher.district && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">জেলা</p>
                          <p className="font-medium">{teacher.district}</p>
                        </div>
                      </div>
                    )}

                    {teacher.emergencyContactName && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">জরুরী যোগাযোগ</p>
                          <p className="font-medium">{teacher.emergencyContactName} ({teacher.emergencyContactPhone})</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    অতিরিক্ত তথ্য
                  </h3>

                  <div className="space-y-4">
                    {teacher.languages && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">ভাষা জ্ঞান</p>
                        <p className="font-medium">{teacher.languages}</p>
                      </div>
                    )}

                    {teacher.skills && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">দক্ষতা</p>
                        <p className="font-medium">{teacher.skills}</p>
                      </div>
                    )}

                    {teacher.achievements && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">অর্জনসমূহ</p>
                        <p className="font-medium">{teacher.achievements}</p>
                      </div>
                    )}

                    {teacher.publications && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">প্রকাশনা</p>
                        <p className="font-medium">{teacher.publications}</p>
                      </div>
                    )}

                    {teacher.researchInterests && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">গবেষণা আগ্রহ</p>
                        <p className="font-medium">{teacher.researchInterests}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherViewPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <TeacherViewPage />
    </ProtectedRoute>
  );
}
