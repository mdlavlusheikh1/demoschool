'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { studentQueries, teacherQueries, settingsQueries } from '@/lib/database-queries';
import { exportToPDF, exportToExcel, convertStudentsForExport } from '@/lib/export-utils';
import type { User as UserType } from '@/lib/queries/user-queries';
import { 
  ArrowLeft, Download, FileDown, Loader2, 
  Users, GraduationCap, CheckCircle, XCircle, X,
  Search, FileText
} from 'lucide-react';

function ReportBuilderPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reportId = params.reportId as string;
  
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const reportTypes: { [key: string]: { title: string; icon: any; color: string } } = {
    students: { title: 'শিক্ষার্থী রিপোর্ট', icon: Users, color: 'blue' },
    teachers: { title: 'শিক্ষক রিপোর্ট', icon: GraduationCap, color: 'green' },
    attendance: { title: 'উপস্থিতি রিপোর্ট', icon: FileText, color: 'orange' },
    exam: { title: 'পরীক্ষার ফলাফল', icon: FileText, color: 'purple' },
    financial: { title: 'আর্থিক রিপোর্ট', icon: FileText, color: 'red' },
    events: { title: 'ইভেন্ট রিপোর্ট', icon: FileText, color: 'indigo' },
  };

  const currentReport = reportTypes[reportId] || reportTypes.students;

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

  // Load report data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (reportId === 'students') {
          const data = await studentQueries.getAllStudents(true);
          setReportData(data);
        } else if (reportId === 'teachers') {
          const data = await teacherQueries.getAllTeachers(true);
          setReportData(data);
        } else {
          setReportData([]);
        }
      } catch (error) {
        console.error('Error loading report data:', error);
        setReportData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (reportId) {
      loadData();
    }
  }, [reportId]);

  // Check auth
  useEffect(() => {
    if (!authLoading && userData) {
      if (userData.role !== 'admin' && userData.role !== 'super_admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [userData, authLoading, router]);

  // Get available classes
  const getAvailableClasses = () => {
    if (!reportData || !Array.isArray(reportData)) return [];
    const classes = new Set(reportData.map((item: any) => item.class).filter(Boolean));
    return Array.from(classes).sort();
  };

  // Filter data
  const filteredData = () => {
    if (!reportData || !Array.isArray(reportData)) return [];
    
    let filtered = [...reportData];
    
    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter((item: any) => item.class === selectedClass);
    }
    
    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter((item: any) => item.isActive !== false);
      } else if (selectedStatus === 'inactive') {
        filtered = filtered.filter((item: any) => item.isActive === false);
      }
    }
    
    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((item: any) => 
        item.name?.toLowerCase().includes(term) ||
        item.email?.toLowerCase().includes(term) ||
        item.studentId?.toLowerCase().includes(term) ||
        item.phoneNumber?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (reportId !== 'students') {
      setShowErrorMessage(true);
      setMessageText('এই রিপোর্টের জন্য PDF ডাউনলোড এখনো উপলব্ধ নয়');
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    setGenerating(true);
    try {
      const data = filteredData();
      const exportData = convertStudentsForExport(data as UserType[]);
      const currentDate = new Date().toISOString().split('T')[0];
      await exportToPDF(exportData, `students_report_${currentDate}.pdf`, schoolLogo, schoolSettings);
      
      setShowSuccessMessage(true);
      setMessageText('PDF সফলভাবে ডাউনলোড হয়েছে');
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error: any) {
      setShowErrorMessage(true);
      setMessageText(error.message || 'PDF ডাউনলোড করা যায়নি');
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setGenerating(false);
    }
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    if (reportId !== 'students') {
      setShowErrorMessage(true);
      setMessageText('এই রিপোর্টের জন্য Excel ডাউনলোড এখনো উপলব্ধ নয়');
      setTimeout(() => setShowErrorMessage(false), 3000);
      return;
    }

    setGenerating(true);
    try {
      const data = filteredData();
      const exportData = convertStudentsForExport(data as UserType[]);
      const currentDate = new Date().toISOString().split('T')[0];
      exportToExcel(exportData, `students_report_${currentDate}.xlsx`);
      
      setShowSuccessMessage(true);
      setMessageText('Excel সফলভাবে ডাউনলোড হয়েছে');
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error: any) {
      setShowErrorMessage(true);
      setMessageText(error.message || 'Excel ডাউনলোড করা যায়নি');
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setGenerating(false);
    }
  };

  const filtered = filteredData();
  const Icon = currentReport.icon;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout title={currentReport.title} subtitle="রিপোর্ট তৈরি করুন এবং ডাউনলোড করুন">
      {/* Toast Messages */}
      {showSuccessMessage && (
        <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <CheckCircle className="w-5 h-5" />
          <span>{messageText}</span>
          <button onClick={() => setShowSuccessMessage(false)} className="ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showErrorMessage && (
        <div className="fixed top-20 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <XCircle className="w-5 h-5" />
          <span>{messageText}</span>
          <button onClick={() => setShowErrorMessage(false)} className="ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/generate')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>ফিরে যান</span>
          </button>
          <div className="flex items-center space-x-2">
            <Icon className={`w-5 h-5 text-${currentReport.color}-600`} />
            <h2 className="text-2xl font-bold text-gray-900">{currentReport.title}</h2>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {reportId === 'students' && (
              <div className="w-full md:w-auto min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাস</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">সকল ক্লাস</option>
                  {getAvailableClasses().map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="w-full md:w-auto min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">অবস্থা</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">সকল</option>
                <option value="active">সক্রিয়</option>
                <option value="inactive">নিষ্ক্রিয়</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">রিপোর্ট অ্যাকশন</h3>
              <p className="text-sm text-gray-600 mt-1">
                মোট: {filtered.length} টি রেকর্ড
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDownloadPDF}
                disabled={generating}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>PDF ডাউনলোড</span>
              </button>
              <button
                onClick={handleDownloadExcel}
                disabled={generating}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>Excel ডাউনলোড</span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">তালিকা</h3>
          </div>
          <div className="overflow-x-auto">
            {reportId === 'students' ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ক্রমিক</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">নাম</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">আইডি</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ক্লাস</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ইমেইল</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ফোন</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.length > 0 ? (
                    filtered.map((student: any, index: number) => (
                      <tr key={student.uid || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{student.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{student.studentId || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{student.class || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{student.email || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{student.phoneNumber || student.phone || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>কোনো ডাটা পাওয়া যায়নি</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>এই রিপোর্টের জন্য এখনো ডাটা টেবিল উপলব্ধ নয়</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function ReportBuilderPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ReportBuilderPage />
    </ProtectedRoute>
  );
}

