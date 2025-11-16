'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProtectedRoute from '@/components/ProtectedRoute';
import { teacherQueries, User as TeacherUser, settingsQueries } from '@/lib/database-queries';
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
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Save,
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
  Loader2,
  Package,
} from 'lucide-react';

interface TeacherAttendanceRecord {
  id?: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  timestamp?: any;
  markedBy?: string;
  remarks?: string;
}

function TeacherAttendancePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState<string | React.ReactNode>('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();


  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadTeachers();
        loadAttendanceRecords();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load attendance records when date changes
  useEffect(() => {
    if (user && teachers.length > 0) {
      loadAttendanceRecords();
    }
  }, [user, selectedDate, teachers]);

  const loadTeachers = async () => {
    if (!user) return;

    setTeachersLoading(true);
    setError('');

    try {
      const teachersData = await teacherQueries.getAllTeachers();
      setTeachers(teachersData.filter(t => t.isActive !== false));
    } catch (error) {
      console.error('Error loading teachers:', error);
      setError('শিক্ষক লোড করতে সমস্যা হয়েছে');
    } finally {
      setTeachersLoading(false);
    }
  };

  const loadAttendanceRecords = async () => {
    if (!user) return;

    setAttendanceLoading(true);
    setError('');

    try {
      const attendanceRef = collection(db, 'teacherAttendance');
      const q = query(
        attendanceRef,
        where('date', '==', selectedDate)
      );

      const querySnapshot = await getDocs(q);
      const records: TeacherAttendanceRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as TeacherAttendanceRecord);
      });

      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance records:', error);
      setError('উপস্থিতি রেকর্ড লোড করতে সমস্যা হয়েছে');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getTeacherAttendance = (teacherId: string): TeacherAttendanceRecord | undefined => {
    return attendanceRecords.find(r => r.teacherId === teacherId);
  };

  const markTeacherAttendance = async (teacherId: string, status: 'present' | 'absent' | 'late' | 'leave') => {
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const teacher = teachers.find(t => t.uid === teacherId);
      if (!teacher) {
        setError('শিক্ষক পাওয়া যায়নি');
        return;
      }

      const existingRecord = getTeacherAttendance(teacherId);
      const attendanceData: TeacherAttendanceRecord = {
        teacherId,
        teacherName: teacher.displayName || teacher.name || 'Unknown',
        teacherEmail: teacher.email || '',
        date: selectedDate,
        status,
        timestamp: serverTimestamp(),
        markedBy: user.uid
      };

      if (existingRecord?.id) {
        // Update existing record
        const docRef = doc(db, 'teacherAttendance', existingRecord.id);
        await setDoc(docRef, {
          ...attendanceData,
          updatedAt: serverTimestamp()
        }, { merge: true });
        setSuccess(`${teacher.displayName || teacher.name} এর উপস্থিতি আপডেট করা হয়েছে`);
      } else {
        // Create new record
        const docRef = doc(collection(db, 'teacherAttendance'));
        await setDoc(docRef, attendanceData);
        setSuccess(`${teacher.displayName || teacher.name} এর উপস্থিতি মার্ক করা হয়েছে`);
      }

      await loadAttendanceRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError('উপস্থিতি মার্ক করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (teacher.displayName || teacher.name || '').toLowerCase().includes(searchLower) ||
      (teacher.email || '').toLowerCase().includes(searchLower) ||
      (teacher.phoneNumber || '').includes(searchTerm)
    );
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'leave':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'উপস্থিত';
      case 'absent':
        return 'অনুপস্থিত';
      case 'late':
        return 'বিলম্বে';
      case 'leave':
        return 'ছুটি';
      default:
        return 'মার্ক করা হয়নি';
    }
  };

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
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-gray-800"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">শিক্ষক উপস্থিতি</h1>
                <p className="text-sm text-gray-600">শিক্ষকদের উপস্থিতি দেখুন এবং নিন</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-2 flex-1">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="শিক্ষক খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadAttendanceRecords}
                  disabled={attendanceLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${attendanceLoading ? 'animate-spin' : ''}`} />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>
          </div>


          {/* Teachers List */}
          {teachersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">কোন শিক্ষক পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        শিক্ষক
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ইমেইল
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ফোন
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        অবস্থা
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        কার্যক্রম
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTeachers.map((teacher) => {
                      const attendance = getTeacherAttendance(teacher.uid);
                      return (
                        <tr key={teacher.uid} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                {(teacher as any).profileImage ? (
                                  <img
                                    src={(teacher as any).profileImage}
                                    alt={teacher.displayName || teacher.name || 'Teacher'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white font-bold">
                                    {(teacher.displayName || teacher.name || 'T').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {teacher.displayName || teacher.name || 'Unknown'}
                                </div>
                                {(teacher as any).subject && (
                                  <div className="text-sm text-gray-500">{(teacher as any).subject}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{teacher.email || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{teacher.phoneNumber || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {attendance ? (
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(attendance.status)}`}>
                                {getStatusLabel(attendance.status)}
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-300">
                                মার্ক করা হয়নি
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => markTeacherAttendance(teacher.uid, 'present')}
                                disabled={saving}
                                className={`px-3 py-1 text-xs font-medium rounded ${
                                  attendance?.status === 'present'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                উপস্থিত
                              </button>
                              <button
                                onClick={() => markTeacherAttendance(teacher.uid, 'late')}
                                disabled={saving}
                                className={`px-3 py-1 text-xs font-medium rounded ${
                                  attendance?.status === 'late'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                বিলম্বে
                              </button>
                              <button
                                onClick={() => markTeacherAttendance(teacher.uid, 'absent')}
                                disabled={saving}
                                className={`px-3 py-1 text-xs font-medium rounded ${
                                  attendance?.status === 'absent'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                অনুপস্থিত
                              </button>
                              <button
                                onClick={() => markTeacherAttendance(teacher.uid, 'leave')}
                                disabled={saving}
                                className={`px-3 py-1 text-xs font-medium rounded ${
                                  attendance?.status === 'leave'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                ছুটি
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          {filteredTeachers.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-sm text-gray-600">মোট শিক্ষক</div>
                <div className="text-2xl font-bold text-gray-900">{filteredTeachers.length}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-sm text-gray-600">উপস্থিত</div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredTeachers.filter(t => getTeacherAttendance(t.uid)?.status === 'present').length}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-sm text-gray-600">অনুপস্থিত</div>
                <div className="text-2xl font-bold text-red-600">
                  {filteredTeachers.filter(t => getTeacherAttendance(t.uid)?.status === 'absent').length}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-sm text-gray-600">বিলম্বে/ছুটি</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredTeachers.filter(t => {
                    const status = getTeacherAttendance(t.uid)?.status;
                    return status === 'late' || status === 'leave';
                  }).length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <TeacherAttendancePage />
    </ProtectedRoute>
  );
}

