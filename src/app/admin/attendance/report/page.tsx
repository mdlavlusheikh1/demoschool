'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceQueries, classQueries, studentQueries, teacherQueries, AttendanceRecord, Class, User as StudentUser, User as TeacherUser } from '@/lib/database-queries';
import { settingsQueries } from '@/lib/database-queries';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ArrowLeft, Download, FileDown, Loader2, 
  Calendar, Users, ClipboardList, TrendingUp,
  Search, Filter, FileText, CheckCircle, XCircle, Clock, UserCheck, GraduationCap
} from 'lucide-react';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface TeacherAttendanceRecord {
  id?: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  timestamp?: any;
  entryTime?: any;
  exitTime?: any;
  markedBy?: string;
  remarks?: string;
}

function AttendanceReportPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [reportTab, setReportTab] = useState<'students' | 'teachers'>('students');
  
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Report data
  const [reportData, setReportData] = useState<AttendanceRecord[]>([]);
  const [teacherReportData, setTeacherReportData] = useState<TeacherAttendanceRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  const reportTypes: ReportType[] = [
    {
      id: 'daily',
      title: 'দৈনিক উপস্থিতি রিপোর্ট',
      description: 'নির্দিষ্ট তারিখের উপস্থিতি রিপোর্ট',
      icon: Calendar,
      color: 'blue'
    },
    {
      id: 'monthly',
      title: 'মাসিক উপস্থিতি রিপোর্ট',
      description: 'মাসিক উপস্থিতির সারাংশ',
      icon: ClipboardList,
      color: 'green'
    },
    {
      id: 'class',
      title: 'ক্লাস অনুযায়ী রিপোর্ট',
      description: 'নির্দিষ্ট ক্লাসের উপস্থিতি রিপোর্ট',
      icon: Users,
      color: 'orange'
    },
    {
      id: 'student',
      title: 'শিক্ষার্থী অনুযায়ী রিপোর্ট',
      description: 'নির্দিষ্ট শিক্ষার্থীর উপস্থিতি ইতিহাস',
      icon: UserCheck,
      color: 'purple'
    },
    {
      id: 'summary',
      title: 'উপস্থিতি সারাংশ',
      description: 'সামগ্রিক উপস্থিতির পরিসংখ্যান',
      icon: TrendingUp,
      color: 'indigo'
    }
  ];

  // Load school settings
  useEffect(() => {
    const loadSettings = async () => {
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
    loadSettings();
  }, []);

  // Load classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const classesData = await classQueries.getAllClasses();
        setClasses(classesData);
      } catch (error) {
        console.error('Error loading classes:', error);
      }
    };
    loadClasses();
  }, []);

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      try {
        // Load all students including inactive ones
        const studentsData = await studentQueries.getAllStudents(false);
        setStudents(studentsData);
        console.log('Loaded students for report:', studentsData.length);
        
        // Log sample student data for debugging
        if (studentsData.length > 0) {
          console.log('Sample student data:', {
            uid: studentsData[0].uid,
            studentId: studentsData[0].studentId,
            displayName: studentsData[0].displayName,
            name: studentsData[0].name
          });
        }
      } catch (error) {
        console.error('Error loading students:', error);
      }
    };
    loadStudents();
  }, []);

  // Load teachers
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachersData = await teacherQueries.getAllTeachers();
        setTeachers(teachersData.filter(t => t.isActive !== false));
        console.log('Loaded teachers for report:', teachersData.length);
      } catch (error) {
        console.error('Error loading teachers:', error);
      }
    };
    loadTeachers();
  }, []);

  // Check auth
  useEffect(() => {
    if (!authLoading && userData) {
      if (userData.role !== 'admin' && userData.role !== 'super_admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [userData, authLoading, router]);

  // Load report data
  const loadReportData = async () => {
    if (!selectedReportType) {
      alert('অনুগ্রহ করে একটি রিপোর্ট টাইপ নির্বাচন করুন');
      return;
    }
    
    setLoading(true);
    setReportData([]);
    
    try {
      let data: AttendanceRecord[] = [];
      
      // Get schoolId from userData or settings - try multiple formats
      let schoolId = userData?.schoolId || schoolSettings?.schoolCode || '102330';
      
      // Normalize schoolId - handle both string and number formats
      if (typeof schoolId === 'number') {
        schoolId = String(schoolId);
      }
      
      // Also try common schoolId formats - prioritize "102330" which is the actual school ID
      const possibleSchoolIds = [
        schoolId,
        '102330',
        String(schoolSettings?.schoolCode || ''),
        String(userData?.schoolId || ''),
        'iqra-school' // Keep as fallback for old records
      ].filter(Boolean);
      
      console.log('Loading report with schoolIds:', possibleSchoolIds, {
        userDataSchoolId: userData?.schoolId,
        settingsSchoolCode: schoolSettings?.schoolCode,
        selectedReportType,
        startDate,
        endDate
      });
      
      if (selectedReportType === 'daily') {
        // Daily report - get attendance for a specific date
        // Don't filter by schoolId for daily report, get all and filter in memory if needed
        const allDailyData = await attendanceQueries.getAttendanceByDateAndClass(startDate, selectedClass || 'all');
        
        // Filter by schoolId if we have one
        if (schoolId && schoolId !== 'all') {
          data = allDailyData.filter(record => 
            possibleSchoolIds.includes(record.schoolId) || 
            record.schoolId === schoolId ||
            !record.schoolId // Include records without schoolId as fallback
          );
        } else {
          data = allDailyData;
        }
        
      } else if (selectedReportType === 'monthly') {
        // Monthly report - get first and last day of month
        if (!startDate) {
          alert('অনুগ্রহ করে মাস নির্বাচন করুন');
          setLoading(false);
          return;
        }
        
        const date = new Date(startDate);
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = endDate || new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        console.log('Loading monthly report:', { schoolId, firstDay, lastDay });
        
        try {
          // Try with primary schoolId
          data = await attendanceQueries.getSchoolAttendance(schoolId, firstDay, lastDay);
          
          // If no data found, try with alternative schoolIds
          if (data.length === 0 && possibleSchoolIds.length > 1) {
            for (const altSchoolId of possibleSchoolIds.slice(1)) {
              if (altSchoolId && altSchoolId !== schoolId) {
                try {
                  const altData = await attendanceQueries.getSchoolAttendance(altSchoolId, firstDay, lastDay);
                  if (altData.length > 0) {
                    console.log(`Found data with alternative schoolId: ${altSchoolId}`);
                    data = altData;
                    break;
                  }
                } catch (err) {
                  console.log(`Tried schoolId ${altSchoolId}, no data found`);
                }
              }
            }
          }
        } catch (error: any) {
          // If query fails due to index issue, try alternative approach
          console.error('Error with getSchoolAttendance, trying alternative:', error);
          // Fallback: Get all records and filter in memory (less efficient but works)
          const allRecords = await attendanceQueries.getAttendanceByDateAndClass(firstDay, 'all');
          const endDateObj = new Date(lastDay);
          data = allRecords.filter(record => {
            const recordDate = new Date(record.date);
            const matchesSchoolId = !record.schoolId || 
                                   possibleSchoolIds.includes(record.schoolId) ||
                                   record.schoolId === schoolId;
            return matchesSchoolId && 
                   recordDate >= new Date(firstDay) && 
                   recordDate <= endDateObj;
          });
        }
        
      } else if (selectedReportType === 'class') {
        // Class report - get attendance for a specific class and date range
        if (!startDate) {
          alert('অনুগ্রহ করে শুরুর তারিখ নির্বাচন করুন');
          setLoading(false);
          return;
        }
        
        // Use endDate if provided, otherwise use startDate (single day)
        const classEndDate = endDate || startDate;
        
        try {
          if (selectedClass === 'all') {
            // If all classes selected, get all attendance for date range
            data = await attendanceQueries.getSchoolAttendance(schoolId, startDate, classEndDate);
            
            // If no data, try alternative schoolIds
            if (data.length === 0 && possibleSchoolIds.length > 1) {
              for (const altSchoolId of possibleSchoolIds.slice(1)) {
                if (altSchoolId && altSchoolId !== schoolId) {
                  try {
                    const altData = await attendanceQueries.getSchoolAttendance(altSchoolId, startDate, classEndDate);
                    if (altData.length > 0) {
                      data = altData;
                      break;
                    }
                  } catch (err) {
                    // Continue to next
                  }
                }
              }
            }
          } else {
            // Get attendance for specific class
            // Get all attendance for date range, then filter by class
            const allData = await attendanceQueries.getSchoolAttendance(schoolId, startDate, classEndDate);
            
            // If no data, try alternative schoolIds
            let allDataToFilter = allData;
            if (allData.length === 0 && possibleSchoolIds.length > 1) {
              for (const altSchoolId of possibleSchoolIds.slice(1)) {
                if (altSchoolId && altSchoolId !== schoolId) {
                  try {
                    const altData = await attendanceQueries.getSchoolAttendance(altSchoolId, startDate, classEndDate);
                    if (altData.length > 0) {
                      allDataToFilter = altData;
                      break;
                    }
                  } catch (err) {
                    // Continue to next
                  }
                }
              }
            }
            
            // Find the class object to get both classId and className for matching
            const selectedClassObj = classes.find(c => (c.classId || c.id) === selectedClass);
            const classNameToMatch = selectedClassObj?.className;
            
            // Filter by classId or className
            data = allDataToFilter.filter(record => {
              return record.classId === selectedClass || 
                     record.className === selectedClass ||
                     record.className === classNameToMatch;
            });
          }
        } catch (error: any) {
          console.error('Error loading class report, trying alternative:', error);
          // Fallback: Get records day by day
          const dates = [];
          const start = new Date(startDate);
          const end = new Date(classEndDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
          }
          
          const allRecords: AttendanceRecord[] = [];
          for (const date of dates) {
            try {
              const dayRecords = await attendanceQueries.getAttendanceByDateAndClass(date, selectedClass || 'all');
              const filtered = dayRecords.filter(r => {
                const matchesSchoolId = !r.schoolId || 
                                       possibleSchoolIds.includes(r.schoolId) ||
                                       r.schoolId === schoolId;
                if (selectedClass === 'all') return matchesSchoolId;
                const selectedClassObj = classes.find(c => (c.classId || c.id) === selectedClass);
                return matchesSchoolId && 
                       (r.classId === selectedClass || r.className === selectedClassObj?.className);
              });
              allRecords.push(...filtered);
            } catch (err) {
              console.error(`Error loading data for date ${date}:`, err);
            }
          }
          data = allRecords;
        }
        
      } else if (selectedReportType === 'student') {
        // Student report - get attendance for a specific student
        // For this, we need a student selector, but for now, get all students' attendance
        // and filter by date range
        if (!startDate) {
          alert('অনুগ্রহ করে শুরুর তারিখ নির্বাচন করুন');
          setLoading(false);
          return;
        }
        
        const studentEndDate = endDate || startDate;
        
        try {
          data = await attendanceQueries.getSchoolAttendance(schoolId, startDate, studentEndDate);
          
          // If no data, try alternative schoolIds
          if (data.length === 0 && possibleSchoolIds.length > 1) {
            for (const altSchoolId of possibleSchoolIds.slice(1)) {
              if (altSchoolId && altSchoolId !== schoolId) {
                try {
                  const altData = await attendanceQueries.getSchoolAttendance(altSchoolId, startDate, studentEndDate);
                  if (altData.length > 0) {
                    data = altData;
                    break;
                  }
                } catch (err) {
                  // Continue to next
                }
              }
            }
          }
        } catch (error: any) {
          console.error('Error loading student report, trying alternative:', error);
          // Fallback: Get records day by day
          const dates = [];
          const start = new Date(startDate);
          const end = new Date(studentEndDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
          }
          
          const allRecords: AttendanceRecord[] = [];
          for (const date of dates) {
            try {
              const dayRecords = await attendanceQueries.getAttendanceByDateAndClass(date, 'all');
              const filtered = dayRecords.filter(r => 
                !r.schoolId || 
                possibleSchoolIds.includes(r.schoolId) ||
                r.schoolId === schoolId
              );
              allRecords.push(...filtered);
            } catch (err) {
              console.error(`Error loading data for date ${date}:`, err);
            }
          }
          data = allRecords;
        }
        
      } else if (selectedReportType === 'summary') {
        // Summary report - get attendance for date range
        if (!startDate || !endDate) {
          alert('অনুগ্রহ করে শুরুর তারিখ এবং শেষের তারিখ নির্বাচন করুন');
          setLoading(false);
          return;
        }
        
        console.log('Loading summary report:', { schoolId, startDate, endDate });
        
        try {
          data = await attendanceQueries.getSchoolAttendance(schoolId, startDate, endDate);
          
          // If no data, try alternative schoolIds
          if (data.length === 0 && possibleSchoolIds.length > 1) {
            for (const altSchoolId of possibleSchoolIds.slice(1)) {
              if (altSchoolId && altSchoolId !== schoolId) {
                try {
                  const altData = await attendanceQueries.getSchoolAttendance(altSchoolId, startDate, endDate);
                  if (altData.length > 0) {
                    data = altData;
                    break;
                  }
                } catch (err) {
                  // Continue to next
                }
              }
            }
          }
        } catch (error: any) {
          console.error('Error loading summary report, trying alternative:', error);
          // Fallback: Get records day by day
          const dates = [];
          const start = new Date(startDate);
          const end = new Date(endDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
          }
          
          const allRecords: AttendanceRecord[] = [];
          for (const date of dates) {
            try {
              const dayRecords = await attendanceQueries.getAttendanceByDateAndClass(date, 'all');
              const filtered = dayRecords.filter(r => 
                !r.schoolId || 
                possibleSchoolIds.includes(r.schoolId) ||
                r.schoolId === schoolId
              );
              allRecords.push(...filtered);
            } catch (err) {
              console.error(`Error loading data for date ${date}:`, err);
            }
          }
          data = allRecords;
        }
      }
      
      // Filter by status if needed
      if (selectedStatus !== 'all') {
        data = data.filter(record => record.status === selectedStatus);
      }
      
      console.log('Report data loaded:', data.length, 'records');
      setReportData(data);
      
      if (data.length === 0) {
        console.warn('No data found for report:', {
          reportType: selectedReportType,
          schoolId,
          startDate,
          endDate,
          selectedClass,
          selectedStatus
        });
        // Don't show alert here, just show empty state in UI
      } else {
        console.log(`Successfully loaded ${data.length} records for ${selectedReportType} report`);
      }
      
    } catch (error) {
      console.error('Error loading report data:', error);
      const errorMessage = error instanceof Error ? error.message : 'অজানা ত্রুটি';
      alert(`রিপোর্ট লোড করতে সমস্যা হয়েছে: ${errorMessage}\n\nদয়া করে কনসোল চেক করুন অথবা অন্য তারিখ/মানদণ্ড দিয়ে চেষ্টা করুন।`);
    } finally {
      setLoading(false);
    }
  };

  // Load teacher report data
  const loadTeacherReportData = async () => {
    if (!selectedReportType) {
      alert('অনুগ্রহ করে একটি রিপোর্ট টাইপ নির্বাচন করুন');
      return;
    }
    
    setLoading(true);
    setTeacherReportData([]);
    
    try {
      let data: TeacherAttendanceRecord[] = [];
      
      if (selectedReportType === 'daily') {
        // Daily report - get attendance for a specific date
        const attendanceRef = collection(db, 'teacherAttendance');
        const q = query(
          attendanceRef,
          where('date', '==', startDate),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          data.push({
            id: doc.id,
            ...doc.data()
          } as TeacherAttendanceRecord);
        });
        
      } else if (selectedReportType === 'monthly') {
        // Monthly report - get first and last day of month
        if (!startDate) {
          alert('অনুগ্রহ করে মাস নির্বাচন করুন');
          setLoading(false);
          return;
        }
        
        const date = new Date(startDate);
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = endDate || new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Get all records for date range
        const dates = [];
        const start = new Date(firstDay);
        const end = new Date(lastDay);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }
        
        const allRecords: TeacherAttendanceRecord[] = [];
        for (const dateStr of dates) {
          try {
            const attendanceRef = collection(db, 'teacherAttendance');
            const q = query(
              attendanceRef,
              where('date', '==', dateStr),
              orderBy('timestamp', 'desc')
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              allRecords.push({
                id: doc.id,
                ...doc.data()
              } as TeacherAttendanceRecord);
            });
          } catch (err) {
            console.error(`Error loading data for date ${dateStr}:`, err);
          }
        }
        data = allRecords;
        
      } else if (selectedReportType === 'summary' || selectedReportType === 'class' || selectedReportType === 'student') {
        // Summary/Class/Student report - get attendance for date range
        if (!startDate || !endDate) {
          alert('অনুগ্রহ করে শুরুর তারিখ এবং শেষের তারিখ নির্বাচন করুন');
          setLoading(false);
          return;
        }
        
        // Get all records for date range
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }
        
        const allRecords: TeacherAttendanceRecord[] = [];
        for (const dateStr of dates) {
          try {
            const attendanceRef = collection(db, 'teacherAttendance');
            const q = query(
              attendanceRef,
              where('date', '==', dateStr),
              orderBy('timestamp', 'desc')
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              allRecords.push({
                id: doc.id,
                ...doc.data()
              } as TeacherAttendanceRecord);
            });
          } catch (err) {
            console.error(`Error loading data for date ${dateStr}:`, err);
          }
        }
        data = allRecords;
      }
      
      // Filter by status if needed
      if (selectedStatus !== 'all') {
        data = data.filter(record => record.status === selectedStatus);
      }
      
      console.log('Teacher report data loaded:', data.length, 'records');
      setTeacherReportData(data);
      
      if (data.length === 0) {
        console.warn('No teacher data found for report:', {
          reportType: selectedReportType,
          startDate,
          endDate,
          selectedStatus
        });
      } else {
        console.log(`Successfully loaded ${data.length} teacher records for ${selectedReportType} report`);
      }
      
    } catch (error) {
      console.error('Error loading teacher report data:', error);
      const errorMessage = error instanceof Error ? error.message : 'অজানা ত্রুটি';
      alert(`শিক্ষক রিপোর্ট লোড করতে সমস্যা হয়েছে: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Get color classes
  const getColorClasses = (color: string, type: 'bg' | 'text' | 'hover' | 'light') => {
    const colors: { [key: string]: { bg: string; text: string; hover: string; light: string } } = {
      blue: { bg: 'bg-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-700', light: 'bg-blue-100 text-blue-600' },
      green: { bg: 'bg-green-600', text: 'text-green-600', hover: 'hover:bg-green-700', light: 'bg-green-100 text-green-600' },
      orange: { bg: 'bg-orange-600', text: 'text-orange-600', hover: 'hover:bg-orange-700', light: 'bg-orange-100 text-orange-600' },
      purple: { bg: 'bg-purple-600', text: 'text-purple-600', hover: 'hover:bg-purple-700', light: 'bg-purple-100 text-purple-600' },
      indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', hover: 'hover:bg-indigo-700', light: 'bg-indigo-100 text-indigo-600' },
    };
    return colors[color]?.[type] || colors.blue[type];
  };

  // Get student name from studentId
  const getStudentName = (studentId: string): string => {
    if (!studentId) {
      console.warn('getStudentName: studentId is empty');
      return 'Unknown';
    }
    
    // Try multiple matching strategies
    // 1. Match by uid (document ID) - most common case
    let student = students.find(s => s.uid === studentId);
    
    // 2. Match by studentId field (like "STD028")
    if (!student) {
      student = students.find(s => s.studentId === studentId);
    }
    
    // 3. Match by email (if studentId is an email)
    if (!student && studentId.includes('@')) {
      student = students.find(s => s.email === studentId);
    }
    
    if (student) {
      // Return displayName first, then name, then fallback
      const name = student.displayName || student.name;
      if (name && name !== 'Unknown' && name.trim() !== '') {
        return name;
      } else {
        console.warn('getStudentName: Student found but name is empty', { studentId, uid: student.uid, studentIdField: student.studentId });
      }
    } else {
      // Log when student is not found for debugging
      if (students.length > 0) {
        console.warn('getStudentName: Student not found', { 
          attendanceStudentId: studentId, 
          totalStudents: students.length,
          sampleStudentIds: students.slice(0, 3).map(s => ({ uid: s.uid, studentId: s.studentId }))
        });
      }
    }
    
    // Return Unknown if no match found
    return 'Unknown';
  };

  // Get unique records - based on studentId and date combination
  const getUniqueRecords = () => {
    const uniqueRecords = new Map<string, AttendanceRecord>();
    
    reportData.forEach(record => {
      // Use studentId + date as unique key
      const key = `${record.studentId}_${record.date}`;
      // Keep the most recent record for each student-date combination
      if (!uniqueRecords.has(key) || 
          (record.timestamp && uniqueRecords.get(key)?.timestamp && 
           record.timestamp.seconds > (uniqueRecords.get(key)?.timestamp?.seconds || 0))) {
        uniqueRecords.set(key, record);
      }
    });
    
    return Array.from(uniqueRecords.values());
  };

  // Calculate statistics - based on unique students
  const getStatistics = () => {
    const uniqueRecordsArray = getUniqueRecords();
    const total = uniqueRecordsArray.length;
    const present = uniqueRecordsArray.filter(r => r.status === 'present').length;
    const absent = uniqueRecordsArray.filter(r => r.status === 'absent').length;
    const late = uniqueRecordsArray.filter(r => r.status === 'late').length;
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(2) : '0';
    
    return { total, present, absent, late, attendanceRate, totalRecords: reportData.length };
  };

  // Get unique teacher records - based on teacherId and date combination
  const getUniqueTeacherRecords = () => {
    const uniqueRecords = new Map<string, TeacherAttendanceRecord>();
    
    teacherReportData.forEach(record => {
      // Use teacherId + date as unique key
      const key = `${record.teacherId}_${record.date}`;
      // Keep the most recent record for each teacher-date combination
      if (!uniqueRecords.has(key) || 
          (record.timestamp && uniqueRecords.get(key)?.timestamp && 
           record.timestamp.seconds > (uniqueRecords.get(key)?.timestamp?.seconds || 0))) {
        uniqueRecords.set(key, record);
      }
    });
    
    return Array.from(uniqueRecords.values());
  };

  // Calculate teacher statistics
  const getTeacherStatistics = () => {
    const uniqueRecordsArray = getUniqueTeacherRecords();
    const total = uniqueRecordsArray.length;
    const present = uniqueRecordsArray.filter(r => r.status === 'present').length;
    const absent = uniqueRecordsArray.filter(r => r.status === 'absent').length;
    const late = uniqueRecordsArray.filter(r => r.status === 'late').length;
    const leave = uniqueRecordsArray.filter(r => r.status === 'leave').length;
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(2) : '0';
    
    return { total, present, absent, late, leave, attendanceRate, totalRecords: teacherReportData.length };
  };

  const stats = getStatistics();
  const uniqueRecords = getUniqueRecords();
  const teacherStats = getTeacherStatistics();
  const uniqueTeacherRecords = getUniqueTeacherRecords();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="উপস্থিতি রিপোর্ট" subtitle="বিভিন্ন ধরনের উপস্থিতি রিপোর্ট তৈরি করুন">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin/attendance')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>ফিরে যান</span>
        </button>

        {/* Report Type Selection */}
        {!selectedReportType && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReportType(report.id)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${getColorClasses(report.color, 'light')} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Report Builder */}
        {selectedReportType && (
          <div className="space-y-6">
            {/* Tab Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex space-x-2">
              <button
                onClick={() => {
                  setReportTab('students');
                  setReportData([]);
                  setTeacherReportData([]);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  reportTab === 'students'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                শিক্ষার্থী রিপোর্ট
              </button>
              <button
                onClick={() => {
                  setReportTab('teachers');
                  setReportData([]);
                  setTeacherReportData([]);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  reportTab === 'teachers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <GraduationCap className="w-4 h-4 inline mr-2" />
                শিক্ষক রিপোর্ট
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">রিপোর্ট টাইপ</label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => {
                      setSelectedReportType(e.target.value);
                      setReportData([]);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {reportTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.title}</option>
                    ))}
                  </select>
                </div>

                {selectedReportType === 'class' && reportTab === 'students' && (
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাস</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option key="all-classes" value="all">সকল ক্লাস</option>
                      {classes.map((cls, index) => (
                        <option key={cls.classId || cls.id || `class-${index}`} value={cls.classId || cls.id}>
                          {cls.className} {cls.section ? `(${cls.section})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedReportType !== 'monthly' && (
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedReportType === 'daily' ? 'তারিখ' : 'শুরুর তারিখ'}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {selectedReportType === 'monthly' && (
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">মাস (তারিখ নির্বাচন করুন)</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        // Auto-set end date to last day of month
                        if (e.target.value) {
                          const date = new Date(e.target.value);
                          const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
                          setEndDate(lastDay);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">মাসের যেকোনো তারিখ নির্বাচন করুন, শেষ তারিখ স্বয়ংক্রিয়ভাবে সেট হবে</p>
                  </div>
                )}

                {(selectedReportType === 'summary' || selectedReportType === 'class' || selectedReportType === 'student') && (
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">শেষ তারিখ</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">অবস্থা</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option key="all" value="all">সকল</option>
                    <option key="present" value="present">উপস্থিত</option>
                    <option key="absent" value="absent">অনুপস্থিত</option>
                    <option key="late" value="late">বিলম্ব</option>
                    {reportTab === 'teachers' && (
                      <option key="leave" value="leave">ছুটি</option>
                    )}
                  </select>
                </div>

                <button
                  onClick={reportTab === 'students' ? loadReportData : loadTeacherReportData}
                  disabled={loading}
                  className={`px-6 py-2 ${getColorClasses(reportTypes.find(r => r.id === selectedReportType)?.color || 'blue', 'bg')} text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>লোড হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>রিপোর্ট লোড করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Statistics */}
            {reportTab === 'students' && reportData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">মোট শিক্ষার্থী</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                      <p className="text-2xl font-bold text-green-600">{stats.present}</p>
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
                      <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
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
                      <p className="text-2xl font-bold text-blue-600">{stats.attendanceRate}%</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportTab === 'teachers' && teacherReportData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">মোট শিক্ষক</p>
                      <p className="text-2xl font-bold text-gray-900">{teacherStats.total}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">উপস্থিত</p>
                      <p className="text-2xl font-bold text-green-600">{teacherStats.present}</p>
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
                      <p className="text-2xl font-bold text-red-600">{teacherStats.absent}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">বিলম্বে/ছুটি</p>
                      <p className="text-2xl font-bold text-yellow-600">{teacherStats.late + teacherStats.leave}</p>
                    </div>
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">উপস্থিতির হার</p>
                      <p className="text-2xl font-bold text-blue-600">{teacherStats.attendanceRate}%</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Student Report Data Table */}
            {reportTab === 'students' && reportData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">শিক্ষার্থী রিপোর্ট ডাটা</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // TODO: Implement PDF export
                        alert('PDF export coming soon!');
                      }}
                      disabled={generating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="w-4 h-4" />
                          <span>PDF</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement Excel export
                        alert('Excel export coming soon!');
                      }}
                      disabled={generating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Excel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">তারিখ</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">শিক্ষার্থীর নাম</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">ক্লাস</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">অবস্থা</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">সময়</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueRecords.map((record, index) => {
                        const studentName = getStudentName(record.studentId);
                        return (
                          <tr key={`${record.studentId}_${record.date}_${index}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700 border-b">{record.date}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-b font-medium">{studentName}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-b">{record.className}</td>
                            <td className="px-4 py-3 text-sm border-b">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                record.status === 'present' ? 'bg-green-100 text-green-700' :
                                record.status === 'absent' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {record.status === 'present' ? 'উপস্থিত' :
                                 record.status === 'absent' ? 'অনুপস্থিত' :
                                 'বিলম্ব'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-b">
                              {record.timestamp ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('bn-BD') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Teacher Report Data Table */}
            {reportTab === 'teachers' && teacherReportData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">শিক্ষক রিপোর্ট ডাটা</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // TODO: Implement PDF export
                        alert('PDF export coming soon!');
                      }}
                      disabled={generating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="w-4 h-4" />
                          <span>PDF</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement Excel export
                        alert('Excel export coming soon!');
                      }}
                      disabled={generating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Excel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">তারিখ</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">শিক্ষকের নাম</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">ইমেইল</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">অবস্থা</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">প্রবেশ</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">প্রস্থান</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueTeacherRecords.map((record, index) => {
                        const teacher = teachers.find(t => t.uid === record.teacherId);
                        return (
                          <tr key={`${record.teacherId}_${record.date}_${index}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700 border-b">{record.date}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-b font-medium">
                              {record.teacherName || teacher?.displayName || teacher?.name || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-b">{record.teacherEmail || teacher?.email || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm border-b">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                record.status === 'present' ? 'bg-green-100 text-green-700' :
                                record.status === 'absent' ? 'bg-red-100 text-red-700' :
                                record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {record.status === 'present' ? 'উপস্থিত' :
                                 record.status === 'absent' ? 'অনুপস্থিত' :
                                 record.status === 'late' ? 'বিলম্বে' :
                                 'ছুটি'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-b">
                              {record.entryTime ? (() => {
                                try {
                                  const timestamp = record.entryTime;
                                  let date: Date;
                                  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
                                    date = timestamp.toDate();
                                  } else if (timestamp instanceof Date) {
                                    date = timestamp;
                                  } else {
                                    date = new Date(timestamp.seconds * 1000);
                                  }
                                  return date.toLocaleTimeString('bn-BD', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                  });
                                } catch (error) {
                                  return '-';
                                }
                              })() : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-b">
                              {record.exitTime ? (() => {
                                try {
                                  const timestamp = record.exitTime;
                                  let date: Date;
                                  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
                                    date = timestamp.toDate();
                                  } else if (timestamp instanceof Date) {
                                    date = timestamp;
                                  } else {
                                    date = new Date(timestamp.seconds * 1000);
                                  }
                                  return date.toLocaleTimeString('bn-BD', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                  });
                                } catch (error) {
                                  return '-';
                                }
                              })() : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {reportTab === 'students' && reportData.length === 0 && !loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">কোনো ডাটা পাওয়া যায়নি। অনুগ্রহ করে রিপোর্ট লোড করুন।</p>
              </div>
            )}

            {reportTab === 'teachers' && teacherReportData.length === 0 && !loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">কোনো ডাটা পাওয়া যায়নি। অনুগ্রহ করে রিপোর্ট লোড করুন।</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AttendanceReportPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AttendanceReportPage />
    </ProtectedRoute>
  );
}

