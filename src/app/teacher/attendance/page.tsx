'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where, serverTimestamp, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TeacherLayout from '@/components/TeacherLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceQueries, studentQueries, classQueries, teacherQueries, AttendanceRecord, Class, User as TeacherUser } from '@/lib/database-queries';
import {
  Search,
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Filter,
  UserCheck,
  X,
  BookOpen,
  AlertCircle,
  FileText,
  TrendingUp,
  Users,
  GraduationCap,
} from 'lucide-react';
import { serverTimestamp as serverTimestampFn } from 'firebase/firestore';
import { User as StudentUser } from '@/lib/database-queries';

interface TeacherAttendanceRecord {
  id?: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  timestamp?: any;
  entryTime?: any; // Time when teacher entered (first scan)
  exitTime?: any; // Time when teacher exited (second scan)
  markedBy?: string;
  remarks?: string;
}

function AttendancePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceType, setAttendanceType] = useState<'students' | 'teachers'>('students');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [teacherAttendanceRecords, setTeacherAttendanceRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkAttendanceStatus, setBulkAttendanceStatus] = useState<'present' | 'absent' | 'late'>('present');
  const [bulkModalSelectedClass, setBulkModalSelectedClass] = useState<string>('all');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadStudents();
        loadTeachers();
        loadClasses();
        loadAttendanceRecords();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load students, teachers and classes when component mounts
  useEffect(() => {
    if (user) {
      loadStudents();
      loadTeachers();
      loadClasses();
    }
  }, [user]);

  // Real-time updates for teacher attendance
  useEffect(() => {
    if (!user || attendanceType !== 'teachers') return;

    console.log('🔄 Setting up real-time listener for teacher attendance...');
    
    const attendanceRef = collection(db, 'teacherAttendance');
    const q = query(
      attendanceRef,
      where('date', '==', selectedDate)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('📊 Real-time teacher attendance update:', snapshot.size, 'records');
        const records: TeacherAttendanceRecord[] = [];
        
        snapshot.forEach((doc) => {
          records.push({
            id: doc.id,
            ...doc.data()
          } as TeacherAttendanceRecord);
        });

        setTeacherAttendanceRecords(records);
        setAttendanceLoading(false);
      },
      (error) => {
        console.error('❌ Error in real-time teacher attendance listener:', error);
        setError('রিয়েল-টাইম আপডেট লোড করতে সমস্যা হয়েছে');
        setAttendanceLoading(false);
      }
    );

    return () => {
      console.log('🛑 Cleaning up teacher attendance listener');
      unsubscribe();
    };
  }, [user, selectedDate, attendanceType]);

  // Load attendance records when date, class, students, or attendance type changes
  useEffect(() => {
    if (user) {
      if (attendanceType === 'students' && students.length > 0) {
        loadAttendanceRecords();
      } else if (attendanceType === 'teachers') {
        // Set loading state, real-time listener will update the data
        setAttendanceLoading(true);
      }
    }
  }, [user, selectedDate, selectedClass, students, teachers, attendanceType]);

  // Auto-close success modal after 3 seconds
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

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
        try {
          const usersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'teacher'),
            where('isActive', '==', true)
          );
          const usersSnapshot = await getDocs(usersQuery);
          teachersData = usersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          } as TeacherUser));
        } catch (usersError) {
          console.error('Error loading from users collection:', usersError);
        }
      }
      
      console.log('✅ Loaded teachers:', teachersData.length);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading teachers:', error);
      setError('শিক্ষক লোড করতে সমস্যা হয়েছে');
    } finally {
      setTeachersLoading(false);
    }
  };

  const loadClasses = async () => {
    if (!user) return;

    setClassesLoading(true);

    try {
      const classesData = await classQueries.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
      setError('ক্লাস লোড করতে সমস্যা হয়েছে');
    } finally {
      setClassesLoading(false);
    }
  };

  const loadTeacherAttendanceRecords = async () => {
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

      console.log('✅ Loaded teacher attendance records:', records.length);
      setTeacherAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading teacher attendance records:', error);
      setError('শিক্ষক উপস্থিতি রেকর্ড লোড করতে সমস্যা হয়েছে');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadAttendanceRecords = async () => {
    if (!user) return;

    setAttendanceLoading(true);
    setError('');

    try {
      console.log('🔍 Teacher loading attendance for date:', selectedDate);
      const records = await attendanceQueries.getAttendanceByDateAndClass(selectedDate, selectedClass);
      console.log('📊 Teacher total records from Firebase:', records.length);
      
      // Enrich records with student data (roll number and class)
      const enrichedRecords = records.map(record => {
        const student = students.find(s => s.uid === record.studentId);
        return {
          ...record,
          rollNumber: student?.rollNumber || student?.studentId || '-',
          studentName: record.studentName || student?.displayName || student?.name || 'Unknown',
          className: record.className || student?.class || (record as any).className || '-'
        };
      });
      
      console.log('🎯 Teacher final enriched records:', enrichedRecords.length);
      setAttendanceRecords(enrichedRecords);
    } catch (error) {
      console.error('Error loading attendance records:', error);
      setError('উপস্থিতি রেকর্ড লোড করতে সমস্যা হয়েছে');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const markStudentAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!user || !userData) return;

    try {
      // Check if student already has attendance record for today
      const existingRecord = attendanceRecords.find(r => r.studentId === studentId && r.date === selectedDate);

      if (existingRecord) {
        // Update existing record
        await attendanceQueries.updateAttendance(existingRecord.id!, { status });
        setSuccess(`উপস্থিতি আপডেট করা হয়েছে: ${status === 'present' ? 'উপস্থিত' : status === 'late' ? 'বিলম্বে' : 'অনুপস্থিত'}`);
      } else {
        // Create new record
        const student = students.find(s => s.uid === studentId);
        const studentClass = student?.class ? classes.find(c => c.className === student.class) : null;
        
        const attendanceData = {
          studentId,
          studentName: student?.displayName || student?.name || 'Unknown',
          classId: studentClass?.classId || student?.class || 'unknown',
          className: student?.class || studentClass?.className || 'Unknown',
          schoolId: userData?.schoolId || '102330',
          date: selectedDate,
          status,
          timestamp: serverTimestampFn() as any,
          teacherId: user.uid,
          method: 'manual' as const,
          rollNumber: student?.rollNumber || student?.studentId || '-'
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
    if (!user || !userData || selectedStudents.length === 0) return;

    // Check for already marked students
    const alreadyMarkedStudents = selectedStudents.filter(studentId => {
      return attendanceRecords.some(record => 
        record.studentId === studentId && record.date === selectedDate
      );
    });

    if (alreadyMarkedStudents.length > 0) {
      const alreadyMarkedNames = alreadyMarkedStudents.map(studentId => {
        const student = students.find(s => s.uid === studentId);
        return student?.displayName || student?.name || 'Unknown';
      }).join(', ');
      
      alert(`নিম্নলিখিত শিক্ষার্থীদের উপস্থিতি ইতিমধ্যে মার্ক করা হয়েছে:\n\n${alreadyMarkedNames}\n\nঅনুগ্রহ করে শুধুমাত্র নতুন শিক্ষার্থী নির্বাচন করুন।`);
      return;
    }

    setAttendanceLoading(true);
    try {
      const schoolId = userData?.schoolId || '102330';
      
      const promises = selectedStudents.map(studentId => {
        const student = students.find(s => s.uid === studentId);
        // Find the class object to get both classId and className
        const studentClass = student?.class ? classes.find(c => c.className === student.class) : null;
        
        return attendanceQueries.recordAttendance({
          studentId,
          studentName: student?.displayName || student?.name || 'Unknown',
          classId: studentClass?.classId || student?.class || 'unknown',
          className: student?.class || studentClass?.className || 'Unknown',
          schoolId: schoolId,
          date: selectedDate,
          status: bulkAttendanceStatus,
          timestamp: serverTimestampFn() as any,
          teacherId: user.uid,
          method: 'manual',
          rollNumber: student?.rollNumber || student?.studentId || '-'
        } as any);
      });

      await Promise.all(promises);
      await loadAttendanceRecords();
      setShowAttendanceModal(false);
      setSelectedStudents([]);
      setBulkModalSelectedClass('all');
      setSuccessMessage(`${selectedStudents.length} জন শিক্ষার্থীর উপস্থিতি মার্ক করা হয়েছে`);
      setShowSuccessModal(true);
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

  const getTeacherAttendance = (teacherId: string): TeacherAttendanceRecord | undefined => {
    return teacherAttendanceRecords.find(r => r.teacherId === teacherId);
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
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      
      // If status is 'present' but it's after 9:00 AM, change to 'late'
      let finalStatus = status;
      if (status === 'present' && (currentHour > 9 || (currentHour === 9 && currentMinute > 0))) {
        finalStatus = 'late';
      }

      const attendanceData: TeacherAttendanceRecord = {
        teacherId,
        teacherName: teacher.displayName || teacher.name || 'Unknown',
        teacherEmail: teacher.email || '',
        date: selectedDate,
        status: finalStatus,
        timestamp: serverTimestampFn(),
        markedBy: user.uid
      };

      // If it's a new record and status is present/late, set entryTime
      if (!existingRecord && (finalStatus === 'present' || finalStatus === 'late')) {
        attendanceData.entryTime = serverTimestampFn();
      }

      if (existingRecord?.id) {
        // Update existing record
        const docRef = doc(db, 'teacherAttendance', existingRecord.id);
        await setDoc(docRef, {
          ...attendanceData,
          updatedAt: serverTimestampFn()
        }, { merge: true });
        setSuccess(`${teacher.displayName || teacher.name} এর উপস্থিতি আপডেট করা হয়েছে`);
      } else {
        // Create new record
        const docRef = doc(collection(db, 'teacherAttendance'));
        await setDoc(docRef, attendanceData);
        setSuccess(`${teacher.displayName || teacher.name} এর উপস্থিতি মার্ক করা হয়েছে`);
      }

      await loadTeacherAttendanceRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error marking teacher attendance:', error);
      setError('উপস্থিতি মার্ক করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

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

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (teacher.displayName || teacher.name || '').toLowerCase().includes(searchLower) ||
      (teacher.email || '').toLowerCase().includes(searchLower) ||
      (teacher.phoneNumber || '').includes(searchTerm)
    );
  });

  // Filter students based on search and class
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm ||
      student.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = selectedClass === 'all' || student.class === selectedClass;

    return matchesSearch && matchesClass;
  });

  // Filter students for bulk modal based on modal class selection
  const bulkModalFilteredStudents = students.filter(student => {
    if (bulkModalSelectedClass === 'all') {
      return true;
    }
    
    // Find the selected class object to get its className
    const selectedClassObj = classes.find(c => c.classId === bulkModalSelectedClass);
    if (selectedClassObj) {
      // Match by className (since student.class stores the class name like "নার্সারি")
      return student.class === selectedClassObj.className;
    }
    
    // Fallback: direct comparison (in case student.class stores classId)
    return student.class === bulkModalSelectedClass;
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

  // Filter records by selected class
  const filteredRecords = selectedClass === 'all'
    ? attendanceRecords
    : attendanceRecords.filter(r => r.classId === selectedClass);

  // Get unique students (remove duplicates by studentId)
  const uniqueRecordsMap = new Map();
  filteredRecords.forEach(record => {
    if (!uniqueRecordsMap.has(record.studentId)) {
      uniqueRecordsMap.set(record.studentId, record);
    }
  });
  const uniqueRecords = Array.from(uniqueRecordsMap.values());

  // Calculate stats from unique records
  const presentCount = uniqueRecords.filter(r => r.status === 'present').length;
  const absentCount = uniqueRecords.filter(r => r.status === 'absent').length;
  const lateCount = uniqueRecords.filter(r => r.status === 'late').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TeacherLayout title="উপস্থিতি ব্যবস্থাপনা" subtitle="শিক্ষার্থী ও শিক্ষকদের উপস্থিতি রেকর্ড দেখুন এবং পরিচালনা করুন">
      <div className="space-y-6">
        {/* Tab Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex space-x-2">
          <button
            onClick={() => {
              setAttendanceType('students');
              setSearchTerm('');
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              attendanceType === 'students'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            শিক্ষার্থী উপস্থিতি
          </button>
          <button
            onClick={() => {
              setAttendanceType('teachers');
              setSearchTerm('');
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              attendanceType === 'teachers'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 inline mr-2" />
            শিক্ষক উপস্থিতি
          </button>
        </div>

        {/* Attendance Stats */}
        {attendanceType === 'students' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">মোট</p>
                <p className="text-2xl font-bold text-gray-900">{uniqueRecords.length}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Calendar className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">উপস্থিত</p>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">অনুপস্থিত</p>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">বিলম্বিত</p>
                <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">মোট শিক্ষক</p>
                <p className="text-2xl font-bold text-gray-900">{filteredTeachers.length}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">উপস্থিত</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredTeachers.filter(t => getTeacherAttendance(t.uid)?.status === 'present').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">অনুপস্থিত</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredTeachers.filter(t => getTeacherAttendance(t.uid)?.status === 'absent').length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">বিলম্বে/ছুটি</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredTeachers.filter(t => {
                    const status = getTeacherAttendance(t.uid)?.status;
                    return status === 'late' || status === 'leave';
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Report Card */}
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg border border-blue-200 p-6 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            router.push('/teacher/attendance/report');
          }}
        >
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
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
              {attendanceType === 'students' && (
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
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">খুঁজুন</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={attendanceType === 'students' ? 'শিক্ষার্থী খুঁজুন...' : 'শিক্ষক খুঁজুন...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={attendanceType === 'students' ? loadAttendanceRecords : loadTeacherAttendanceRecords}
                disabled={attendanceLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${attendanceLoading ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ</span>
              </button>
              {attendanceType === 'students' && (
              <button
                onClick={() => {
                  setBulkModalSelectedClass(selectedClass !== 'all' ? selectedClass : 'all');
                  setShowAttendanceModal(true);
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>বাল্ক মার্ক</span>
              </button>
              )}
              {attendanceType === 'students' && (
              <a
                href="/teacher/attendance/take"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>উপস্থিতি নিন</span>
              </a>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Records */}
        {attendanceType === 'students' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {attendanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-2"></div>
              <span className="text-gray-600">উপস্থিতি লোড হচ্ছে...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">রোল</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">নাম</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্লাস</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থা</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">সময়</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uniqueRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Calendar className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">কোন উপস্থিতি রেকর্ড পাওয়া যায়নি</p>
                          <p className="text-sm text-gray-400">এই তারিখ এবং ক্লাসের জন্য এখনও উপস্থিতি নেওয়া হয়নি</p>
                          <button
                            onClick={() => router.push('/teacher/attendance/take')}
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>এখন উপস্থিতি নিন</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    uniqueRecords.map((record, index) => {
                      const student = students.find(s => s.uid === record.studentId);
                      return (
                        <tr key={record.id || `${record.studentId}-${record.date}-${index}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(record as any).rollNumber || student?.rollNumber || student?.studentId || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{record.studentName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {(record as any).className || student?.class || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1 ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.status === 'present' && <CheckCircle className="w-3 h-3" />}
                              {record.status === 'absent' && <XCircle className="w-3 h-3" />}
                              {record.status === 'late' && <Clock className="w-3 h-3" />}
                              {record.status === 'present' ? 'উপস্থিত' : record.status === 'absent' ? 'অনুপস্থিত' : 'বিলম্বিত'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {record.timestamp?.toDate?.().toLocaleTimeString('bn-BD') || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => markStudentAttendance(record.studentId, 'present')}
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  record.status === 'present'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                title="উপস্থিত"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => markStudentAttendance(record.studentId, 'late')}
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  record.status === 'late'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                }`}
                                title="বিলম্বে"
                              >
                                ⟲
                              </button>
                              <button
                                onClick={() => markStudentAttendance(record.studentId, 'absent')}
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  record.status === 'absent'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                                title="অনুপস্থিত"
                              >
                                ✗
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {attendanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-2"></div>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">কোন শিক্ষক পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">শিক্ষক</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ইমেইল</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ফোন</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থা</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">প্রবেশ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">প্রস্থান</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">কার্যক্রম</th>
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
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border animate-pulse ${getStatusColor(attendance.status)}`}>
                              {attendance.status === 'present' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {attendance.status === 'absent' && <XCircle className="w-3 h-3 mr-1" />}
                              {attendance.status === 'late' && <Clock className="w-3 h-3 mr-1" />}
                              {attendance.status === 'leave' && <Clock className="w-3 h-3 mr-1" />}
                              {getStatusLabel(attendance.status)}
                            </span>
                          ) : (
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-300">
                              মার্ক করা হয়নি
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {attendance?.entryTime ? (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-green-500" />
                              <span className="text-green-700 font-medium">
                                {(() => {
                                  try {
                                    const timestamp = attendance.entryTime;
                                    let date: Date;

                                    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
                                      date = timestamp.toDate();
                                    } else if (timestamp instanceof Date) {
                                      date = timestamp;
                                    } else {
                                      date = new Date(timestamp);
                                    }

                                    return date.toLocaleTimeString('bn-BD', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                      hour12: true
                                    });
                                  } catch (error) {
                                    console.error('Error formatting entry time:', error);
                                    return '--:--';
                                  }
                                })()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {attendance?.exitTime ? (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-blue-500" />
                              <span className="text-blue-700 font-medium">
                                {(() => {
                                  try {
                                    const timestamp = attendance.exitTime;
                                    let date: Date;

                                    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
                                      date = timestamp.toDate();
                                    } else if (timestamp instanceof Date) {
                                      date = timestamp;
                                    } else {
                                      date = new Date(timestamp);
                                    }

                                    return date.toLocaleTimeString('bn-BD', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                      hour12: true
                                    });
                                  } catch (error) {
                                    console.error('Error formatting exit time:', error);
                                    return '--:--';
                                  }
                                })()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
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
          )}
        </div>
        )}

        {/* Pagination */}
        {filteredStudents.length > itemsPerPage && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                দেখাচ্ছে {startIndex + 1} থেকে {Math.min(endIndex, filteredStudents.length)} এর {filteredStudents.length} জন শিক্ষার্থী
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  পূর্ববর্তী
                </button>
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 border rounded-lg text-sm ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  পরবর্তী
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <UserCheck className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">বাল্ক উপস্থিতি মার্ক করুন</h3>
                    <p className="text-sm text-gray-600">একসাথে একাধিক শিক্ষার্থীর উপস্থিতি মার্ক করুন</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setSelectedStudents([]);
                    setBulkModalSelectedClass('all');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Class Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাস নির্বাচন করুন</label>
                <select
                  value={bulkModalSelectedClass}
                  onChange={(e) => {
                    setBulkModalSelectedClass(e.target.value);
                    setSelectedStudents([]); // Clear selections when class changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      onClick={() => {
                        const unmarkedStudents = bulkModalFilteredStudents.filter(s => 
                          !attendanceRecords.some(record => record.studentId === s.uid && record.date === selectedDate)
                        );
                        setSelectedStudents(unmarkedStudents.map(s => s.uid));
                      }}
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
                  {bulkModalFilteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {classesLoading ? 'ক্লাস লোড হচ্ছে...' : 'কোন শিক্ষার্থী পাওয়া যায়নি'}
                    </div>
                  ) : (
                    bulkModalFilteredStudents.map((student) => {
                      const isAlreadyMarked = attendanceRecords.some(record => 
                        record.studentId === student.uid && record.date === selectedDate
                      );
                      
                      return (
                        <label 
                          key={student.uid} 
                          className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 ${
                            isAlreadyMarked ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.uid)}
                            disabled={isAlreadyMarked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents([...selectedStudents, student.uid]);
                              } else {
                                setSelectedStudents(selectedStudents.filter(id => id !== student.uid));
                              }
                            }}
                            className="mr-3"
                          />
                          <div className="flex items-center flex-1">
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
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{student.displayName || student.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{student.studentId} • {student.class}</div>
                            </div>
                            {isAlreadyMarked && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                ✓ মার্ক করা হয়েছে
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
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
                    setBulkModalSelectedClass('all');
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => {
            setShowSuccessModal(false);
            setSuccessMessage('');
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative animate-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" strokeWidth={2.5} />
              </div>
              
              {/* Success Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">সফল!</h3>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">{successMessage}</p>
              
              {/* OK Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                }}
                className="w-full px-6 py-3 bg-green-600 text-white font-semibold text-lg rounded-lg hover:bg-green-700 active:bg-green-800 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AttendancePage />
    </ProtectedRoute>
  );
}
