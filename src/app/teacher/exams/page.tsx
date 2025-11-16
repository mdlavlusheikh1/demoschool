'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import TeacherLayout from '@/components/TeacherLayout';
import { examQueries } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
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

      {/* Quick Actions Dashboard - Only Results */}
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
    <TeacherLayout title="পরীক্ষা পরিচালনা" subtitle="নতুন পরীক্ষা তৈরি করুন, সম্পাদনা করুন এবং পরীক্ষা ব্যবস্থাপনা করুন।">
      <ExamsPage />
    </TeacherLayout>
  );
}
