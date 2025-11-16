'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import TeacherLayout from '@/components/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceQueries, classQueries, studentQueries, AttendanceRecord, Class } from '@/lib/database-queries';
import { settingsQueries } from '@/lib/database-queries';
import { 
  ArrowLeft, Download, FileDown, Loader2, 
  Calendar, Users, ClipboardList, TrendingUp,
  Search, Filter, FileText, CheckCircle, XCircle, Clock, UserCheck
} from 'lucide-react';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

function AttendanceReportPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Report data
  const [reportData, setReportData] = useState<AttendanceRecord[]>([]);
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
    if (!selectedReportType) return;
    
    setLoading(true);
    try {
      let data: AttendanceRecord[] = [];
      
      if (selectedReportType === 'daily') {
        data = await attendanceQueries.getAttendanceByDateAndClass(startDate, selectedClass);
      } else if (selectedReportType === 'monthly') {
        // Get first and last day of month
        const date = new Date(startDate);
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        if (userData?.schoolId) {
          data = await attendanceQueries.getSchoolAttendance(userData.schoolId, firstDay, lastDay);
        }
      } else if (selectedReportType === 'class') {
        if (selectedClass !== 'all') {
          data = await attendanceQueries.getAttendanceByDateAndClass(startDate, selectedClass);
        }
      } else if (selectedReportType === 'summary') {
        if (userData?.schoolId && startDate && endDate) {
          data = await attendanceQueries.getSchoolAttendance(userData.schoolId, startDate, endDate);
        }
      }
      
      // Filter by status if needed
      if (selectedStatus !== 'all') {
        data = data.filter(record => record.status === selectedStatus);
      }
      
      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
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

  const stats = getStatistics();
  const uniqueRecords = getUniqueRecords();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TeacherLayout title="উপস্থিতি রিপোর্ট" subtitle="বিভিন্ন ধরনের উপস্থিতি রিপোর্ট তৈরি করুন">
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

                {selectedReportType === 'class' && (
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাস</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option key="all-classes" value="all">সকল ক্লাস</option>
                      {classes.map((cls, index) => (
                        <option key={cls.id || `class-${index}`} value={cls.id}>{cls.className}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">শুরুর তারিখ</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {(selectedReportType === 'summary' || selectedReportType === 'monthly') && (
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
                  </select>
                </div>

                <button
                  onClick={loadReportData}
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
            {reportData.length > 0 && (
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

            {/* Report Data Table */}
            {reportData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">রিপোর্ট ডাটা</h3>
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
                      {uniqueRecords.map((record, index) => (
                        <tr key={`${record.studentId}_${record.date}_${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700 border-b">{record.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-b">{record.studentName}</td>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportData.length === 0 && !loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">কোনো ডাটা পাওয়া যায়নি। অনুগ্রহ করে রিপোর্ট লোড করুন।</p>
              </div>
            )}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}

export default function AttendanceReportPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AttendanceReportPage />
    </ProtectedRoute>
  );
}

