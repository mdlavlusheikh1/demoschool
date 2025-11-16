'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { studentQueries, examResultQueries, examQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Award, TrendingUp, FileText, Calendar, Loader2, Users } from 'lucide-react';

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

function ResultsPage() {
  const { userData, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [studentResults, setStudentResults] = useState<Record<string, any[]>>({});
  const [latestExam, setLatestExam] = useState<any>(null);
  const [nextExam, setNextExam] = useState<any>(null);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      
      const parentEmail = user?.email || (userData as any)?.email;
      const parentPhone = (userData as any)?.phone || user?.phoneNumber;
      
      // Load children
      const myChildren = await getStudentsByParent(parentEmail, parentPhone);
      const studentsList = myChildren.map(s => {
        const studentId = (s as any).studentId || (s as any).uid || (s as any).id || '';
        const studentUid = (s as any).uid || (s as any).id || '';
        // Use studentId as primary key, fallback to uid
        const key = studentId || studentUid;
        return {
          id: key,
          studentId: studentId,
          uid: studentUid,
          name: s.name || s.displayName || '',
          className: (s as any).className || (s as any).class || '',
          section: (s as any).section || '',
        };
      });
      setStudents(studentsList);

      if (myChildren.length === 0) {
        setLoading(false);
        return;
      }

      // Load exam results for each student
      const resultsMap: Record<string, any[]> = {};
      const allResults: any[] = [];

      for (const student of myChildren) {
        try {
          // CRITICAL: Use studentId field from student, not uid or id
          // examResults collection uses studentId field, not uid
          const studentId = (student as any).studentId || (student as any).uid || (student as any).id;
          const studentUid = (student as any).uid || (student as any).id || '';
          
          console.log('🔍 Loading results for student:', {
            name: student.name || student.displayName,
            studentId: studentId,
            uid: studentUid,
            allFields: Object.keys(student)
          });
          
          // Try to get results using studentId first
          let results = await examResultQueries.getStudentResults(studentId, SCHOOL_ID);
          
          // If no results found with studentId, try with uid as fallback
          if (results.length === 0 && studentUid && studentUid !== studentId) {
            console.log('⚠️ No results found with studentId, trying with uid:', studentUid);
            results = await examResultQueries.getStudentResults(studentUid, SCHOOL_ID);
          }
          
          console.log(`✅ Found ${results.length} results for student ${student.name || student.displayName}`);
          
          // Group results by exam
          const examGroups: Record<string, any[]> = {};
          results.forEach(result => {
            const examId = result.examId || result.examName;
            if (!examGroups[examId]) {
              examGroups[examId] = [];
            }
            examGroups[examId].push(result);
          });

          // Use the same key as in setStudents for consistency
          // Match the key used in studentsList mapping
          const studentKey = studentId || studentUid;
          resultsMap[studentKey] = results;
          
          console.log('📋 Stored results with key:', studentKey, 'Results count:', results.length);
          allResults.push(...results);
        } catch (error) {
          console.error(`Error loading results for student ${student.name || student.displayName}:`, error);
        }
      }

      setStudentResults(resultsMap);

      // Find latest exam
      if (allResults.length > 0) {
        const sortedResults = [...allResults].sort((a, b) => {
          const dateA = a.enteredAt?.toDate?.() || new Date(0);
          const dateB = b.enteredAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        const latestResult = sortedResults[0];
        setLatestExam({
          name: latestResult.examName || 'পরীক্ষা',
          date: latestResult.enteredAt
        });
      }

      // Load upcoming exams (from exam queries)
      try {
        const exams = await examQueries.getAllExams(SCHOOL_ID);
        const now = new Date();
        const upcomingExams = exams
          .filter(exam => {
            try {
              const examDate = new Date(exam.date || exam.startDate || '');
              return examDate >= now && exam.status !== 'সম্পন্ন' && exam.status !== 'completed';
            } catch {
              return false;
            }
          })
          .sort((a, b) => {
            const dateA = new Date(a.date || a.startDate || '').getTime();
            const dateB = new Date(b.date || b.startDate || '').getTime();
            return dateA - dateB;
          });

        if (upcomingExams.length > 0) {
          setNextExam({
            name: upcomingExams[0].name,
            date: upcomingExams[0].date || upcomingExams[0].startDate
          });
        }
      } catch (error) {
        console.error('Error loading upcoming exams:', error);
      }

    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  }, [userData, user]);

  // Initial load of results
  useEffect(() => {
    if (userData || user) {
      loadResults();
    }
  }, [loadResults, userData, user]);

  // Setup real-time listener for exam results
  useEffect(() => {
    if (!userData && !user) return;

    let unsubscribeList: Unsubscribe[] = [];
    let myChildren: any[] = [];

    const setupRealTimeListeners = async () => {
      try {
        const parentEmail = user?.email || (userData as any)?.email;
        const parentPhone = (userData as any)?.phone || user?.phoneNumber;
        
        // Load children
        myChildren = await getStudentsByParent(parentEmail, parentPhone);
        const studentsList = myChildren.map(s => {
          const studentId = (s as any).studentId || (s as any).uid || (s as any).id || '';
          const studentUid = (s as any).uid || (s as any).id || '';
          const key = studentId || studentUid;
          return {
            id: key,
            studentId: studentId,
            uid: studentUid,
            name: s.name || s.displayName || '',
            className: (s as any).className || (s as any).class || '',
            section: (s as any).section || '',
          };
        });
        setStudents(studentsList);

        if (myChildren.length === 0) {
          return;
        }

        // Setup real-time listeners for each student's results
        const resultsMap: Record<string, any[]> = {};
        const allResults: any[] = [];

        for (const student of myChildren) {
          const studentId = (student as any).studentId || (student as any).uid || (student as any).id || '';
          const studentUid = (student as any).uid || (student as any).id || '';
          
          // Skip if no valid student ID
          if (!studentId && !studentUid) {
            console.warn(`⚠️ Skipping student ${student.name || student.displayName} - no valid ID`);
            continue;
          }

          // Use studentId as primary, fallback to uid
          const queryStudentId = studentId || studentUid;
          
          console.log(`🔍 Setting up listener for student:`, {
            name: student.name || student.displayName,
            studentId: studentId,
            uid: studentUid,
            queryStudentId: queryStudentId
          });
          
          // Create query for this student's results
          // Try with orderBy first, if it fails, try without orderBy
          let resultsQuery;
          try {
            resultsQuery = query(
              collection(db, 'examResults'),
              where('studentId', '==', queryStudentId),
              where('schoolId', '==', SCHOOL_ID),
              orderBy('enteredAt', 'desc')
            );
          } catch (orderByError) {
            // If orderBy fails (index missing), try without orderBy
            console.warn('⚠️ OrderBy failed, trying without orderBy:', orderByError);
            resultsQuery = query(
              collection(db, 'examResults'),
              where('studentId', '==', queryStudentId),
              where('schoolId', '==', SCHOOL_ID)
            );
          }

          const unsubscribe = onSnapshot(
            resultsQuery,
            (snapshot) => {
              console.log(`🔄 Real-time results update for student ${student.name || student.displayName}:`, {
                studentId: queryStudentId,
                resultsCount: snapshot.size,
                results: snapshot.docs.map(doc => ({ id: doc.id, studentId: doc.data().studentId, examName: doc.data().examName }))
              });
              
              const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              
              // Sort results by enteredAt if available
              const sortedResults = results.sort((a, b) => {
                const dateA = a.enteredAt?.toDate?.() || (a.enteredAt ? new Date(a.enteredAt) : new Date(0));
                const dateB = b.enteredAt?.toDate?.() || (b.enteredAt ? new Date(b.enteredAt) : new Date(0));
                return dateB.getTime() - dateA.getTime();
              });
              
              // Use the same key as in setStudents for consistency
              const studentKey = studentId || studentUid;
              resultsMap[studentKey] = sortedResults;
              
              // Recalculate all results
              const allResultsArray = Object.values(resultsMap).flat();
              setStudentResults({ ...resultsMap });

              // Find latest exam
              if (allResultsArray.length > 0) {
                const latestResult = allResultsArray[0]; // Already sorted
                setLatestExam({
                  name: latestResult.examName || 'পরীক্ষা',
                  date: latestResult.enteredAt
                });
              }
            },
            (error) => {
              console.error(`❌ Error listening to results for student ${student.name || student.displayName}:`, error);
              console.error('Error details:', {
                studentId: queryStudentId,
                schoolId: SCHOOL_ID,
                errorCode: error.code,
                errorMessage: error.message
              });
            }
          );

          unsubscribeList.push(unsubscribe);
        }

        // Also listen to upcoming exams
        try {
          const examsRef = collection(db, 'exams');
          const examsQuery = query(
            examsRef,
            where('schoolId', '==', SCHOOL_ID),
            orderBy('date', 'asc')
          );

          const examsUnsubscribe = onSnapshot(
            examsQuery,
            async (snapshot) => {
              console.log('🔄 Real-time exams update:', snapshot.size, 'exams');
              const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              const now = new Date();
              const upcomingExams = exams
                .filter(exam => {
                  try {
                    const examDate = new Date(exam.date || exam.startDate || '');
                    return examDate >= now && exam.status !== 'সম্পন্ন' && exam.status !== 'completed';
                  } catch {
                    return false;
                  }
                })
                .sort((a, b) => {
                  const dateA = new Date(a.date || a.startDate || '').getTime();
                  const dateB = new Date(b.date || b.startDate || '').getTime();
                  return dateA - dateB;
                });

              if (upcomingExams.length > 0) {
                setNextExam({
                  name: upcomingExams[0].name,
                  date: upcomingExams[0].date || upcomingExams[0].startDate
                });
              }
            },
            (error) => {
              console.error('❌ Error listening to exams:', error);
            }
          );

          unsubscribeList.push(examsUnsubscribe);
        } catch (error) {
          console.error('Error setting up exams listener:', error);
        }

      } catch (error) {
        console.error('Error setting up real-time listeners:', error);
      }
    };

    setupRealTimeListeners();

    // Cleanup function
    return () => {
      console.log('🔌 Unsubscribing from all result listeners');
      unsubscribeList.forEach(unsubscribe => unsubscribe());
    };
  }, [userData, user]);

  // Calculate average grade for a student
  const calculateAverageGrade = (results: any[]) => {
    if (!results || results.length === 0) return { grade: 'N/A', percentage: 0 };
    
    const completedResults = results.filter(r => !r.isAbsent && r.percentage);
    if (completedResults.length === 0) return { grade: 'N/A', percentage: 0 };
    
    const avgPercentage = completedResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / completedResults.length;
    
    // Determine grade based on percentage
    let grade = 'F';
    if (avgPercentage >= 90) grade = 'A+';
    else if (avgPercentage >= 80) grade = 'A';
    else if (avgPercentage >= 70) grade = 'A-';
    else if (avgPercentage >= 60) grade = 'B';
    else if (avgPercentage >= 50) grade = 'C';
    else if (avgPercentage >= 40) grade = 'D';
    
    return { grade, percentage: avgPercentage };
  };

  // Format date
  const formatDate = (date: any): string => {
    if (!date) return '';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <ParentLayout title="পরীক্ষার ফলাফল" subtitle="সন্তানদের পরীক্ষার ফলাফল দেখুন">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="পরীক্ষার ফলাফল" subtitle="সন্তানদের পরীক্ষার ফলাফল দেখুন">
      {/* Results Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">সর্বশেষ পরীক্ষা</p>
              <p className="text-2xl font-bold text-gray-900">
                {latestExam?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {latestExam?.date ? formatDate(latestExam.date) : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">গড় গ্রেড</p>
              <p className="text-3xl font-bold text-green-600">
                {(() => {
                  const allResults = Object.values(studentResults).flat();
                  const avg = calculateAverageGrade(allResults);
                  return avg.grade;
                })()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">পরবর্তী পরীক্ষা</p>
              <p className="text-2xl font-bold text-gray-900">
                {nextExam?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {nextExam?.date ? formatDate(nextExam.date) : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Student Results */}
      {students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
            <p className="text-sm mt-1">আপনার ফোন নম্বর বা ইমেইলের সাথে মিল রয়েছে এমন কোনো শিক্ষার্থী নেই</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {students.map((student, studentIndex) => {
            const results = studentResults[student.id] || [];
            const avg = calculateAverageGrade(results);
            
            // Group results by exam
            const examGroups: Record<string, any[]> = {};
            results.forEach(result => {
              const examKey = result.examId || result.examName || 'other';
              if (!examGroups[examKey]) {
                examGroups[examKey] = [];
              }
              examGroups[examKey].push(result);
            });

            const colors = [
              'from-blue-50 to-blue-100',
              'from-pink-50 to-pink-100',
              'from-green-50 to-green-100',
              'from-purple-50 to-purple-100'
            ];
            const colorClass = colors[studentIndex % colors.length];

            return (
              <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className={`p-6 border-b border-gray-200 bg-gradient-to-r ${colorClass}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                      <p className="text-sm text-gray-600">
                        {student.className} {student.section ? `- বিভাগ ${student.section}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-600">{avg.grade}</p>
                      <p className="text-sm text-gray-600">
                        {toBengaliNumerals(Math.round(avg.percentage))}%
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {results.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>কোন পরীক্ষার ফলাফল পাওয়া যায়নি</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(examGroups).map(([examKey, examResults]) => (
                        <div key={examKey} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            {examResults[0]?.examName || examKey}
                          </h3>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 text-sm font-semibold text-gray-700">বিষয়</th>
                                <th className="text-center py-3 text-sm font-semibold text-gray-700">নম্বর</th>
                                <th className="text-center py-3 text-sm font-semibold text-gray-700">গ্রেড</th>
                                <th className="text-center py-3 text-sm font-semibold text-gray-700">শতকরা</th>
                              </tr>
                            </thead>
                            <tbody>
                              {examResults.map((result, index) => (
                                <tr key={index} className="border-b border-gray-100 last:border-0">
                                  <td className="py-3 text-sm text-gray-900">{result.subject}</td>
                                  <td className="py-3 text-sm text-center text-gray-900">
                                    {result.isAbsent ? (
                                      <span className="text-red-600">অনুপস্থিত</span>
                                    ) : (
                                      `${toBengaliNumerals(result.obtainedMarks)}/${toBengaliNumerals(result.totalMarks)}`
                                    )}
                                  </td>
                                  <td className="py-3 text-center">
                                    {result.isAbsent ? (
                                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                        N/A
                                      </span>
                                    ) : (
                                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        result.grade === 'A+' ? 'bg-green-100 text-green-700' :
                                        result.grade === 'A' ? 'bg-blue-100 text-blue-700' :
                                        result.grade === 'A-' ? 'bg-indigo-100 text-indigo-700' :
                                        result.grade === 'B' ? 'bg-yellow-100 text-yellow-700' :
                                        result.grade === 'C' ? 'bg-orange-100 text-orange-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {result.grade || 'N/A'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 text-center text-sm font-medium text-gray-900">
                                    {result.isAbsent ? (
                                      <span className="text-red-600">-</span>
                                    ) : (
                                      `${toBengaliNumerals(Math.round(result.percentage))}%`
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <ResultsPage />
    </ProtectedRoute>
  );
}
