'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import TeacherLayout from '@/components/TeacherLayout';
import { attendanceQueries, studentQueries, teacherQueries, User as StudentUser, User as TeacherUser } from '@/lib/database-queries';
import QRScanner from '@/components/QRScanner';
import { QRUtils } from '@/lib/qr-utils';
import { collection, query, where, getDocs, doc, setDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Users,
  Calendar,
  Bell,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  QrCode,
  Camera,
  CameraOff,
  RefreshCw,
  AlertCircle,
  Save,
  IdCard,
  GraduationCap,
  ArrowLeft
} from 'lucide-react';

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
}

function TakeAttendancePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceType, setAttendanceType] = useState<'students' | 'teachers'>('students');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, any>>(new Map());
  const [teacherAttendanceRecords, setTeacherAttendanceRecords] = useState<Map<string, TeacherAttendanceRecord>>(new Map());
  const [scannedStudents, setScannedStudents] = useState<Set<string>>(new Set());
  const [scannedTeachers, setScannedTeachers] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{name: string, timestamp: Date, type: 'student' | 'teacher'} | null>(null);
  const [error, setError] = useState<string | React.JSX.Element>('');
  const [success, setSuccess] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [qrScannerError, setQrScannerError] = useState('');
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [databaseStats, setDatabaseStats] = useState<any>({});
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [showNextButton, setShowNextButton] = useState(false);
  const [currentStudentToScan, setCurrentStudentToScan] = useState<StudentUser | null>(null);
  const [sequentialScanning, setSequentialScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadStudents();
        loadTeachers();
        loadTeacherAttendanceRecords();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadStudents = async () => {
    if (!user) return;

    setStudentsLoading(true);
    setError('');

    try {
      const studentsData = await studentQueries.getAllStudents();
      setStudents(studentsData);

      // Load existing attendance records for today
      const todayRecords = await attendanceQueries.getAttendanceByDateAndClass(selectedDate, selectedClass);
      const recordsMap = new Map();
      todayRecords.forEach(record => {
        recordsMap.set(record.studentId, record);
      });
      setAttendanceRecords(recordsMap);
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

  const loadTeacherAttendanceRecords = async () => {
    if (!user) return;

    try {
      const attendanceRef = collection(db, 'teacherAttendance');
      const q = query(
        attendanceRef,
        where('date', '==', selectedDate)
      );

      const querySnapshot = await getDocs(q);
      const recordsMap = new Map<string, TeacherAttendanceRecord>();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as TeacherAttendanceRecord;
        recordsMap.set(data.teacherId, {
          id: doc.id,
          ...data
        });
      });

      setTeacherAttendanceRecords(recordsMap);
    } catch (error) {
      console.error('Error loading teacher attendance records:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadStudents();
      loadTeachers();
      loadTeacherAttendanceRecords();
      checkFirebaseConnection();
    }
  }, [user, selectedDate, selectedClass]);

  const checkFirebaseConnection = async () => {
    try {
      // Test Firebase connection by trying to fetch a small document
      const testQuery = await studentQueries.getAllStudents();
      setFirebaseConnected(true);
      setDatabaseStats({
        totalStudents: testQuery.length,
        connected: true,
        projectId: 'iqna-landing'
      });
    } catch (error: any) {
      console.error('Firebase connection error:', error);
      setFirebaseConnected(false);
      setDatabaseStats({
        connected: false,
        error: error?.message || 'Unknown error'
      });
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

  const handleQRCodeScanned = async (qrData: string, parsedData: any) => {
    console.log('🔍 Attendance page received QR data:', qrData);
    console.log('🔍 Parsed data:', parsedData);

    // Show immediate feedback that scan was received
    setScanResults({
      name: 'Processing...',
      timestamp: new Date(),
      type: attendanceType
    });

    // Clear any previous errors
    setError('');
    setQrScannerError('');

    try {
      // First, check if it's a teacher QR code
      const teacherQR = QRUtils.parseTeacherQR(qrData);
      if (teacherQR && teacherQR.type === 'teacher_attendance') {
        console.log('✅ Found teacher attendance QR:', teacherQR);
        await processTeacherQR(teacherQR);
        return;
      }

      // Extract student ID from parsed QR data
      let studentId = null;
      let qrType = null;

      // Check if it's our student attendance QR format
      if (parsedData && parsedData.type === 'student' && parsedData.data) {
        const data = parsedData.data;
        if (data.type === 'student_attendance' && data.studentId) {
          studentId = data.studentId;
          qrType = 'student_attendance';
          console.log('✅ Found student attendance QR:', data);
        }
      } else if (parsedData && parsedData.type === 'json' && parsedData.data) {
        const data = parsedData.data;
        if (data.studentId) {
          studentId = data.studentId;
          qrType = data.type || 'json';
          console.log('✅ Found JSON QR with studentId:', data);
        }
      } else {
        // Fallback: try to parse the raw QR data
        try {
          const rawParsed = JSON.parse(qrData);
          if (rawParsed.type === 'student_attendance' && rawParsed.studentId) {
            studentId = rawParsed.studentId;
            qrType = rawParsed.type;
            console.log('✅ Found student attendance in raw data:', rawParsed);
          } else if (rawParsed.studentId) {
            // Handle other formats that have studentId
            studentId = rawParsed.studentId;
            qrType = rawParsed.type;
            console.log('✅ Found studentId in raw JSON:', rawParsed);
          }
        } catch {
          // If parsing fails, assume the entire qrData is the student ID
          studentId = qrData;
          qrType = 'unknown';
          console.log('❌ Could not parse QR data, using as studentId:', qrData);
        }
      }

      if (!studentId) {
        setError('QR কোডে শিক্ষার্থীর ID পাওয়া যায়নি');
        return;
      }

      // Find student by ID - check multiple fields and formats
      let student = students.find(s =>
        s.studentId === studentId ||
        s.uid === studentId ||
        (s.uid && s.uid.includes(studentId)) ||
        (studentId && studentId.includes(s.uid))
      );

      // If not found, try to find by partial matches or different formats
      if (!student) {
        student = students.find(s => {
          // Check if the scanned ID is a partial match of studentId
          if (s.studentId && studentId.includes(s.studentId)) return true;
          if (s.studentId && s.studentId.includes(studentId)) return true;

          // Check if the scanned ID is a partial match of uid
          if (s.uid && studentId.includes(s.uid)) return true;
          if (s.uid && s.uid.includes(studentId)) return true;

          // Check if it's a Firebase document ID format (contains the student ID)
          if (s.studentId && studentId.includes(s.studentId)) return true;

          return false;
        });
      }

      // If still not found, try case-insensitive search
      if (!student) {
        const lowerScannedId = studentId.toLowerCase();
        student = students.find(s =>
          (s.studentId && s.studentId.toLowerCase().includes(lowerScannedId)) ||
          (s.uid && s.uid.toLowerCase().includes(lowerScannedId)) ||
          (s.displayName && s.displayName.toLowerCase().includes(lowerScannedId)) ||
          (s.name && s.name.toLowerCase().includes(lowerScannedId))
        );
      }

      if (!student) {
        setError(
          <div className="space-y-2">
            <p>শিক্ষার্থী পাওয়া যায়নি: {studentId}</p>
            <p className="text-sm">ডাটাবেসে এই আইডি সহ কোনো শিক্ষার্থী নেই।</p>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => {
                  setError('');
                  router.push('/admin/students/id-cards');
                }}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                নতুন QR কোড তৈরি করুন
              </button>
              <button
                onClick={() => {
                  setError('');
                  router.push('/admin/students');
                }}
                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
              >
                শিক্ষার্থী যোগ করুন
              </button>
            </div>
          </div>
        );
        console.log('Scanned Student ID:', studentId);
        console.log('Available students:', students.map(s => ({
          uid: s.uid,
          studentId: s.studentId,
          name: s.displayName || s.name,
          class: s.class
        })));
        console.log('Total students in database:', students.length);
        return;
      }

      // Check if student already has attendance record for today
      const existingRecord = attendanceRecords.get(student.uid);
      if (existingRecord) {
        const firstScanTime = (() => {
          try {
            const timestamp = existingRecord.timestamp;
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
              minute: '2-digit'
            });
          } catch (error) {
            return 'Unknown';
          }
        })();

        setError(
          <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-orange-800 font-medium">⚠️ ডুপ্লিকেট স্ক্যান</p>
                <p className="text-orange-700 text-sm">{student.displayName || student.name}</p>
              </div>
            </div>
            <div className="bg-white p-3 rounded border-l-4 border-orange-300">
              <p className="text-sm text-gray-700 mb-1">ইতিমধ্যে স্ক্যান করা হয়েছে (আজকের জন্য)</p>
              <p className="text-xs text-gray-600">
                প্রথম স্ক্যানের সময়: <span className="font-medium text-orange-600">{firstScanTime}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                নতুন করে স্ক্যান করলে ডুপ্লিকেট রেকর্ড তৈরি হবে না
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setError('');
                }}
                className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
              >
                বোঝা গেছে
              </button>
            </div>
          </div>
        );
        console.log('Duplicate scan prevented for student:', student.uid, 'First scan time:', firstScanTime);
        return;
      }

      // Mark attendance as present
      await markStudentAttendance(student.uid, 'present');

      // Add to scanned students
      setScannedStudents(prev => new Set([...prev, student.uid]));
      setScanResults({
        name: student.displayName || student.name || 'Unknown',
        timestamp: new Date(),
        type: 'student'
      });

      setSuccess(`${student.displayName || student.name} এর উপস্থিতি মার্ক করা হয়েছে`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error processing QR scan:', error);
      setError('QR কোড প্রসেস করতে সমস্যা হয়েছে');
    }
  };

  const processTeacherQR = async (teacherQR: { teacherId: string; schoolId: string; schoolName: string; subject?: string; timestamp: number; uuid: string }) => {
    try {
      const teacher = teachers.find(t => t.uid === teacherQR.teacherId);
      
      if (!teacher) {
        setError('শিক্ষক পাওয়া যায়নি');
        return;
      }

      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      
      // Check if it's after 9:00 AM (9:00 = 9 hours, 0 minutes)
      const isLate = currentHour > 9 || (currentHour === 9 && currentMinute > 0);

      // Check if teacher already has attendance record for today
      const existingRecord = teacherAttendanceRecords.get(teacher.uid);
      
      if (existingRecord) {
        // Second scan - set exit time
        if (!existingRecord.exitTime) {
          await markTeacherExit(teacher.uid);
          setSuccess(`${teacher.displayName || teacher.name} এর প্রস্থান সময় রেকর্ড করা হয়েছে`);
          setTimeout(() => setSuccess(''), 3000);
          
          setScanResults({
            name: teacher.displayName || teacher.name || 'Unknown',
            timestamp: new Date(),
            type: 'teacher'
          });
          return;
        } else {
          // Already scanned twice
          const entryTime = (() => {
            try {
              const timestamp = existingRecord.entryTime || existingRecord.timestamp;
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
                minute: '2-digit'
              });
            } catch (error) {
              return 'Unknown';
            }
          })();

          const exitTime = (() => {
            try {
              const timestamp = existingRecord.exitTime;
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
                minute: '2-digit'
              });
            } catch (error) {
              return 'Unknown';
            }
          })();

          setError(
            <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-blue-800 font-medium">✅ স্ক্যান সম্পন্ন</p>
                  <p className="text-blue-700 text-sm">{teacher.displayName || teacher.name}</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded border-l-4 border-blue-300">
                <p className="text-sm text-gray-700 mb-1">ইতিমধ্যে প্রবেশ ও প্রস্থান স্ক্যান করা হয়েছে</p>
                <p className="text-xs text-gray-600">
                  প্রবেশ: <span className="font-medium text-green-600">{entryTime}</span> | 
                  প্রস্থান: <span className="font-medium text-blue-600">{exitTime}</span>
                </p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                বোঝা গেছে
              </button>
            </div>
          );
          return;
        }
      }

      // First scan - set entry time and determine status
      const status = isLate ? 'late' : 'present';
      await markTeacherEntry(teacher.uid, status);

      // Add to scanned teachers
      setScannedTeachers(prev => new Set([...prev, teacher.uid]));
      setScanResults({
        name: teacher.displayName || teacher.name || 'Unknown',
        timestamp: new Date(),
        type: 'teacher'
      });

      setSuccess(`${teacher.displayName || teacher.name} এর প্রবেশ সময় রেকর্ড করা হয়েছে (${status === 'late' ? 'বিলম্বে' : 'উপস্থিত'})`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error processing teacher QR scan:', error);
      setError('শিক্ষক QR কোড প্রসেস করতে সমস্যা হয়েছে');
    }
  };

  const markTeacherEntry = async (teacherId: string, status: 'present' | 'late') => {
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

      const existingRecord = teacherAttendanceRecords.get(teacherId);
      const attendanceData: TeacherAttendanceRecord = {
        teacherId,
        teacherName: teacher.displayName || teacher.name || 'Unknown',
        teacherEmail: teacher.email || '',
        date: selectedDate,
        status,
        timestamp: serverTimestamp(),
        entryTime: serverTimestamp(),
        markedBy: user.uid
      };

      if (existingRecord?.id) {
        // Update existing record with entry time
        const docRef = doc(db, 'teacherAttendance', existingRecord.id);
        await setDoc(docRef, {
          ...attendanceData,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Create new record
        const docRef = doc(collection(db, 'teacherAttendance'));
        await setDoc(docRef, attendanceData);
      }

      await loadTeacherAttendanceRecords();
    } catch (error) {
      console.error('Error marking teacher entry:', error);
      setError('প্রবেশ সময় রেকর্ড করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const markTeacherExit = async (teacherId: string) => {
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

      const existingRecord = teacherAttendanceRecords.get(teacherId);
      if (!existingRecord?.id) {
        setError('প্রবেশ রেকর্ড পাওয়া যায়নি');
        return;
      }

      // Update existing record with exit time
      const docRef = doc(db, 'teacherAttendance', existingRecord.id);
      await setDoc(docRef, {
        exitTime: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      await loadTeacherAttendanceRecords();
    } catch (error) {
      console.error('Error marking teacher exit:', error);
      setError('প্রস্থান সময় রেকর্ড করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const markStudentAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!user) return;

    try {
      const student = students.find(s => s.uid === studentId);
      if (!student) return;

      const currentTime = new Date();
      const attendanceData = {
        studentId,
        studentName: student.displayName || student.name || 'Unknown',
        studentEmail: student.email || '',
        classId: selectedClass,
        className: selectedClass,
        schoolId: 'iqra-school',
        schoolName: 'আমার স্কুল',
        date: selectedDate,
        status,
        timestamp: serverTimestamp() as any,
        firstScanTime: serverTimestamp() as any, // Store original scan time
        teacherId: user.uid,
        teacherName: user.displayName || user.email || 'Unknown Teacher',
        teacherEmail: user.email || '',
        method: 'qr_scan' as const,
        deviceInfo: {
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
          timestamp: currentTime.toISOString()
        },
        metadata: {
          scannedAt: currentTime.toISOString(),
          sessionId: `session_${Date.now()}`,
          version: '1.0'
        }
      };

      console.log('Saving attendance data to Firebase:', attendanceData);

      const attendanceId = await attendanceQueries.recordAttendance(attendanceData);
      console.log('Attendance saved successfully with ID:', attendanceId);

      // Update local records
      setAttendanceRecords(prev => new Map(prev.set(studentId, attendanceData)));

      return attendanceId;
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError(`উপস্থিতি সংরক্ষণ করতে ত্রুটি হয়েছে: ${error}`);
      throw error;
    }
  };

  const markAllPresent = async () => {
    if (!user || students.length === 0) return;

    try {
      const promises = students.map(student =>
        attendanceQueries.recordAttendance({
          studentId: student.uid,
          studentName: student.displayName || student.name || 'Unknown',
          classId: selectedClass,
          className: selectedClass,
          schoolId: 'iqra-school',
          date: selectedDate,
          status: 'present',
          timestamp: new Date() as any,
          teacherId: user.uid,
          method: 'manual'
        })
      );

      await Promise.all(promises);
      await loadStudents(); // Refresh data
      setSuccess(`সকল শিক্ষার্থীর (${students.length} জন) উপস্থিতি মার্ক করা হয়েছে`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error marking all present:', error);
      setError('সকলকে উপস্থিত মার্ক করতে সমস্যা হয়েছে');
    }
  };

  const resetAttendance = async () => {
    if (!user || !confirm('আপনি কি সকল উপস্থিতি রেকর্ড মুছে ফেলতে চান?')) return;

    try {
      // In a real implementation, you would delete today's attendance records
      // For now, we'll just refresh the data
      await loadStudents();
      setScannedStudents(new Set());
      setScanResults(null);
      setCurrentScanIndex(0);
      setSequentialScanning(false);
      setCurrentStudentToScan(null);
      setSuccess('উপস্থিতি রেকর্ড রিসেট করা হয়েছে');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error resetting attendance:', error);
      setError('রিসেট করতে সমস্যা হয়েছে');
    }
  };

  const startSequentialScanning = () => {
    if (filteredStudents.length === 0) {
      setError('কোন শিক্ষার্থী নেই। প্রথমে কিছু শিক্ষার্থী যোগ করুন।');
      return;
    }

    setSequentialScanning(true);
    setCurrentScanIndex(0);
    setCurrentStudentToScan(filteredStudents[0]);
    setScannedStudents(new Set());
    setScanResults(null);
    setSuccess(`ক্রমিক স্ক্যানিং শুরু হয়েছে। প্রথমে ${filteredStudents[0].displayName || filteredStudents[0].name} এর QR কোড স্ক্যান করুন।`);
    setTimeout(() => setSuccess(''), 5000);
  };

  const moveToNextStudent = () => {
    if (currentScanIndex < filteredStudents.length - 1) {
      const nextIndex = currentScanIndex + 1;
      setCurrentScanIndex(nextIndex);
      setCurrentStudentToScan(filteredStudents[nextIndex]);
      setSuccess(`${filteredStudents[currentScanIndex].displayName || filteredStudents[currentScanIndex].name} স্ক্যান করা হয়েছে। এখন ${filteredStudents[nextIndex].displayName || filteredStudents[nextIndex].name} এর QR কোড স্ক্যান করুন।`);
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setSequentialScanning(false);
      setCurrentStudentToScan(null);
      setSuccess(`সকল শিক্ষার্থীর (${filteredStudents.length} জন) উপস্থিতি স্ক্যান করা হয়েছে! ✅`);
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const getStudentAttendanceStatus = (studentId: string) => {
    const record = attendanceRecords.get(studentId);
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

  // Filter students by selected class (show all if no class selected)
  const filteredStudents = selectedClass
    ? students.filter(student => student.class === selectedClass)
    : students;

  // Calculate stats
  const presentCount = filteredStudents.filter(student =>
    getStudentAttendanceStatus(student.uid) === 'present'
  ).length;

  const attendancePercentage = filteredStudents.length > 0
    ? ((presentCount / filteredStudents.length) * 100).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TeacherLayout title="উপস্থিতি নিন" subtitle="QR কোড স্ক্যান করে উপস্থিতি নিন">
      <div className="space-y-6">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/teacher/attendance')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            title="পিছনে যান"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>পিছনে যান</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex space-x-2">
          <button
            onClick={() => {
              setAttendanceType('students');
              setScanResults(null);
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
              setScanResults(null);
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

        {/* Quick Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">তারিখ: {new Date().toLocaleDateString('bn-BD')}</span>
              </div>
              <div className="flex items-center space-x-2">
                {attendanceType === 'students' ? (
                  <>
                    <Users className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">মোট শিক্ষার্থী: {students.length}</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">মোট শিক্ষক: {teachers.length}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {attendanceType === 'students' && (
                <>
                  <button
                    onClick={startSequentialScanning}
                    disabled={students.length === 0 || sequentialScanning}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>ক্রমিক স্ক্যান শুরু</span>
                  </button>
                  <button
                    onClick={markAllPresent}
                    disabled={students.length === 0}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>সকলকে উপস্থিত মার্ক করুন</span>
                  </button>
                  <button
                    onClick={resetAttendance}
                    disabled={attendanceRecords.size === 0}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>রিসেট</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sequential Scanning Status - Hidden */}

        {/* Success and Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* QR Scanner Section - Top Position */}
        <div className="mb-6">
          {/* QR Scanner */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">QR কোড স্ক্যানার</h3>
                <p className="text-sm text-gray-600">
                  {attendanceType === 'students' 
                    ? 'শিক্ষার্থীদের QR কোড স্ক্যান করে উপস্থিতি নিন'
                    : 'শিক্ষকদের QR কোড স্ক্যান করে উপস্থিতি নিন'}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                <QRScanner
                  onScanSuccess={handleQRCodeScanned}
                  onScanError={(error) => setQrScannerError(error)}
                  width={320}
                  height={320}
                />
              </div>
            </div>

            {/* Scan Instructions */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">📱 স্ক্যান করার নির্দেশনা:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• {attendanceType === 'students' ? 'শিক্ষার্থীর' : 'শিক্ষকের'} QR কোডটি সাদা বক্সের মধ্যে রাখুন</li>
                <li>• ক্যামেরা থেকে ১৫-৩০ সেমি দূরত্বে রাখুন</li>
                <li>• পর্যাপ্ত আলো নিশ্চিত করুন (টর্চ ব্যবহার করুন)</li>
                <li>• QR কোড স্থির রাখুন ২-৩ সেকেন্ড</li>
                {attendanceType === 'teachers' && (
                  <li>• প্রথম স্ক্যান: প্রবেশ সময় | দ্বিতীয় স্ক্যান: প্রস্থান সময়</li>
                )}
              </ul>
            </div>

            {qrScannerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                <p className="text-red-600 text-sm">{qrScannerError}</p>
                <p className="text-xs text-red-500 mt-1">ক্যামেরা অ্যাক্সেসের অনুমতি দিন এবং পেজ রিফ্রেশ করুন</p>
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout - Equal Height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Scan Results */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">স্ক্যান রেজাল্ট</h3>
                <p className="text-sm text-gray-600">
                  {attendanceType === 'students' 
                    ? 'স্ক্যান করা শিক্ষার্থীদের তালিকা'
                    : 'স্ক্যান করা শিক্ষকদের তালিকা'}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {attendanceType === 'students' ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">মোট শিক্ষার্থী:</span>
                    <span className="font-semibold text-gray-900">{filteredStudents.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-600">স্ক্যান করা:</span>
                    <span className="font-semibold text-green-600">{scannedStudents.size}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-600">উপস্থিতির হার:</span>
                    <span className="font-semibold text-blue-600">{attendancePercentage}%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">মোট শিক্ষক:</span>
                    <span className="font-semibold text-gray-900">{teachers.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-600">স্ক্যান করা:</span>
                    <span className="font-semibold text-green-600">{scannedTeachers.size}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-600">উপস্থিতির হার:</span>
                    <span className="font-semibold text-blue-600">
                      {teachers.length > 0 
                        ? ((scannedTeachers.size / teachers.length) * 100).toFixed(1)
                        : '0'}%
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {!scanResults ? (
                <div className="text-center py-8 text-gray-500">
                  <QrCode className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>এখনও কোনো স্ক্যান রেজাল্ট নেই</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{scanResults.name}</span>
                      <span className="text-xs text-green-600">
                        {(() => {
                          try {
                            const date = scanResults.timestamp instanceof Date 
                              ? scanResults.timestamp 
                              : new Date(scanResults.timestamp);
                            return date.toLocaleTimeString('bn-BD', {
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch {
                            return new Date().toLocaleTimeString('bn-BD', {
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          }
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {scanResults.type === 'student' ? 'শিক্ষার্থী' : 'শিক্ষক'} স্ক্যান করে উপস্থিতি মার্ক করা হয়েছে
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Students/Teachers List */}
          {attendanceType === 'students' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">শিক্ষার্থী তালিকা</h3>
                  <p className="text-sm text-gray-600">ক্লাস: {selectedClass || 'সকল ক্লাসের সকল শিক্ষার্থী'}</p>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {studentsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">শিক্ষার্থী লোড হচ্ছে...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>কোন শিক্ষার্থী পাওয়া যায়নি</p>
                    <p className="text-sm">ক্লাস নির্বাচন করুন</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">শিক্ষার্থী</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">স্ট্যাটাস</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">সময়</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">মেথড</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.map((student) => {
                          const status = getStudentAttendanceStatus(student.uid);
                          const record = attendanceRecords.get(student.uid);

                          return (
                            <tr key={student.uid} className={`hover:bg-gray-50 ${
                              scannedStudents.has(student.uid)
                                ? 'bg-green-50'
                                : sequentialScanning && currentStudentToScan && currentStudentToScan.uid === student.uid
                                ? 'bg-blue-50 border-2 border-blue-300'
                                : ''
                            }`}>
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
                                    <div className="text-sm text-gray-500">{student.studentId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  status === 'present'
                                    ? 'bg-green-100 text-green-800'
                                    : status === 'absent'
                                    ? 'bg-red-100 text-red-800'
                                    : status === 'late'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {status ? getBengaliStatus(status) : 'পেন্ডিং'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record?.timestamp ? (
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                    {(() => {
                                      try {
                                        // Handle both Firestore Timestamp and JavaScript Date
                                        const timestamp = record.timestamp;
                                        let date: Date;

                                        if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
                                          // It's a Firestore Timestamp
                                          date = timestamp.toDate();
                                        } else if (timestamp instanceof Date) {
                                          // It's already a JavaScript Date
                                          date = timestamp;
                                        } else {
                                          // It's a string or other format
                                          date = new Date(timestamp);
                                        }

                                        return date.toLocaleTimeString('bn-BD', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        });
                                      } catch (error) {
                                        console.error('Error formatting timestamp:', error);
                                        return '--:--';
                                      }
                                    })()}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record?.method === 'qr_scan' ? (
                                  <span className="flex items-center text-blue-600">
                                    <QrCode className="w-4 h-4 mr-1" />
                                    QR স্ক্যান
                                  </span>
                                ) : (
                                  <span className="text-gray-400">ম্যানুয়াল</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">শিক্ষক তালিকা</h3>
                  <p className="text-sm text-gray-600">সকল শিক্ষক</p>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {teachersLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">শিক্ষক লোড হচ্ছে...</p>
                  </div>
                ) : teachers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <GraduationCap className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>কোন শিক্ষক পাওয়া যায়নি</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">শিক্ষক</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">স্ট্যাটাস</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">প্রবেশ</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">প্রস্থান</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teachers.map((teacher) => {
                          const record = teacherAttendanceRecords.get(teacher.uid);
                          const status = record?.status || null;

                          return (
                            <tr key={teacher.uid} className={`hover:bg-gray-50 ${
                              scannedTeachers.has(teacher.uid) ? 'bg-green-50' : ''
                            }`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
                                    {(teacher as any).profileImage ? (
                                      <img
                                        src={(teacher as any).profileImage}
                                        alt={teacher.displayName || 'Teacher'}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-white font-medium text-sm">
                                        {(teacher.displayName || teacher.name || 'T').charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{teacher.displayName || teacher.name || 'Unknown'}</div>
                                    <div className="text-sm text-gray-500">{(teacher as any).subject || 'N/A'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  status === 'present'
                                    ? 'bg-green-100 text-green-800'
                                    : status === 'absent'
                                    ? 'bg-red-100 text-red-800'
                                    : status === 'late'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : status === 'leave'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {status === 'present' ? 'উপস্থিত' : 
                                   status === 'absent' ? 'অনুপস্থিত' : 
                                   status === 'late' ? 'বিলম্বে' : 
                                   status === 'leave' ? 'ছুটি' : 'পেন্ডিং'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {record?.entryTime ? (
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1 text-green-500" />
                                    <span className="text-green-700 font-medium">
                                      {(() => {
                                        try {
                                          const timestamp = record.entryTime;
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
                                {record?.exitTime ? (
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1 text-blue-500" />
                                    <span className="text-blue-700 font-medium">
                                      {(() => {
                                        try {
                                          const timestamp = record.exitTime;
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}

export default function TakeAttendancePageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <TakeAttendancePage />
    </ProtectedRoute>
  );
}
