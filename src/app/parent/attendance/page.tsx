'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { studentQueries, attendanceQueries } from '@/lib/database-queries';
import { 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Loader2,
  Filter,
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

function AttendancePage() {
  const { userData, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendanceRate: 0
  });

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      
      const parentEmail = user?.email || (userData as any)?.email;
      const parentPhone = (userData as any)?.phone || user?.phoneNumber;
      
      // Load children
      const myChildren = await getStudentsByParent(parentEmail, parentPhone);
      setStudents(myChildren.map(s => ({
        id: (s as any).uid || (s as any).id || '',
        name: s.name || '',
        className: (s as any).className || (s as any).class || '',
        section: (s as any).section || '',
      })));

      if (myChildren.length === 0) {
        setLoading(false);
        return;
      }

      // Get date range for selected month
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Load attendance for selected student(s)
      let allRecords: any[] = [];
      const studentIdsToLoad = selectedStudent === 'all' 
        ? myChildren.map(c => (c as any).uid || (c as any).id)
        : [selectedStudent];

      for (const studentId of studentIdsToLoad) {
        try {
          // Get all attendance records for the student
          const records = await attendanceQueries.getStudentAttendance(studentId);
          
          // Filter by month
          const monthRecords = records.filter(record => {
            const recordDate = record.date || '';
            return recordDate >= startDateStr && recordDate <= endDateStr;
          });

          allRecords = [...allRecords, ...monthRecords.map(r => ({
            ...r,
            studentId,
            studentName: myChildren.find(c => ((c as any).uid || (c as any).id) === studentId)?.name || ''
          }))];
        } catch (error) {
          console.error(`Error loading attendance for student ${studentId}:`, error);
        }
      }

      // Calculate total working days in the month (excluding weekends)
      // In Bangladesh, typically Friday (5) and Saturday (6) are weekends
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      let totalWorkingDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth, day);
        const dayOfWeek = date.getDay();
        // Count only weekdays: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
        // Exclude Friday (5) and Saturday (6) as weekends in Bangladesh
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
          totalWorkingDays++;
        }
      }

      // Calculate stats from attendance records
      // Group by date and studentId to avoid duplicate counting
      // If multiple records exist for same date+student, use the first one (or most recent)
      const uniqueRecords = new Map<string, any>();
      
      // Sort by date descending to get most recent record first for each date+student
      const sortedRecords = [...allRecords].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return 0;
      });

      // Keep only unique date+studentId combinations
      for (const record of sortedRecords) {
        const key = `${record.date}_${record.studentId || 'all'}`;
        if (!uniqueRecords.has(key)) {
          uniqueRecords.set(key, record);
        }
      }

      const uniqueRecordsArray = Array.from(uniqueRecords.values());
      
      // Set attendance data to unique records only (for display in list)
      setAttendanceData(uniqueRecordsArray);
      
      // Count unique days per status
      const presentCount = uniqueRecordsArray.filter(r => r.status === 'present').length;
      const absentCount = uniqueRecordsArray.filter(r => r.status === 'absent').length;
      const lateCount = uniqueRecordsArray.filter(r => r.status === 'late').length;
      
      // Present includes late (late is also considered present)
      const totalPresent = presentCount + lateCount;
      
      // Total days should be just the working days in the month
      // Not multiplied by number of students, because we're showing unique attendance days
      const totalDays = totalWorkingDays;
      
      // Calculate attendance rate based on total unique present days vs total working days
      // If multiple students, we need to consider: total possible days = working days * number of students
      const numberOfStudents = selectedStudent === 'all' ? (students.length || 1) : 1;
      const totalPossibleDays = totalWorkingDays * numberOfStudents;
      const attendanceRate = totalPossibleDays > 0 ? (totalPresent / totalPossibleDays) * 100 : 0;

      console.log('Attendance Stats Debug:', {
        totalRecords: allRecords.length,
        uniqueRecords: uniqueRecordsArray.length,
        totalWorkingDays,
        numberOfStudents,
        totalDays,
        presentCount,
        lateCount,
        totalPresent,
        absentCount,
        attendanceRate
      });

      setStats({
        totalDays: totalDays,
        present: totalPresent,
        absent: absentCount,
        late: lateCount,
        attendanceRate
      });

    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedStudent, userData, user]);

  useEffect(() => {
    if (userData || user) {
      loadAttendance();
    }
  }, [loadAttendance, userData, user]);

  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  // Generate calendar days
  const getCalendarDays = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = attendanceData.filter(r => r.date === dateStr);
      days.push({
        day,
        date: dateStr,
        records: dayRecords
      });
    }
    
    return days;
  };

  if (loading) {
    return (
      <ParentLayout title="উপস্থিতি রিপোর্ট" subtitle="সন্তানদের উপস্থিতি পর্যবেক্ষণ করুন">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  const calendarDays = getCalendarDays();

  return (
    <ParentLayout title="উপস্থিতি রিপোর্ট" subtitle="মাসিক উপস্থিতি বিশ্লেষণ">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center space-x-4 flex-wrap">
          <Filter className="w-5 h-5 text-gray-600" />
          {students.length > 1 && (
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">সব শিক্ষার্থী</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.className} {student.section ? `- ${student.section}` : ''})
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">মোট দিন</p>
              <p className="text-3xl font-bold text-gray-900">
                {toBengaliNumerals(stats.totalDays)}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">উপস্থিত</p>
              <p className="text-3xl font-bold text-green-600">
                {toBengaliNumerals(stats.present)}
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
              <p className="text-sm text-gray-600 mb-1">অনুপস্থিত</p>
              <p className="text-3xl font-bold text-red-600">
                {toBengaliNumerals(stats.absent)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">উপস্থিতির হার</p>
              <p className="text-3xl font-bold text-blue-600">
                {toBengaliNumerals(Math.round(stats.attendanceRate))}%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">উপস্থিতি ক্যালেন্ডার</h2>
        
        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
            <p className="text-sm mt-1">আপনার ফোন নম্বর বা ইমেইলের সাথে মিল রয়েছে এমন কোনো শিক্ষার্থী নেই</p>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">এই মাসে কোনো উপস্থিতি রেকর্ড নেই</p>
            <p className="text-sm mt-1">নির্বাচিত মাসের জন্য কোনো উপস্থিতির ডেটা পাওয়া যায়নি</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((dayData, index) => {
                if (!dayData) {
                  return <div key={index} className="aspect-square"></div>;
                }
                
                const hasPresent = dayData.records.some(r => r.status === 'present');
                const hasAbsent = dayData.records.some(r => r.status === 'absent');
                const hasLate = dayData.records.some(r => r.status === 'late');
                
                let bgColor = 'bg-gray-50';
                let textColor = 'text-gray-600';
                let borderColor = 'border-gray-200';
                
                if (hasPresent && !hasAbsent && !hasLate) {
                  bgColor = 'bg-green-50';
                  textColor = 'text-green-700';
                  borderColor = 'border-green-200';
                } else if (hasAbsent) {
                  bgColor = 'bg-red-50';
                  textColor = 'text-red-700';
                  borderColor = 'border-red-200';
                } else if (hasLate) {
                  bgColor = 'bg-yellow-50';
                  textColor = 'text-yellow-700';
                  borderColor = 'border-yellow-200';
                } else if (dayData.records.length === 0) {
                  bgColor = 'bg-gray-50';
                  textColor = 'text-gray-400';
                  borderColor = 'border-gray-100';
                }
                
                return (
                  <div
                    key={index}
                    className={`aspect-square ${bgColor} ${borderColor} border rounded-lg p-2 flex flex-col items-center justify-center ${textColor}`}
                    title={dayData.date}
                  >
                    <span className="text-sm font-medium">{toBengaliNumerals(dayData.day)}</span>
                    {dayData.records.length > 0 && (
                      <span className="text-xs mt-1">
                        {hasPresent && <CheckCircle className="w-3 h-3 inline text-green-600" />}
                        {hasAbsent && <XCircle className="w-3 h-3 inline text-red-600" />}
                        {hasLate && <Clock className="w-3 h-3 inline text-yellow-600" />}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span className="text-gray-600">উপস্থিত</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span className="text-gray-600">অনুপস্থিত</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                <span className="text-gray-600">বিলম্ব</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border border-gray-100 rounded"></div>
                <span className="text-gray-600">রেকর্ড নেই</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Attendance List */}
      {attendanceData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">উপস্থিতি তালিকা</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">তারিখ</th>
                  {students.length > 1 && (
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">শিক্ষার্থী</th>
                  )}
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">অবস্থা</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">সময়</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">মন্তব্য</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .map((record, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {record.date ? new Date(record.date).toLocaleDateString('bn-BD') : '-'}
                      </td>
                      {students.length > 1 && (
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {record.studentName || '-'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        {record.status === 'present' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            উপস্থিত
                          </span>
                        ) : record.status === 'absent' ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            অনুপস্থিত
                          </span>
                        ) : record.status === 'late' ? (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                            বিলম্ব
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                            {record.status || 'N/A'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.timestamp ? (
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
                                } else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
                                  // It's a Firestore Timestamp with seconds property
                                  date = new Date(timestamp.seconds * 1000);
                                } else if (timestamp instanceof Date) {
                                  // It's already a JavaScript Date
                                  date = timestamp;
                                } else if (typeof timestamp === 'string') {
                                  // It's a string
                                  date = new Date(timestamp);
                                } else {
                                  return '-';
                                }

                                return date.toLocaleTimeString('bn-BD', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                });
                              } catch (error) {
                                console.error('Error formatting timestamp:', error, record.timestamp);
                                return '-';
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.remarks || record.note || '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <AttendancePage />
    </ProtectedRoute>
  );
}
