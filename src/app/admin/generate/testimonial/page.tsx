'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { classQueries } from '@/lib/database-queries';
import { studentQueries } from '@/lib/database-queries';
import { settingsQueries } from '@/lib/database-queries';
import { ArrowLeft, Search, Download, Printer, FileText, Users, Calendar } from 'lucide-react';

function TestimonialPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classes, setClasses] = useState<Array<{ classId?: string; className: string; section: string }>>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

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
      setStudents(studentsData);
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

  const handleGenerateTestimonial = (student: any) => {
    setSelectedStudent(student);
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
    <AdminLayout title="প্রত্যায়ন পত্র" subtitle="শিক্ষার্থীদের জন্য প্রত্যায়ন পত্র তৈরি করুন">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin/generate')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>পিছনে যান</span>
        </button>

        {!selectedStudent ? (
          <>
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
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">রোল</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">নাম</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ক্লাস</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student.uid} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">{student.rollNumber || '-'}</td>
                            <td className="py-3 px-4">{student.name || '-'}</td>
                            <td className="py-3 px-4">{student.class || '-'}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleGenerateTestimonial(student)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                              >
                                <FileText className="w-4 h-4" />
                                <span>প্রত্যায়ন পত্র তৈরি করুন</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Testimonial Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 print:p-12">
              <div className="flex justify-between items-start mb-6 print:hidden">
                <button
                  onClick={() => setSelectedStudent(null)}
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

              {/* Testimonial Content */}
              <div className="border-2 border-gray-300 p-8 space-y-6">
                {/* Header */}
                <div>
                  {/* Logo and School Name in same line */}
                  <div className="flex items-center justify-between mb-4">
                    {schoolSettings?.schoolLogo ? (
                      <img
                        src={schoolSettings.schoolLogo}
                        alt="School Logo"
                        className="h-20 w-20 object-contain"
                      />
                    ) : (
                      <div className="w-20"></div>
                    )}
                    <div className="flex-1 text-center">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {schoolSettings?.schoolName || 'স্কুলের নাম'}
                      </h1>
                    </div>
                    {/* Spacer for alignment */}
                    <div className="w-20"></div>
                  </div>
                  {/* Address and Title - Centered */}
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      {schoolSettings?.schoolAddress || schoolSettings?.address || 'স্কুলের ঠিকানা'}
                    </p>
                    <h2 className="text-xl font-semibold text-gray-900">প্রত্যায়ন পত্র</h2>
                  </div>
                </div>

                {/* Body */}
                <div className="text-justify space-y-4 text-gray-800 leading-relaxed">
                  <p>
                    এটি প্রত্যয়িত করা যাচ্ছে যে, <strong>{selectedStudent.name}</strong> এই স্কুলের একজন নিয়মিত শিক্ষার্থী ছিলেন।
                  </p>
                  <p>
                    তিনি <strong>{selectedStudent.class}</strong> শ্রেণীতে অধ্যয়ন করেছেন এবং তার রোল নম্বর ছিল <strong>{selectedStudent.rollNumber || 'N/A'}</strong>।
                  </p>
                  <p>
                    তার চরিত্র, আচরণ এবং শিক্ষাগত পারফরমেন্স সন্তোষজনক ছিল। তিনি একজন শৃঙ্খলাবদ্ধ এবং মেধাবী শিক্ষার্থী ছিলেন।
                  </p>
                  <p>
                    এই প্রত্যায়ন পত্রটি তার ভবিষ্যৎ প্রয়োজনে প্রদান করা হলো।
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-12 flex justify-between">
                  <div>
                    <p className="text-gray-600 mb-2">তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600 mb-2">প্রধান শিক্ষক</p>
                    <p className="font-semibold text-gray-900">
                      {schoolSettings?.principalName || 'প্রধান শিক্ষকের নাম'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {schoolSettings?.schoolName || 'স্কুলের নাম'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default function TestimonialPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <TestimonialPage />
    </ProtectedRoute>
  );
}

