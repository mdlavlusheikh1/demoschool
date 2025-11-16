'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { classQueries } from '@/lib/database-queries';
import { studentQueries } from '@/lib/database-queries';
import { settingsQueries } from '@/lib/database-queries';
import { ArrowLeft, Search, Download, Printer, Ticket, Users, Calendar, CheckSquare } from 'lucide-react';

function AdmitCardPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classes, setClasses] = useState<Array<{ classId?: string; className: string; section: string }>>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [examDetails, setExamDetails] = useState({
    examName: '',
    examDate: new Date().toISOString().split('T')[0],
    examTime: '',
    duration: '',
    room: '',
    center: ''
  });

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
      setSelectedStudents([]);
    }
  }, [selectedClass]);

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

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber?.toString().includes(searchTerm)
  );

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.uid));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    alert('PDF ডাউনলোড ফিচার শীঘ্রই যোগ করা হবে');
  };

  const selectedStudentsData = students.filter(s => selectedStudents.includes(s.uid));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="প্রবেশপত্র" subtitle="পরীক্ষার প্রবেশপত্র তৈরি করুন">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin/generate')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>পিছনে যান</span>
        </button>

        {!showPreview ? (
          <>
            {/* Exam Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">পরীক্ষার বিবরণ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পরীক্ষার নাম</label>
                  <input
                    type="text"
                    value={examDetails.examName}
                    onChange={(e) => setExamDetails(prev => ({ ...prev, examName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="পরীক্ষার নাম"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পরীক্ষার তারিখ</label>
                  <input
                    type="date"
                    value={examDetails.examDate}
                    onChange={(e) => setExamDetails(prev => ({ ...prev, examDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পরীক্ষার সময়</label>
                  <input
                    type="time"
                    value={examDetails.examTime}
                    onChange={(e) => setExamDetails(prev => ({ ...prev, examTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">সময়কাল</label>
                  <input
                    type="text"
                    value={examDetails.duration}
                    onChange={(e) => setExamDetails(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="যেমন: ২ ঘণ্টা"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">রুম/হল</label>
                  <input
                    type="text"
                    value={examDetails.room}
                    onChange={(e) => setExamDetails(prev => ({ ...prev, room: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="রুম/হল নম্বর"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পরীক্ষা কেন্দ্র</label>
                  <input
                    type="text"
                    value={examDetails.center}
                    onChange={(e) => setExamDetails(prev => ({ ...prev, center: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="পরীক্ষা কেন্দ্র"
                  />
                </div>
              </div>
            </div>

            {/* Class Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ক্লাস নির্বাচন করুন</h3>
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

            {/* Student List */}
            {selectedClass && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">শিক্ষার্থী তালিকা</h3>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-64">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="শিক্ষার্থী খুঁজুন..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={selectAllStudents}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>{selectedStudents.length === filteredStudents.length ? 'সব নির্বাচন বাতিল' : 'সব নির্বাচন'}</span>
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    কোন শিক্ষার্থী পাওয়া যায়নি
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-12">
                            <input
                              type="checkbox"
                              checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                              onChange={selectAllStudents}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">রোল</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">নাম</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ক্লাস</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student.uid} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(student.uid)}
                                onChange={() => toggleStudentSelection(student.uid)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3 px-4">{student.rollNumber || '-'}</td>
                            <td className="py-3 px-4">{student.name || '-'}</td>
                            <td className="py-3 px-4">{student.class || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedStudents.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setShowPreview(true)}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>{selectedStudents.length} জনের প্রবেশপত্র দেখুন</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Admit Cards Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 print:p-12">
              <div className="flex justify-between items-start mb-6 print:hidden">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedStudents([]);
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>পিছনে যান</span>
                </button>
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

              {/* Admit Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                {selectedStudentsData.map((student) => (
                  <div
                    key={student.uid}
                    className="border-2 border-gray-400 p-6 space-y-4 print:break-inside-avoid"
                  >
                    {/* Header */}
                    <div className="text-center border-b-2 border-gray-300 pb-4">
                      {schoolSettings?.schoolLogo && (
                        <img
                          src={schoolSettings.schoolLogo}
                          alt="School Logo"
                          className="h-16 mx-auto mb-2"
                        />
                      )}
                      <h1 className="text-lg font-bold text-gray-900">
                        {schoolSettings?.schoolName || 'স্কুলের নাম'}
                      </h1>
                      <p className="text-sm text-gray-600">
                        {schoolSettings?.schoolAddress || schoolSettings?.address || 'স্কুলের ঠিকানা'}
                      </p>
                      <h2 className="text-xl font-bold text-gray-900 mt-2">প্রবেশপত্র</h2>
                    </div>

                    {/* Student Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">নাম:</span>
                        <span className="font-semibold text-gray-900">{student.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">রোল নম্বর:</span>
                        <span className="font-semibold text-gray-900">{student.rollNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ক্লাস:</span>
                        <span className="font-semibold text-gray-900">{student.class || 'N/A'}</span>
                      </div>
                      {student.section && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">শাখা:</span>
                          <span className="font-semibold text-gray-900">{student.section}</span>
                        </div>
                      )}
                    </div>

                    {/* Exam Info */}
                    <div className="border-t-2 border-gray-300 pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">পরীক্ষার নাম:</span>
                        <span className="font-semibold text-gray-900">{examDetails.examName || 'N/A'}</span>
                      </div>
                      {examDetails.examDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">তারিখ:</span>
                          <span className="font-semibold text-gray-900">
                            {new Date(examDetails.examDate).toLocaleDateString('bn-BD')}
                          </span>
                        </div>
                      )}
                      {examDetails.examTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">সময়:</span>
                          <span className="font-semibold text-gray-900">{examDetails.examTime}</span>
                        </div>
                      )}
                      {examDetails.duration && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">সময়কাল:</span>
                          <span className="font-semibold text-gray-900">{examDetails.duration}</span>
                        </div>
                      )}
                      {examDetails.room && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">রুম/হল:</span>
                          <span className="font-semibold text-gray-900">{examDetails.room}</span>
                        </div>
                      )}
                      {examDetails.center && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">পরীক্ষা কেন্দ্র:</span>
                          <span className="font-semibold text-gray-900">{examDetails.center}</span>
                        </div>
                      )}
                    </div>

                    {/* Signature Area */}
                    <div className="border-t-2 border-gray-300 pt-4 mt-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">শিক্ষার্থীর স্বাক্ষর</p>
                          <div className="h-12 border-b border-gray-400"></div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-1">প্রধান শিক্ষক</p>
                          <div className="h-12 border-b border-gray-400"></div>
                          <p className="text-xs text-gray-600 mt-1">
                            {schoolSettings?.principalName || 'প্রধান শিক্ষকের নাম'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdmitCardPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AdmitCardPage />
    </ProtectedRoute>
  );
}

