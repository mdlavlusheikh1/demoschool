'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TeacherLayout from '@/components/TeacherLayout';
import {
  subjectQueries,
  Subject,
  classQueries,
  examQueries,
  examSubjectQueries,
  Class as ClassType,
  Exam,
  ExamSubject
} from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { useAlert } from '@/hooks/useAlert';
import AlertDialog from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Plus, Save, Trash2, CheckSquare, Square, BookOpen, 
  GraduationCap, Calendar, Loader2, Search, X, AlertCircle
} from 'lucide-react';

interface ExamWithId extends Exam {
  id: string;
}

interface CreateSubjectForm {
  name: string;
  nameEn: string;
  code: string;
  teacherName: string;
  selectedClass: string;
  type: 'মূল' | 'ধর্মীয়' | 'ঐচ্ছিক';
  description: string;
  credits: number;
}

function ExamSubjectsPage() {
  const router = useRouter();
  const schoolId = SCHOOL_ID;
  const { showSuccess, showError } = useAlert();

  // Core data state
  const [exams, setExams] = useState<ExamWithId[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);
  
  // Selection state
  const [selectedExam, setSelectedExam] = useState<ExamWithId | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hasSavedSubjects, setHasSavedSubjects] = useState(false);
  
  // Create subject form
  const [newSubject, setNewSubject] = useState<CreateSubjectForm>({
    name: '',
    nameEn: '',
    code: '',
    teacherName: '',
    selectedClass: '',
    type: 'মূল',
    description: '',
    credits: 4
  });

  // Alert dialog state
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as const,
    onConfirm: () => {}
  });

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [examsData, classesData, subjectsData] = await Promise.all([
        examQueries.getAllExams(schoolId),
        classQueries.getClassesBySchool(schoolId),
        subjectQueries.getActiveSubjects(schoolId)
      ]);

      setExams(examsData?.map((exam, index) => ({
        ...exam,
        id: exam.id || `exam-${index}`
      })) || []);
      
      setClasses(classesData || []);
      setSubjects(subjectsData || []);

      if (!classesData?.length) {
        showError('কোনো ক্লাস পাওয়া যায়নি। প্রথমে ক্লাস তৈরি করুন।');
      }
      if (!subjectsData?.length) {
        showError('কোনো বিষয় পাওয়া যায়নি। প্রথমে বিষয় তৈরি করুন।');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showError('ডেটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }, [schoolId, showError]);

  // Load subjects for selected class
  const loadClassSubjects = useCallback(async (classInfo: ClassType, exam?: ExamWithId | null) => {
    try {
      const filteredSubjects = subjects.filter(subject =>
        subject.classes?.some(cls =>
          cls.includes(classInfo.className) ||
          classInfo.className.includes(cls)
        )
      );
      setClassSubjects(filteredSubjects);

      // If exam is selected, check for saved subjects and load them automatically
      if (exam) {
        console.log('🎯 Exam selected:', exam.name, 'ID:', exam.id);
        console.log('📚 Available subjects for class:', filteredSubjects.length);

        // Check if there are saved subjects and load them automatically
        const examSubjects = await examSubjectQueries.getExamSubjects(exam.id || '');
        setHasSavedSubjects(examSubjects.length > 0);
        console.log('🔍 Saved subjects available:', examSubjects.length > 0);

        if (examSubjects.length > 0) {
          // Filter saved subjects to only include those that match the current class
          const classMatchingSavedSubjects = examSubjects.filter(savedSubject => {
            // Check if the saved subject matches any subject in the current class
            return filteredSubjects.some(classSubject =>
              classSubject.id === savedSubject.subjectId
            );
          });

          if (classMatchingSavedSubjects.length > 0) {
            // Auto-load only the saved subjects that match the current class
            const selectedIds = new Set(
              classMatchingSavedSubjects
                .map(es => es.subjectId)
                .filter(id => id !== undefined)
            );
            setSelectedSubjects(selectedIds);
            console.log(`✅ Auto-loaded ${selectedIds.size} saved subjects for exam: ${exam.name} and class: ${classInfo.className}`);

            // Show success notification for auto-loading
            showSuccess(`${selectedIds.size}টি সংরক্ষিত বিষয় স্বয়ংক্রিয়ভাবে লোড করা হয়েছে।`);
          } else {
            // No saved subjects match the current class, start with empty selection
            setSelectedSubjects(new Set());
            console.log(`ℹ️ No saved subjects found for exam: ${exam.name} and class: ${classInfo.className}. Manual selection required.`);
          }
        } else {
          // No saved subjects, start with empty selection
          setSelectedSubjects(new Set());
          console.log(`ℹ️ No saved subjects found for exam: ${exam.name}. Manual selection required.`);
        }
      } else {
        console.log('❌ No exam selected, clearing subjects');
        setSelectedSubjects(new Set());
        setHasSavedSubjects(false);
      }
    } catch (error) {
      console.error('Error loading class subjects:', error);
      showError('ক্লাসের বিষয়সমূহ লোড করতে ব্যর্থ হয়েছে');
    }
  }, [subjects, showError, showSuccess]);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Event handlers
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const classSelected = classes.find(c => c.id === classId || c.classId === classId);
    setSelectedClass(classSelected || null);
    
    if (classSelected) {
      loadClassSubjects(classSelected, selectedExam);
    } else {
      setClassSubjects([]);
      setSelectedSubjects(new Set());
    }
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const examId = e.target.value;
    const exam = exams.find(e => e.id === examId);
    setSelectedExam(exam || null);
  };

  // Handle exam change effect
  useEffect(() => {
    console.log('🔄 useEffect triggered - selectedExam:', selectedExam?.name, 'selectedClass:', selectedClass?.className);
    if (selectedExam && selectedClass) {
      console.log('🔄 Loading subjects for exam:', selectedExam.name, 'and class:', selectedClass.className);
      loadClassSubjects(selectedClass, selectedExam);
    } else if (!selectedExam) {
      console.log('❌ No exam selected, clearing subjects');
      setSelectedSubjects(new Set());
    }
  }, [selectedExam, selectedClass, loadClassSubjects]);

  // Subject selection handlers
  const toggleSubjectSelection = (subjectId: string) => {
    const newSelection = new Set(selectedSubjects);
    if (newSelection.has(subjectId)) {
      newSelection.delete(subjectId);
    } else {
      newSelection.add(subjectId);
    }
    setSelectedSubjects(newSelection);
  };

  const selectAllSubjects = () => {
    const allIds = classSubjects.map(s => s.id!).filter(Boolean);
    setSelectedSubjects(new Set(allIds));
  };

  const deselectAllSubjects = () => {
    setSelectedSubjects(new Set());
  };

  // Load saved subjects from Firebase
  const loadSavedSubjects = async () => {
    if (!selectedExam || !selectedClass) {
      showError('প্রথমে একটি পরীক্ষা এবং ক্লাস নির্বাচন করুন।');
      return;
    }

    try {
      setSaving(true);
      console.log('📥 Loading saved subjects for:', selectedExam.name, 'and class:', selectedClass.className);

      const existingExamSubjects = await examSubjectQueries.getExamSubjects(selectedExam.id || '');
      console.log('🔍 Found saved subjects:', existingExamSubjects.length);

      if (existingExamSubjects.length > 0) {
        // Filter saved subjects to only include those that match the current class
        const classMatchingSavedSubjects = existingExamSubjects.filter(savedSubject => {
          // Check if the saved subject matches any subject in the current class
          return classSubjects.some(classSubject =>
            classSubject.id === savedSubject.subjectId
          );
        });

        if (classMatchingSavedSubjects.length > 0) {
          const selectedIds = new Set(
            classMatchingSavedSubjects
              .map(es => es.subjectId)
              .filter(id => id !== undefined)
          );
          setSelectedSubjects(selectedIds);
          setHasSavedSubjects(true);
          console.log('✅ Loaded saved subjects for current class:', selectedIds.size);
          showSuccess(`${selectedIds.size}টি সংরক্ষিত বিষয় লোড করা হয়েছে।`);
        } else {
          setSelectedSubjects(new Set());
          setHasSavedSubjects(false);
          console.log('ℹ️ No saved subjects found for current class');
          showSuccess('এই ক্লাসের জন্য কোনো সংরক্ষিত বিষয় পাওয়া যায়নি।');
        }
      } else {
        setHasSavedSubjects(false);
        showSuccess('কোনো সংরক্ষিত বিষয় পাওয়া যায়নি।');
      }
    } catch (error) {
      console.error('❌ Error loading saved subjects:', error);
      showError('সংরক্ষিত বিষয় লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // Clear all existing exam subjects from Firebase
  const clearExistingExamSubjects = async () => {
    if (!selectedExam || !selectedClass) {
      showError('প্রথমে একটি পরীক্ষা এবং ক্লাস নির্বাচন করুন।');
      return;
    }

    try {
      setSaving(true);
      console.log('🗑️ Clearing existing exam subjects for:', selectedExam.name, 'and class:', selectedClass.className);

      const existingExamSubjects = await examSubjectQueries.getExamSubjects(selectedExam.id || '');
      console.log('🔍 Found existing subjects to delete:', existingExamSubjects.length);

      if (existingExamSubjects.length > 0) {
        // Filter subjects to only delete those that match the current class
        const subjectsToDelete = existingExamSubjects.filter(savedSubject => {
          return classSubjects.some(classSubject =>
            classSubject.id === savedSubject.subjectId
          );
        });

        if (subjectsToDelete.length > 0) {
          await Promise.all(
            subjectsToDelete
              .filter(es => es.id)
              .map(es => examSubjectQueries.deleteExamSubject(es.id!))
          );
          console.log(`✅ Cleared ${subjectsToDelete.length} existing exam subjects for current class`);
          showSuccess(`${subjectsToDelete.length}টি বিদ্যমান বিষয় মুছে ফেলা হয়েছে।`);
        } else {
          console.log('ℹ️ No subjects to delete for current class');
          showSuccess('এই ক্লাসের জন্য কোনো বিদ্যমান বিষয় পাওয়া যায়নি।');
        }
      } else {
        showSuccess('কোনো বিদ্যমান বিষয় পাওয়া যায়নি।');
      }

      // Clear current selection
      setSelectedSubjects(new Set());
      setHasSavedSubjects(false);
    } catch (error) {
      console.error('❌ Error clearing exam subjects:', error);
      showError('বিদ্যমান বিষয় মুছতে ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // Save exam subjects
  const saveExamSubjects = async () => {
    console.log('💾 Save button clicked');
    console.log('📋 Selected exam:', selectedExam);
    console.log('🏫 Selected class:', selectedClass);
    console.log('📚 Selected subjects count:', selectedSubjects.size);
    console.log('📚 Selected subjects:', Array.from(selectedSubjects));

    if (!selectedExam || !selectedClass) {
      showError('অনুগ্রহ করে একটি পরীক্ষা এবং ক্লাস নির্বাচন করুন।');
      return;
    }

    if (selectedSubjects.size === 0) {
      showError('অন্তত একটি বিষয় নির্বাচন করুন।');
      return;
    }

    try {
      setSaving(true);
      console.log('🔄 Starting save process...');

      // Get selected subject details and validate they exist in current class
      const selectedSubjectDetails = classSubjects
        .filter(s => selectedSubjects.has(s.id!) && s.id)
        .map(s => ({
          subjectId: s.id!,
          subjectName: s.name,
          subjectCode: s.code,
          totalMarks: s.totalMarks || 100, // Use subject's totalMarks if available
          passMarks: 33
        }));

      // Ensure all selected subjects are valid for the current class
      if (selectedSubjectDetails.length !== selectedSubjects.size) {
        console.warn('⚠️ Some selected subjects are not available for the current class');
        showError('কিছু নির্বাচিত বিষয় এই ক্লাসের জন্য উপলব্ধ নেই। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।');
        return;
      }

      // Delete existing exam subjects for this exam
      const existingExamSubjects = await examSubjectQueries.getExamSubjects(selectedExam.id || '');
      const subjectsToDelete = existingExamSubjects.filter(es =>
        selectedSubjectDetails.some(s => s.subjectId === es.subjectId)
      );

      if (subjectsToDelete.length > 0) {
        await Promise.all(
          subjectsToDelete
            .filter(es => es.id)
            .map(es => examSubjectQueries.deleteExamSubject(es.id!))
        );
      }

      // Save new exam subjects
      const savePromises = selectedSubjectDetails.map(subject => {
        const examSubjectData = {
          examId: selectedExam.id,
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          totalMarks: subject.totalMarks,
          passingMarks: subject.passMarks,
          examDate: selectedExam.startDate || new Date().toISOString().split('T')[0],
          examTime: '10:00 AM',
          duration: '2 hours',
          venue: 'Main Hall',
          schoolId,
          createdBy: 'admin',
          // Add class information for mark entry page compatibility
          className: selectedClass.className,
          class: selectedClass.className,
          classId: selectedClass.id || selectedClass.classId
        };
        return examSubjectQueries.createExamSubject(examSubjectData);
      });

      await Promise.all(savePromises);
      console.log('✅ Successfully saved all subjects to Firebase');
      console.log('📋 Saved subjects summary:', selectedSubjectDetails.map(s => `${s.subjectName} (${s.subjectCode})`));
      showSuccess(`${selectedSubjectDetails.length}টি বিষয় সফলভাবে সংরক্ষণ করা হয়েছে।`);

      // Update the hasSavedSubjects state
      setHasSavedSubjects(true);

    } catch (error) {
      console.error('❌ Error saving exam subjects:', error);
      showError('পরীক্ষার বিষয় সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // Create new subject
  const handleCreateSubject = async () => {
    if (!newSubject.name || !newSubject.code) {
      showError('অনুগ্রহ করে বিষয়ের নাম এবং কোড পূরণ করুন।');
      return;
    }

    try {
      setSaving(true);

      const subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'> = {
        name: newSubject.name,
        nameEn: newSubject.nameEn,
        code: newSubject.code,
        teacherName: newSubject.teacherName || 'নির্ধারিত নয়',
        classes: newSubject.selectedClass ? [newSubject.selectedClass] : [],
        students: 0,
        credits: newSubject.credits,
        type: newSubject.type,
        description: newSubject.description,
        schoolId,
        createdBy: 'admin',
        isActive: true
      };

      await subjectQueries.createSubject(subjectData);
      showSuccess(`"${newSubject.name}" বিষয় সফলভাবে তৈরি করা হয়েছে।`);

      // Reset form and reload data
      setShowCreateModal(false);
      setNewSubject({
        name: '',
        nameEn: '',
        code: '',
        teacherName: '',
        selectedClass: '',
        type: 'মূল',
        description: '',
        credits: 4
      });
      loadInitialData();
    } catch (error) {
      console.error('Error creating subject:', error);
      showError('বিষয় তৈরিতে ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // Filter subjects based on search
  const filteredSubjects = classSubjects.filter(subject => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      subject.name.toLowerCase().includes(query) ||
      subject.code.toLowerCase().includes(query) ||
      subject.classes?.some(cls => cls.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">ডেটা লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/exams')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>পিছনে যান</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">পরীক্ষার বিষয়সমূহ</h1>
              <p className="text-gray-600 mt-1">পরীক্ষা এবং ক্লাস নির্বাচন করে বিষয় নির্ধারণ করুন</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বিষয়</span>
          </button>
        </div>
      </div>

      {/* Selection Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          পরীক্ষা এবং ক্লাস নির্বাচন করুন
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ক্লাস নির্বাচন করুন *
            </label>
            <select
              value={selectedClass?.id || ''}
              onChange={handleClassChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">
                {classes.length === 0 ? 'কোনো ক্লাস পাওয়া যায়নি' : '-- একটি ক্লাস নির্বাচন করুন --'}
              </option>
              {classes.map((cls, index) => (
                <option key={`class-${cls.id || cls.classId || index}`} value={cls.id || cls.classId}>
                  {cls.className} {cls.section ? `- ${cls.section}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              পরীক্ষা নির্বাচন করুন *
            </label>
            <select
              value={selectedExam?.id || ''}
              onChange={handleExamChange}
              disabled={!selectedClass}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedClass 
                  ? 'প্রথমে ক্লাস নির্বাচন করুন' 
                  : exams.length === 0 
                    ? 'কোনো পরীক্ষা পাওয়া যায়নি' 
                    : '-- একটি পরীক্ষা নির্বাচন করুন --'}
              </option>
              {exams.map((exam, index) => (
                <option key={`exam-${exam.id || index}`} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClass && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                নির্বাচিত ক্লাস: {selectedClass.className} {selectedClass.section ? `- ${selectedClass.section}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Subjects Section */}
      {selectedClass && classSubjects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
              {selectedClass.className} এর বিষয়সমূহ
            </h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="বিষয় খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <button
                onClick={selectAllSubjects}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                সব নির্বাচন
              </button>
              <button
                onClick={deselectAllSubjects}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                সব বাতিল
              </button>
              {selectedExam && (
                <>
                  <button
                    onClick={loadSavedSubjects}
                    disabled={saving}
                    className="text-sm text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                  >
                    সংরক্ষিত লোড
                  </button>
                  <button
                    onClick={clearExistingExamSubjects}
                    disabled={saving}
                    className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                  >
                    বিদ্যমান মুছুন
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Instruction message */}
          {selectedExam && selectedSubjects.size === 0 && !hasSavedSubjects && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>নির্দেশনা:</strong> পরীক্ষার জন্য প্রয়োজনীয় বিষয়সমূহ নির্বাচন করুন। প্রতিটি বিষয়ের উপর ক্লিক করে নির্বাচন করুন। 
                <br />
                <strong>টিপ:</strong> নতুন করে শুরু করতে চাইলে "বিদ্যমান মুছুন" বাটন ব্যবহার করুন।
              </p>
            </div>
          )}

          {/* Saved subjects loaded indicator */}
          {selectedExam && hasSavedSubjects && selectedSubjects.size > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-green-800">
                  <strong>সংরক্ষিত বিষয় লোড করা হয়েছে!</strong> {selectedSubjects.size}টি বিষয় স্বয়ংক্রিয়ভাবে নির্বাচন করা হয়েছে।
                </p>
              </div>
            </div>
          )}

          {/* Debug info for troubleshooting */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer font-medium">🔍 ডিবাগ তথ্য (ডেভেলপমেন্ট মোড)</summary>
                <div className="mt-2 space-y-1">
                  <p>📚 মোট বিষয় (subjects): {subjects.length}</p>
                  <p>🏫 ক্লাসের বিষয় (classSubjects): {classSubjects.length}</p>
                  <p>📋 নির্বাচিত বিষয় (selectedSubjects): {selectedSubjects.size}</p>
                  <p>🎯 নির্বাচিত পরীক্ষা: {selectedExam?.name || 'কোনোটি নয়'}</p>
                  <p>🏫 নির্বাচিত ক্লাস: {selectedClass?.className || 'কোনোটি নয়'}</p>
                  <p>💾 সংরক্ষিত বিষয় আছে: {hasSavedSubjects ? 'হ্যাঁ' : 'না'}</p>
                </div>
              </details>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((subject, index) => (
              <div
                key={`subject-${subject.id || index}`}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedSubjects.has(subject.id!)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
                onClick={() => toggleSubjectSelection(subject.id!)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{subject.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{subject.code}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      শিক্ষক: {subject.teacherName} • ক্রেডিট: {subject.credits}
                    </p>
                  </div>
                  <div className="ml-3">
                    {selectedSubjects.has(subject.id!) ? (
                      <CheckSquare className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedExam && selectedSubjects.size > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveExamSubjects}
                disabled={saving}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{selectedSubjects.size}টি বিষয় সংরক্ষণ করুন</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {selectedClass && classSubjects.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedClass.className} এর কোনো বিষয় পাওয়া যায়নি
          </h3>
          <p className="text-gray-600 mb-6">নতুন বিষয় যোগ করুন অথবা অন্য ক্লাস নির্বাচন করুন</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বিষয় তৈরি করুন</span>
          </button>
        </div>
      )}


      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">নতুন বিষয় তৈরি করুন</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      বিষয়ের নাম (বাংলা) *
                    </label>
                    <input
                      type="text"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="যেমন: বাংলা"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      বিষয়ের নাম (ইংরেজি)
                    </label>
                    <input
                      type="text"
                      value={newSubject.nameEn}
                      onChange={(e) => setNewSubject({...newSubject, nameEn: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g: Bangla"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      বিষয় কোড *
                    </label>
                    <input
                      type="text"
                      value={newSubject.code}
                      onChange={(e) => setNewSubject({...newSubject, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="যেমন: BAN101"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      শিক্ষকের নাম
                    </label>
                    <input
                      type="text"
                      value={newSubject.teacherName}
                      onChange={(e) => setNewSubject({...newSubject, teacherName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="যেমন: মোহাম্মদ লাভলু শেখ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ক্লাস
                    </label>
                    <select
                      value={newSubject.selectedClass}
                      onChange={(e) => setNewSubject({...newSubject, selectedClass: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">ক্লাস নির্বাচন করুন</option>
                      {classes.map((cls, index) => (
                        <option key={`modal-class-${cls.id || cls.classId || index}`} value={cls.className}>
                          {cls.className} {cls.section ? `- ${cls.section}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      বিষয়ের ধরন
                    </label>
                    <select
                      value={newSubject.type}
                      onChange={(e) => setNewSubject({...newSubject, type: e.target.value as 'মূল' | 'ধর্মীয়' | 'ঐচ্ছিক'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="মূল">মূল বিষয়</option>
                      <option value="ধর্মীয়">ধর্মীয় বিষয়</option>
                      <option value="ঐচ্ছিক">ঐচ্ছিক বিষয়</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ক্রেডিট
                    </label>
                    <input
                      type="number"
                      value={newSubject.credits}
                      onChange={(e) => setNewSubject({...newSubject, credits: parseInt(e.target.value) || 4})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    বিবরণ
                  </label>
                  <textarea
                    value={newSubject.description}
                    onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="বিষয় সম্পর্কে অতিরিক্ত তথ্য..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleCreateSubject}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>বিষয় তৈরি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ExamSubjectsPageWrapper() {
  return (
    <TeacherLayout title="পরীক্ষার বিষয়" subtitle="পরীক্ষার বিষয়সমূহ">
      <ExamSubjectsPage />
    </TeacherLayout>
  );
}
