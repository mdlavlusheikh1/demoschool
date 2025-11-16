'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { classQueries } from '@/lib/database-queries';
import { studentQueries } from '@/lib/database-queries';
import { settingsQueries } from '@/lib/database-queries';
import { ArrowLeft, Search, Download, Printer, Award, Users, Calendar, FileText } from 'lucide-react';

function CertificatePage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classes, setClasses] = useState<Array<{ classId?: string; className: string; section: string }>>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [certificateType, setCertificateType] = useState('achievement');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [certificateDetails, setCertificateDetails] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    achievement: ''
  });

  const certificateTypes = [
    { id: 'achievement', label: 'অর্জন', description: 'কৃতিত্বের জন্য সার্টিফিকেট' },
    { id: 'participation', label: 'অংশগ্রহণ', description: 'অংশগ্রহণের জন্য সার্টিফিকেট' },
    { id: 'completion', label: 'সমাপ্তি', description: 'কোর্স সমাপ্তির সার্টিফিকেট' },
    { id: 'excellence', label: 'সুযোগ্যতা', description: 'সুযোগ্যতার জন্য সার্টিফিকেট' },
  ];

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

  const handleGenerateCertificate = (student: any) => {
    setSelectedStudent(student);
    // Set default certificate details based on type
    const type = certificateTypes.find(t => t.id === certificateType);
    setCertificateDetails({
      title: type?.label || '',
      description: type?.description || '',
      date: new Date().toISOString().split('T')[0],
      achievement: ''
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    alert('PDF ডাউনলোড ফিচার শীঘ্রই যোগ করা হবে');
  };

  const getCertificateContent = () => {
    const type = certificateTypes.find(t => t.id === certificateType);
    switch (certificateType) {
      case 'achievement':
        return {
          title: 'অর্জন সার্টিফিকেট',
          content: `${selectedStudent.name} কৃতিত্বের জন্য এই সার্টিফিকেট প্রদান করা হলো। ${certificateDetails.achievement ? `তার অর্জন: ${certificateDetails.achievement}` : ''}`
        };
      case 'participation':
        return {
          title: 'অংশগ্রহণ সার্টিফিকেট',
          content: `${selectedStudent.name} ${certificateDetails.description || 'বিভিন্ন কার্যক্রমে'} সক্রিয়ভাবে অংশগ্রহণ করেছেন।`
        };
      case 'completion':
        return {
          title: 'সমাপ্তি সার্টিফিকেট',
          content: `${selectedStudent.name} ${certificateDetails.description || 'কোর্সটি'} সফলভাবে সম্পন্ন করেছেন।`
        };
      case 'excellence':
        return {
          title: 'সুযোগ্যতা সার্টিফিকেট',
          content: `${selectedStudent.name} ${certificateDetails.description || 'শিক্ষাগত কার্যক্রমে'} অসাধারণ সাফল্য অর্জন করেছেন।`
        };
      default:
        return {
          title: 'সার্টিফিকেট',
          content: `${selectedStudent.name} এর জন্য এই সার্টিফিকেট প্রদান করা হলো।`
        };
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="সার্টিফিকেট" subtitle="বিভিন্ন ধরনের সার্টিফিকেট তৈরি করুন">
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
            {/* Certificate Type Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">সার্টিফিকেটের ধরন নির্বাচন করুন</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {certificateTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setCertificateType(type.id)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      certificateType === type.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Award className={`w-6 h-6 mb-2 ${certificateType === type.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <h4 className="font-semibold text-gray-900">{type.label}</h4>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </button>
                ))}
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
                                onClick={() => handleGenerateCertificate(student)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                              >
                                <Award className="w-4 h-4" />
                                <span>সার্টিফিকেট তৈরি করুন</span>
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
            {/* Certificate Details Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">সার্টিফিকেটের বিবরণ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">বিবরণ</label>
                  <input
                    type="text"
                    value={certificateDetails.description}
                    onChange={(e) => setCertificateDetails(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="সার্টিফিকেটের বিবরণ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">তারিখ</label>
                  <input
                    type="date"
                    value={certificateDetails.date}
                    onChange={(e) => setCertificateDetails(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {certificateType === 'achievement' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">অর্জনের বিবরণ</label>
                    <textarea
                      value={certificateDetails.achievement}
                      onChange={(e) => setCertificateDetails(prev => ({ ...prev, achievement: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="অর্জনের বিবরণ লিখুন"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Certificate Preview */}
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

              {/* Certificate Content */}
              <div className="border-4 border-yellow-400 p-8 space-y-6 bg-gradient-to-br from-yellow-50 to-white">
                {/* Header */}
                <div className="text-center">
                  {schoolSettings?.schoolLogo && (
                    <img
                      src={schoolSettings.schoolLogo}
                      alt="School Logo"
                      className="h-20 mx-auto mb-4"
                    />
                  )}
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {schoolSettings?.schoolName || 'স্কুলের নাম'}
                  </h1>
                  <p className="text-gray-600">
                    {schoolSettings?.schoolAddress || schoolSettings?.address || 'স্কুলের ঠিকানা'}
                  </p>
                  <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-6">
                    {getCertificateContent().title}
                  </h2>
                </div>

                {/* Body */}
                <div className="text-center space-y-6">
                  <p className="text-lg text-gray-700 italic">
                    এটি প্রত্যয়িত করা যাচ্ছে যে
                  </p>
                  <div className="py-4 border-b-2 border-t-2 border-gray-400">
                    <h3 className="text-3xl font-bold text-gray-900">{selectedStudent.name}</h3>
                    <p className="text-gray-600 mt-2">
                      {selectedStudent.class} শ্রেণী, রোল নম্বর: {selectedStudent.rollNumber || 'N/A'}
                    </p>
                  </div>
                  <p className="text-lg text-gray-800 leading-relaxed">
                    {getCertificateContent().content}
                  </p>
                  <p className="text-gray-600">
                    তারিখ: {new Date(certificateDetails.date).toLocaleDateString('bn-BD')}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-12 flex justify-between">
                  <div></div>
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

export default function CertificatePageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <CertificatePage />
    </ProtectedRoute>
  );
}

