'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProtectedRoute from '@/components/ProtectedRoute';
import { attendanceQueries, studentQueries, classQueries, User as StudentUser, AttendanceRecord, Class } from '@/lib/database-queries';
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
  Package,
  Save,
  RefreshCw,
  AlertCircle,
  QrCode,
  Globe,
  FileText,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
} from 'lucide-react';

function AttendancePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkAttendanceStatus, setBulkAttendanceStatus] = useState<'present' | 'absent' | 'late'>('present');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadStudents();
        loadAttendanceRecords();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load students and classes when component mounts
  useEffect(() => {
    if (user) {
      loadStudents();
      loadClasses();
    }
  }, [user]);

  // Load attendance records when date or class changes
  useEffect(() => {
    if (user) {
      loadAttendanceRecords();
    }
  }, [user, selectedDate, selectedClass]);

  const loadStudents = async () => {
    if (!user) return;

    setStudentsLoading(true);
    setError('');

    try {
      const studentsData = await studentQueries.getAllStudents();
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      setError('শিক্ষার্থী লোড করতে সমস্যা হয়েছে');
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadClasses = async () => {
    if (!user) return;

    setClassesLoading(true);

    try {
      console.log('Loading classes from Firebase...');
      const classesData = await classQueries.getAllClasses();
      console.log('Classes loaded from Firebase:', classesData);
      console.log('Number of classes:', classesData.length);

      if (classesData.length === 0) {
        console.log('No classes found in database. You may need to create some classes first.');
        // Add some default classes for testing
        const defaultClasses = [
          {
            classId: 'nursery',
            className: 'নার্সারি',
            section: 'A',
            schoolId: 'iqra-school',
            schoolName: 'আমার স্কুল',
            teacherId: user.uid,
            teacherName: user.displayName || user.email || 'Unknown Teacher',
            academicYear: '2025',
            totalStudents: 0,
            isActive: true
          },
          {
            classId: 'class1',
            className: 'ক্লাস ১',
            section: 'A',
            schoolId: 'iqra-school',
            schoolName: 'আমার স্কুল',
            teacherId: user.uid,
            teacherName: user.displayName || user.email || 'Unknown Teacher',
            academicYear: '2025',
            totalStudents: 0,
            isActive: true
          },
          {
            classId: 'class2',
            className: 'ক্লাস ২',
            section: 'A',
            schoolId: 'iqra-school',
            schoolName: 'আমার স্কুল',
            teacherId: user.uid,
            teacherName: user.displayName || user.email || 'Unknown Teacher',
            academicYear: '2025',
            totalStudents: 0,
            isActive: true
          }
        ];

        for (const classData of defaultClasses) {
          try {
            await classQueries.createClass(classData);
            console.log('Created default class:', classData.className);
          } catch (createError) {
            console.error('Error creating default class:', createError);
          }
        }

        // Try loading classes again after creating defaults
        const retryClassesData = await classQueries.getAllClasses();
        console.log('Classes after retry:', retryClassesData);
        setClasses(retryClassesData);
      } else {
        setClasses(classesData);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setError('ক্লাস লোড করতে সমস্যা হয়েছে');
    } finally {
      setClassesLoading(false);
    }
  };

  const loadAttendanceRecords = async () => {
    if (!user) return;

    setAttendanceLoading(true);
    setError('');

    try {
      console.log('Loading attendance records for date:', selectedDate, 'class:', selectedClass);

      // Get attendance records for the selected date and class
      const records = await attendanceQueries.getAttendanceByDateAndClass(selectedDate, selectedClass);

      console.log('Loaded attendance records:', records.length);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance records:', error);
      setError('উপস্থিতি রেকর্ড লোড করতে সমস্যা হয়েছে');
    } finally {
      setAttendanceLoading(false);
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

  const markStudentAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!user) return;

    try {
      // Check if student already has attendance record for today
      const existingRecord = attendanceRecords.find(r => r.studentId === studentId && r.date === selectedDate);

      if (existingRecord) {
        // Update existing record
        await attendanceQueries.updateAttendance(existingRecord.id!, { status });
        setSuccess(`উপস্থিতি আপডেট করা হয়েছে: ${status === 'present' ? 'উপস্থিত' : status === 'late' ? 'বিলম্বে' : 'অনুপস্থিত'}`);
      } else {
        // Create new record
        const attendanceData = {
          studentId,
          studentName: students.find(s => s.uid === studentId)?.displayName || 'Unknown',
          classId: selectedClass,
          className: selectedClass,
          schoolId: 'iqra-school',
          date: selectedDate,
          status,
          timestamp: serverTimestamp() as any,
          teacherId: user.uid,
          method: 'manual' as const
        };

        await attendanceQueries.recordAttendance(attendanceData);
        setSuccess(`উপস্থিতি মার্ক করা হয়েছে: ${status === 'present' ? 'উপস্থিত' : status === 'late' ? 'বিলম্বে' : 'অনুপস্থিত'}`);
      }

      await loadAttendanceRecords(); // Refresh the records
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError('উপস্থিতি মার্ক করতে সমস্যা হয়েছে');
    }
  };

  const handleBulkAttendanceMark = async () => {
    if (!user || selectedStudents.length === 0) return;

    setAttendanceLoading(true);
    try {
      const promises = selectedStudents.map(studentId =>
        attendanceQueries.recordAttendance({
          studentId,
          studentName: students.find(s => s.uid === studentId)?.displayName || 'Unknown',
          classId: selectedClass,
          className: selectedClass,
          schoolId: 'iqra-school',
          date: selectedDate,
          status: bulkAttendanceStatus,
          timestamp: serverTimestamp() as any,
          teacherId: user.uid,
          method: 'manual'
        })
      );

      await Promise.all(promises);
      await loadAttendanceRecords();
      setShowAttendanceModal(false);
      setSelectedStudents([]);
      alert(`${selectedStudents.length} জন শিক্ষার্থীর উপস্থিতি মার্ক করা হয়েছে`);
    } catch (error) {
      console.error('Error marking bulk attendance:', error);
      setError('বাল্ক উপস্থিতি মার্ক করতে সমস্যা হয়েছে');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getStudentAttendanceStatus = (studentId: string) => {
    const record = attendanceRecords.find(r => r.studentId === studentId && r.date === selectedDate);
    return record?.status || null;
  };

  const getBengaliStatus = (status: string) => {
    switch (status) {
      case 'present': return 'উপস্থিত';
      case 'absent': return 'অনুপস্থিত';
      case 'late': return 'বিলম্বে';
      default: return 'পেন্ডিং';
    }
  };

  // Filter students based on search and class
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm ||
      student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = selectedClass === 'all' || student.class === selectedClass;

    return matchesSearch && matchesClass;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
      }
    }

    return pages;
  };

  // Calculate stats from real data - only for selected date
  const todaysAttendanceRecords = attendanceRecords.filter(r => r.date === selectedDate);

  // Create a unique map of students for today to avoid duplicates
  const uniqueStudentsToday = new Map();
  todaysAttendanceRecords.forEach(record => {
    if (!uniqueStudentsToday.has(record.studentId)) {
      uniqueStudentsToday.set(record.studentId, record);
    }
  });

  const attendanceStats = {
    total: filteredStudents.length,
    present: Array.from(uniqueStudentsToday.values()).filter(r => r.status === 'present').length,
    absent: Array.from(uniqueStudentsToday.values()).filter(r => r.status === 'absent').length,
    late: Array.from(uniqueStudentsToday.values()).filter(r => r.status === 'late').length
  };

  // Calculate percentage correctly
  const totalMarked = attendanceStats.present + attendanceStats.absent + attendanceStats.late;
  const attendancePercentage = totalMarked > 0
    ? ((attendanceStats.present + attendanceStats.late) / totalMarked * 100).toFixed(1)
    : '0';

  console.log('Attendance Stats Debug:', {
    selectedDate,
    totalStudents: attendanceStats.total,
    todaysRecords: todaysAttendanceRecords.length,
    uniqueStudentsToday: uniqueStudentsToday.size,
    present: attendanceStats.present,
    absent: attendanceStats.absent,
    late: attendanceStats.late,
    totalMarked,
    percentage: attendancePercentage,
    sampleRecords: todaysAttendanceRecords.slice(0, 3).map(r => ({
      studentId: r.studentId,
      date: r.date,
      status: r.status
    }))
  });

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
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: true },
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
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
      <div className="flex-1 lg:ml-64">
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">উপস্থিতি ব্যবস্থাপনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">শিক্ষার্থীদের উপস্থিতি ট্র্যাক করুন</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 h-full">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="শিক্ষার্থী খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 w-64"
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
        <div className="p-4 lg:p-4 bg-gray-50 min-h-screen">
          {/* Attendance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট শিক্ষার্থী</p>
                  <p className="text-2xl font-bold text-gray-900">{attendanceStats.total}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">উপস্থিত</p>
                  <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">অনুপস্থিত</p>
                  <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">উপস্থিতির হার</p>
                  <p className="text-2xl font-bold text-blue-600">{attendancePercentage}%</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Report Card */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg border border-blue-200 p-6 mb-6 cursor-pointer hover:shadow-xl transition-shadow" onClick={() => router.push('/admin/attendance/report')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">উপস্থিতি রিপোর্ট</h3>
                  <p className="text-blue-100 text-sm">বিভিন্ন ধরনের উপস্থিতি রিপোর্ট তৈরি করুন</p>
                </div>
              </div>
              <div className="text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Filters and Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ক্লাস</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">সকল ক্লাস</option>
                    {classesLoading ? (
                      <option value="" disabled>ক্লাস লোড হচ্ছে...</option>
                    ) : (
                      classes.map((classItem) => (
                        <option key={classItem.classId} value={classItem.classId}>
                          {classItem.className} {classItem.section ? `(${classItem.section})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <a
                  href="/admin/attendance/take"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR দিয়ে উপস্থিতি নিন</span>
                </a>
                <button
                  onClick={() => setShowAttendanceModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>বাল্ক মার্ক</span>
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>রিপোর্ট</span>
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">শিক্ষার্থী</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্লাস</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">রোল</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থা</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">সময়</th>

                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                          শিক্ষার্থী লোড হচ্ছে...
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        কোন শিক্ষার্থী পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => {
                      const currentStatus = getStudentAttendanceStatus(student.uid);
                      const statusText = currentStatus ? getBengaliStatus(currentStatus) : 'পেন্ডিং';
                      const record = attendanceRecords.find(r => r.studentId === student.uid && r.date === selectedDate);

                      return (
                        <tr key={student.uid} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
                                {student.profileImage ? (
                                  <img
                                    src={student.profileImage}
                                    alt={student.displayName || 'Student'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white font-medium text-sm">
                                    {student.displayName?.split(' ')[0].charAt(0) || student.email?.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{student.displayName || student.name || 'Unknown'}</div>
                                <div className="text-sm text-gray-500">{student.studentId || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.class || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.studentId || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              currentStatus === 'present'
                                ? 'bg-green-100 text-green-800'
                                : currentStatus === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : currentStatus === 'late'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record?.firstScanTime ? (
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                {new Date(record.firstScanTime.toDate()).toLocaleTimeString('bn-BD', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            ) : record?.timestamp ? (
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                {new Date(record.timestamp.toDate()).toLocaleTimeString('bn-BD', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center text-sm text-gray-700">
                <span className="mr-2">দেখানো হচ্ছে</span>
                <span className="font-medium">{startIndex + 1}</span>
                <span className="mx-1">থেকে</span>
                <span className="font-medium">{Math.min(endIndex, filteredStudents.length)}</span>
                <span className="mx-1">পর্যন্ত</span>
                <span className="font-medium">{filteredStudents.length}</span>
                <span className="ml-1">জন শিক্ষার্থী</span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:hover:bg-gray-100"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  আগের
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:hover:bg-gray-100"
                >
                  পরের
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">বাল্ক উপস্থিতি মার্ক করুন</h3>
                  <p className="text-sm text-gray-600">একসাথে একাধিক শিক্ষার্থীর উপস্থিতি মার্ক করুন</p>
                </div>
              </div>

              {/* Attendance Status Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">উপস্থিতির অবস্থা নির্বাচন করুন</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="present"
                      checked={bulkAttendanceStatus === 'present'}
                      onChange={(e) => setBulkAttendanceStatus(e.target.value as 'present')}
                      className="mr-2"
                    />
                    <span className="text-green-600 font-medium">✓ উপস্থিত</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="late"
                      checked={bulkAttendanceStatus === 'late'}
                      onChange={(e) => setBulkAttendanceStatus(e.target.value as 'late')}
                      className="mr-2"
                    />
                    <span className="text-yellow-600 font-medium">⟲ বিলম্বে</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="absent"
                      checked={bulkAttendanceStatus === 'absent'}
                      onChange={(e) => setBulkAttendanceStatus(e.target.value as 'absent')}
                      className="mr-2"
                    />
                    <span className="text-red-600 font-medium">✗ অনুপস্থিত</span>
                  </label>
                </div>
              </div>

              {/* Students Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">শিক্ষার্থী নির্বাচন করুন</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedStudents(filteredStudents.map(s => s.uid))}
                      className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      সব নির্বাচন করুন
                    </button>
                    <button
                      onClick={() => setSelectedStudents([])}
                      className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      সব মুক্ত করুন
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredStudents.map((student) => (
                    <label key={student.uid} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.uid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.uid]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.uid));
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden mr-3">
                          {student.profileImage ? (
                            <img
                              src={student.profileImage}
                              alt={student.displayName || 'Student'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-medium text-xs">
                              {student.displayName?.split(' ')[0].charAt(0) || student.email?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{student.displayName || student.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{student.studentId} • {student.class}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">নির্বাচিত শিক্ষার্থী:</span>
                  <span className="text-lg font-bold text-gray-900">{selectedStudents.length} জন</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">অবস্থা:</span>
                  <span className={`text-sm font-medium ${
                    bulkAttendanceStatus === 'present' ? 'text-green-600' :
                    bulkAttendanceStatus === 'late' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {bulkAttendanceStatus === 'present' ? 'উপস্থিত' :
                     bulkAttendanceStatus === 'late' ? 'বিলম্বে' : 'অনুপস্থিত'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setSelectedStudents([]);
                  }}
                  disabled={attendanceLoading}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleBulkAttendanceMark}
                  disabled={attendanceLoading || selectedStudents.length === 0}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {attendanceLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>মার্ক করছি...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>মার্ক করুন ({selectedStudents.length})</span>
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

export default function AttendancePageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AttendancePage />
    </ProtectedRoute>
  );
}
