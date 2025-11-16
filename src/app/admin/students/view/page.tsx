'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { studentQueries, User as StudentUser } from '@/lib/database-queries';
import { getProxyUrl } from '@/lib/imagekit-utils';
import { settingsQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
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
  Heart,
  ArrowLeft,
  MapPin,
  User,
  Calendar as CalendarIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  Building as BuildingIcon,
  GraduationCap as GraduationCapIcon,
  Globe,
  FileText,
  FileCheck,
  Download,
  ExternalLink,
  Upload,
  BookOpen as BookOpenIcon,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  Users as UsersIcon,
  AlertCircle
} from 'lucide-react';

function StudentViewPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingDocuments, setUploadingDocuments] = useState<Record<string, boolean>>({});
  const [documentProgress, setDocumentProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('id');
  const { userData } = useAuth();

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  useEffect(() => {
    if (!auth) return;

    let firestoreUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        if (studentId) {
          await loadStudent(studentId);
          // Set up real-time listener
          firestoreUnsubscribe = setupRealtimeListener(studentId);
        }
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [router, studentId]);

  // Real-time listener for student updates
  const setupRealtimeListener = (id: string) => {
    if (!id) return;
    
    const studentRef = doc(db, 'students', id);
    
    const unsubscribe = onSnapshot(studentRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const studentData = { uid: docSnapshot.id, ...docSnapshot.data() } as StudentUser;
        console.log('🔄 Real-time update received:', studentData);
        setStudent(studentData);
      } else {
        setError('শিক্ষার্থী পাওয়া যায়নি');
      }
    }, (error) => {
      console.error('Error in real-time listener:', error);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  };

  const loadStudent = async (id: string) => {
    setStudentLoading(true);
    setError('');

    try {
      const studentData = await studentQueries.getStudentById(id);
      console.log('🔍 Student ID:', id);
      console.log('🔍 Student Data:', studentData);
      
      if (studentData) {
        console.log('🔍 Student Name:', studentData.name || studentData.displayName);
        console.log('🔍 Student Email:', studentData.email);
        console.log('🔍 Student Class:', studentData.class);
        console.log('🔍 Student Father:', studentData.fatherName);
        console.log('🔍 Student Mother:', studentData.motherName);
        setStudent(studentData);
      } else {
        setError('শিক্ষার্থী পাওয়া যায়নি');
      }
    } catch (error) {
      console.error('Error loading student:', error);
      setError('শিক্ষার্থী লোড করতে সমস্যা হয়েছে');
    } finally {
      setStudentLoading(false);
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

  const handleEditStudent = () => {
    if (student) {
      router.push(`/admin/students/edit?id=${student.uid}`);
    }
  };

  const handleDeleteStudent = async () => {
    if (!student) return;

    if (!confirm('আপনি কি এই শিক্ষার্থীকে মুছে ফেলতে চান? এটি স্থায়ীভাবে মুছে যাবে।')) return;

    try {
      await studentQueries.deleteStudent(student.uid);
      router.push('/admin/students');
    } catch (error) {
      console.error('Error deleting student:', error);
      setError('শিক্ষার্থী মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const uploadDocumentToImageKit = async (file: File, documentType: string): Promise<string | null> => {
    try {
      console.log(`📄 Starting document upload for ${documentType}...`);
      setUploadingDocuments(prev => ({ ...prev, [documentType]: true }));
      setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));

      const authResponse = await fetch('/api/imagekit');
      if (!authResponse.ok) {
        const authError = await authResponse.json().catch(() => null);
        console.error('ImageKit auth error:', authError);
        setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
        setUploadErrors(prev => ({ ...prev, [documentType]: authError?.message || 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।' }));
        return null;
      }

      const authData = await authResponse.json();
      const loadedSettings = await settingsQueries.getSettings();
      const schoolId = loadedSettings?.schoolCode || 'default';
      const studentIdForUpload = student?.studentId || `temp-${Date.now()}`;
      const fileName = `doc-${documentType}-${studentIdForUpload}-${Date.now()}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('folder', `/school-management/students/${schoolId}/documents`);
      formData.append('tags', `document,${documentType},student,${schoolId},${studentIdForUpload}`);
      formData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');
      formData.append('token', authData.token);
      formData.append('expire', authData.expire?.toString() || '');
      formData.append('signature', authData.signature);

      return await new Promise<string | null>((resolve) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setDocumentProgress(prev => ({ ...prev, [documentType]: progress }));
            console.log(`📊 Upload progress for ${documentType}: ${progress}%`);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log(`✅ Document upload successful for ${documentType}:`, response);
              setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
              setDocumentProgress(prev => ({ ...prev, [documentType]: 100 }));
              setUploadErrors(prev => ({ ...prev, [documentType]: '' }));
              resolve(response.url);
            } catch (parseError) {
              console.error(`❌ Failed to parse upload response for ${documentType}:`, parseError);
              setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
              setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));
              setUploadErrors(prev => ({ ...prev, [documentType]: 'ডকুমেন্ট আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' }));
              resolve(null);
            }
          } else {
            console.error(`❌ Upload failed for ${documentType} with status:`, xhr.status);
            setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
            setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));
            setUploadErrors(prev => ({ ...prev, [documentType]: 'ডকুমেন্ট আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' }));
            resolve(null);
          }
        });

        xhr.addEventListener('error', (error) => {
          console.error(`❌ Upload network error for ${documentType}:`, error);
          setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
          setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));
          setUploadErrors(prev => ({ ...prev, [documentType]: 'নেটওয়ার্ক সমস্যার কারণে আপলোড ব্যর্থ হয়েছে।' }));
          resolve(null);
        });

        xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
        xhr.send(formData);
      });
    } catch (error) {
      console.error(`❌ Document upload error for ${documentType}:`, error);
      setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
      setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));
      setUploadErrors(prev => ({ ...prev, [documentType]: 'ডকুমেন্ট আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' }));
      return null;
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadErrors(prev => ({ ...prev, [documentType]: 'ফাইলের আকার ১০MB এর বেশি হতে পারবে না' }));
      return;
    }

    // Accept images and PDFs
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setUploadErrors(prev => ({ ...prev, [documentType]: 'শুধুমাত্র ছবি বা PDF ফাইল আপলোড করুন' }));
      return;
    }

    setUploadErrors(prev => ({ ...prev, [documentType]: '' }));
    const uploadedUrl = await uploadDocumentToImageKit(file, documentType);
    
    if (uploadedUrl && student) {
      setIsUpdating(true);
      try {
        await studentQueries.updateStudent(student.uid, {
          [documentType]: uploadedUrl
        } as any);
        // Reload student data
        await loadStudent(student.uid);
        setUploadErrors(prev => ({ ...prev, [documentType]: '' }));
      } catch (error) {
        console.error(`Error updating student document ${documentType}:`, error);
        setUploadErrors(prev => ({ ...prev, [documentType]: 'ডকুমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে।' }));
      } finally {
        setIsUpdating(false);
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

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: true },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষার্থী দেখুন</h1>
                  <p className="text-sm text-gray-600 leading-tight">শিক্ষার্থীর বিস্তারিত তথ্য</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                  {((userData as any)?.photoURL || user?.photoURL) && !imageError ? (
                    <img
                      src={(userData as any)?.photoURL || user?.photoURL || ''}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <span className="text-white font-medium text-sm">
                      {(user?.email?.charAt(0) || userData?.email?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
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
              onClick={() => router.push('/admin/students')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>শিক্ষার্থী তালিকায় ফিরে যান</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Loading State */}
          {studentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">শিক্ষার্থী লোড হচ্ছে...</span>
            </div>
          ) : !student ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">শিক্ষার্থী পাওয়া যায়নি</h3>
              <p className="mt-1 text-sm text-gray-500">এই শিক্ষার্থীটি আর বিদ্যমান নেই</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Student Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
                      {student.profileImage ? (
                        <img
                          src={student.profileImage}
                          alt={student.displayName || student.name || 'Student'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-2xl">
                          {student.displayName?.split(' ')[0].charAt(0) || student.email?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{student.displayName || student.name || 'Unknown Student'}</h2>
                      <p className="text-gray-600">ID: {student.studentId || 'N/A'}</p>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
                        student.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleEditStudent}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>সম্পাদনা</span>
                    </button>
                    <button
                      onClick={handleDeleteStudent}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>মুছে ফেলুন</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    মৌলিক তথ্য
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <UserCheck className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">নাম</p>
                        <p className="font-medium">{student.displayName || student.name || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <MailIcon className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">ইমেইল</p>
                        <p className="font-medium">{student.email || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <PhoneIcon className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">ফোন নম্বর</p>
                        <p className="font-medium">{student.phoneNumber || student.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">যোগদানের তারিখ</p>
                        <p className="font-medium">
                          {student.createdAt ? new Date(student.createdAt.toDate()).toLocaleDateString('bn-BD') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <GraduationCapIcon className="w-5 h-5 mr-2" />
                    একাডেমিক তথ্য
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <BuildingIcon className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">ক্লাস</p>
                        <p className="font-medium">{student.class || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className="w-4 h-4 mr-3 text-gray-400">বি</span>
                      <div>
                        <p className="text-sm text-gray-600">বিভাগ</p>
                        <p className="font-medium">{student.section || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className="w-4 h-4 mr-3 text-gray-400">গ্রু</span>
                      <div>
                        <p className="text-sm text-gray-600">গ্রুপ</p>
                        <p className="font-medium">{student.group || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className="w-4 h-4 mr-3 text-gray-400">ID</span>
                      <div>
                        <p className="text-sm text-gray-600">রোল নম্বর</p>
                        <p className="font-medium">{student.rollNumber || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">রেজিস্ট্রেশন নম্বর</p>
                        <p className="font-medium font-mono">{(student as any).registrationNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guardian Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    গার্ডিয়ান
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">গার্ডিয়ানের নাম</p>
                      <p className="font-medium">
                        {student.fatherName || student.motherName || student.guardianName || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">গার্ডিয়ানের ফোন</p>
                      <p className="font-medium">
                        {(student as any).fatherPhone || (student as any).motherPhone || student.guardianPhone || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">গার্ডিয়ানের পেশা</p>
                      <p className="font-medium">
                        {(student as any).fatherOccupation || (student as any).motherOccupation || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    ব্যক্তিগত তথ্য
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">জন্ম তারিখ</p>
                      <p className="font-medium">{student.dateOfBirth || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">রোল নম্বর</p>
                      <p className="font-medium">{student.rollNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Previous School Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BuildingIcon className="w-5 h-5 mr-2" />
                    পূর্ববর্তী স্কুল তথ্য
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">পূর্ববর্তী স্কুল</p>
                      <p className="font-medium">{(student as any).previousSchool || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">পূর্ববর্তী ক্লাস</p>
                      <p className="font-medium">{(student as any).previousClass || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">পূর্ববর্তী স্কুলের ঠিকানা</p>
                      <p className="font-medium">{(student as any).previousSchoolAddress || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">স্কুল পরিবর্তনের কারণ</p>
                      <p className="font-medium">{(student as any).reasonForLeaving || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">পূর্ববর্তী GPA</p>
                      <p className="font-medium">{(student as any).previousGPA || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    ঠিকানা
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">ঠিকানা</p>
                      <p className="font-medium">{student.address || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">পোস্টাল কোড</p>
                      <p className="font-medium">{(student as any).postalCode || 'N/A'}</p>
                    </div>

                    {(student as any).division && (
                      <div>
                        <p className="text-sm text-gray-600">বিভাগ</p>
                        <p className="font-medium">{(student as any).division}</p>
                      </div>
                    )}

                    {(student as any).district && !(student as any).division && (
                      <div>
                        <p className="text-sm text-gray-600">জেলা</p>
                        <p className="font-medium">{(student as any).district}</p>
                      </div>
                    )}

                    {(student as any).district && (student as any).division && (
                      <div>
                        <p className="text-sm text-gray-600">জেলা</p>
                        <p className="font-medium">{(student as any).district}</p>
                      </div>
                    )}

                    {(student as any).upazila && (
                      <div>
                        <p className="text-sm text-gray-600">উপজেলা</p>
                        <p className="font-medium">{(student as any).upazila || 'N/A'}</p>
                      </div>
                    )}

                    {(student as any).union && (
                      <div>
                        <p className="text-sm text-gray-600">ইউনিয়ন</p>
                        <p className="font-medium">{(student as any).union || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileCheck className="w-5 h-5 mr-2" />
                    ডকুমেন্টস
                  </h3>
                  <div className="space-y-6">
                    {/* Student Documents */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">শিক্ষার্থীর ডকুমেন্টস</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Student Birth Certificate */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">জন্ম নিবন্ধন</p>
                          {(student as any).studentBirthCertificate ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <a
                                  href={getProxyUrl((student as any).studentBirthCertificate)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 text-sm"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>দেখুন</span>
                                </a>
                                <span className="text-gray-400">|</span>
                                <a
                                  href={getProxyUrl((student as any).studentBirthCertificate)}
                                  download
                                  className="text-green-600 hover:text-green-800 flex items-center space-x-2 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>ডাউনলোড</span>
                                </a>
                              </div>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড/পরিবর্তন করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'studentBirthCertificate')}
                                  className="hidden"
                                  disabled={uploadingDocuments.studentBirthCertificate || isUpdating}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500 mb-2">N/A</p>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'studentBirthCertificate')}
                                  className="hidden"
                                  disabled={uploadingDocuments.studentBirthCertificate || isUpdating}
                                />
                              </label>
                            </div>
                          )}
                          {uploadingDocuments.studentBirthCertificate && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${documentProgress.studentBirthCertificate || 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">আপলোড হচ্ছে... {documentProgress.studentBirthCertificate || 0}%</p>
                            </div>
                          )}
                          {uploadErrors.studentBirthCertificate && (
                            <p className="text-xs text-red-600 mt-1">{uploadErrors.studentBirthCertificate}</p>
                          )}
                        </div>

                        {/* Student Vaccination Card */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">টিকার কার্ড</p>
                          {(student as any).studentVaccinationCard ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <a
                                  href={getProxyUrl((student as any).studentVaccinationCard)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 text-sm"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>দেখুন</span>
                                </a>
                                <span className="text-gray-400">|</span>
                                <a
                                  href={getProxyUrl((student as any).studentVaccinationCard)}
                                  download
                                  className="text-green-600 hover:text-green-800 flex items-center space-x-2 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>ডাউনলোড</span>
                                </a>
                              </div>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড/পরিবর্তন করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'studentVaccinationCard')}
                                  className="hidden"
                                  disabled={uploadingDocuments.studentVaccinationCard || isUpdating}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500 mb-2">N/A</p>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'studentVaccinationCard')}
                                  className="hidden"
                                  disabled={uploadingDocuments.studentVaccinationCard || isUpdating}
                                />
                              </label>
                            </div>
                          )}
                          {uploadingDocuments.studentVaccinationCard && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${documentProgress.studentVaccinationCard || 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">আপলোড হচ্ছে... {documentProgress.studentVaccinationCard || 0}%</p>
                            </div>
                          )}
                          {uploadErrors.studentVaccinationCard && (
                            <p className="text-xs text-red-600 mt-1">{uploadErrors.studentVaccinationCard}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Parents Documents */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">পিতা-মাতার ডকুমেন্টস</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Father Birth Certificate */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">পিতার জন্ম নিবন্ধন</p>
                          {(student as any).fatherBirthCertificate ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <a
                                  href={getProxyUrl((student as any).fatherBirthCertificate)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 text-sm"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>দেখুন</span>
                                </a>
                                <span className="text-gray-400">|</span>
                                <a
                                  href={getProxyUrl((student as any).fatherBirthCertificate)}
                                  download
                                  className="text-green-600 hover:text-green-800 flex items-center space-x-2 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>ডাউনলোড</span>
                                </a>
                              </div>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড/পরিবর্তন করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'fatherBirthCertificate')}
                                  className="hidden"
                                  disabled={uploadingDocuments.fatherBirthCertificate || isUpdating}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500 mb-2">N/A</p>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'fatherBirthCertificate')}
                                  className="hidden"
                                  disabled={uploadingDocuments.fatherBirthCertificate || isUpdating}
                                />
                              </label>
                            </div>
                          )}
                          {uploadingDocuments.fatherBirthCertificate && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${documentProgress.fatherBirthCertificate || 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">আপলোড হচ্ছে... {documentProgress.fatherBirthCertificate || 0}%</p>
                            </div>
                          )}
                          {uploadErrors.fatherBirthCertificate && (
                            <p className="text-xs text-red-600 mt-1">{uploadErrors.fatherBirthCertificate}</p>
                          )}
                        </div>

                        {/* Father Voter ID */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">পিতার ভোটার আইডি কার্ড</p>
                          {(student as any).fatherVoterId ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <a
                                  href={getProxyUrl((student as any).fatherVoterId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 text-sm"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>দেখুন</span>
                                </a>
                                <span className="text-gray-400">|</span>
                                <a
                                  href={getProxyUrl((student as any).fatherVoterId)}
                                  download
                                  className="text-green-600 hover:text-green-800 flex items-center space-x-2 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>ডাউনলোড</span>
                                </a>
                              </div>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড/পরিবর্তন করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'fatherVoterId')}
                                  className="hidden"
                                  disabled={uploadingDocuments.fatherVoterId || isUpdating}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500 mb-2">N/A</p>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'fatherVoterId')}
                                  className="hidden"
                                  disabled={uploadingDocuments.fatherVoterId || isUpdating}
                                />
                              </label>
                            </div>
                          )}
                          {uploadingDocuments.fatherVoterId && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${documentProgress.fatherVoterId || 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">আপলোড হচ্ছে... {documentProgress.fatherVoterId || 0}%</p>
                            </div>
                          )}
                          {uploadErrors.fatherVoterId && (
                            <p className="text-xs text-red-600 mt-1">{uploadErrors.fatherVoterId}</p>
                          )}
                        </div>

                        {/* Mother Birth Certificate */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">মাতার জন্ম নিবন্ধন</p>
                          {(student as any).motherBirthCertificate ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <a
                                  href={getProxyUrl((student as any).motherBirthCertificate)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 text-sm"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>দেখুন</span>
                                </a>
                                <span className="text-gray-400">|</span>
                                <a
                                  href={getProxyUrl((student as any).motherBirthCertificate)}
                                  download
                                  className="text-green-600 hover:text-green-800 flex items-center space-x-2 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>ডাউনলোড</span>
                                </a>
                              </div>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড/পরিবর্তন করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'motherBirthCertificate')}
                                  className="hidden"
                                  disabled={uploadingDocuments.motherBirthCertificate || isUpdating}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500 mb-2">N/A</p>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'motherBirthCertificate')}
                                  className="hidden"
                                  disabled={uploadingDocuments.motherBirthCertificate || isUpdating}
                                />
                              </label>
                            </div>
                          )}
                          {uploadingDocuments.motherBirthCertificate && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${documentProgress.motherBirthCertificate || 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">আপলোড হচ্ছে... {documentProgress.motherBirthCertificate || 0}%</p>
                            </div>
                          )}
                          {uploadErrors.motherBirthCertificate && (
                            <p className="text-xs text-red-600 mt-1">{uploadErrors.motherBirthCertificate}</p>
                          )}
                        </div>

                        {/* Mother Voter ID */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">মাতার ভোটার আইডি কার্ড</p>
                          {(student as any).motherVoterId ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <a
                                  href={getProxyUrl((student as any).motherVoterId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 text-sm"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>দেখুন</span>
                                </a>
                                <span className="text-gray-400">|</span>
                                <a
                                  href={getProxyUrl((student as any).motherVoterId)}
                                  download
                                  className="text-green-600 hover:text-green-800 flex items-center space-x-2 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>ডাউনলোড</span>
                                </a>
                              </div>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড/পরিবর্তন করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'motherVoterId')}
                                  className="hidden"
                                  disabled={uploadingDocuments.motherVoterId || isUpdating}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500 mb-2">N/A</p>
                              <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                <span>আপলোড করুন</span>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'motherVoterId')}
                                  className="hidden"
                                  disabled={uploadingDocuments.motherVoterId || isUpdating}
                                />
                              </label>
                            </div>
                          )}
                          {uploadingDocuments.motherVoterId && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${documentProgress.motherVoterId || 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">আপলোড হচ্ছে... {documentProgress.motherVoterId || 0}%</p>
                            </div>
                          )}
                          {uploadErrors.motherVoterId && (
                            <p className="text-xs text-red-600 mt-1">{uploadErrors.motherVoterId}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* School Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BuildingIcon className="w-5 h-5 mr-2" />
                  স্কুল তথ্য
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">স্কুল আইডি</p>
                    <p className="font-medium">{student.schoolId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">স্কুলের নাম</p>
                    <p className="font-medium">{student.schoolName || 'N/A'}</p>
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

export default function StudentViewPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <StudentViewPage />
    </ProtectedRoute>
  );
}
