'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { studentQueries, attendanceQueries, examResultQueries, eventQueries } from '@/lib/database-queries';
import { feeQueries } from '@/lib/queries/fee-queries';
import { getParentMessages, getUnreadMessageCount } from '@/lib/fee-notification-helper';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, onSnapshot } from 'firebase/firestore';
import { 
  ClipboardList, 
  Calendar, 
  FileText,
  MessageCircle,
  DollarSign,
  TrendingUp,
  BookOpen,
  Loader2
} from 'lucide-react';

// Helper function to convert numbers to Bengali numerals
const toBengaliNumerals = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '০';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formatted = num.toLocaleString('en-US');
  return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

// Helper function to get students by parent
const getStudentsByParent = async (parentEmail?: string, parentPhone?: string) => {
  try {
    const allStudents = await studentQueries.getAllStudents();
    
    if (!parentEmail && !parentPhone) {
      return [];
    }

    const myChildren = allStudents.filter(student => {
      const guardianPhone = (student as any).guardianPhone || '';
      const fatherPhone = (student as any).fatherPhone || '';
      const motherPhone = (student as any).motherPhone || '';
      const parentEmailField = (student as any).parentEmail || '';
      
      return (parentPhone && (guardianPhone === parentPhone || fatherPhone === parentPhone || motherPhone === parentPhone)) ||
             (parentEmail && parentEmailField === parentEmail);
    });

    return myChildren;
  } catch (error) {
    console.error('Error getting students by parent:', error);
    return [];
  }
};

// Helper function to format date
const formatDate = (date: any): string => {
  if (!date) return '';
  if (date.toDate) {
    return date.toDate().toLocaleDateString('en-GB');
  }
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString('en-GB');
  }
  return '';
};

