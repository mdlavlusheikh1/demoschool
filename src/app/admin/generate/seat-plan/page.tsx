'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { classQueries } from '@/lib/database-queries';
import { studentQueries } from '@/lib/database-queries';
import { settingsQueries } from '@/lib/database-queries';
import { ArrowLeft, Download, Printer, LayoutGrid, Users, Calendar, Settings } from 'lucide-react';

function SeatPlanPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classes, setClasses] = useState<Array<{ classId?: string; className: string; section: string }>>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [seatPlanConfig, setSeatPlanConfig] = useState({
    rows: 5,
    columns: 6,
    examName: '',
    examDate: new Date().toISOString().split('T')[0],
    examTime: '',
    room: ''
  });
  const [seatPlan, setSeatPlan] = useState<any[][]>([]);

  useEffect(() => {
    if (!authLoading && userData) {
      if (userData.role !== 'admin' && userData.role !== 'super_admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [userData, authLoading, router]);

  useEffect(() => {
    loadClasses();
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
    } else {
      setStudents([]);
      setSeatPlan([]);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (students.length > 0 && seatPlanConfig.rows > 0 && seatPlanConfig.columns > 0) {
      generateSeatPlan();
    }
  }, [students, seatPlanConfig.rows, seatPlanConfig.columns]);

  const loadClasses = async () => {
    try {
      const classesData = await classQueries.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudents = async (className: string) => {
    setLoading(true);
    try {
      const studentsData = await studentQueries.getStudentsByClass(className);
      // Sort by roll number
      const sorted = studentsData.sort((a, b) => {
        const rollA = parseInt(a.rollNumber || '0');
        const rollB = parseInt(b.rollNumber || '0');
        return rollA - rollB;
      });
      setStudents(sorted);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      setSchoolSettings(settings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const generateSeatPlan = () => {
    const totalSeats = seatPlanConfig.rows * seatPlanConfig.columns;
    const plan: any[][] = [];
    let studentIndex = 0;

    for (let row = 0; row < seatPlanConfig.rows; row++) {
      const rowData: any[] = [];
      for (let col = 0; col < seatPlanConfig.columns; col++) {
        if (studentIndex < students.length) {
          rowData.push(students[studentIndex]);
          studentIndex++;
        } else {
          rowData.push(null);
        }
      }
      plan.push(rowData);
    }

    setSeatPlan(plan);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    alert('PDF ডাউনলোড ফিচার শীঘ্রই যোগ করা হবে');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="সিট প্ল্যান" subtitle="পরীক্ষার জন্য সিট প্ল্যান তৈরি করুন">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin/generate')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>পিছনে যান</span>
        </button>

        {/* Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            সিট প্ল্যান কনফিগারেশন
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাস নির্বাচন করুন</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ক্লাস নির্বাচন করুন</option>
                {classes.map((classItem) => (
                  <option key={classItem.classId} value={classItem.className}>
                    {classItem.className} - {classItem.section}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">পরীক্ষার নাম</label>
              <input
                type="text"
                value={seatPlanConfig.examName}
                onChange={(e) => setSeatPlanConfig(prev => ({ ...prev, examName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="পরীক্ষার নাম"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">পরীক্ষার তারিখ</label>
              <input
                type="date"
                value={seatPlanConfig.examDate}
                onChange={(e) => setSeatPlanConfig(prev => ({ ...prev, examDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">পরীক্ষার সময়</label>
              <input
                type="time"
                value={seatPlanConfig.examTime}
                onChange={(e) => setSeatPlanConfig(prev => ({ ...prev, examTime: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">রুম/হল</label>
              <input
                type="text"
                value={seatPlanConfig.room}
                onChange={(e) => setSeatPlanConfig(prev => ({ ...prev, room: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="রুম/হল নম্বর"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">সারি</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={seatPlanConfig.rows}
                  onChange={(e) => setSeatPlanConfig(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">কলাম</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={seatPlanConfig.columns}
                  onChange={(e) => setSeatPlanConfig(prev => ({ ...prev, columns: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Seat Plan Preview */}
        {selectedClass && seatPlan.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 print:p-12">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <div className="text-sm text-gray-600">
                <p>মোট শিক্ষার্থী: {students.length}</p>
                <p>মোট সিট: {seatPlanConfig.rows * seatPlanConfig.columns}</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>ডাউনলোড</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট</span>
                </button>
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              {schoolSettings?.schoolLogo && (
                <img
                  src={schoolSettings.schoolLogo}
                  alt="School Logo"
                  className="h-16 mx-auto mb-4"
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {schoolSettings?.schoolName || 'স্কুলের নাম'}
              </h1>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {seatPlanConfig.examName || 'পরীক্ষার সিট প্ল্যান'}
              </h2>
              <div className="flex justify-center space-x-6 text-sm text-gray-600">
                <p>ক্লাস: {selectedClass}</p>
                {seatPlanConfig.examDate && (
                  <p>তারিখ: {new Date(seatPlanConfig.examDate).toLocaleDateString('bn-BD')}</p>
                )}
                {seatPlanConfig.examTime && <p>সময়: {seatPlanConfig.examTime}</p>}
                {seatPlanConfig.room && <p>রুম: {seatPlanConfig.room}</p>}
              </div>
            </div>

            {/* Seat Plan Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 bg-gray-100 text-gray-700 text-sm">সারি</th>
                    {Array.from({ length: seatPlanConfig.columns }, (_, i) => (
                      <th key={i} className="border border-gray-300 p-2 bg-gray-100 text-gray-700 text-sm">
                        {String.fromCharCode(65 + i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seatPlan.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="border border-gray-300 p-2 bg-gray-100 text-gray-700 font-semibold text-center">
                        {rowIndex + 1}
                      </td>
                      {row.map((student, colIndex) => (
                        <td
                          key={colIndex}
                          className="border border-gray-300 p-3 text-center min-w-[120px]"
                        >
                          {student ? (
                            <div className="space-y-1">
                              <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                              <p className="text-xs text-gray-600">রোল: {student.rollNumber || 'N/A'}</p>
                            </div>
                          ) : (
                            <div className="text-gray-300">-</div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-6 text-sm text-gray-600">
              <p className="mb-2"><strong>নির্দেশনা:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>সারি নম্বর বাম দিকে এবং কলাম (A, B, C...) উপরে দেখানো হয়েছে</li>
                <li>প্রতিটি সিটে শিক্ষার্থীর নাম এবং রোল নম্বর দেখানো হয়েছে</li>
                <li>খালি সিট "-" চিহ্ন দিয়ে দেখানো হয়েছে</li>
              </ul>
            </div>
          </div>
        )}

        {selectedClass && loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {selectedClass && !loading && students.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-500">
            এই ক্লাসে কোন শিক্ষার্থী পাওয়া যায়নি
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function SeatPlanPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <SeatPlanPage />
    </ProtectedRoute>
  );
}

