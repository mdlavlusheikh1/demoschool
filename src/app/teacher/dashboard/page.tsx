'use client';

import { useState, useEffect } from 'react';
import TeacherLayout from '@/components/TeacherLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { studentQueries, accountingQueries, settingsQueries, userQueries, classQueries, examQueries, attendanceQueries, eventQueries, Event } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, onSnapshot } from 'firebase/firestore';
import {
  Users,
  GraduationCap,
  Building,
  BookOpen,
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  Loader2,
  ClipboardList,
  MessageSquare,
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'exam' | 'homework' | 'attendance' | 'notice' | 'event';
  title: string;
  description: string;
  time: string;
  color: string;
}

interface Schedule {
  id: string;
  time: string;
  timeLabel: string;
  title: string;
  subtitle: string;
  status: 'চলমান' | 'আসন্ন' | 'পরবর্তী';
  statusColor: string;
}

function TeacherDashboard() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<Schedule[]>([]);
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalClasses: 0,
    myClasses: 0,
    pendingHomework: 0,
    upcomingExams: 0,
    todayAttendance: 0,
    monthlyIncome: 0,
  });

  useEffect(() => {
    loadDashboardData();
    loadRecentActivities();
    loadTodaySchedule();
    
    // Set up real-time listener for students
    const settingsPromise = settingsQueries.getSettings();
    settingsPromise.then(async (settings) => {
      const schoolId = settings?.schoolCode || SCHOOL_ID;
      
      const q = query(
        collection(db, 'students'),
        where('role', '==', 'student'),
        where('schoolId', '==', schoolId),
        where('isActive', '==', true)
      );

      const unsubscribe = onSnapshot(q, () => {
        // When students change, refresh dashboard data
        console.log('🔄 Students updated - refreshing teacher dashboard');
        loadDashboardData();
      }, (error) => {
        console.error('Error in real-time listener:', error);
      });

      return () => unsubscribe();
    });
  }, [userData]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const settings = await settingsQueries.getSettings();
      const schoolId = settings?.schoolCode || SCHOOL_ID;

      // Load students data
      const students = await studentQueries.getStudentsBySchool(schoolId);
      const activeStudents = students.filter((s: any) => s.isActive);

      // Load classes data
      const allClasses = await classQueries.getAllClasses();
      const myClasses = userData?.uid 
        ? allClasses.filter((c: any) => c.teacherId === userData.uid)
        : [];

      // Load homework data
      let pendingHomeworkCount = 0;
      try {
        const homeworksRef = collection(db, 'homeworks');
        const homeworkQuery = query(
          homeworksRef,
          where('teacherId', '==', userData?.uid || ''),
          where('status', '==', 'active')
        );
        const homeworkSnapshot = await getDocs(homeworkQuery);
        pendingHomeworkCount = homeworkSnapshot.size;
      } catch (error) {
        console.log('Error loading homework:', error);
      }

      // Load exams data (upcoming exams this month)
      let upcomingExamsCount = 0;
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const allExams = await examQueries.getAllExams(schoolId);
        upcomingExamsCount = allExams.filter((exam: any) => {
          if (!exam.examDate) return false;
          const examDate = new Date(exam.examDate);
          return examDate >= firstDayOfMonth && examDate <= lastDayOfMonth;
        }).length;
      } catch (error) {
        console.log('Error loading exams:', error);
      }

      // Load today's attendance
      let todayAttendanceCount = 0;
      try {
        const today = new Date().toISOString().split('T')[0];
        const attendanceRecords = await attendanceQueries.getSchoolAttendance(schoolId, today, today);
        todayAttendanceCount = attendanceRecords.filter((r: any) => r.status === 'present').length;
      } catch (error) {
        console.log('Error loading attendance:', error);
      }

      // Load financial data
      let monthlyIncome = 0;
      try {
        const financialSummary = await accountingQueries.getFinancialSummary(schoolId);
        monthlyIncome = financialSummary.totalIncome || 0;
      } catch (error) {
        console.log('Error loading financial data:', error);
      }

      setDashboardData({
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        totalClasses: allClasses.length,
        myClasses: myClasses.length,
        pendingHomework: pendingHomeworkCount,
        upcomingExams: upcomingExamsCount,
        todayAttendance: todayAttendanceCount,
        monthlyIncome: monthlyIncome,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values on error
      setDashboardData({
        totalStudents: 0,
        activeStudents: 0,
        totalClasses: 0,
        myClasses: 0,
        pendingHomework: 0,
        upcomingExams: 0,
        todayAttendance: 0,
        monthlyIncome: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      const schoolId = settings?.schoolCode || SCHOOL_ID;
      const activities: Activity[] = [];

      // Load recent exams
      try {
        const allExams = await examQueries.getAllExams(schoolId);
        const recentExams = allExams
          .filter((exam: any) => exam.examDate)
          .sort((a: any, b: any) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())
          .slice(0, 2);

        recentExams.forEach((exam: any) => {
          activities.push({
            id: exam.id || '',
            type: 'exam',
            title: `${exam.name} - ${exam.examType || 'পরীক্ষা'}`,
            description: `${exam.class || ''} ${exam.section || ''} - পরীক্ষা সম্পন্ন`,
            time: getRelativeTime(exam.examDate),
            color: 'green'
          });
        });
      } catch (error) {
        console.log('Error loading recent exams:', error);
      }

      // Load recent homework
      try {
        const homeworksRef = collection(db, 'homeworks');
        let homeworkQuery;
        let homeworkSnapshot;
        
        try {
          // Try with composite query (status + createdAt)
          homeworkQuery = query(
            homeworksRef,
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(2)
          );
          homeworkSnapshot = await getDocs(homeworkQuery);
        } catch (indexError: any) {
          // If index error, try without status filter
          if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
            console.log('⚠️ Index error, trying without status filter...');
            homeworkQuery = query(
              homeworksRef,
              orderBy('createdAt', 'desc'),
              limit(10)
            );
            homeworkSnapshot = await getDocs(homeworkQuery);
            
            // Filter by status manually
            const filteredDocs = homeworkSnapshot.docs.filter(doc => doc.data().status === 'active').slice(0, 2);
            filteredDocs.forEach((doc) => {
              const data = doc.data();
              activities.push({
                id: doc.id,
                type: 'homework',
                title: 'নতুন হোমওয়ার্ক জমা',
                description: `${data.class || ''} - ${data.subject || ''}`,
                time: getRelativeTime(data.createdAt),
                color: 'blue'
              });
            });
            // Skip the forEach below
            homeworkSnapshot = null;
          } else {
            throw indexError;
          }
        }
        
        if (homeworkSnapshot) {
          homeworkSnapshot.forEach((doc) => {
            const data = doc.data();
            activities.push({
              id: doc.id,
              type: 'homework',
              title: 'নতুন হোমওয়ার্ক জমা',
              description: `${data.class || ''} - ${data.subject || ''}`,
              time: getRelativeTime(data.createdAt),
              color: 'blue'
            });
          });
        }
      } catch (error: any) {
        console.log('Error loading homework:', error);
        // Silently fail - homework is not critical for dashboard
      }

      // Load recent attendance
      try {
        const today = new Date().toISOString().split('T')[0];
        const attendanceRecords = await attendanceQueries.getSchoolAttendance(schoolId, today, today);
        
        if (attendanceRecords.length > 0) {
          activities.push({
            id: 'attendance-today',
            type: 'attendance',
            title: 'উপস্থিতি রেকর্ড সম্পন্ন',
            description: `আজকের উপস্থিতি - ${attendanceRecords.filter(r => r.status === 'present').length} জন উপস্থিত`,
            time: 'আজ',
            color: 'purple'
          });
        }
      } catch (error) {
        console.log('Error loading attendance:', error);
      }

      // Load recent notices
      try {
        const noticesRef = collection(db, 'notices');
        const noticeQuery = query(
          noticesRef,
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const noticeSnapshot = await getDocs(noticeQuery);
        
        noticeSnapshot.forEach((doc) => {
          const data = doc.data();
          activities.push({
            id: doc.id,
            type: 'notice',
            title: 'নোটিশ প্রকাশিত',
            description: data.title || 'নতুন নোটিশ',
            time: getRelativeTime(data.createdAt),
            color: 'orange'
          });
        });
      } catch (error) {
        console.log('Error loading notices:', error);
      }

      // Sort by most recent and limit to 4
      setRecentActivities(activities.slice(0, 4));
    } catch (error) {
      console.error('Error loading recent activities:', error);
      setRecentActivities([]);
    }
  };

  const loadTodaySchedule = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      const schoolId = settings?.schoolCode || SCHOOL_ID;
      const schedule: Schedule[] = [];

      // Load today's events
      try {
        const today = new Date().toISOString().split('T')[0];
        const allEvents = await eventQueries.getAllEvents(schoolId);
        const todayEvents = allEvents.filter((event: Event) => event.date === today);

        todayEvents.forEach((event: Event, index: number) => {
          const eventTime = event.startTime || '08:00';
          schedule.push({
            id: event.id || `event-${index}`,
            time: eventTime,
            timeLabel: formatTimeLabel(eventTime),
            title: event.title,
            subtitle: event.location || 'স্কুল',
            status: getEventStatus(eventTime),
            statusColor: getStatusColor(getEventStatus(eventTime))
          });
        });
      } catch (error) {
        console.log('Error loading events:', error);
      }

      // Load teacher's classes for today
      if (userData?.uid) {
        try {
          const myClasses = await classQueries.getClassesByTeacher(userData.uid);
          
          // Add some sample class times (in real implementation, fetch from schedule)
          const classTimes = [
            { time: '08:00', label: 'সকাল' },
            { time: '10:00', label: 'সকাল' },
            { time: '14:00', label: 'দুপুর' }
          ];

          myClasses.slice(0, 3).forEach((cls: any, index: number) => {
            const timeSlot = classTimes[index] || { time: '08:00', label: 'সকাল' };
            schedule.push({
              id: cls.classId || `class-${index}`,
              time: timeSlot.time,
              timeLabel: timeSlot.label,
              title: `${cls.className} ${cls.section || ''} - ${cls.subject || 'ক্লাস'}`,
              subtitle: `রুম নং ${101 + index}`,
              status: getEventStatus(timeSlot.time),
              statusColor: getStatusColor(getEventStatus(timeSlot.time))
            });
          });
        } catch (error) {
          console.log('Error loading classes:', error);
        }
      }

      // Sort by time
      schedule.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      setTodaySchedule(schedule.slice(0, 3));
    } catch (error) {
      console.error('Error loading today schedule:', error);
      setTodaySchedule([]);
    }
  };

  const getRelativeTime = (timestamp: any): string => {
    if (!timestamp) return 'সম্প্রতি';
    
    let date: Date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'সম্প্রতি';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'এইমাত্র';
    if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;
    if (diffDays === 1) return '১ দিন আগে';
    if (diffDays < 7) return `${diffDays} দিন আগে`;
    return 'সম্প্রতি';
  };

  const formatTimeLabel = (time: string): string => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'সকাল';
    if (hour < 17) return 'দুপুর';
    return 'বিকাল';
  };

  const getEventStatus = (time: string): 'চলমান' | 'আসন্ন' | 'পরবর্তী' => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [eventHour, eventMinute] = time.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMinute;
    const eventMinutes = eventHour * 60 + eventMinute;
    
    if (Math.abs(currentMinutes - eventMinutes) < 60) return 'চলমান';
    if (eventMinutes > currentMinutes && eventMinutes - currentMinutes < 120) return 'আসন্ন';
    return 'পরবর্তী';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'চলমান': return 'bg-green-100 text-green-700';
      case 'আসন্ন': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const getActivityColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-600',
      blue: 'bg-blue-600',
      purple: 'bg-purple-600',
      orange: 'bg-orange-600'
    };
    return colors[color] || 'bg-gray-600';
  };

  if (loading) {
    return (
      <TeacherLayout title="শিক্ষক ড্যাশবোর্ড" subtitle="আপনার শিক্ষণ কার্যক্রমের সারসংক্ষেপ">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="শিক্ষক ড্যাশবোর্ড" subtitle={`স্বাগতম, ${userData?.name || 'শিক্ষক'}`}>
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-gray-100 to-white rounded-xl shadow-lg p-8 mb-6 text-center border border-gray-200">
        <h2 className="text-3xl font-bold mb-2 text-gray-800">স্বাগতম, {userData?.name || 'শিক্ষক'}!</h2>
        <p className="text-gray-600">আপনার শিক্ষণ কার্যক্রমের সারসংক্ষেপ দেখুন এবং দৈনন্দিন কাজ পরিচালনা করুন।</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">মোট শিক্ষার্থী</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.totalStudents}</p>
              <p className="text-xs text-green-600 mt-1">সক্রিয়: {dashboardData.activeStudents}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">আমার ক্লাস</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.myClasses}</p>
              <p className="text-xs text-gray-500 mt-1">মোট: {dashboardData.totalClasses}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">বাড়ির কাজ</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.pendingHomework}</p>
              <p className="text-xs text-yellow-600 mt-1">পর্যালোচনার জন্য অপেক্ষমান</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">আসন্ন পরীক্ষা</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.upcomingExams}</p>
              <p className="text-xs text-purple-600 mt-1">এই মাসে</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">দ্রুত কাজ</h3>
          <div className="space-y-3">
            <a
              href="/teacher/attendance"
              className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <ClipboardList className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">উপস্থিতি নিন</p>
                  <p className="text-sm text-gray-600">আজকের উপস্থিতি রেকর্ড করুন</p>
                </div>
              </div>
            </a>

            <a
              href="/teacher/homework"
              className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">বাড়ির কাজ দিন</p>
                  <p className="text-sm text-gray-600">নতুন হোমওয়ার্ক তৈরি করুন</p>
                </div>
              </div>
            </a>

            <a
              href="/teacher/exams"
              className="block p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Award className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-semibold text-gray-900">পরীক্ষা পরিচালনা</p>
                  <p className="text-sm text-gray-600">পরীক্ষা তৈরি ও নম্বর প্রদান</p>
                </div>
              </div>
            </a>

            <a
              href="/teacher/students"
              className="block p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-semibold text-gray-900">শিক্ষার্থী দেখুন</p>
                  <p className="text-sm text-gray-600">শিক্ষার্থীদের তালিকা ও বিবরণ</p>
                </div>
              </div>
            </a>

            <a
              href="/teacher/messages"
              className="block p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-semibold text-gray-900">বার্তা</p>
                  <p className="text-sm text-gray-600">প্রশাসনিক বার্তা দেখুন</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">সাম্প্রতিক কার্যক্রম</h3>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
                  <div className={`w-2 h-2 ${getActivityColor(activity.color)} rounded-full mt-2`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">কোনো সাম্প্রতিক কার্যক্রম নেই</p>
            )}
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">আজকের সময়সূচী</h3>
        <div className="space-y-3">
          {todaySchedule.length > 0 ? (
            todaySchedule.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{item.time}</p>
                    <p className="text-xs text-gray-600">{item.timeLabel}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.subtitle}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 ${item.statusColor} text-xs font-medium rounded-full`}>
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">আজকের জন্য কোনো সময়সূচী নেই</p>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <TeacherDashboard />
    </ProtectedRoute>
  );
}
