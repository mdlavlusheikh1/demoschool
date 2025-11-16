'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { studentQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, Timestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { BookOpen, Calendar, CheckCircle, Clock, AlertCircle, Loader2, Users } from 'lucide-react';

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

// Helper function to convert numbers to Bengali numerals
const toBengaliNumerals = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '০';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formatted = num.toLocaleString('en-US');
  return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

// Helper function to format date
const formatDate = (date: any): string => {
  if (!date) return '';
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
};

// Helper function to get time ago
const getTimeAgo = (date: any): string => {
  if (!date) return '';
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
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
  } catch {
    return '';
  }
};

function HomeworkPage() {
  const { userData, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });

  // Helper function to normalize class names
  const normalizeClass = useCallback((className: string): string => {
    if (!className) return '';
    return className.trim().normalize('NFC').toLowerCase();
  }, []);

  // Helper function to process and filter homeworks
  const processHomeworks = useCallback((homeworksSnapshot: any, myChildren: any[]) => {
    const studentClasses = myChildren.map(c => {
      const className = (c as any).class || (c as any).className || '';
      return normalizeClass(className);
    }).filter(Boolean);
    
    console.log(`📚 Processing homeworks for ${myChildren.length} children`);
    console.log(`📚 Student classes (normalized):`, studentClasses);
    
    const allHomeworks: any[] = [];
    let matchedCount = 0;
    let statusFilteredCount = 0;
    let classMismatchCount = 0;
    
    homeworksSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const homeworkClass = (data.class || data.className || '').trim();
      const homeworkStatus = data.status || 'active';
      
      // Normalize homework class
      const normalizedHomeworkClass = normalizeClass(homeworkClass);
      
      // Check if class matches (normalized comparison)
      const classMatches = studentClasses.some(studentClass => {
        return studentClass === normalizedHomeworkClass;
      });
      
      // Check status (allow 'active' status, or if status is undefined/null, treat as active)
      const statusMatches = homeworkStatus === 'active' || !homeworkStatus;
      
      if (!classMatches) {
        classMismatchCount++;
      }
      
      if (!statusMatches) {
        statusFilteredCount++;
      }
      
      // Filter homeworks for student classes and active status
      if (classMatches && statusMatches) {
        matchedCount++;
        const dueDate = data.dueDate ? new Date(data.dueDate) : null;
        const now = new Date();
        const isOverdue = dueDate ? dueDate < now : false;
        
        // Find which student this homework belongs to (normalized match)
        const student = myChildren.find(c => {
          const studentClass = normalizeClass((c as any).class || (c as any).className || '');
          return studentClass === normalizedHomeworkClass;
        });

        allHomeworks.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          subject: data.subject || '',
          class: homeworkClass,
          teacherName: data.teacherName || data.teacher || 'Unknown Teacher',
          dueDate: data.dueDate || '',
          dueTime: data.dueTime || '',
          priority: data.priority || 'medium',
          status: data.status || 'active',
          attachments: data.attachments || [],
          instructions: data.instructions || '',
          createdAt: data.createdAt,
          studentName: student?.name || student?.displayName || '',
          studentId: student?.uid || student?.id || '',
          isOverdue
        });
      }
    });
    
    console.log(`📚 Homework matching summary:`);
    console.log(`  - Total homeworks in DB: ${homeworksSnapshot.size}`);
    console.log(`  - Class mismatches: ${classMismatchCount}`);
    console.log(`  - Status filtered out: ${statusFilteredCount}`);
    console.log(`  - Matched homeworks: ${matchedCount}`);
    console.log(`  - Final homeworks list: ${allHomeworks.length}`);

    // Sort by due date (overdue first, then by due date)
    allHomeworks.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });

    setHomeworks(allHomeworks);

    // Calculate stats
    const total = allHomeworks.length;
    const completed = 0; // TODO: Implement homework completion tracking
    const pending = total - completed;
    const overdue = allHomeworks.filter(h => h.isOverdue).length;

    setStats({
      total,
      completed,
      pending,
      overdue
    });
  }, [normalizeClass]);

  // Load children and setup real-time listener
  useEffect(() => {
    if (!userData && !user) return;

    let unsubscribe: Unsubscribe | null = null;
    let myChildren: any[] = [];

    const setupRealTimeListener = async () => {
      try {
        setLoading(true);
        
        const parentEmail = user?.email || (userData as any)?.email;
        const parentPhone = (userData as any)?.phone || user?.phoneNumber;
        
        // Load children
        myChildren = await getStudentsByParent(parentEmail, parentPhone);
        setStudents(myChildren.map(s => ({
          id: (s as any).uid || (s as any).id || '',
          name: s.name || s.displayName || '',
          className: (s as any).className || (s as any).class || '',
          section: (s as any).section || '',
        })));

        if (myChildren.length === 0) {
          setLoading(false);
          return;
        }

        // Setup real-time listener for homeworks
        const homeworksRef = collection(db, 'homeworks');
        const homeworksQuery = query(
          homeworksRef,
          orderBy('createdAt', 'desc')
        );
        
        unsubscribe = onSnapshot(
          homeworksQuery,
          (snapshot) => {
            console.log('🔄 Real-time homework update received:', snapshot.size, 'homeworks');
            processHomeworks(snapshot, myChildren);
            setLoading(false);
          },
          (error) => {
            console.error('❌ Error in real-time homework listener:', error);
            setLoading(false);
          }
        );

      } catch (error) {
        console.error('Error setting up homework listener:', error);
        setLoading(false);
      }
    };

    setupRealTimeListener();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        console.log('🔌 Unsubscribing from homework listener');
        unsubscribe();
      }
    };
  }, [userData, user, processHomeworks]);

  if (loading) {
    return (
      <ParentLayout title="হোমওয়ার্ক" subtitle="সন্তানদের বাড়ির কাজ পর্যবেক্ষণ করুন">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="হোমওয়ার্ক" subtitle="সন্তানদের বাড়ির কাজ পর্যবেক্ষণ করুন">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">মোট হোমওয়ার্ক</p>
              <p className="text-3xl font-bold text-gray-900">
                {toBengaliNumerals(stats.total)}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">সম্পন্ন</p>
              <p className="text-3xl font-bold text-green-600">
                {toBengaliNumerals(stats.completed)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">অপেক্ষমান</p>
              <p className="text-3xl font-bold text-yellow-600">
                {toBengaliNumerals(stats.pending)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">বিলম্বিত</p>
              <p className="text-3xl font-bold text-red-600">
                {toBengaliNumerals(stats.overdue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Homework List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">সাম্প্রতিক হোমওয়ার্ক</h2>
        </div>
        
        <div className="p-6">
          {students.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
              <p className="text-sm mt-1">আপনার ফোন নম্বর বা ইমেইলের সাথে মিল রয়েছে এমন কোনো শিক্ষার্থী নেই</p>
            </div>
          ) : homeworks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">কোনো হোমওয়ার্ক নেই</p>
              <p className="text-sm mt-1">এই মুহূর্তে কোনো হোমওয়ার্ক অ্যাসাইন করা হয়নি</p>
            </div>
          ) : (
            <div className="space-y-4">
              {homeworks.map((homework) => {
                const dueDate = homework.dueDate ? new Date(homework.dueDate) : null;
                const isOverdue = homework.isOverdue;
                const isPending = !homework.completed; // Assuming no completion tracking yet
                
                let bgColor = 'bg-yellow-50';
                let borderColor = 'border-yellow-200';
                let statusColor = 'bg-yellow-600';
                let statusText = 'অপেক্ষমান';
                let iconColor = 'text-yellow-600';
                
                if (isOverdue) {
                  bgColor = 'bg-red-50';
                  borderColor = 'border-red-200';
                  statusColor = 'bg-red-600';
                  statusText = 'বিলম্বিত';
                  iconColor = 'text-red-600';
                } else if (homework.completed) {
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-200';
                  statusColor = 'bg-green-600';
                  statusText = 'সম্পন্ন';
                  iconColor = 'text-green-600';
                }

                return (
                  <div key={homework.id} className={`p-4 ${bgColor} border ${borderColor} rounded-lg`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{homework.title}</h3>
                        {homework.description && (
                          <p className="text-sm text-gray-600 mt-1">{homework.description}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          শিক্ষার্থী: {homework.studentName} ({homework.class})
                        </p>
                        <p className="text-sm text-gray-600">
                          বিষয়: {homework.subject} | শিক্ষক: {homework.teacherName}
                        </p>
                        <div className="flex items-center mt-2">
                          {isOverdue ? (
                            <AlertCircle className={`w-4 h-4 ${iconColor} mr-1`} />
                          ) : homework.completed ? (
                            <CheckCircle className={`w-4 h-4 ${iconColor} mr-1`} />
                          ) : (
                            <Calendar className={`w-4 h-4 ${iconColor} mr-1`} />
                          )}
                          <span className={`text-sm ${iconColor}`}>
                            {isOverdue 
                              ? `বিলম্বিত: ${dueDate ? formatDate(dueDate) : ''}`
                              : homework.completed
                              ? `জমা দেওয়া হয়েছে: ${dueDate ? formatDate(dueDate) : ''}`
                              : `জমা দিতে হবে: ${dueDate ? formatDate(dueDate) : 'তারিখ নেই'}`
                            }
                          </span>
                        </div>
                        {homework.instructions && (
                          <p className="text-xs text-gray-500 mt-2">{homework.instructions}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 ${statusColor} text-white text-xs font-medium rounded-full ml-4`}>
                        {statusText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <HomeworkPage />
    </ProtectedRoute>
  );
}
