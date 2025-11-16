'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { studentQueries, examResultQueries, ExamResult } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { 
  TrendingUp, 
  Award, 
  BarChart3, 
  BookOpen,
  Loader2,
  Filter,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Users
} from 'lucide-react';

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

function PerformancePage() {
  const { userData, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [students, setStudents] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [performanceData, setPerformanceData] = useState<any>({
    averagePercentage: 0,
    totalExams: 0,
    totalSubjects: 0,
    gradeDistribution: {},
    subjectPerformance: {},
    trend: []
  });

  const calculatePerformanceMetrics = useCallback((results: ExamResult[]) => {
    if (!results || results.length === 0) {
      setPerformanceData({
        averagePercentage: 0,
        totalExams: 0,
        totalSubjects: 0,
        gradeDistribution: {},
        subjectPerformance: {},
        trend: []
      });
      return;
    }

    try {
      // Calculate average percentage
      const completedResults = results.filter(r => r && !r.isAbsent);
      const avgPercentage = completedResults.length > 0
        ? completedResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / completedResults.length
        : 0;

      // Get unique subjects
      const subjects = [...new Set(results.map(r => r.subject).filter(Boolean))];

      // Calculate grade distribution
      const gradeDistribution: { [key: string]: number } = {};
      completedResults.forEach(r => {
        const grade = r.grade || 'N/A';
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      });

      // Calculate subject-wise performance
      const subjectPerformance: { [key: string]: { avg: number; count: number } } = {};
      subjects.forEach(subject => {
        const subjectResults = completedResults.filter(r => r.subject === subject);
        if (subjectResults.length > 0) {
          const avg = subjectResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / subjectResults.length;
          subjectPerformance[subject] = {
            avg,
            count: subjectResults.length
          };
        }
      });

      // Calculate trend (last 5 exams)
      const sortedResults = [...completedResults].sort((a, b) => {
        try {
          const dateA = a.enteredAt?.toDate?.() || (a.enteredAt ? new Date(a.enteredAt as any) : new Date(0));
          const dateB = b.enteredAt?.toDate?.() || (b.enteredAt ? new Date(b.enteredAt as any) : new Date(0));
          return dateB.getTime() - dateA.getTime();
        } catch {
          return 0;
        }
      });
      const trend = sortedResults.slice(0, 5).map(r => r.percentage || 0);

      setPerformanceData({
        averagePercentage: avgPercentage,
        totalExams: results.length,
        totalSubjects: subjects.length,
        gradeDistribution,
        subjectPerformance,
        trend
      });
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      setPerformanceData({
        averagePercentage: 0,
        totalExams: 0,
        totalSubjects: 0,
        gradeDistribution: {},
        subjectPerformance: {},
        trend: []
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!userData && !user) {
        if (isMounted) {
          setLoading(false);
          setExamResults([]);
          calculatePerformanceMetrics([]);
        }
        return;
      }

      try {
        setLoading(true);
        
        // Load students linked to this parent
        const parentEmail = user?.email || (userData as any)?.email;
        const parentPhone = (userData as any)?.phone || user?.phoneNumber;
        const myChildren = await getStudentsByParent(parentEmail, parentPhone);
        
        if (!isMounted) return;
        
        const studentList = myChildren.map(s => ({
          id: (s as any).uid || (s as any).id || '',
          name: s.name || '',
          class: (s as any).className || (s as any).class || '',
          section: (s as any).section || '',
          roll: (s as any).rollNumber || ''
        }));
        
        setStudents(studentList);

        if (myChildren.length === 0) {
          setExamResults([]);
          calculatePerformanceMetrics([]);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Load exam results
        let loadedResults: ExamResult[] = [];
        const studentIds = myChildren.map(c => (c as any).uid || (c as any).id);
        
        if (selectedStudent === 'all') {
          // Load results for all students
          for (const studentId of studentIds) {
            try {
              const results = await examResultQueries.getStudentResults(studentId, SCHOOL_ID);
              if (results && Array.isArray(results) && isMounted) {
                loadedResults = [...loadedResults, ...results];
              }
            } catch (error: any) {
              console.error(`Error loading results for student ${studentId}:`, error?.message || error);
              // Continue with other students even if one fails
            }
          }
        } else {
          try {
            const results = await examResultQueries.getStudentResults(selectedStudent, SCHOOL_ID);
            if (results && Array.isArray(results) && isMounted) {
              loadedResults = results;
            }
          } catch (error: any) {
            console.error('Error loading results:', error?.message || error);
            loadedResults = [];
          }
        }
        
        // Filter by period if needed
        if (selectedPeriod !== 'all' && loadedResults.length > 0) {
          const now = new Date();
          let startDate: Date;
          
          switch (selectedPeriod) {
            case 'thisMonth':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case 'last3Months':
              startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
              break;
            case 'thisYear':
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
            default:
              startDate = new Date(0);
          }
          
          loadedResults = loadedResults.filter(result => {
            try {
              const resultDate = result.enteredAt?.toDate?.() || new Date(0);
              return resultDate >= startDate;
            } catch {
              return true;
            }
          });
        }

        if (!isMounted) return;
        
        setExamResults(loadedResults);
        calculatePerformanceMetrics(loadedResults);
      } catch (error: any) {
        console.error('Error loading performance data:', error?.message || error);
        if (isMounted) {
          setExamResults([]);
          calculatePerformanceMetrics([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedStudent, selectedPeriod, userData, user, calculatePerformanceMetrics]);


  if (loading) {
    return (
      <ParentLayout title="একাডেমিক পারফরম্যান্স" subtitle="সন্তানদের একাডেমিক পারফরম্যান্স বিশ্লেষণ করুন">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="একাডেমিক পারফরম্যান্স" subtitle="সন্তানদের একাডেমিক পারফরম্যান্স এবং প্রবণতা বিশ্লেষণ করুন">
      {students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
            <p className="text-sm mt-1">আপনার ফোন নম্বর বা ইমেইলের সাথে মিল রয়েছে এমন কোনো শিক্ষার্থী নেই</p>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center space-x-4 flex-wrap">
              <Filter className="w-5 h-5 text-gray-600" />
              {students.length > 1 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">শিক্ষার্থী</label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">সব শিক্ষার্থী</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.class} - {student.section})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">সময়কাল</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">সব সময়</option>
                  <option value="thisMonth">এই মাস</option>
                  <option value="last3Months">গত ৩ মাস</option>
                  <option value="thisYear">এই বছর</option>
                </select>
              </div>
            </div>
          </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">গড় নম্বর</p>
              <p className="text-3xl font-bold text-blue-600">
                {toBengaliNumerals(Math.round(performanceData?.averagePercentage || 0))}%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {performanceData?.averagePercentage >= 80 ? (
              <span className="text-sm text-green-600 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                উত্তম
              </span>
            ) : performanceData?.averagePercentage >= 60 ? (
              <span className="text-sm text-yellow-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                মধ্যম
              </span>
            ) : (
              <span className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                উন্নতির প্রয়োজন
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">মোট পরীক্ষা</p>
              <p className="text-3xl font-bold text-green-600">
                {toBengaliNumerals(performanceData?.totalExams || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">মোট বিষয়</p>
              <p className="text-3xl font-bold text-purple-600">
                {toBengaliNumerals(performanceData?.totalSubjects || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">সর্বোচ্চ গ্রেড</p>
              <p className="text-3xl font-bold text-orange-600">
                {Object.keys(performanceData?.gradeDistribution || {}).length > 0
                  ? Object.keys(performanceData.gradeDistribution).reduce((a, b) => 
                      performanceData.gradeDistribution[a] > performanceData.gradeDistribution[b] ? a : b
                    )
                  : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Subject-wise Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            বিষয়ভিত্তিক পারফরম্যান্স
          </h3>
          <div className="space-y-4">
            {Object.keys(performanceData?.subjectPerformance || {}).length > 0 ? (
              Object.entries(performanceData.subjectPerformance).map(([subject, data]: [string, any]) => (
                <div key={subject} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{subject}</span>
                    <span className="text-lg font-bold text-blue-600">
                      {toBengaliNumerals(Math.round(data.avg))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        data.avg >= 80 ? 'bg-green-500' :
                        data.avg >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(data.avg, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {toBengaliNumerals(data.count)} টি পরীক্ষা
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>কোন পারফরম্যান্স ডেটা পাওয়া যায়নি</p>
              </div>
            )}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-purple-600" />
            গ্রেড বন্টন
          </h3>
          <div className="space-y-4">
            {Object.keys(performanceData?.gradeDistribution || {}).length > 0 ? (
              Object.entries(performanceData.gradeDistribution)
                .sort(([a], [b]) => {
                  const gradeOrder = ['A+', 'A', 'A-', 'B', 'C', 'D', 'F'];
                  return gradeOrder.indexOf(a) - gradeOrder.indexOf(b);
                })
                .map(([grade, count]: [string, number]) => {
                  const total = examResults.filter(r => !r.isAbsent).length;
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={grade} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                          grade === 'A+' ? 'bg-green-100 text-green-700' :
                          grade === 'A' ? 'bg-blue-100 text-blue-700' :
                          grade === 'A-' ? 'bg-indigo-100 text-indigo-700' :
                          grade === 'B' ? 'bg-yellow-100 text-yellow-700' :
                          grade === 'C' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {grade}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{grade}</p>
                          <p className="text-sm text-gray-500">
                            {toBengaliNumerals(count)} টি পরীক্ষা
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {toBengaliNumerals(Math.round(percentage))}%
                        </p>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>কোন গ্রেড ডেটা পাওয়া যায়নি</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          পারফরম্যান্স প্রবণতা
        </h3>
        {performanceData?.trend && performanceData.trend.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between h-64 space-x-2">
              {performanceData.trend.map((percentage: number, index: number) => {
                const maxPercentage = Math.max(...performanceData.trend, 100);
                const height = (percentage / maxPercentage) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end justify-center h-48 mb-2">
                      <div
                        className={`w-full rounded-t-lg ${
                          percentage >= 80 ? 'bg-green-500' :
                          percentage >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ height: `${height}%` }}
                        title={`${percentage}%`}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      {toBengaliNumerals(index + 1)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {toBengaliNumerals(Math.round(percentage))}%
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-gray-500 text-center">
              শেষ {toBengaliNumerals(performanceData.trend.length)} টি পরীক্ষার পারফরম্যান্স
            </p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>কোন প্রবণতা ডেটা পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {/* Recent Exam Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          সাম্প্রতিক পরীক্ষার ফলাফল
        </h3>
        {examResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">পরীক্ষা</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">বিষয়</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">নম্বর</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">গ্রেড</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">শতকরা</th>
                </tr>
              </thead>
              <tbody>
                {examResults.slice(0, 10).map((result, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{result.examName}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{result.subject}</td>
                    <td className="py-3 px-4 text-sm text-center text-gray-900">
                      {result.isAbsent ? (
                        <span className="text-red-600">অনুপস্থিত</span>
                      ) : (
                        `${toBengaliNumerals(result.obtainedMarks)}/${toBengaliNumerals(result.totalMarks)}`
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
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
                    <td className="py-3 px-4 text-center text-sm font-medium text-gray-900">
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
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>কোন পরীক্ষার ফলাফল পাওয়া যায়নি</p>
          </div>
        )}
      </div>
        </>
      )}
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <PerformancePage />
    </ProtectedRoute>
  );
}

