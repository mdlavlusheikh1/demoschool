'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TeacherLayout from '@/components/TeacherLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { teacherQueries, User as TeacherUser, settingsQueries } from '@/lib/database-queries';
import { exportSingleTeacherToPDF } from '@/lib/export-utils';
import {
  Search,
  Plus,
  Edit,
  Eye,
  Download,
  Loader2,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Mail,
  Phone,
  CheckCircle,
  X,
} from 'lucide-react';

function TeachersPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [isExporting, setIsExporting] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const router = useRouter();
  const { userData } = useAuth();

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

  const handleViewTeacher = (teacher: TeacherUser) => {
    router.push(`/teacher/teachers/view?id=${teacher.uid}`);
  };

  const handleEditTeacher = (teacher: TeacherUser) => {
    router.push(`/teacher/teachers/edit?id=${teacher.uid}`);
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
        teacherId: (teacher as any).teacherId || (teacher as any).employeeId || teacher.uid || '-',
        employeeId: (teacher as any).employeeId || (teacher as any).teacherId || '-',
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

  return (
    <TeacherLayout title="শিক্ষক ব্যবস্থাপনা" subtitle="সকল শিক্ষকের তথ্য দেখুন এবং পরিচালনা করুন">
      <div className="space-y-6">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {messageText}
            </div>
            <button onClick={() => setShowSuccessMessage(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {(error || showErrorMessage) && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">শিক্ষক তালিকা</h2>
            <p className="text-gray-600">
              {searchTerm ? `${filteredTeachers.length} জন পাওয়া গেছে` : `মোট ${teachers.length} জন শিক্ষক`}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/teacher/teachers/add')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন শিক্ষক যোগ করুন</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="শিক্ষক খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>উন্নত অনুসন্ধান</span>
            </button>
            <button
              onClick={loadTeachers}
              disabled={teachersLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${teachersLoading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          {/* Advanced Search Filters */}
          {showAdvancedSearch && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">বিষয়</label>
                <select
                  value={searchFilters.subject}
                  onChange={(e) => setSearchFilters({ ...searchFilters, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">সকল বিষয়</option>
                  {uniqueSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">অবস্থা</label>
                <select
                  value={searchFilters.status}
                  onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">সকল</option>
                  <option value="active">সক্রিয়</option>
                  <option value="inactive">নিষ্ক্রিয়</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">অভিজ্ঞতা</label>
                <input
                  type="text"
                  placeholder="অভিজ্ঞতা খুঁজুন..."
                  value={searchFilters.experience}
                  onChange={(e) => setSearchFilters({ ...searchFilters, experience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute requireAuth={true}>
      <TeachersPage />
    </ProtectedRoute>
  );
}
