'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import AdminLayout from '@/components/AdminLayout';
import { examQueries } from '@/lib/database-queries';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';
import {
  Plus, Edit, Trash2, Eye, Clock, FileText, Award, BarChart3, Save,
  CheckCircle, XCircle, BookOpen as BookOpenIcon,
  FileSpreadsheet, TrendingUp as TrendingUpIcon, Loader2, DollarSign, X
} from 'lucide-react';

interface Exam {
  id?: string;
  name: string;
  nameEn?: string;
  class: string;
  subject: string;
  date: string;
  startDate: string;
  endDate: string;
  time: string;
  duration: string;
  totalMarks: number;
  students: number;
  status: 'সক্রিয়' | 'সম্পন্ন' | 'পরিকল্পনা';
  schoolId: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
  resultsPublished: boolean;
  resultsPublishedAt?: any;
  resultsPublishedBy?: string;
  allowResultView: boolean;
  examType: 'মাসিক' | 'সাময়িক' | 'বার্ষিক' | 'নির্বাচনী' | 'অন্যান্য';
  passingMarks: number;
  instructions?: string;
  venue?: string;
  invigilators?: string[];
  gradingSystem: 'percentage' | 'gpa' | 'letter';
  gradeDistribution?: any;
}

function ExamsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const schoolId = SCHOOL_ID;
  const schoolName = SCHOOL_NAME;

  // State for add exam modal
  const [newExam, setNewExam] = useState({
    name: '',
    class: '',
    subject: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  // Load exams from Firebase
  useEffect(() => {
    if (user) {
      loadExams();
    }
  }, [user]);

  // Load exams from Firebase
  const loadExams = async () => {
    try {
      setLoading(true);
      const examsData = await examQueries.getAllExams(schoolId);
      setExams(examsData || []);
    } catch (error) {
      console.error('Error loading exams:', error);
      setErrorMessage('পরীক্ষা লোড করতে ত্রুটি হয়েছে।');
      setShowErrorAlert(true);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for exams
  useEffect(() => {
    if (user) {
      try {
        const unsubscribe = examQueries.subscribeToExams(
          schoolId,
          (examsData) => {
            setExams(examsData || []);
          },
          (error) => {
            console.error('Real-time listener error:', error);
            setExams([]);
          }
        );

        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up real-time listener:', error);
        setExams([]);
      }
    }
  }, [user, schoolId]);

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Toggle result publication
  const toggleResultPublication = async (examId: string, currentStatus: boolean) => {
    if (!examId) {
      setErrorMessage('পরীক্ষা আইডি পাওয়া যায়নি।');
      setShowErrorAlert(true);
      return;
    }
    try {
      await examQueries.toggleResultPublication(examId, !currentStatus, user?.email || 'admin');
      setSuccessMessage(currentStatus ? 'ফলাফল গোপন করা হয়েছে' : 'ফলাফল প্রকাশ করা হয়েছে');
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error toggling result publication:', error);
      setErrorMessage('ফলাফল প্রকাশনা টগল করতে ত্রুটি হয়েছে।');
      setShowErrorAlert(true);
    }
  };

  // Delete exam
  const handleDeleteExam = async (examId: string) => {
    if (!examId) {
      setErrorMessage('পরীক্ষা আইডি পাওয়া যায়নি।');
      setShowErrorAlert(true);
      return;
    }
    const confirmed = window.confirm('আপনি কি নিশ্চিত যে এই পরীক্ষা মুছে ফেলতে চান?');
    if (confirmed) {
      try {
        await examQueries.deleteExam(examId);
        setSuccessMessage('পরীক্ষা সফলভাবে মুছে ফেলা হয়েছে');
        setShowSuccessAlert(true);
      } catch (error) {
        console.error('Error deleting exam:', error);
        setErrorMessage('পরীক্ষা মুছে ফেলতে ত্রুটি হয়েছে।');
        setShowErrorAlert(true);
      }
    }
  };

  // Add new exam
  const handleAddExam = async () => {
    if (!newExam.name || !newExam.class || !newExam.subject || !newExam.startDate || !newExam.endDate) {
      setErrorMessage('অনুগ্রহ করে সকল তথ্য পূরণ করুন।');
      setShowErrorAlert(true);
      return;
    }

    try {
      const examData = {
        name: newExam.name,
        class: newExam.class,
        subject: newExam.subject,
        startDate: newExam.startDate,
        endDate: newExam.endDate,
        date: newExam.startDate,
        time: '10:00',
        duration: '2 ঘণ্টা',
        totalMarks: 100,
        students: 0,
        status: 'সক্রিয়' as const,
        schoolId,
        schoolName,
        createdBy: user?.email || 'admin',
        resultsPublished: false,
        allowResultView: false,
        examType: 'সাময়িক' as const,
        passingMarks: 40,
        gradingSystem: 'percentage' as const,
        instructions: newExam.description
      };

      await examQueries.createExam(examData);

      // Reset form
      setNewExam({
        name: '',
        class: '',
        subject: '',
        startDate: '',
        endDate: '',
        description: ''
      });
      setShowAddModal(false);
      setSuccessMessage(`নতুন পরীক্ষা "${newExam.name}" সফলভাবে যোগ করা হয়েছে।`);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Error creating exam:', error);
      setErrorMessage('পরীক্ষা তৈরি করতে ত্রুটি হয়েছে।');
      setShowErrorAlert(true);
    }
  };

  // Filter exams based on search
  const filteredExams = (exams || []).filter(exam =>
    exam?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam?.class?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* Quick Actions Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Exam Results */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">ফলাফল</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ফলাফল</h3>
          <p className="text-gray-600 text-sm mb-4">পরীক্ষার ফলাফল দেখুন, প্রকাশ করুন এবং ডাউনলোড করুন।</p>
          <button
            onClick={() => router.push('/admin/exams/results')}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            ফলাফল দেখুন
          </button>
        </div>

        {/* Exam Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">পরীক্ষা</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">পরীক্ষার ম্যানেজমেন্ট</h3>
          <p className="text-gray-600 text-sm mb-4">পরীক্ষা পরিকল্পনা ও ব্যবস্থাপনা পরিচালনা করুন।</p>
          <button
            onClick={() => router.push('/admin/exams/exam-fee-management')}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            পরীক্ষা পরিচালনা করুন
          </button>
        </div>

        {/* Exam Subjects */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpenIcon className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">বিষয়</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">পরীক্ষার বিষয়</h3>
          <p className="text-gray-600 text-sm mb-4">পরীক্ষায় অন্তর্ভুক্ত বিষয়সমূহ যোগ করুন এবং পরিচালনা করুন।</p>
          <button
            onClick={() => router.push('/admin/exams/exam-subjects')}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            বিষয় যোগ করুন
          </button>
        </div>

        {/* Mark Entry */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Edit className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">এন্ট্রি</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">মার্ক এন্ট্রি</h3>
          <p className="text-gray-600 text-sm mb-4">শিক্ষার্থীদের পরীক্ষার নম্বর এন্ট্রি করুন এবং সম্পাদনা করুন।</p>
          <button
            onClick={() => router.push('/admin/exams/mark-entry')}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 text-sm font-medium"
          >
            মার্ক এন্ট্রি করুন
          </button>
        </div>

        {/* Save Marks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Save className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">সংরক্ষণ</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">মার্ক সংরক্ষণ করুন</h3>
          <p className="text-gray-600 text-sm mb-4">এন্ট্রি করা মার্ক সংরক্ষণ করুন এবং ব্যাকআপ নিন।</p>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            disabled
            className="w-full bg-gray-400 text-white py-2 px-4 rounded-lg cursor-not-allowed text-sm font-medium opacity-60"
          >
            মার্ক সংরক্ষণ করুন
          </button>
        </div>

        {/* Promotion */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">প্রমোশন</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">প্রমোশন</h3>
          <p className="text-gray-600 text-sm mb-4">শিক্ষার্থীদের পরবর্তী ক্লাসে প্রমোশন দিন এবং রেকর্ড রাখুন।</p>
          <button
            onClick={() => router.push('/admin/exams/promotion')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            প্রমোশন করুন
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">মোট পরীক্ষা</p>
              <p className="text-2xl font-bold text-gray-900">{(exams || []).length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">সক্রিয় পরীক্ষা</p>
              <p className="text-2xl font-bold text-gray-900">
                {(exams || []).filter(exam => exam?.status === 'সক্রিয়').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">সম্পন্ন পরীক্ষা</p>
              <p className="text-2xl font-bold text-gray-900">
                {(exams || []).filter(exam => exam?.status === 'সম্পন্ন').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">প্রকাশিত ফলাফল</p>
              <p className="text-2xl font-bold text-gray-900">
                {(exams || []).filter(exam => exam?.resultsPublished).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Award className="w-4 h-4 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Exams Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">পরীক্ষাসমূহ</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="পরীক্ষা খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  পরীক্ষার নাম
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  শুরুর তারিখ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  শেষের তারিখ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  স্ট্যাটাস
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ফলাফল প্রকাশ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ক্রিয়াকলাপ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো পরীক্ষা পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">পরীক্ষা পরিচালনা করুন</p>
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => (
                  <tr key={exam?.id || Math.random()} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{exam?.name || '-'}</div>
                      <div className="text-xs text-gray-500">{exam?.class || '-'} - {exam?.subject || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(exam?.startDate || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(exam?.endDate || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        exam?.status === 'সম্পন্ন' ? 'bg-green-100 text-green-800' :
                        exam?.status === 'সক্রিয়' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {exam?.status || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {exam?.id && (
                        <>
                          <button
                            onClick={() => toggleResultPublication(exam.id!, exam?.resultsPublished || false)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              exam?.resultsPublished ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                            title={exam?.resultsPublished ? 'ফলাফল প্রকাশিত' : 'ফলাফল গোপন'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                exam?.resultsPublished ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          {exam?.resultsPublished && (
                            <div className="text-xs text-green-600 mt-1 flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              প্রকাশিত
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {exam?.id && (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => exam.id && router.push(`/admin/exams/results?examId=${exam.id}`)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="ফলাফল দেখুন"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingExam(exam)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="সম্পাদনা করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => exam.id && handleDeleteExam(exam.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Alert Dialog */}
      {showSuccessAlert && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          onClick={() => setShowSuccessAlert(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-modal-enter"
            style={{
              animation: 'modalEnter 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    সফল!
                  </h3>
                  <p className="text-sm text-gray-600">
                    {successMessage}
                  </p>
                </div>
                <button
                  onClick={() => setShowSuccessAlert(false)}
                  className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSuccessAlert(false)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert Dialog */}
      {showErrorAlert && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          onClick={() => setShowErrorAlert(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-modal-enter"
            style={{
              animation: 'modalEnter 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    ত্রুটি
                  </h3>
                  <p className="text-sm text-gray-600">
                    {errorMessage}
                  </p>
                </div>
                <button
                  onClick={() => setShowErrorAlert(false)}
                  className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowErrorAlert(false)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ExamsPageWrapper() {
  return (
    <AdminLayout title="পরীক্ষা পরিচালনা" subtitle="নতুন পরীক্ষা তৈরি করুন, সম্পাদনা করুন এবং পরীক্ষা ব্যবস্থাপনা করুন।">
      <ExamsPage />
    </AdminLayout>
  );
}
