'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { User, onAuthStateChanged } from 'firebase/auth';
import AdminLayout from '@/components/AdminLayout';
import Modal from '@/components/ui/modal';
import { accountingQueries, Exam, Class } from '@/lib/database-queries';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';
import { useGlobalAlert } from '@/contexts/AlertContext';
import { ClassData } from '@/types';
import {
  ArrowLeft, Save, Edit, DollarSign,
  BookOpen, Loader2, CheckCircle, Calculator, Trash2
} from 'lucide-react';

function ExamManagementPage() {
  const { showSuccess, showError, showWarning, showConfirm } = useGlobalAlert();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [actualExams, setActualExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [examFees, setExamFees] = useState<{[examType: string]: { [className: string]: number }}>({});


  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [tempFees, setTempFees] = useState<{[examKey: string]: number}>({});
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // New exam creation states
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamType, setNewExamType] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const router = useRouter();
  const schoolId = SCHOOL_ID; // Match the actual school ID from your classes
  const schoolName = SCHOOL_NAME;

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadClasses();
      loadActualExams();
      loadExamFees();

      // Set up real-time listener for exam changes
      let unsubscribe: (() => void) | undefined;

      setupExamListener().then((unsub) => {
        unsubscribe = unsub;
      });

      // Cleanup function to unsubscribe from listener
      return () => {
        if (unsubscribe) {
          unsubscribe();
          console.log('🔌 Unsubscribed from exam listener');
        }
      };
    }
  }, [user]);

  // Set up real-time listener for exam changes
  const setupExamListener = async () => {
    try {
      const { examQueries } = await import('@/lib/database-queries');

      // Subscribe to exam changes for the school
      const unsubscribe = examQueries.subscribeToExams(
        schoolId,
        (updatedExams) => {
          console.log('🔄 Exams updated in real-time:', updatedExams.length);
          // Filter out deleted exams
          const activeExams = updatedExams.filter((exam) => {
            const isDeleted = (exam as any).deleted === true || (exam as any).deleted === 'true';
            return !isDeleted;
          });
          console.log('🔄 Active exams after filtering:', activeExams.length);
          setActualExams(activeExams);
        },
        (error) => {
          console.error('❌ Error listening to exam updates:', error);
        }
      );

      // Store unsubscribe function to clean up on unmount
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up exam listener:', error);
    }
  };

  // Auto-close success modal after 3 seconds
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // Get available classes from database (memoized to prevent infinite loops)
  const availableClasses = useMemo(
    () => classes.map(cls => cls.className).filter(Boolean),
    [classes]
  );

  // Helper function to get appropriate label for exam type
  const getExamTypeLabel = (standardKey: string, exam: any) => {
    // Try to find a representative exam name for this type
    if (exam && exam.name) {
      return exam.name;
    }

    // Fallback to standard labels
    const labelMap: {[key: string]: string} = {
      'monthly': 'মাসিক পরীক্ষা',
      'quarterly': 'ত্রৈমাসিক পরীক্ষা',
      'halfYearly': 'অর্ধবার্ষিক পরীক্ষা',
      'annual': 'বার্ষিক পরীক্ষা'
    };

    return labelMap[standardKey] || 'অন্যান্য পরীক্ষা';
  };

  // Load actual exam types from exam management system
  const examTypes = useMemo(() => {
    console.log('📋 Creating exam cards from actual exams:', actualExams.length);

    if (actualExams.length > 0) {
      // Create a card for each individual exam
      const examCards = actualExams.map((exam) => ({
        key: exam.id!,
        label: exam.name || exam.examType || 'পরীক্ষা',
        exams: [exam],
        examId: exam.id!
      }));

      console.log('📋 Created exam cards:', examCards.map(c => ({
        key: c.key,
        label: c.label
      })));

      return examCards;
    } else {
      console.log('📋 No actual exams found, showing empty state');
      return [];
    }
  }, [actualExams]);

  // Load actual exams from exam management page
  const loadActualExams = async () => {
    setLoadingExams(true);
    try {
      const { examQueries } = await import('@/lib/database-queries');
      const allExams = await examQueries.getAllExams();
      const activeExams = allExams.filter((exam) => {
        const isDeleted = (exam as any).deleted === true || (exam as any).deleted === 'true';
        return !isDeleted;
      });
      setActualExams(activeExams);
    } catch (error) {
      setActualExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const { classQueries } = await import('@/lib/queries/class-queries');
      const allClasses = await classQueries.getAllClasses(false);
      const classesData = allClasses.filter(cls => cls.schoolId === schoolId);
      setClasses(classesData);
    } catch (error) {
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  // Authentication check
  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth is not initialized');
      router.push('/auth/login');
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Load exam fees from Firebase - now loads exam-specific fees by exam ID
  const loadExamFees = async () => {
    try {
      // Load exam-specific fees from /examSpecificFees/{schoolId}
      const examFeesRef = doc(db, 'examSpecificFees', schoolId);
      const examFeesSnap = await getDoc(examFeesRef);

      if (examFeesSnap.exists()) {
        const examSpecificData = examFeesSnap.data();
        const examSpecificFees = examSpecificData.fees || {};
        
        console.log('✅ Loaded exam-specific fees:', examSpecificFees);
        setExamFees(examSpecificFees);
      } else {
        console.log('📋 No exam-specific fees found');
        setExamFees({});
      }
    } catch (error) {
      console.error('❌ Error loading exam fees:', error);
      setExamFees({});
    }
  };

  // Start editing fees for an exam type
  const startEditingFees = (examType: string, examId: string) => {
    const currentFees = getExamFeesForDisplay(examType);
    setTempFees({ ...currentFees });
    setEditingType(examType);
    setEditingExamId(examId);
  };

  // Start editing fees for a class

  // Cancel editing
  const cancelEditing = () => {
    setEditingType(null);
    setEditingExamId(null);
    setTempFees({});
  };

  // Set up comprehensive fee structure for all classes
  const setupComprehensiveFees = async () => {
    try {
      console.log('🚀 Setting up comprehensive fee structure for all classes...');

      // Get current exam fees
      const currentExamFees = await accountingQueries.getExamFees(schoolId);

      // Define comprehensive fee structure for all classes
      const comprehensiveFees = {
        'First Term Examination Fee': {
          'প্লে': 180,
          'নার্সারি': 200,
          'প্রথম': 250,
          'দ্বিতীয়': 300,
          'তৃতীয়': 350,
          'চতুর্থ': 400,
          'পঞ্চম': 450,
          'ষষ্ঠ': 500,
          'সপ্তম': 550,
          'অষ্টম': 600,
          'নবম': 650,
          'দশম': 700,
          'একাদশ': 750,
          'দ্বাদশ': 800
        },
        'Second Term Examination Fee': {
          'প্লে': 180,
          'নার্সারি': 200,
          'প্রথম': 250,
          'দ্বিতীয়': 300,
          'তৃতীয়': 350,
          'চতুর্থ': 400,
          'পঞ্চম': 450,
          'ষষ্ঠ': 500,
          'সপ্তম': 550,
          'অষ্টম': 600,
          'নবম': 650,
          'দশম': 700,
          'একাদশ': 750,
          'দ্বাদশ': 800
        },
        'Annual Examination Fee': {
          'প্লে': 300,
          'নার্সারি': 350,
          'প্রথম': 400,
          'দ্বিতীয়': 450,
          'তৃতীয়': 500,
          'চতুর্থ': 550,
          'পঞ্চম': 600,
          'ষষ্ঠ': 650,
          'সপ্তম': 700,
          'অষ্টম': 750,
          'নবম': 800,
          'দশম': 850,
          'একাদশ': 900,
          'দ্বাদশ': 950
        },
        'Monthly Examination Fee': {
          'প্লে': 100,
          'নার্সারি': 120,
          'প্রথম': 150,
          'দ্বিতীয়': 180,
          'তৃতীয়': 200,
          'চতুর্থ': 220,
          'পঞ্চম': 250,
          'ষষ্ঠ': 280,
          'সপ্তম': 300,
          'অষ্টম': 320,
          'নবম': 350,
          'দশম': 380,
          'একাদশ': 400,
          'দ্বাদশ': 420
        }
      };

      console.log('📋 Comprehensive fee structure to save:', comprehensiveFees);

      // Save comprehensive fees to Firebase
      await accountingQueries.saveExamFees(schoolId, comprehensiveFees, user?.email || 'admin');
      console.log('✅ Comprehensive fees saved to Firebase successfully');

      // Update local state immediately for instant UI feedback
      setExamFees(comprehensiveFees);
      console.log('✅ Local state updated immediately');

      // Also reload from database to ensure consistency
      await loadExamFees();
      console.log('✅ Reloaded fees from database');

      console.log('🎉 Comprehensive fee structure saved and UI updated successfully!');
      setShowSuccessModal(true);

      // Show the saved fees in console for verification
      console.log('📋 Complete comprehensive fee structure saved:', comprehensiveFees);
    } catch (error) {
      console.error('❌ Error setting up comprehensive fees:', error);
      showError('সম্পূর্ণ ফি স্ট্রাকচার সেটআপ করতে ত্রুটি হয়েছে।');
    }
  };

  // Save fees for an exam type
  const saveFees = async (examType: string) => {
    setSaving(true);
    try {
      console.log('💾 Saving fees for exam type:', examType);
      console.log('📝 Editing exam ID:', editingExamId);
      console.log('📝 Temp fees to save:', tempFees);

      // Filter out zero values before saving
      const feesToSave = Object.fromEntries(
        Object.entries(tempFees).filter(([_, fee]) => fee && fee > 0)
      );

      // Use the existing exam ID that we're editing
      const examId = editingExamId || examType;

      // 1. Update exam record in /exams collection with fees
      const examRef = doc(db, 'exams', examId);
      const examSnap = await getDoc(examRef);

      if (examSnap.exists()) {
        // Update existing exam with new fees
        await setDoc(examRef, {
          fees: feesToSave,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'admin'
        }, { merge: true });
        console.log('✅ Exam fees updated in /exams:', examId);
      } else {
        console.error('❌ Exam not found:', examId);
        showError('পরীক্ষা খুঁজে পাওয়া যায়নি।');
        return;
      }

      // 2. Save exam-specific fees to /examSpecificFees
      const examFeesRef = doc(db, 'examSpecificFees', schoolId);
      await setDoc(examFeesRef, {
        fees: {
          [examId]: feesToSave
        },
        lastUpdated: new Date().toISOString(),
        updatedBy: user?.email || 'admin'
      }, { merge: true });
      console.log('✅ Exam fees saved to /examSpecificFees:', examId);

      // Update local state
      setExamFees(prev => ({
        ...prev,
        [examId]: feesToSave
      }));
      await loadExamFees();
      await loadActualExams();

      setEditingType(null);
      setEditingExamId(null);
      setTempFees({});

      console.log('🎉 Exam fees updated successfully!');
      showSuccess('পরীক্ষার ফি সফলভাবে আপডেট করা হয়েছে!');
    } catch (error) {
      console.error('❌ Error saving fees:', error);
      showError('ফি সংরক্ষণ করতে ত্রুটি হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // Save fees for a class

  // Get exam fees for display - now works with exam IDs
  const getExamFeesForDisplay = (examKey: string) => {
    // First try to get fees from examFeesData (exam-specific fees by exam ID)
    const examSpecificFeesRef = doc(db, 'examSpecificFees', schoolId);

    // For now, return from examFees state which should have exam ID as key
    return examFees[examKey] || {};
  };



  // Delete exam
  const deleteExam = async (examId: string, examName: string) => {
    showConfirm(
      `আপনি কি "${examName}" পরীক্ষাটি মুছে ফেলতে চান?`,
      async () => {
        setSaving(true);
    try {
      // 1. Delete exam record
      const examRef = doc(db, 'exams', examId);
      await setDoc(examRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
      console.log('✅ Exam marked as deleted:', examId);

      // 2. Remove fees
      const examFeesRef = doc(db, 'examSpecificFees', schoolId);
      const examFeesSnap = await getDoc(examFeesRef);
      
      if (examFeesSnap.exists()) {
        const currentFees = examFeesSnap.data().fees || {};
        delete currentFees[examId];
        
        await setDoc(examFeesRef, {
          fees: currentFees,
          lastUpdated: new Date().toISOString()
        });
        console.log('✅ Exam fees removed:', examId);
      }

      // 3. Reload data
      await loadActualExams();
      await loadExamFees();

      showSuccess('পরীক্ষা সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (error) {
      console.error('❌ Error deleting exam:', error);
      showError('পরীক্ষা মুছে ফেলতে ত্রুটি হয়েছে।');
    } finally {
      setSaving(false);
    }
      }
    );
  };

  // Create new exam with fees
  const createNewExam = async () => {
    if (!newExamName.trim() || !newExamType.trim()) {
      showWarning('অনুগ্রহ করে পরীক্ষার নাম এবং ধরন প্রদান করুন।');
      return;
    }


    setSaving(true);
    try {
      // Create exam ID
      const examId = `${schoolId}-${newExamType}-${Date.now()}`;
      
      // 1. Create exam record
      const examData = {
        id: examId,
        name: newExamName,
        examType: newExamType,
        schoolId: schoolId,
        schoolName: schoolName,
        academicYear: '2025',
        status: 'সক্রিয়', // Set status to active by default
        startDate: newStartDate || new Date().toISOString().split('T')[0],
        endDate: newEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email || 'admin'
      };

      const examRef = doc(db, 'exams', examId);
      await setDoc(examRef, examData);
      console.log('✅ New exam created:', examId);

      // 3. Reload data
      await loadActualExams();
      await loadExamFees();

      // 4. Reset form and close modal
      setNewExamName('');
      setNewExamType('');
      setNewStartDate('');
      setNewEndDate('');
      setShowAddExamModal(false);
      setShowSuccessModal(true);

      console.log('🎉 New exam created successfully!');
    } catch (error) {
      console.error('❌ Error creating exam:', error);
      showError('পরীক্ষা তৈরি করতে ত্রুটি হয়েছে।');
    } finally {
      setSaving(false);
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
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/admin/exams')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>পরীক্ষায় ফিরে যান</span>
          </button>
        </div>
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">পরীক্ষার ম্যানেজমেন্ট</h1>
            <p className="text-gray-600 mt-1">পরীক্ষা পরিকল্পনা ও ব্যবস্থাপনা পরিচালনা করুন</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddExamModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>নতুন পরীক্ষা যোগ করুন</span>
            </button>
            <button
              onClick={setupComprehensiveFees}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Calculator className="w-4 h-4" />
              <span>সম্পূর্ণ ফি স্ট্রাকচার সেটআপ করুন</span>
            </button>
          </div>
        </div>
      </div>


      {/* Loading State for Classes */}
      {loadingClasses && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-gray-600">ক্লাস লোড হচ্ছে...</p>
        </div>
      )}

      {/* Settings Display when no classes exist */}
      {!loadingClasses && availableClasses.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">সেটিংস</h3>
            <p className="text-gray-600">স্কুলের তথ্য এবং কনফিগারেশন</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">স্কুল কোড</span>
                <span className="text-sm font-bold text-blue-600">{schoolId}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">স্কুলের নাম</span>
                <span className="text-sm font-bold text-blue-600">আমার স্কুল</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">ক্লাস তৈরি করার পর এখানে ফি ম্যানেজমেন্ট করতে পারবেন।</p>
            <button
              onClick={() => router.push('/admin/classes')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              ক্লাস তৈরি করুন
            </button>
          </div>
        </div>
      )}

      {/* Add Exam Modal */}
      <Modal
        isOpen={showAddExamModal}
        onClose={() => {
          setShowAddExamModal(false);
          setNewExamName('');
          setNewExamType('');
          setNewStartDate('');
          setNewEndDate('');
        }}
        size="lg"
        title="নতুন পরীক্ষা যোগ করুন"
        closeOnOverlayClick={false}
      >
        <div className="space-y-6">
          {/* Exam Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              পরীক্ষার নাম *
            </label>
            <input
              type="text"
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
              placeholder="যেমন: প্রথম সাময়িক পরীক্ষা ২০২৫"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Exam Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              পরীক্ষার ধরন *
            </label>
            <input
              type="text"
              value={newExamType}
              onChange={(e) => setNewExamType(e.target.value)}
              placeholder="যেমন: firstTerm, secondTerm, monthly"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ইংরেজিতে লিখুন (firstTerm, secondTerm, thirdTerm, annual, monthly, quarterly, halfYearly)
            </p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              শুরুর তারিখ *
            </label>
            <input
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              শেষের তারিখ *
            </label>
            <input
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setShowAddExamModal(false);
                setNewExamName('');
                setNewExamType('');
                setNewStartDate('');
                setNewEndDate('');
              }}
              disabled={saving}
              className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              বাতিল করুন
            </button>
            <button
              onClick={createNewExam}
              disabled={saving || !newExamName.trim() || !newExamType.trim() || !newStartDate || !newEndDate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>পরীক্ষা তৈরি করুন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        size="sm"
        title="সফল!"
        closeOnOverlayClick={true}
        className="text-center"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">সফলভাবে সংরক্ষণ করা হয়েছে!</h3>
            <p className="text-gray-600">পরীক্ষা এবং ফি সফলভাবে তৈরি করা হয়েছে।</p>
          </div>
          <button
            onClick={() => setShowSuccessModal(false)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            ঠিক আছে
          </button>
        </div>
      </Modal>

      {/* Exam Cards Display */}
      {!loadingExams && examTypes.length > 0 && (
        <div className="space-y-6">
          {examTypes.map((examType) => (
            <div key={examType.key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{examType.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">পরীক্ষার ফি পরিচালনা করুন</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => startEditingFees(examType.key, examType.examId)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>ফি সম্পাদনা করুন</span>
                    </button>
                    <button
                      onClick={() => deleteExam(examType.examId, examType.label)}
                      className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>মুছে ফেলুন</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Fee Display */}
              <div className="p-6">
                {editingType === examType.key ? (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">ফি সম্পাদনা করুন</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableClasses.map((className) => (
                        <div key={className} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {className} ক্লাস
                          </label>
                          <input
                            type="number"
                            value={tempFees[className] || ''}
                            onChange={(e) => setTempFees(prev => ({
                              ...prev,
                              [className]: parseInt(e.target.value) || 0
                            }))}
                            placeholder="ফি প্রদান করুন"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      >
                        বাতিল করুন
                      </button>
                      <button
                        onClick={() => saveFees(examType.key)}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>সংরক্ষণ হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>সংরক্ষণ করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">বর্তমান ফি</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableClasses.map((className) => {
                        const fee = getExamFeesForDisplay(examType.key)[className] || 0;
                        return (
                          <div key={className} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">{className} ক্লাস</span>
                              <span className="text-sm font-bold text-blue-600">৳{fee}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State for Exams */}
      {loadingExams && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-gray-600">পরীক্ষা লোড হচ্ছে...</p>
        </div>
      )}

      {/* Empty State */}
      {!loadingExams && examTypes.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">কোনো পরীক্ষা পাওয়া যায়নি</h3>
          <p className="text-gray-600 mb-4">নতুন পরীক্ষা যোগ করে ফি ম্যানেজমেন্ট শুরু করুন।</p>
          <button
            onClick={() => setShowAddExamModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            পরীক্ষা যোগ করুন
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExamManagementPageWrapper() {
  return (
    <AdminLayout title="পরীক্ষার ম্যানেজমেন্ট" subtitle="পরীক্ষা পরিকল্পনা ও ব্যবস্থাপনা পরিচালনা করুন।">
      <ExamManagementPage />
    </AdminLayout>
  );
}