// Helper function to get time ago
const getTimeAgo = (date: any): string => {
  if (!date) return '';
  try {
    let dateObj: Date;
    if (date.toDate) {
      dateObj = date.toDate();
    } else if (date.toMillis) {
      dateObj = new Date(date.toMillis());
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (date.seconds) {
      // Firestore Timestamp with seconds
      dateObj = new Date(date.seconds * 1000);
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${toBengaliNumerals(diffMins)} মিনিট আগে`;
    } else if (diffHours < 24) {
      return `${toBengaliNumerals(diffHours)} ঘন্টা আগে`;
    } else if (diffDays < 7) {
      return `${toBengaliNumerals(diffDays)} দিন আগে`;
    } else {
      return formatDate(date);
    }
  } catch (error) {
    console.error('Error calculating time ago:', error, date);
    return '';
  }
};

function ParentDashboard() {
  const router = useRouter();
  const { userData, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [stats, setStats] = useState({
    averageAttendance: 0,
    averagePercentage: 0,
    totalSubjects: 0,
    newMessages: 0
  });
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const parentEmail = user?.email || (userData as any)?.email;
      const parentPhone = (userData as any)?.phone || user?.phoneNumber;
      
      // Load children
      const myChildren = await getStudentsByParent(parentEmail, parentPhone);
      const childrenData = myChildren.map(s => ({
        id: (s as any).id || (s as any).uid || '',
        name: s.name || '',
        className: (s as any).className || (s as any).class || '',
        section: (s as any).section || '',
        rollNumber: (s as any).rollNumber || '',
        photoURL: (s as any).profileImage || (s as any).photoURL || '',
      }));
      setChildren(childrenData);
      // Reset image errors when children are reloaded
      setImageErrors({});

      if (myChildren.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = myChildren.map(c => (c as any).uid || (c as any).id);

      // Load attendance stats
      let totalAttendance = 0;
      let attendanceCount = 0;
      for (const student of myChildren) {
        try {
          const studentId = (student as any).uid || (student as any).id;
          const attendanceRecords = await attendanceQueries.getStudentAttendance(studentId, 30);
          
          if (attendanceRecords.length > 0) {
            const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
            const attendanceRate = (presentCount / attendanceRecords.length) * 100;
            totalAttendance += attendanceRate;
            attendanceCount++;
          }
        } catch (error) {
          console.error(`Error loading attendance for student:`, error);
        }
      }

      const averageAttendance = attendanceCount > 0 ? totalAttendance / attendanceCount : 0;

      // Load exam results for average
      let totalPercentage = 0;
      let resultCount = 0;
      const recentResults: any[] = [];
      
      for (const studentId of studentIds) {
        try {
          const results = await examResultQueries.getStudentResults(studentId, SCHOOL_ID);
          const completedResults = results.filter(r => !r.isAbsent && r.percentage);
          
          console.log(`Student ${studentId}: Found ${completedResults.length} completed exam results`);
          
          if (completedResults.length > 0) {
            const studentAvg = completedResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / completedResults.length;
            totalPercentage += studentAvg;
            resultCount++;
            
            // Get recent results for updates
            const sortedResults = [...completedResults].sort((a, b) => {
              const dateA = a.enteredAt?.toDate?.() || new Date(0);
              const dateB = b.enteredAt?.toDate?.() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });
            
            const examUpdates = sortedResults.slice(0, 3).map(r => ({
              type: 'exam_result',
              studentName: r.studentName,
              subject: r.subject,
              grade: r.grade,
              percentage: r.percentage,
              date: r.enteredAt,
              examName: r.examName
            }));
            
            console.log(`Adding ${examUpdates.length} exam result updates for student ${studentId}`);
            recentResults.push(...examUpdates);
          }
        } catch (error) {
          console.error(`Error loading results for student:`, error);
        }
      }
      
      console.log(`Total exam result updates: ${recentResults.length}`);

      const averagePercentage = resultCount > 0 ? totalPercentage / resultCount : 0;

      // Get unique subjects
      const allSubjects = new Set<string>();
      for (const studentId of studentIds) {
        try {
          const results = await examResultQueries.getStudentResults(studentId, SCHOOL_ID);
          results.forEach(r => {
            if (r.subject) allSubjects.add(r.subject);
          });
        } catch (error) {
          console.error(`Error loading subjects for student:`, error);
        }
      }

      // Load recent homeworks
      try {
        const homeworksRef = collection(db, 'homeworks');
        const homeworksQuery = query(
          homeworksRef,
          orderBy('createdAt', 'desc'),
          limit(10) // Increase limit to get more homeworks
        );
        const homeworksSnapshot = await getDocs(homeworksQuery);
        
        const studentClasses = myChildren.map(c => (c as any).class || (c as any).className || '');
        console.log(`Loading homeworks for classes: ${studentClasses.join(', ')}`);
        console.log(`Found ${homeworksSnapshot.size} total homeworks in database`);
        
        let homeworkCount = 0;
        homeworksSnapshot.forEach(doc => {
          const data = doc.data();
          const homeworkClass = data.class || '';
          
          if (studentClasses.includes(homeworkClass) && data.status === 'active') {
            homeworkCount++;
            recentResults.push({
              type: 'homework',
              title: data.title,
              subject: data.subject,
              studentName: myChildren.find(c => ((c as any).class || (c as any).className) === homeworkClass)?.name || '',
              dueDate: data.dueDate,
              date: data.createdAt
            });
          }
        });
        
        console.log(`Added ${homeworkCount} homework updates`);
      } catch (error) {
        console.error('Error loading homeworks:', error);
      }

      // Load messages count and fee payment notifications FIRST (before sorting)
      let newMessagesCount = 0;
      try {
        if (user?.uid) {
          console.log(`Loading messages for parent user: ${user.uid}`);
          newMessagesCount = await getUnreadMessageCount(user.uid);
          console.log(`Unread message count: ${newMessagesCount}`);
          
          // Load recent fee payment messages for recent updates
          const parentMessages = await getParentMessages(user.uid);
          console.log(`Total parent messages: ${parentMessages.length}`);
          console.log(`Message types:`, parentMessages.map(m => m.type));
          
          const feePaymentMessages = parentMessages
            .filter(m => m.type === 'fee_payment')
            .slice(0, 10) // Increase limit to get more fee payment messages
            .map(m => {
              const date = m.createdAt || m.paymentDate;
              console.log(`Processing fee payment message:`, {
                studentName: m.studentName,
                feeName: m.feeName,
                amount: m.amount,
                date: date,
                dateType: typeof date,
                hasToDate: date?.toDate ? 'yes' : 'no'
              });
              
              return {
                type: 'fee_payment',
                studentName: m.studentName,
                feeName: m.feeName,
                amount: m.amount,
                month: m.month,
                date: date,
                voucherNumber: m.voucherNumber
              };
            });
          
          console.log(`Found ${feePaymentMessages.length} fee payment messages for recent updates`);
          
          // Add fee payment messages to recent updates
          if (feePaymentMessages.length > 0) {
            recentResults.push(...feePaymentMessages);
            console.log(`Added ${feePaymentMessages.length} fee payment messages to recent updates`);
          }
        } else {
          console.warn('⚠️ No user.uid found, skipping message loading');
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }

      // Sort recent updates by date (after adding all updates including fee payments)
      // Filter out items with invalid dates and sort by date
      const validUpdates = recentResults.filter(update => {
        try {
          let date: Date | null = null;
          
          if (update.date) {
            if (update.date.toDate) {
              date = update.date.toDate();
            } else if (update.date.toMillis) {
              date = new Date(update.date.toMillis());
            } else if (typeof update.date === 'string') {
              date = new Date(update.date);
            } else if (update.date instanceof Date) {
              date = update.date;
            } else if (update.date.seconds) {
              // Firestore Timestamp with seconds
              date = new Date(update.date.seconds * 1000);
            } else {
              date = new Date(update.date);
            }
          }
          
          const isValid = date !== null && !isNaN(date.getTime());
          if (!isValid) {
            console.warn(`Invalid date for update:`, update);
          }
          return isValid;
        } catch (error) {
          console.error('Error validating date:', error, update);
          return false;
        }
      });
      
      validUpdates.sort((a, b) => {
        try {
          let dateA: Date;
          let dateB: Date;
          
          if (a.date.toDate) {
            dateA = a.date.toDate();
          } else if (a.date.toMillis) {
            dateA = new Date(a.date.toMillis());
          } else if (a.date.seconds) {
            dateA = new Date(a.date.seconds * 1000);
          } else {
            dateA = new Date(a.date);
          }
          
          if (b.date.toDate) {
            dateB = b.date.toDate();
          } else if (b.date.toMillis) {
            dateB = new Date(b.date.toMillis());
          } else if (b.date.seconds) {
            dateB = new Date(b.date.seconds * 1000);
          } else {
            dateB = new Date(b.date);
          }
          
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          console.error('Error sorting updates:', error, a, b);
          return 0;
        }
      });

      console.log(`Total recent updates: ${recentResults.length}, Valid updates: ${validUpdates.length}, setting first 5`);
      console.log(`Updates breakdown:`, {
        exam_results: recentResults.filter(u => u.type === 'exam_result').length,
        homeworks: recentResults.filter(u => u.type === 'homework').length,
        fee_payments: recentResults.filter(u => u.type === 'fee_payment').length,
        invalid_dates: recentResults.length - validUpdates.length
      });
      
      // Log each valid update for debugging
      validUpdates.forEach((update, index) => {
        console.log(`Update ${index + 1}:`, {
          type: update.type,
          studentName: update.studentName,
          date: update.date
        });
      });

      // Update recent updates (after sorting all updates including fee payments)
      setRecentUpdates(validUpdates.slice(0, 5));

      // Load upcoming events
      try {
        const events = await eventQueries.getAllEvents(SCHOOL_ID);
        const now = new Date();
        const upcoming = events
          .filter(event => {
            try {
              const eventDate = new Date(event.date);
              return eventDate >= now && event.status !== 'completed' && event.status !== 'সম্পন্ন';
            } catch {
              return false;
            }
          })
          .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateA - dateB;
          })
          .slice(0, 5);

        setUpcomingEvents(upcoming);
      } catch (error) {
        console.error('Error loading events:', error);
      }

      setStats({
        averageAttendance: averageAttendance,
        averagePercentage: averagePercentage,
        totalSubjects: allSubjects.size,
        newMessages: newMessagesCount
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [userData, user]);

  useEffect(() => {
    if (userData || user) {
      loadDashboardData();
      
      // Set up real-time listener for students
      const parentPhone = (userData as any)?.phone || user?.phoneNumber;
      if (parentPhone) {
        const q = query(
          collection(db, 'students'),
          where('role', '==', 'student'),
          where('isActive', '==', true)
        );

        const unsubscribe = onSnapshot(q, () => {
          // When students change, refresh dashboard data
          console.log('🔄 Students updated - refreshing parent dashboard');
          loadDashboardData();
        }, (error) => {
          console.error('Error in real-time listener:', error);
        });

        return () => unsubscribe();
      }
    }
  }, [userData, user, loadDashboardData]);

  if (loading) {
    return (
      <ParentLayout title="ড্যাশবোর্ড" subtitle="স্বাগতম, আপনার ড্যাশবোর্ড">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="ড্যাশবোর্ড" subtitle="স্বাগতম, আপনার ড্যাশবোর্ড">
          {/* Children Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">আমার সন্তানগণ</h3>
        {children.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>কোনো সন্তান পাওয়া যায়নি</p>
            <p className="text-sm mt-1">আপনার ফোন নম্বর বা ইমেইলের সাথে মিল রয়েছে এমন কোনো শিক্ষার্থী নেই</p>
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child, index) => {
              const colors = [
                'from-blue-50 to-blue-100 border-blue-200 bg-blue-600',
                'from-pink-50 to-pink-100 border-pink-200 bg-pink-600',
                'from-green-50 to-green-100 border-green-200 bg-green-600',
                'from-purple-50 to-purple-100 border-purple-200 bg-purple-600'
              ];
              const colorSet = colors[index % colors.length];
              const [fromColor, toColor, borderColor, bgColor] = colorSet.split(' ');
              
              return (
                <div key={child.id} className={`bg-gradient-to-r ${fromColor} ${toColor} rounded-lg p-4 border ${borderColor}`}>
                <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center overflow-hidden`}>
                      {child.photoURL && !imageErrors[child.id] ? (
                        <img 
                          src={child.photoURL} 
                          alt={child.name} 
                          className="w-full h-full object-cover"
                          onError={() => {
                            console.error('Image load error for child:', child.name, child.photoURL);
                            setImageErrors(prev => ({ ...prev, [child.id]: true }));
                          }}
                        />
                      ) : (
                        <span className="text-white font-bold">{child.name.charAt(0)}</span>
                      )}
                  </div>
                  <div>
                      <h4 className="text-lg font-semibold text-gray-900">{child.name}</h4>
                      <p className="text-sm text-gray-600">
                        {child.className} {child.section ? `- বিভাগ ${child.section}` : ''}
                      </p>
                      {child.rollNumber && (
                        <p className="text-sm text-gray-600">রোল: {child.rollNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">গড় উপস্থিতি</p>
              <p className="text-2xl font-bold text-gray-900">
                {toBengaliNumerals(Math.round(stats.averageAttendance))}%
              </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">গড় নম্বর</p>
              <p className="text-2xl font-bold text-gray-900">
                {toBengaliNumerals(Math.round(stats.averagePercentage))}%
              </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">মোট বিষয়</p>
              <p className="text-2xl font-bold text-gray-900">
                {toBengaliNumerals(stats.totalSubjects)}
              </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">নতুন বার্তা</p>
              <p className="text-2xl font-bold text-gray-900">
                {toBengaliNumerals(stats.newMessages)}
              </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Updates & Upcoming Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">সাম্প্রতিক আপডেট</h3>
              </div>
              <div className="p-6">
            {recentUpdates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>কোন সাম্প্রতিক আপডেট নেই</p>
              </div>
            ) : (
                <div className="space-y-4">
                {recentUpdates.map((update, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      update.type === 'exam_result' ? 'bg-green-600' :
                      update.type === 'homework' ? 'bg-blue-600' :
                      update.type === 'fee_payment' ? 'bg-purple-600' :
                      'bg-yellow-600'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {update.type === 'exam_result' ? 'নতুন পরীক্ষার ফলাফল' : 
                         update.type === 'homework' ? 'হোমওয়ার্ক' :
                         update.type === 'fee_payment' ? 'ফি পেমেন্ট' : 'আপডেট'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {update.type === 'exam_result' 
                          ? `${update.studentName} - ${update.subject}: ${update.grade || 'N/A'} (${toBengaliNumerals(Math.round(update.percentage || 0))}%)`
                          : update.type === 'homework'
                          ? `${update.studentName || ''} - ${update.subject}: ${update.title}`
                          : update.type === 'fee_payment'
                          ? `${update.studentName} - ${update.feeName}${update.month ? ` (${update.month})` : ''}: ৳${toBengaliNumerals(Math.round(update.amount || 0))}`
                          : 'নতুন আপডেট'
                        }
                      </p>
                      <p className="text-xs text-gray-500">{getTimeAgo(update.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">আসন্ন ইভেন্টসমূহ</h3>
              </div>
              <div className="p-6">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>কোন আসন্ন ইভেন্ট নেই</p>
              </div>
            ) : (
                <div className="space-y-4">
                {upcomingEvents.map((event, index) => {
                  const eventDate = new Date(event.date);
                  const today = new Date();
                  const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysDiff <= 7;
                  const isImportant = event.category === 'শিক্ষা' || event.priority === 'high';
                  
                  return (
                    <div key={event.id || index} className={`flex items-center justify-between p-3 rounded-lg ${
                      isUrgent ? 'bg-red-50' : isImportant ? 'bg-blue-50' : 'bg-green-50'
                    }`}>
                    <div>
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-sm text-gray-600">{event.description || ''}</p>
                        <p className="text-xs text-gray-500">
                          {eventDate.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isUrgent ? 'bg-red-100 text-red-800' :
                        isImportant ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {isUrgent ? 'জরুরি' : daysDiff > 0 ? `${toBengaliNumerals(daysDiff)} দিন বাকি` : 'আজ'}
                    </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">দ্রুত কাজ</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button 
                    onClick={() => router.push('/parent/attendance')}
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ClipboardList className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">উপস্থিতি দেখুন</span>
                  </button>
                  <button 
                    onClick={() => router.push('/parent/results')}
                    className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <FileText className="w-8 h-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">ফলাফল দেখুন</span>
                  </button>
                  <button 
                    onClick={() => router.push('/parent/messages')}
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <MessageCircle className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">শিক্ষকের সাথে যোগাযোগ</span>
                  </button>
                  <button 
                    onClick={() => router.push('/parent/fees')}
                    className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <DollarSign className="w-8 h-8 text-yellow-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">ফিস পেমেন্ট</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <ParentDashboard />
    </ProtectedRoute>
  );
}