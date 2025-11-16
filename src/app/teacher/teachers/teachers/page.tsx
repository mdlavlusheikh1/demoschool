'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { teacherQueries, User as TeacherUser, settingsQueries } from '@/lib/database-queries';
import { exportTeachersToPDF, exportTeachersToExcel, exportSingleTeacherToPDF } from '@/lib/export-utils';
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
  Mail,
  Phone,
  Package,
  RefreshCw,
  AlertCircle,
  Globe,
  FileText,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
  Download,
  FileDown,
  Loader2,
} from 'lucide-react';

function TeachersPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    subject: '',
    status: 'all', // all, active, inactive
    experience: ''
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadTeachers();
        loadSchoolSettings();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load school settings
  const loadSchoolSettings = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      setSchoolSettings(settings);
      if ((settings as any)?.schoolLogo) {
        setSchoolLogo((settings as any).schoolLogo);
      } else if ((settings as any)?.websiteLogo) {
        setSchoolLogo((settings as any).websiteLogo);
      }
    } catch (error) {
      console.error('Error loading school settings:', error);
    }
  };

  // Real-time listener for teachers
  useEffect(() => {
    if (!user) return;

    setTeachersLoading(true);
    
    // Try to query from teachers collection first (where they're actually stored)
    let teachersUnsubscribe: (() => void) | null = null;
    
    const loadFromUsersCollection = () => {
      console.log('🔄 Falling back to users collection...');
      const fallbackQuery = query(
        collection(db, 'users'),
        where('role', '==', 'teacher')
      );
      
      teachersUnsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
        const fallbackTeachers = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as TeacherUser));
        setTeachers(fallbackTeachers);
        setTeachersLoading(false);
        console.log('✅ Teachers loaded from users collection (fallback):', fallbackTeachers.length);
      }, (fallbackError) => {
        console.error('❌ Error loading teachers from users collection:', fallbackError);
        setError('শিক্ষক লোড করতে সমস্যা হয়েছে');
        setTeachersLoading(false);
      });
    };
    
    // Try with orderBy first
    const q1 = query(
      collection(db, 'teachers'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    teachersUnsubscribe = onSnapshot(q1, (snapshot) => {
      const teachersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as TeacherUser));
      setTeachers(teachersData);
      setTeachersLoading(false);
      console.log('✅ Teachers loaded from teachers collection:', teachersData.length);
    }, (error: any) => {
      console.error('❌ Error loading teachers from teachers collection:', error);
      
      // If orderBy fails (missing index), try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('⚠️ Index error, trying without orderBy...');
        const q2 = query(
          collection(db, 'teachers'),
          where('isActive', '==', true)
        );
        
        teachersUnsubscribe = onSnapshot(q2, (snapshot) => {
          const teachersData = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          } as TeacherUser));
          // Sort manually
          teachersData.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
          });
          setTeachers(teachersData);
          setTeachersLoading(false);
          console.log('✅ Teachers loaded from teachers collection (no orderBy):', teachersData.length);
        }, (error2) => {
          console.error('❌ Error loading teachers (no orderBy):', error2);
          // Fallback: try users collection
          loadFromUsersCollection();
        });
      } else {
        // Other error - fallback to users collection
        loadFromUsersCollection();
      }
    });

    return () => {
      if (teachersUnsubscribe) {
        teachersUnsubscribe();
      }
    };
  }, [user]);

  const loadTeachers = async () => {
    if (!user) return;

    setTeachersLoading(true);
    setError('');

    try {
      // Query from teachers collection first (where they're actually stored)
      let teachersData: TeacherUser[] = [];
      
      try {
        // Try with orderBy first
        const teachersQuery = query(
          collection(db, 'teachers'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(teachersQuery);
        teachersData = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as TeacherUser));
      } catch (error: any) {
        // If orderBy fails (missing index), try without it
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          console.log('⚠️ Index error, trying without orderBy...');
          const teachersQuery = query(
            collection(db, 'teachers'),
            where('isActive', '==', true)
          );
          const snapshot = await getDocs(teachersQuery);
          teachersData = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          } as TeacherUser));
          
          // Sort manually
          teachersData.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
          });
        } else {
          throw error;
        }
      }
      
      // If no teachers found, try users collection as fallback
      if (teachersData.length === 0) {
        console.log('No teachers in teachers collection, trying users collection...');
        const fallbackQuery = query(
          collection(db, 'users'),
          where('role', '==', 'teacher')
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        teachersData = fallbackSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as TeacherUser));
      }
      
      setTeachers(teachersData);
      console.log('✅ Loaded teachers:', teachersData.length);
    } catch (error) {
      console.error('Error loading teachers:', error);
      // Final fallback to teacherQueries
      try {
        const fallbackTeachers = await teacherQueries.getAllTeachers();
        setTeachers(fallbackTeachers);
        console.log('✅ Fallback loaded teachers:', fallbackTeachers.length);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setError('শিক্ষক লোড করতে সমস্যা হয়েছে');
      }
    } finally {
      setTeachersLoading(false);
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

  const handleViewTeacher = (teacher: TeacherUser) => {
    router.push(`/admin/teachers/view?id=${teacher.uid}`);
  };

  const handleEditTeacher = (teacher: TeacherUser) => {
    router.push(`/admin/teachers/edit?id=${teacher.uid}`);
  };

  const handleDeleteClick = (teacher: TeacherUser) => {
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return;

    setIsDeleting(true);
    try {
      console.log('Starting deletion process for teacher:', teacherToDelete.uid);
      await teacherQueries.deleteTeacher(teacherToDelete.uid);
      console.log('Deletion successful, refreshing teacher list...');
      setError('');
      console.log('Teacher list refreshed successfully');
      setShowDeleteModal(false);
      setTeacherToDelete(null);
      alert('শিক্ষক সফলভাবে মুছে ফেলা হয়েছে');
    } catch (error) {
      console.error('Error deleting teacher:', error);
      setError(`শিক্ষক মুছে ফেলতে সমস্যা হয়েছে: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setTeacherToDelete(null);
  };

  // Download single teacher information
  const handleDownloadTeacher = async (teacher: TeacherUser) => {
    setIsExporting(true);
    try {
      const teacherData = {
        name: teacher.name || teacher.displayName || '-',
        displayName: teacher.displayName || teacher.name || '-',
        email: teacher.email || '-',
        phoneNumber: teacher.phoneNumber || teacher.phone || '-',
        phone: teacher.phone || teacher.phoneNumber || '-',
        dateOfBirth: teacher.dateOfBirth || '-',
        gender: teacher.gender || '-',
        maritalStatus: (teacher as any).maritalStatus || '-',
        nationality: (teacher as any).nationality || '-',
        religion: (teacher as any).religion || '-',
        bloodGroup: (teacher as any).bloodGroup || '-',
        fatherName: (teacher as any).fatherName || '-',
        motherName: (teacher as any).motherName || '-',
        nationalId: (teacher as any).nationalId || '-',
        address: teacher.address || '-',
        presentAddress: (teacher as any).presentAddress || teacher.address || '-',
        permanentAddress: (teacher as any).permanentAddress || '-',
        city: (teacher as any).city || '-',
        district: (teacher as any).district || '-',
        postalCode: (teacher as any).postalCode || '-',
        country: (teacher as any).country || '-',
        teacherId: teacher.teacherId || teacher.employeeId || teacher.uid || '-',
        employeeId: teacher.employeeId || teacher.teacherId || '-',
        subject: teacher.subject || '-',
        class: teacher.class || '-',
        qualification: teacher.qualification || '-',
        experience: teacher.experience || '-',
        specialization: (teacher as any).specialization || '-',
        department: teacher.department || '-',
        designation: teacher.designation || '-',
        joinDate: teacher.joinDate || '-',
        salary: (teacher as any).salary || '-',
        employmentType: (teacher as any).employmentType || '-',
        emergencyContactName: (teacher as any).emergencyContactName || '-',
        emergencyContactPhone: (teacher as any).emergencyContactPhone || '-',
        emergencyContactRelation: (teacher as any).emergencyContactRelation || '-',
        languages: (teacher as any).languages || '-',
        skills: (teacher as any).skills || '-',
        achievements: (teacher as any).achievements || '-',
        publications: (teacher as any).publications || '-',
        researchInterests: (teacher as any).researchInterests || '-',
        isActive: teacher.isActive !== false,
        profileImage: (teacher as any).profileImage || teacher.profileImage || '',
      };
      await exportSingleTeacherToPDF(teacherData, schoolLogo, schoolSettings);
      
      setShowSuccessMessage(true);
      setMessageText(`${teacher.name || teacher.displayName || 'শিক্ষক'}-এর তথ্য PDF-এ ডাউনলোড হয়েছে`);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error: any) {
      setShowErrorMessage(true);
      setMessageText(error.message || 'PDF ডাউনলোড করা যায়নি');
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Convert teachers to export format
  const convertTeachersForExport = (teachers: TeacherUser[]) => {
    return teachers.map(teacher => ({
      name: teacher.name || teacher.displayName || '-',
      teacherId: teacher.teacherId || teacher.uid || '-',
      email: teacher.email || '-',
      phoneNumber: teacher.phoneNumber || teacher.phone || '-',
      subject: (teacher as any).subject || '-',
      class: (teacher as any).class || '-',
      experience: (teacher as any).experience || '-',
      qualification: (teacher as any).qualification || '-',
      address: teacher.address || '-',
      dateOfBirth: teacher.dateOfBirth || '-',
      isActive: teacher.isActive !== false,
      createdAt: teacher.createdAt?.toDate?.().toLocaleDateString('bn-BD') || '-',
    }));
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const exportData = convertTeachersForExport(filteredTeachers);
      const currentDate = new Date().toISOString().split('T')[0];
      await exportTeachersToPDF(exportData, `teachers_report_${currentDate}.pdf`, schoolLogo, schoolSettings);
      
      setShowSuccessMessage(true);
      setMessageText('PDF সফলভাবে ডাউনলোড হয়েছে');
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error: any) {
      setShowErrorMessage(true);
      setMessageText(error.message || 'PDF ডাউনলোড করা যায়নি');
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const exportData = convertTeachersForExport(filteredTeachers);
      const currentDate = new Date().toISOString().split('T')[0];
      exportTeachersToExcel(exportData, `teachers_report_${currentDate}.xlsx`);
      
      setShowSuccessMessage(true);
      setMessageText('Excel সফলভাবে ডাউনলোড হয়েছে');
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error: any) {
      setShowErrorMessage(true);
      setMessageText(error.message || 'Excel ডাউনলোড করা যায়নি');
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Enhanced search and filter logic
  const filteredTeachers = teachers.filter(teacher => {
    // Text search - search in multiple fields
    const searchMatch = !searchTerm ||
      (teacher.displayName || teacher.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (teacher.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (teacher.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (teacher.phoneNumber || teacher.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by subject
    const subjectMatch = !searchFilters.subject || teacher.subject === searchFilters.subject;

    // Filter by status
    const statusMatch = searchFilters.status === 'all' ||
      (searchFilters.status === 'active' && teacher.isActive) ||
      (searchFilters.status === 'inactive' && !teacher.isActive);

    // Filter by experience
    const experienceMatch = !searchFilters.experience ||
      (teacher.experience || '').toLowerCase().includes(searchFilters.experience.toLowerCase());

    return searchMatch && subjectMatch && statusMatch && experienceMatch;
  });

  // Get unique values for filter dropdowns
  const uniqueSubjects = [...new Set(teachers.map(t => t.subject).filter(Boolean))];

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
      {/* Sidebar - Same as students page */}
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষক ব্যবস্থাপনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">সকল শিক্ষকের তথ্য দেখুন এবং পরিচালনা করুন</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 h-full">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="শিক্ষক খুঁজুন..."
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
          {/* Success Message */}
          {showSuccessMessage && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                {messageText}
              </div>
              <button onClick={() => setShowSuccessMessage(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {(error || showErrorMessage) && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {showErrorMessage ? messageText : error}
              </div>
              {showErrorMessage && (
                <button onClick={() => setShowErrorMessage(false)}>
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Page Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">শিক্ষক তালিকা</h2>
              <p className="text-gray-600">
                {searchTerm ? `${filteredTeachers.length} জন পাওয়া গেছে` : `মোট ${teachers.length} জন শিক্ষক`}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>Excel</span>
              </button>
              <button
                onClick={() => router.push('/admin/teachers/id-cards')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <GraduationCap className="w-4 h-4" />
                <span>আইডি কার্ড তৈরি করুন</span>
              </button>
              <button
                onClick={() => router.push('/admin/teachers/add')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন শিক্ষক যোগ করুন</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {teachersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">শিক্ষক লোড হচ্ছে...</span>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'কোন শিক্ষক পাওয়া যায়নি' : 'কোন শিক্ষক নেই'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'অন্য কিছু দিয়ে অনুসন্ধান করুন' : 'নতুন শিক্ষক যোগ করুন'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeachers.map((teacher) => (
                <div key={teacher.uid} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center overflow-hidden">
                      {teacher.profileImage ? (
                        <img
                          src={teacher.profileImage}
                          alt={teacher.displayName || teacher.name || 'Teacher'}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {(teacher.displayName || teacher.name || 'T').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {teacher.displayName || teacher.name || 'Unknown Teacher'}
                      </h3>
                      <p className="text-sm text-gray-600">{teacher.subject || 'No Subject'}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                        teacher.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {teacher.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {teacher.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {teacher.phoneNumber || teacher.phone || 'N/A'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      অভিজ্ঞতা: {teacher.experience || 'N/A'}
                    </div>
                    {teacher.qualification && (
                      <div className="flex items-center text-sm text-gray-600">
                        <GraduationCap className="w-4 h-4 mr-2" />
                        যোগ্যতা: {teacher.qualification}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewTeacher(teacher)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-100 flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>দেখুন</span>
                    </button>
                    <button
                      onClick={() => handleEditTeacher(teacher)}
                      className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm hover:bg-green-100 flex items-center justify-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>সম্পাদনা</span>
                    </button>
                    <button
                      onClick={() => handleDownloadTeacher(teacher)}
                      disabled={isExporting}
                      className="bg-purple-50 text-purple-600 px-3 py-2 rounded-lg text-sm hover:bg-purple-100 flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="ডাউনলোড করুন"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(teacher)}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && teacherToDelete && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">শিক্ষক মুছে ফেলুন</h3>
                  <p className="text-sm text-gray-600">এটি স্থায়ীভাবে মুছে যাবে</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {(teacherToDelete.displayName || teacherToDelete.name || 'T').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{teacherToDelete.displayName || teacherToDelete.name || 'Unknown Teacher'}</p>
                    <p className="text-sm text-gray-600">{teacherToDelete.subject || 'No Subject'}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>📧 {teacherToDelete.email}</p>
                  <p>📞 {teacherToDelete.phoneNumber || teacherToDelete.phone || 'N/A'}</p>
                  <p>🎓 {teacherToDelete.experience || 'N/A'}</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>মুছে ফেলছি...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>মুছে ফেলুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeachersPageWrapper() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Block unauthorized access - only admin and super_admin can access
    if (!loading && userData?.role) {
      const role = userData.role;
      
      if (role === 'teacher') {
        router.push('/teacher/teachers');
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
      <TeachersPage />
    </ProtectedRoute>
  );
}
