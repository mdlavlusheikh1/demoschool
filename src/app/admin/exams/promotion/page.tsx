'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';
import {
  examResultQueries,
  studentQueries,
  classQueries,
  examQueries,
  ExamResult,
  User,
  Class,
  Exam
} from '@/lib/database-queries';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';
import {
  ArrowLeft,
  RefreshCw,
  Calculator,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

function ExamPromotionPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  // Filter states
  const [selectedCurrentClass, setSelectedCurrentClass] = useState('');
  const [selectedTargetClass, setSelectedTargetClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [promotionThreshold, setPromotionThreshold] = useState(40);

  // UI states
  const [dataLoading, setDataLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sorting functions
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort data function
  const getSortedData = (data: any[]) => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'studentId':
          aValue = a.studentId || '';
          bValue = b.studentId || '';
          break;
        case 'studentName':
          aValue = (a.studentName || '').toLowerCase();
          bValue = (b.studentName || '').toLowerCase();
          break;
        case 'currentClass':
          aValue = (a.currentClass || '').toLowerCase();
          bValue = (b.currentClass || '').toLowerCase();
          break;
        case 'targetClass':
          aValue = (a.targetClass || '').toLowerCase();
          bValue = (b.targetClass || '').toLowerCase();
          break;
        case 'totalObtainedMarks':
          aValue = a.totalObtainedMarks || 0;
          bValue = b.totalObtainedMarks || 0;
          break;
        case 'averagePercentage':
          aValue = a.averagePercentage || 0;
          bValue = b.averagePercentage || 0;
          break;
        case 'averageGPA':
          aValue = a.averageGPA || 0;
          bValue = b.averageGPA || 0;
          break;
        case 'overallGrade':
          aValue = a.overallGrade || '';
          bValue = b.overallGrade || '';
          break;
        case 'isPass':
          aValue = a.isPass ? 1 : 0;
          bValue = b.isPass ? 1 : 0;
          break;
        case 'rank':
          aValue = a.rank || 0;
          bValue = b.rank || 0;
          break;
        default:
          // Handle subject sorting
          if (sortField.startsWith('subject_')) {
            const subjectName = sortField.replace('subject_', '');
            const aSubject = a.subjects.get(subjectName);
            const bSubject = b.subjects.get(subjectName);
            aValue = aSubject?.obtainedMarks || 0;
            bValue = bSubject?.obtainedMarks || 0;
          } else {
            aValue = a[sortField] || '';
            bValue = b[sortField] || '';
          }
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'bn')
          : bValue.localeCompare(aValue, 'bn');
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  };

  const [promotionResults, setPromotionResults] = useState<{
    promoted: any[];
    notPromoted: any[];
    summary: {
      totalStudents: number;
      promotedCount: number;
      notPromotedCount: number;
      promotionRate: string;
    };
  } | null>(null);

  const router = useRouter();
  const schoolId = SCHOOL_ID;
  const schoolName = SCHOOL_NAME;

  // Convert English numbers to Bengali numerals
  const toBengaliNumerals = (num: number): string => {
    const englishToBengali: { [key: string]: string } = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };

    return num.toString().replace(/[0-9]/g, (digit) => englishToBengali[digit]);
  };

  // Authentication check
  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth not initialized');
      router.push('/auth/login');
      setLoading(false);
      return;
    }

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

  // Load initial data
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  // Load all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadExamResults(),
        loadClasses(),
        loadExams(),
        loadStudents()
      ]);
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load exam results
  const loadExamResults = async () => {
    try {
      console.log('📊 Loading exam results for school:', schoolId);
      const results = await examResultQueries.getAllExamResults(schoolId);
      setExamResults(results || []);
    } catch (error) {
      console.error('❌ Error loading exam results:', error);
      setExamResults([]);
    }
  };

  // Load classes
  const loadClasses = async () => {
    try {
      console.log('🏫 Loading classes for school:', schoolId);
      const classesData = await classQueries.getClassesBySchool(schoolId);
      const convertedClasses = classesData.map(cls => ({
        classId: cls.classId || cls.id || '',
        className: cls.className || '',
        section: cls.section || 'A',
        schoolId: cls.schoolId || schoolId,
        schoolName: cls.schoolName || schoolName,
        teacherId: cls.teacherId,
        teacherName: cls.teacherName,
        academicYear: cls.academicYear,
        totalStudents: cls.totalStudents,
        isActive: cls.isActive,
        createdAt: cls.createdAt,
        updatedAt: cls.updatedAt
      }));
      setClasses(convertedClasses);
    } catch (error) {
      console.error('❌ Error loading classes:', error);
      setClasses([]);
    }
  };

  // Load exams
  const loadExams = async () => {
    try {
      console.log('📝 Loading exams for school:', schoolId);
      const examsData = await examQueries.getAllExams(schoolId);
      const convertedExams = examsData.map(exam => ({
        id: exam.id || '',
        name: exam.name || '',
        nameEn: exam.nameEn || '',
        class: exam.class || '',
        subject: exam.subject || '',
        date: exam.date || '',
        startDate: exam.startDate || '',
        endDate: exam.endDate || '',
        time: exam.time || '',
        duration: exam.duration || '',
        totalMarks: exam.totalMarks || 0,
        students: exam.students || 0,
        status: exam.status || 'সক্রিয়',
        schoolId: exam.schoolId,
        createdBy: exam.createdBy,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
        resultsPublished: exam.resultsPublished || false,
        resultsPublishedAt: exam.resultsPublishedAt,
        resultsPublishedBy: exam.resultsPublishedBy,
        allowResultView: exam.allowResultView || false,
        examType: exam.examType || 'মাসিক',
        passingMarks: exam.passingMarks || 0,
        instructions: exam.instructions,
        venue: exam.venue,
        invigilators: exam.invigilators,
        gradingSystem: exam.gradingSystem || 'percentage',
        gradeDistribution: exam.gradeDistribution
      }));
      setExams(convertedExams);
    } catch (error) {
      console.error('❌ Error loading exams:', error);
      setExams([]);
    }
  };

  // Load students
  const loadStudents = async () => {
    try {
      console.log('👥 Loading students for school:', schoolId);
      const studentsData = await studentQueries.getStudentsBySchool(schoolId);
      setStudents(studentsData || []);
    } catch (error) {
      console.error('❌ Error loading students:', error);
      setStudents([]);
    }
  };

  // Get filtered results
  const getFilteredResults = (): ExamResult[] => {
    let filtered = examResults;

    if (selectedCurrentClass) {
      filtered = filtered.filter(result => {
        const normalizeText = (text: string) => text.trim().normalize('NFC').toLowerCase();
        const resultClass = normalizeText(result.className || '');
        const selectedClassTrimmed = normalizeText(selectedCurrentClass);
        return resultClass === selectedClassTrimmed ||
               resultClass.includes(selectedClassTrimmed) ||
               selectedClassTrimmed.includes(resultClass);
      });
    }

    if (selectedExam) {
      filtered = filtered.filter(result => {
        const normalizeText = (text: string) => text.trim().normalize('NFC').toLowerCase();
        const resultExam = normalizeText(result.examName || '');
        const selectedExamTrimmed = normalizeText(selectedExam);
        return resultExam === selectedExamTrimmed;
      });
    }

    return filtered;
  };

  // Get filtered results
  const filteredResults = useMemo(() => {
    return getFilteredResults();
  }, [examResults, selectedCurrentClass, selectedExam]);

  // Get all unique subjects
  const allSubjects = useMemo(() => {
    if (!selectedExam || !selectedCurrentClass) return [];
    return [...new Set(filteredResults.map(r => r.subject))].sort();
  }, [filteredResults, selectedExam, selectedCurrentClass]);

  // Create promotion data
  const promotionData = useMemo(() => {
    if (!selectedExam || !selectedCurrentClass || !selectedTargetClass) {
      return [];
    }

    console.log('🔍=== PROMOTION DATA DEBUG ===');
    console.log('📋 Selected exam:', selectedExam);
    console.log('🏫 Selected current class:', selectedCurrentClass);
    console.log('🎯 Selected target class:', selectedTargetClass);
    console.log('📊 Filtered results:', filteredResults.length);
    console.log('👥 Total students:', students.length);

    // Group results by student
    const studentGroups = new Map();

    // Get unique student IDs from the filtered exam results
    const resultStudentIds = new Set(filteredResults.map(result => result.studentId));

    // Add only students who are in the exam results AND match the selected current class
    const validStudents = students.filter(student => {
      // Must have exam results
      const hasResults = resultStudentIds.has(student.uid);

      // Must be in the selected current class
      const normalizeText = (text: string) => text ? text.trim().normalize('NFC').toLowerCase() : '';
      const studentClass = normalizeText(student.class || '');
      const selectedClassTrimmed = normalizeText(selectedCurrentClass);

      // Simplified and more robust class matching
      const matches = studentClass === selectedClassTrimmed ||
                     studentClass.includes(selectedClassTrimmed) ||
                     selectedClassTrimmed.includes(studentClass) ||
                     // Handle common variations
                     selectedClassTrimmed === 'প্লে' && studentClass.includes('প্লে') ||
                     selectedClassTrimmed === 'নার্সারি' && studentClass.includes('নার্সারি') ||
                     selectedClassTrimmed === 'প্রথম' && (studentClass.includes('প্রথম') || studentClass.includes('১')) ||
                     selectedClassTrimmed === 'দ্বিতীয়' && (studentClass.includes('দ্বিতীয়') || studentClass.includes('২')) ||
                     selectedClassTrimmed === 'তৃতীয়' && (studentClass.includes('তৃতীয়') || studentClass.includes('৩')) ||
                     selectedClassTrimmed === 'চতুর্থ' && (studentClass.includes('চতুর্থ') || studentClass.includes('৪')) ||
                     selectedClassTrimmed === 'পঞ্চম' && (studentClass.includes('পঞ্চম') || studentClass.includes('৫'));

      console.log(`🔍 Student ${student.name || student.displayName} validation:`, {
        studentId: student.uid,
        studentClass: `"${student.class}"`,
        selectedClassTrimmed: `"${selectedClassTrimmed}"`,
        hasResults,
        classMatches: matches,
        willInclude: hasResults && matches
      });

      return hasResults && matches;
    });

    console.log('🔍=== PROMOTION DATA CREATION DEBUG ===');
    console.log('Available students:', students.length);
    console.log('Valid students found:', validStudents.length);
    console.log('Sample valid students:', validStudents.slice(0, 3).map(s => ({
      uid: s.uid,
      name: s.name || s.displayName,
      class: s.class,
      studentId: s.studentId
    })));

    console.log(`✅ Found ${validStudents.length} valid students with both class match and exam results`);

    // Create student groups for valid students
    validStudents.forEach(student => {
      console.log('🔍=== CREATING STUDENT GROUP ===');
      console.log('Student UID:', student.uid);
      console.log('Student studentId:', student.studentId);
      console.log('Student name:', student.name || student.displayName);

      studentGroups.set(student.uid, {
        uid: student.uid, // Add the uid field explicitly
        studentId: student.studentId || student.uid,
        studentName: student.name || student.displayName || '',
        currentClass: student.class || '',
        targetClass: selectedTargetClass,
        subjects: new Map(),
        totalObtainedMarks: 0,
        totalPossibleMarks: 0,
        averagePercentage: 0,
        averageGPA: 0,
        overallGrade: 'F',
        isPass: false,
        rank: 0
      });
    });

    console.log(`📋 Student groups created: ${studentGroups.size}`);

    // Add exam results for students who are in promotional groups
    filteredResults.forEach(result => {
      const studentKey = result.studentId;
      if (studentGroups.has(studentKey)) {
        const studentData = studentGroups.get(studentKey);
        studentData.subjects.set(result.subject, {
          obtainedMarks: result.obtainedMarks,
          totalMarks: result.totalMarks,
          percentage: result.percentage,
          grade: result.grade || 'N/A',
          gpa: result.gpa || 0
        });
        console.log(`✅ Added result for student ${result.studentName}, subject: ${result.subject}`);
      } else {
        // If exam result exists but student not in class, add the student from exam results
        console.log(`⚠️ Student ${result.studentName} (ID: ${studentKey}) has exam results but not in class list - adding from exam results`);
        studentGroups.set(studentKey, {
          uid: studentKey, // Use the studentId as uid since we don't have the actual uid
          studentId: studentKey,
          studentName: result.studentName,
          currentClass: result.className || selectedCurrentClass,
          targetClass: selectedTargetClass,
          subjects: new Map(),
          totalObtainedMarks: 0,
          totalPossibleMarks: 0,
          averagePercentage: 0,
          averageGPA: 0,
          overallGrade: 'F',
          isPass: false,
          rank: 0
        });

        // Now add the result
        const studentData = studentGroups.get(studentKey);
        studentData.subjects.set(result.subject, {
          obtainedMarks: result.obtainedMarks,
          totalMarks: result.totalMarks,
          percentage: result.percentage,
          grade: result.grade || 'N/A',
          gpa: result.gpa || 0
        });
        console.log(`✅ Added student ${result.studentName} from exam results and their subject: ${result.subject}`);
      }
    });

    // Log exam results summary
    console.log(`📊 Exam results summary: ${filteredResults.length} results found`);
    if (filteredResults.length > 0) {
      console.log('📋 Sample exam results:', filteredResults.slice(0, 3).map(r => ({
        studentId: r.studentId,
        studentName: r.studentName,
        className: r.className,
        examName: r.examName,
        subject: r.subject
      })));
    }

    // Calculate comprehensive results for each student
    const studentsWithCalculations = Array.from(studentGroups.values()).map(student => {
      const subjects = Array.from(student.subjects.values());

      console.log(`🧮 Calculating for student: ${student.studentName}, subjects: ${subjects.length}`);

      // If student has no exam results, they still get shown but with N/A values
      if (subjects.length === 0) {
        console.log(`📝 Student ${student.studentName} has no exam results - showing with N/A`);
        return {
          ...student,
          totalObtainedMarks: 0,
          totalPossibleMarks: 0,
          averagePercentage: 0,
          averageGPA: 0,
          overallGrade: 'N/A',
          isPass: false, // Cannot promote without exam results
          rank: 0
        };
      }

      // Calculate total marks
      const totalObtainedMarks = subjects.reduce((sum: number, sub: any) => sum + (sub.obtainedMarks || 0), 0);
      const totalPossibleMarks = subjects.reduce((sum: number, sub: any) => sum + (sub.totalMarks || 0), 0);

      // Calculate average percentage
      const averagePercentage = subjects.length > 0
        ? subjects.reduce((sum: number, sub: any) => sum + (sub.percentage || 0), 0) / subjects.length
        : 0;

      // Calculate GPA
      const averageGPA = subjects.length > 0
        ? subjects.reduce((sum: number, sub: any) => sum + (sub.gpa || 0), 0) / subjects.length
        : 0;

      // Determine overall grade
      let overallGrade = 'F';
      if (averagePercentage >= 80) overallGrade = 'A+';
      else if (averagePercentage >= 70) overallGrade = 'A';
      else if (averagePercentage >= 60) overallGrade = 'A-';
      else if (averagePercentage >= 50) overallGrade = 'B';
      else if (averagePercentage >= 40) overallGrade = 'C';
      else if (averagePercentage >= 33) overallGrade = 'D';

      // Determine pass/fail status based on threshold
      const isPass = averagePercentage >= promotionThreshold && !subjects.some((subject: any) => {
        const { obtainedMarks, totalMarks } = subject;

        if (!obtainedMarks || obtainedMarks === 0) {
          return true;
        }

        if (totalMarks === 100) {
          return obtainedMarks < 33;
        } else if (totalMarks === 50) {
          return obtainedMarks < 17;
        } else {
          const passPercentage = 33;
          const requiredMarks = Math.ceil((totalMarks * passPercentage) / 100);
          return obtainedMarks < requiredMarks;
        }
      });

      console.log(`✅ Student ${student.studentName} - Grade: ${overallGrade}, GPA: ${averageGPA.toFixed(2)}, Pass: ${isPass}`);

      return {
        ...student,
        totalObtainedMarks,
        totalPossibleMarks,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
        averageGPA: Math.round(averageGPA * 100) / 100,
        overallGrade,
        isPass,
        rank: 0
      };
    });

    console.log(`✅ Final promotion data: ${studentsWithCalculations.length} students`);

    // Sort by total marks and assign ranks
    studentsWithCalculations.sort((a, b) => b.totalObtainedMarks - a.totalObtainedMarks);
    studentsWithCalculations.forEach((student, index) => {
      student.rank = index + 1;
    });

    return studentsWithCalculations;
  }, [filteredResults, selectedExam, selectedCurrentClass, selectedTargetClass, students, promotionThreshold]);

  // Calculate promotion results
  const calculatePromotionResults = () => {
    console.log('🧮=== CALCULATE PROMOTION RESULTS ===');
    console.log('📋 Promotion data length:', promotionData.length);
    console.log('🏫 Selected current class:', selectedCurrentClass);
    console.log('🎯 Selected target class:', selectedTargetClass);
    console.log('📝 Selected exam:', selectedExam);

    if (promotionData.length === 0) {
      alert('কোনো শিক্ষার্থী পাওয়া যায়নি। প্রথমে ক্লাস এবং পরীক্ষা নির্বাচন করুন।');
      return;
    }

    const promoted = promotionData.filter(student => student.isPass);
    const notPromoted = promotionData.filter(student => !student.isPass);

    const totalStudents = promotionData.length;
    const promotedCount = promoted.length;
    const notPromotedCount = notPromoted.length;
    const promotionRate = ((promotedCount / totalStudents) * 100).toFixed(1);

    setPromotionResults({
      promoted,
      notPromoted,
      summary: {
        totalStudents,
        promotedCount,
        notPromotedCount,
        promotionRate
      }
    });

    setShowPromotionModal(true);
  };

  // Get next roll number for target class based on student's current rank
  const getNextRollNumber = async (student: any, targetClass: string): Promise<number> => {
    try {
      // Get students in target class
      const studentsInTargetClass = await studentQueries.getStudentsByClass(targetClass);

      // Get all existing roll numbers in target class
      const targetClassRolls = studentsInTargetClass
        .map(s => {
          const roll = typeof s.rollNumber === 'number' ? s.rollNumber : parseInt(s.rollNumber || '0') || 0;
          return roll > 0 ? roll : 0; // Ensure we don't include invalid roll numbers
        })
        .filter(roll => roll > 0)
        .sort((a, b) => a - b);

      // Use student's current rank as the desired roll number
      // The rank is already calculated based on academic performance in promotionData
      const desiredRollNumber = student.rank || 1;

      console.log(`🎯 Student ${student.studentName} - Desired roll number based on rank: ${desiredRollNumber}`);

      // Check if the desired roll number is available
      if (!targetClassRolls.includes(desiredRollNumber)) {
        console.log(`✅ Roll number ${desiredRollNumber} is available for student ${student.studentName}`);
        return desiredRollNumber;
      }

      // If desired roll number is taken, find the next available number starting from the desired rank
      console.log(`⚠️ Roll number ${desiredRollNumber} is already taken for student ${student.studentName}`);

      let nextRoll = desiredRollNumber;
      while (targetClassRolls.includes(nextRoll)) {
        nextRoll++;
      }

      console.log(`✅ Next available roll number for student ${student.studentName}: ${nextRoll}`);

      // Ensure we never return 0 as a roll number
      return nextRoll > 0 ? nextRoll : 1;
    } catch (error) {
      console.error('❌ Error getting next roll number:', error);
      return 1; // Default to 1 if error
    }
  };

  // Promote individual student
  const promoteIndividualStudent = async (student: any) => {
    try {
      console.log('🔍=== PROMOTE INDIVIDUAL STUDENT DEBUG ===');
      console.log('Student data:', student);
      console.log('Student UID:', student.uid);
      console.log('Student ID:', student.studentId);

      if (!student.uid) {
        console.error('❌ Student UID is missing for student:', student.studentName);
        alert(`শিক্ষার্থী ${student.studentName} এর UID পাওয়া যায়নি।`);
        return;
      }

      // Find the actual student document by studentId to get the real UID
      const actualStudent = await studentQueries.getStudentByStudentId(student.studentId);
      if (!actualStudent) {
        console.error('❌ No student found with studentId:', student.studentId);
        alert(`শিক্ষার্থী ${student.studentName} (ID: ${student.studentId}) ডাটাবেসে পাওয়া যায়নি।`);
        return;
      }

      console.log('✅ Found actual student:', actualStudent.uid);

      const nextRollNumber = await getNextRollNumber({...actualStudent, rank: student.rank}, student.targetClass);

      await studentQueries.updateStudent(actualStudent.uid, {
        class: student.targetClass,
        rollNumber: nextRollNumber.toString()
      });

      console.log(`✅ Student ${student.studentName} promoted to ${student.targetClass} with roll number ${nextRollNumber}`);

      // Refresh data
      await loadStudents();
      await loadAllData();

      // Show success message with class change info
      alert(`শিক্ষার্থী ${student.studentName} সফলভাবে ${student.targetClass} ক্লাসে প্রমোশন পেয়েছে। রোল নম্বর: ${nextRollNumber}\n\nডেটা রিফ্রেশ করা হয়েছে। নতুন ক্লাসে শিক্ষার্থী দেখতে ফিল্টার চেক করুন।`);

    } catch (error) {
      console.error(`❌ Error promoting student ${student.studentName}:`, error);
      alert(`শিক্ষার্থী ${student.studentName} প্রমোশন করতে ত্রুটি হয়েছে।`);
    }
  };

  // Execute student promotion (bulk)
  const executePromotion = async () => {
    if (!promotionResults) return;

    setCalculating(true);
    try {
      const { promoted } = promotionResults;
      let successCount = 0;
      let errorCount = 0;

      for (const student of promoted) {
        try {
          // Find the actual student document by studentId to get the real UID
          const actualStudent = await studentQueries.getStudentByStudentId(student.studentId);
          if (!actualStudent) {
            console.error('❌ No student found with studentId:', student.studentId);
            errorCount++;
            continue;
          }

          const nextRollNumber = await getNextRollNumber({...actualStudent, rank: student.rank}, student.targetClass);
          await studentQueries.updateStudent(actualStudent.uid, {
            class: student.targetClass,
            rollNumber: nextRollNumber.toString()
          });
          successCount++;
        } catch (error) {
          console.error(`❌ Error promoting student ${student.studentName}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ Promotion completed. Success: ${successCount}, Errors: ${errorCount}`);

      // Refresh data
      await loadStudents();
      await loadAllData();

      // Reset promotion results and close modal
      setPromotionResults(null);
      setShowPromotionModal(false);

      alert(`প্রমোশন সম্পন্ন হয়েছে। সফল: ${successCount} জন, ত্রুটি: ${errorCount} জন\n\nডেটা রিফ্রেশ করা হয়েছে। নতুন ক্লাসে প্রমোশন পাওয়া শিক্ষার্থীদের দেখতে ফিল্টার চেক করুন।`);

    } catch (error) {
      console.error('❌ Error during promotion execution:', error);
      alert('প্রমোশন চলাকালে ত্রুটি হয়েছে।');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <button
                  onClick={() => router.push('/admin/exams')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>পিছনে যান</span>
                </button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">শিক্ষার্থী প্রমোশন</h1>
              <p className="text-gray-600">পরীক্ষার ফলাফলের ভিত্তিতে শিক্ষার্থীদের ক্লাস প্রমোশন করুন</p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                স্কুল আইডি: {schoolId}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">প্রমোশন ফিল্টার</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                বর্তমান ক্লাস নির্বাচন করুন
                <span className="text-xs text-gray-500 ml-1">({classes.length} টি ক্লাস পাওয়া গেছে)</span>
              </label>
              <select
                value={selectedCurrentClass}
                onChange={(e) => setSelectedCurrentClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">বর্তমান ক্লাস নির্বাচন করুন</option>
                {classes.map((cls) => (
                  <option key={cls.classId} value={cls.className}>
                    {cls.className} {cls.section !== 'A' ? `(সেকশন ${cls.section})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                লক্ষ্য ক্লাস নির্বাচন করুন
              </label>
              <select
                value={selectedTargetClass}
                onChange={(e) => setSelectedTargetClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">লক্ষ্য ক্লাস নির্বাচন করুন</option>
                {classes.map((cls) => (
                  <option key={cls.classId} value={cls.className}>
                    {cls.className} {cls.section !== 'A' ? `(সেকশন ${cls.section})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                পরীক্ষা নির্বাচন করুন
                <span className="text-xs text-gray-500 ml-1">({exams.length} টি পরীক্ষা পাওয়া গেছে)</span>
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">পরীক্ষা নির্বাচন করুন</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.name}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                প্রমোশন থ্রেশহোল্ড (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={promotionThreshold}
                onChange={(e) => setPromotionThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="40"
              />
              <p className="text-xs text-gray-500 mt-1">
                এই শতাংশের উপরে পেলে শিক্ষার্থী প্রমোশন পাবে
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={async () => {
                setDataLoading(true);
                await loadAllData();
                setDataLoading(false);
              }}
              disabled={dataLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
              {dataLoading ? 'লোড হচ্ছে...' : 'রিফ্রেশ করুন'}
            </button>

            <button
              onClick={() => {
                setSelectedCurrentClass('');
                setSelectedTargetClass('');
                setSelectedExam('');
                setPromotionThreshold(40);
              }}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ফিল্টার পরিষ্কার করুন
            </button>

            <button
              onClick={calculatePromotionResults}
              disabled={!selectedCurrentClass || !selectedTargetClass || !selectedExam}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              প্রমোশন ক্যালকুলেট করুন
            </button>

            <button
              onClick={async () => {
                try {
                  await executePromotion();
                } catch (error) {
                  console.error('Error during bulk promotion:', error);
                  alert('প্রমোশন চলাকালে ত্রুটি হয়েছে।');
                }
              }}
              disabled={!promotionResults || promotionResults.promoted.length === 0 || calculating}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <TrendingUp className={`w-4 h-4 ${calculating ? 'animate-pulse' : ''}`} />
              {calculating ? 'প্রমোশন হচ্ছে...' : 'সকলকে প্রমোশন করুন'}
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
        {selectedCurrentClass && selectedTargetClass && selectedExam && promotionData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">প্রমোশন সারসংক্ষেপ</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{toBengaliNumerals(promotionData.length)}</div>
                <div className="text-sm text-blue-800">মোট শিক্ষার্থী</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {toBengaliNumerals(promotionData.filter(s => s.isPass).length)}
                </div>
                <div className="text-sm text-green-800">প্রমোশন পাবে</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {toBengaliNumerals(promotionData.filter(s => !s.isPass).length)}
                </div>
                <div className="text-sm text-red-800">প্রমোশন পাবে না</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {(promotionData.reduce((sum, s) => sum + s.averagePercentage, 0) / promotionData.length).toFixed(1)}%
                </div>
                <div className="text-sm text-purple-800">গড় শতাংশ</div>
              </div>
            </div>
          </div>
        )}

        {/* Promotion Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedCurrentClass && selectedTargetClass && selectedExam
                ? `${selectedCurrentClass} থেকে ${selectedTargetClass} - প্রমোশন তালিকা`
                : 'প্রমোশন তালিকা'
              }
            </h3>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-gray-600">
                {promotionData.length > 0
                  ? `শিক্ষার্থী: ${promotionData.length} জন${selectedCurrentClass && selectedTargetClass && selectedExam ? ` (${selectedCurrentClass} → ${selectedTargetClass})` : ''}`
                  : 'কোনো ডেটা নেই'
                }
              </p>
            </div>
          </div>

          {promotionData.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900">কোনো শিক্ষার্থী পাওয়া যায়নি</h3>
              <p className="mt-1 text-sm text-gray-500">
                প্রমোশন তালিকা দেখার জন্য সকল ফিল্টার নির্বাচন করুন এবং ক্যালকুলেট করুন।
              </p>
              <div className="mt-4 text-xs text-gray-400">
                <p>🔍 ডিবাগ তথ্য: কনসোল চেক করুন (F12) ডেটা লোডিং সমস্যা দেখার জন্য</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('studentId')}
                        className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>স্টুডেন্ট আইডি</span>
                        {sortField === 'studentId' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('studentName')}
                        className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>নাম</span>
                        {sortField === 'studentName' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('currentClass')}
                        className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>বর্তমান ক্লাস</span>
                        {sortField === 'currentClass' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('targetClass')}
                        className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>লক্ষ্য ক্লাস</span>
                        {sortField === 'targetClass' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    {allSubjects.map((subject, index) => (
                      <th key={`${subject}_${index}`} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort(`subject_${subject}`)}
                          className="flex items-center justify-center space-x-1 hover:text-gray-700 focus:outline-none"
                        >
                          <span>{subject}</span>
                          {sortField === `subject_${subject}` && (
                            sortDirection === 'asc' ?
                              <ChevronUp className="w-3 h-3" /> :
                              <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('totalObtainedMarks')}
                        className="flex items-center justify-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>মোট নম্বর</span>
                        {sortField === 'totalObtainedMarks' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('averagePercentage')}
                        className="flex items-center justify-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>গড় শতাংশ</span>
                        {sortField === 'averagePercentage' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('averageGPA')}
                        className="flex items-center justify-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>জিপিএ</span>
                        {sortField === 'averageGPA' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('overallGrade')}
                        className="flex items-center justify-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>গ্রেড</span>
                        {sortField === 'overallGrade' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('isPass')}
                        className="flex items-center justify-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>অবস্থা</span>
                        {sortField === 'isPass' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('rank')}
                        className="flex items-center justify-center space-x-1 hover:text-gray-700 focus:outline-none"
                      >
                        <span>র‍্যাঙ্ক</span>
                        {sortField === 'rank' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedData(promotionData).map((student) => {
                    const subjects = student.subjects;

                    return (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.studentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.currentClass}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.targetClass}
                        </td>

                        {/* Subject Columns */}
                         {allSubjects.map((subject, subjectIndex) => {
                           const subjectData = subjects.get(subject);
                           return (
                             <td key={`${student.studentId}_${subject}_${subjectIndex}`} className="px-4 py-4 whitespace-nowrap text-center text-sm">
                              {subjectData && subjectData.obtainedMarks > 0 ? (
                                <div className="text-gray-900">
                                  <div className="font-medium">{toBengaliNumerals(subjectData.obtainedMarks)}</div>
                                  <div className="text-xs text-gray-500 font-medium">{subjectData.grade}</div>
                                </div>
                              ) : (
                                <div className="text-gray-400">
                                  <div className="font-medium">-</div>
                                  <div className="text-xs text-gray-400">-</div>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          <div className="font-medium">
                            {toBengaliNumerals(student.totalObtainedMarks)}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          <div className="font-medium">
                            {toBengaliNumerals(student.averagePercentage)}%
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          <div className="font-medium">
                            {student.averageGPA.toFixed(2)}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                            student.overallGrade === 'A+' ? 'bg-yellow-100 text-yellow-800' :
                            student.overallGrade === 'A' ? 'bg-green-100 text-green-800' :
                            student.overallGrade === 'A-' ? 'bg-blue-100 text-blue-800' :
                            student.overallGrade === 'B' ? 'bg-indigo-100 text-indigo-800' :
                            student.overallGrade === 'C' ? 'bg-purple-100 text-purple-800' :
                            student.overallGrade === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {student.overallGrade}
                          </span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            student.isPass
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.isPass ? 'প্রমোশন পাবে' : 'প্রমোশন পাবে না'}
                          </span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          <span className="font-medium text-gray-600">{toBengaliNumerals(student.rank)}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {student.isPass && (
                            <button
                              onClick={() => promoteIndividualStudent(student)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <TrendingUp className="w-3 h-3" />
                              প্রমোশন
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Promotion Results Modal */}
      {showPromotionModal && promotionResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-2xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">প্রমোশন ফলাফল</h3>
                <button
                  onClick={() => setShowPromotionModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{toBengaliNumerals(promotionResults.summary.totalStudents)}</div>
                  <div className="text-sm text-blue-800">মোট শিক্ষার্থী</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{toBengaliNumerals(promotionResults.summary.promotedCount)}</div>
                  <div className="text-sm text-green-800">প্রমোশন পাবে</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{toBengaliNumerals(promotionResults.summary.notPromotedCount)}</div>
                  <div className="text-sm text-red-800">প্রমোশন পাবে না</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{promotionResults.summary.promotionRate}%</div>
                  <div className="text-sm text-purple-800">প্রমোশন রেট</div>
                </div>
              </div>

              {/* Promoted Students */}
              {promotionResults.promoted.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="text-lg font-semibold text-green-800">প্রমোশন পাবে ({promotionResults.promoted.length} জন)</h4>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {promotionResults.promoted.map((student, index) => (
                        <div key={`${student.studentId}_${index}_promoted`} className="flex items-center space-x-2 text-sm">
                          <UserCheck className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{student.studentName}</span>
                          <span className="text-gray-600">({student.studentId})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Not Promoted Students */}
              {promotionResults.notPromoted.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <h4 className="text-lg font-semibold text-red-800">প্রমোশন পাবে না ({promotionResults.notPromoted.length} জন)</h4>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {promotionResults.notPromoted.map((student, index) => (
                        <div key={`${student.studentId}_${index}_notpromoted`} className="flex items-center space-x-2 text-sm">
                          <UserX className="w-4 h-4 text-red-600" />
                          <span className="font-medium">{student.studentName}</span>
                          <span className="text-gray-600">({student.studentId})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 rounded-b-2xl px-6 py-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                থ্রেশহোল্ড: {promotionThreshold}% • ক্লাস: {selectedCurrentClass} → {selectedTargetClass}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPromotionModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={executePromotion}
                  disabled={calculating || promotionResults.promoted.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  <TrendingUp className={`w-4 h-4 ${calculating ? 'animate-pulse' : ''}`} />
                  {calculating ? 'প্রমোশন হচ্ছে...' : 'প্রমোশন কনফার্ম করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default ExamPromotionPage;
