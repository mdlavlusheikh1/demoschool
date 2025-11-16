'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Award, Search, Filter, ChevronDown, ChevronUp, Download, Eye, Calendar, User, BookOpen, TrendingUp, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { SystemSettings, examQueries, Exam } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SCHOOL_ID } from '@/lib/constants';

interface ExamResult {
  id: string;
  studentName: string;
  studentId: string;
  class: string;
  examName: string;
  examType: string;
  examDate: string;
  examId?: string;
  subjects: {
    subject: string;
    obtainedMarks: number;
    totalMarks: number;
    grade: string;
    gpa: number;
  }[];
  totalObtainedMarks: number;
  totalMarks: number;
  overallGPA: number;
  overallGrade: string;
  position: number;
  status: 'pass' | 'fail';
  remarks: string;
}

const PublicResultsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  // Get current year as default
  const currentYear = new Date().getFullYear().toString();
  
  const [formData, setFormData] = useState({
    examination: '',
    year: currentYear,
    board: '',
    roll: '',
    regNo: '',
    captcha: ''
  });
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [generalSettings, setGeneralSettings] = useState<SystemSettings | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  // Real-time listener for settings
  useEffect(() => {
    const settingsRef = doc(db, 'system', 'settings');
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as SystemSettings;
          setGeneralSettings(data);
          // Don't auto-select board, let user select manually
        }
      },
      (error) => {
        console.error('Error listening to settings:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load exams from database - only published exams with real-time updates
  useEffect(() => {
    const loadExams = async () => {
      setLoadingExams(true);
      try {
        const allExams = await examQueries.getAllExams(SCHOOL_ID);
        // Filter only published exams
        const publishedExams = allExams.filter(exam => exam.resultsPublished === true);
        console.log('Loaded published exams:', publishedExams);
        setExams(publishedExams);
      } catch (error) {
        console.error('Error loading exams:', error);
        setExams([]);
      } finally {
        setLoadingExams(false);
      }
    };

    loadExams();

    // Set up real-time listener for exams
    const unsubscribe = examQueries.subscribeToExams(
      SCHOOL_ID,
      (examsData) => {
        // Filter only published exams
        const publishedExams = examsData.filter(exam => exam.resultsPublished === true);
        console.log('Real-time published exams update:', publishedExams);
        setExams(publishedExams);
      },
      (error) => {
        console.error('Real-time listener error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sample data
  const sampleResults: ExamResult[] = [
    {
      id: '1',
      studentName: 'মোহাম্মদ আব্দুল্লাহ আল মামুন',
      studentId: 'STD001',
      class: '১০ম শ্রেণি',
      examName: 'মধ্যবর্তী পরীক্ষা ২০২৪',
      examType: 'মধ্যবর্তী',
      examDate: '2024-12-15',
      subjects: [
        { subject: 'গণিত', obtainedMarks: 85, totalMarks: 100, grade: 'A+', gpa: 5.0 },
        { subject: 'ইংরেজি', obtainedMarks: 78, totalMarks: 100, grade: 'A', gpa: 4.0 },
        { subject: 'বিজ্ঞান', obtainedMarks: 92, totalMarks: 100, grade: 'A+', gpa: 5.0 },
        { subject: 'বাংলা', obtainedMarks: 88, totalMarks: 100, grade: 'A+', gpa: 5.0 }
      ],
      totalObtainedMarks: 343,
      totalMarks: 400,
      overallGPA: 4.75,
      overallGrade: 'A+',
      position: 1,
      status: 'pass',
      remarks: 'অত্যন্ত ভালো ফলাফল'
    },
    {
      id: '2',
      studentName: 'ফাতেমা আক্তার',
      studentId: 'STD002',
      class: '১০ম শ্রেণি',
      examName: 'মধ্যবর্তী পরীক্ষা ২০২৪',
      examType: 'মধ্যবর্তী',
      examDate: '2024-12-15',
      subjects: [
        { subject: 'গণিত', obtainedMarks: 78, totalMarks: 100, grade: 'A', gpa: 4.0 },
        { subject: 'ইংরেজি', obtainedMarks: 82, totalMarks: 100, grade: 'A+', gpa: 5.0 },
        { subject: 'বিজ্ঞান', obtainedMarks: 85, totalMarks: 100, grade: 'A+', gpa: 5.0 },
        { subject: 'বাংলা', obtainedMarks: 80, totalMarks: 100, grade: 'A', gpa: 4.0 }
      ],
      totalObtainedMarks: 325,
      totalMarks: 400,
      overallGPA: 4.5,
      overallGrade: 'A+',
      position: 2,
      status: 'pass',
      remarks: 'ভালো ফলাফল'
    }
  ];

  // Generate years from 2018 to 2100
  const generateYears = () => {
    const yearsList: string[] = [];
    for (let year = 2018; year <= 2100; year++) {
      yearsList.push(year.toString());
    }
    // Sort years (newest first)
    return yearsList.reverse();
  };

  const sessions = generateYears();


  // Generate captcha
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ num1, num2, answer: num1 + num2 });
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.examination) {
      newErrors.examination = 'পরীক্ষা নির্বাচন করুন';
    }
    if (!formData.year || formData.year.trim() === '') {
      newErrors.year = 'বছর (সেশন) নির্বাচন করুন';
    }
    if (!formData.board || formData.board === '') {
      newErrors.board = 'বোর্ড নির্বাচন করুন';
    }
    // At least one of roll or regNo should be provided
    if (!formData.roll.trim() && !formData.regNo.trim()) {
      newErrors.roll = 'রোল নম্বর বা রেজিস্ট্রেশন নম্বর প্রয়োজন';
      newErrors.regNo = 'রোল নম্বর বা রেজিস্ট্রেশন নম্বর প্রয়োজন';
    }
    if (!formData.captcha.trim()) {
      newErrors.captcha = 'ক্যাপচা উত্তর প্রয়োজন';
    } else if (parseInt(formData.captcha) !== captcha.answer) {
      newErrors.captcha = 'ভুল ক্যাপচা উত্তর';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSearching(true);
    setLoading(true);
    try {
      // Import Firebase functions
      const { collection, query, where, getDocs, or } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { SCHOOL_ID } = await import('@/lib/constants');
      const { studentQueries } = await import('@/lib/database-queries');
      const { examResultQueries } = await import('@/lib/database-queries');

      // First, find the student by registration number or roll number
      let student: any = null;
      
      if (formData.regNo && formData.regNo.trim()) {
        // Search by registration number
        const students = await studentQueries.getAllStudents(false);
        student = students.find(s => 
          (s as any).registrationNumber?.toLowerCase() === formData.regNo.trim().toLowerCase() ||
          (s as any).registrationNumber === formData.regNo.trim()
        );
      }
      
      if (!student && formData.roll && formData.roll.trim()) {
        // Search by roll number or student ID
        const students = await studentQueries.getAllStudents(false);
        student = students.find(s => 
          s.rollNumber?.toLowerCase() === formData.roll.trim().toLowerCase() ||
          s.rollNumber === formData.roll.trim() ||
          s.studentId?.toLowerCase() === formData.roll.trim().toLowerCase() ||
          s.studentId === formData.roll.trim()
        );
      }

      if (!student) {
        setResults([]);
        setShowResults(true);
        setErrors({ roll: 'শিক্ষার্থী পাওয়া যায়নি। রোল নম্বর বা রেজিস্ট্রেশন নম্বর চেক করুন।' });
        return;
      }

      // Now fetch exam results for this student
      let examResults = await examResultQueries.getStudentResults(student.studentId, SCHOOL_ID);

      // Get all exams to check published status
      const allExams = await examQueries.getAllExams(SCHOOL_ID);
      const publishedExamIds = new Set(
        allExams
          .filter(exam => exam.resultsPublished === true)
          .map(exam => exam.id)
      );

      // Filter by published exams only
      examResults = examResults.filter(result => {
        // Check if the exam is published
        if (result.examId && publishedExamIds.has(result.examId)) {
          return true;
        }
        // If examId not available, check by exam name in published exams
        const matchingExam = allExams.find(exam => 
          exam.resultsPublished === true && (
            exam.name === result.examName ||
            exam.id === result.examId
          )
        );
        return !!matchingExam;
      });

      // Filter by examination if selected
      if (formData.examination && formData.examination.trim()) {
        // Find the selected exam from published exams
        const selectedExam = exams.find(e => 
          e.name === formData.examination || 
          e.id === formData.examination
        );

        examResults = examResults.filter(result => {
          // Check by exam name (case-insensitive)
          const nameMatch = result.examName?.toLowerCase().trim() === formData.examination.toLowerCase().trim() ||
                           result.examName?.trim() === formData.examination.trim();
          
          // If we have the selected exam, also check by examId
          if (selectedExam && result.examId) {
            return nameMatch || result.examId === selectedExam.id;
          }
          
          return nameMatch;
        });
      }

      // Filter by year/session if selected
      if (formData.year && formData.year !== 'নির্বাচন করুন' && formData.year.trim()) {
        const selectedYear = formData.year.trim();
        examResults = examResults.filter(result => {
          // Check if exam date matches the year
          if (result.examDate) {
            try {
              const examDate = new Date(result.examDate);
              if (!isNaN(examDate.getTime())) {
                const examYear = examDate.getFullYear().toString();
                if (examYear === selectedYear) {
                  return true;
                }
              }
            } catch (e) {
              console.warn('Error parsing exam date:', result.examDate);
            }
          }
          
          // Check academic year if available in exam record
          if ((result as any).academicYear && (result as any).academicYear.toString() === selectedYear) {
            return true;
          }
          
          // Check if the exam itself has this academic year
          const resultExam = allExams.find(exam => exam.id === result.examId);
          if (resultExam && resultExam.academicYear && resultExam.academicYear.toString() === selectedYear) {
            return true;
          }
          
          // Check exam name for year (last resort)
          if (result.examName && result.examName.includes(selectedYear)) {
            return true;
          }
          
          return false;
        });
      }

      // Debug logging
      console.log('🔍 Search Debug:', {
        studentFound: !!student,
        studentId: student?.studentId,
        totalResultsBeforeFilter: (await examResultQueries.getStudentResults(student.studentId, SCHOOL_ID)).length,
        publishedExamIds: Array.from(publishedExamIds),
        examResultsAfterPublishFilter: examResults.length,
        selectedExamination: formData.examination,
        examResultsAfterExamFilter: examResults.length,
        selectedYear: formData.year,
        finalResultsCount: examResults.length
      });

      if (examResults.length === 0) {
        setResults([]);
        setShowResults(true);
        // Provide more helpful error messages
        const publishedExamsCount = allExams.filter(exam => exam.resultsPublished === true).length;
        if (publishedExamsCount === 0) {
          setErrors({ examination: 'কোন প্রকাশিত পরীক্ষার ফলাফল নেই।' });
        } else {
          setErrors({ examination: 'এই তথ্যের জন্য কোন ফলাফল পাওয়া যায়নি। দয়া করে পরীক্ষা, বছর এবং রোল/রেজি নম্বর চেক করুন।' });
        }
        return;
      }

      // Fetch subject codes from ExamSubjects and general Subjects
      const { subjectQueries, examSubjectQueries, settingsQueries } = await import('@/lib/database-queries');
      
      // Get school ID from settings (preferred) or use constant
      let schoolIdForSubjects = SCHOOL_ID;
      try {
        const settings = await settingsQueries.getSettings();
        if (settings?.schoolCode) {
          schoolIdForSubjects = settings.schoolCode;
        }
      } catch (error) {
        console.warn('Error loading settings for school code:', error);
      }

      // Get all unique exam IDs from the results
      const uniqueExamIds = [...new Set(examResults.map(r => r.examId).filter(Boolean))];
      
      // Fetch ExamSubjects for all exams (these have subjectCode)
      const examSubjectCodeMap = new Map<string, string>(); // subjectName -> subjectCode
      for (const examId of uniqueExamIds) {
        try {
          const examSubjects = await examSubjectQueries.getExamSubjects(examId);
          console.log(`📚 Loaded ${examSubjects.length} exam subjects for exam ${examId}`);
          examSubjects.forEach(es => {
            if (es.subjectName && es.subjectCode) {
              const originalName = es.subjectName.trim();
              const normalizedName = originalName.toLowerCase();
              
              // Store multiple variations for better matching
              examSubjectCodeMap.set(originalName, es.subjectCode);
              if (!examSubjectCodeMap.has(normalizedName)) {
                examSubjectCodeMap.set(normalizedName, es.subjectCode);
              }
              
              // Also store without extra spaces
              const nameWithoutExtraSpaces = originalName.replace(/\s+/g, ' ').trim();
              if (nameWithoutExtraSpaces !== originalName && !examSubjectCodeMap.has(nameWithoutExtraSpaces)) {
                examSubjectCodeMap.set(nameWithoutExtraSpaces, es.subjectCode);
              }
              
              console.log(`  ✓ Mapped: "${originalName}" -> ${es.subjectCode}`);
            }
          });
        } catch (error) {
          console.warn(`Error loading exam subjects for exam ${examId}:`, error);
        }
      }
      
      console.log('📋 Total subject code mappings:', examSubjectCodeMap.size);
      console.log('📋 All mappings:', Array.from(examSubjectCodeMap.entries()));

      // Also fetch general subjects as fallback
      let allSubjects: any[] = [];
      try {
        allSubjects = await subjectQueries.getAllSubjects(schoolIdForSubjects);
      } catch (error) {
        console.warn('Error loading subjects:', error);
      }

      // Add general subjects to map (as fallback, only if not already in examSubjectCodeMap)
      allSubjects.forEach(sub => {
        if (sub.name && sub.code) {
          const normalizedName = sub.name.trim().toLowerCase();
          if (!examSubjectCodeMap.has(normalizedName)) {
            examSubjectCodeMap.set(normalizedName, sub.code);
          }
          const originalName = sub.name.trim();
          if (originalName.toLowerCase() !== normalizedName && !examSubjectCodeMap.has(originalName)) {
            examSubjectCodeMap.set(originalName, sub.code);
          }
        }
      });

      console.log('📋 Subject code map created:', examSubjectCodeMap.size, 'entries');
      console.log('📋 Sample map entries:', Array.from(examSubjectCodeMap.entries()).slice(0, 5));

      // Helper function to calculate GPA from percentage
      // Grade Criteria:
      // 80-100%: A+, 5.00
      // 70-79%: A, 4.00
      // 60-69%: A-, 3.50
      // 50-59%: B, 3.00
      // 40-49%: C, 2.00
      // 33-39%: D, 1.00
      // 0-32%: F, 0.00
      const calculateGPAFromPercentage = (percentage: number): number => {
        if (percentage >= 80) return 5.00;
        if (percentage >= 70) return 4.00;
        if (percentage >= 60) return 3.50;
        if (percentage >= 50) return 3.00;
        if (percentage >= 40) return 2.00;
        if (percentage >= 33) return 1.00;
        return 0.00;
      };

      // Transform Firebase results to match the interface
      const transformedResults: ExamResult[] = examResults.map(result => {
        // Group subjects from multiple result entries
        const subjects = examResults
          .filter(r => r.examId === result.examId && r.studentId === result.studentId)
          .map(r => {
            // Get subject code from map or from result if available
            const subjectName = (r.subject || '').trim();
            const normalizedName = subjectName.toLowerCase();
            const nameWithoutExtraSpaces = subjectName.replace(/\s+/g, ' ').trim();
            
            // Try multiple lookup methods
            let subjectCode = (r as any).subjectCode || '';
            
            if (!subjectCode && subjectName) {
              // Try exact match first (original name)
              subjectCode = examSubjectCodeMap.get(subjectName) || '';
            }
            
            if (!subjectCode && subjectName) {
              // Try normalized (lowercase) match
              subjectCode = examSubjectCodeMap.get(normalizedName) || '';
            }
            
            if (!subjectCode && subjectName) {
              // Try without extra spaces
              subjectCode = examSubjectCodeMap.get(nameWithoutExtraSpaces) || '';
            }
            
            // Debug logging for first few subjects
            if (subjectName && (result.examId === uniqueExamIds[0] || !subjectCode)) {
              console.log(`🔍 Looking for code: "${subjectName}" -> Found: "${subjectCode}"`);
            }
            
            const subObtainedMarks = r.obtainedMarks || 0;
            const subTotalMarks = r.totalMarks || r.fullMarks || 100;
            const subPercentage = subTotalMarks > 0 ? (subObtainedMarks / subTotalMarks) * 100 : 0;
            // Calculate GPA from percentage (use stored GPA if available, otherwise calculate from percentage)
            const subGPA = r.gpa || calculateGPAFromPercentage(subPercentage);
            
            return {
              subject: r.subject || '',
              subjectCode: subjectCode,
              obtainedMarks: subObtainedMarks,
              totalMarks: subTotalMarks,
              grade: r.grade || '',
              gpa: subGPA,
              percentage: subPercentage
            };
          });

        // Calculate totals
        const totalObtained = subjects.reduce((sum, s) => sum + s.obtainedMarks, 0);
        const totalMarks = subjects.reduce((sum, s) => sum + s.totalMarks, 0);
        
        // Calculate average percentage (same as admin page)
        const averagePercentage = subjects.length > 0
          ? subjects.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / subjects.length
          : 0;

        // Calculate average GPA (same as admin page)
        const averageGPA = subjects.length > 0
          ? subjects.reduce((sum: number, s: any) => sum + (s.gpa || 0), 0) / subjects.length
          : 0;
        
        // Determine overall grade based on average percentage (same as admin page)
        let overallGrade = 'F';
        if (averagePercentage >= 80) overallGrade = 'A+';
        else if (averagePercentage >= 70) overallGrade = 'A';
        else if (averagePercentage >= 60) overallGrade = 'A-';
        else if (averagePercentage >= 50) overallGrade = 'B';
        else if (averagePercentage >= 40) overallGrade = 'C';
        else if (averagePercentage >= 33) overallGrade = 'D';

        // Determine pass/fail status based on individual subject marks
        const isPass = !subjects.some(subject => {
          const { obtainedMarks, totalMarks } = subject;

          // If marks are blank (0 or undefined), consider as fail
          if (!obtainedMarks || obtainedMarks === 0) {
            return true;
          }

          // Determine pass mark based on total marks
          if (totalMarks === 100) {
            return obtainedMarks < 33; // 100 marks: pass mark 33
          } else if (totalMarks === 50) {
            return obtainedMarks < 17; // 50 marks: pass mark 17
          } else {
            // For other total marks, use proportional calculation
            const passPercentage = 33; // 33% pass mark
            const requiredMarks = Math.ceil((totalMarks * passPercentage) / 100);
            return obtainedMarks < requiredMarks;
          }
        });

        return {
          id: result.id || '',
          studentName: student.name || result.studentName || '',
          studentId: student.studentId || result.studentId || '',
          class: student.class || result.className || result.class || '',
          examName: result.examName || '',
          examType: result.examType || '',
          examDate: result.examDate || (result.enteredAt?.toDate?.()?.toISOString() || ''),
          examId: result.examId || '',
          subjects: subjects,
          totalObtainedMarks: totalObtained,
          totalMarks: totalMarks,
          overallGPA: Math.round(averageGPA * 100) / 100,
          overallGrade: overallGrade,
          position: result.position || 0,
          status: isPass ? 'pass' : 'fail',
          remarks: result.remarks || ''
        };
      });

      // Remove duplicates by exam ID
      const uniqueResults = Array.from(
        new Map(transformedResults.map(r => [r.examName || r.id, r])).values()
      );

      // Calculate rank by fetching all students' results for the same exam
      // Get examId from uniqueResults or original examResults
      const examIdForRank = uniqueResults[0]?.examId || (examResults.length > 0 ? examResults[0].examId : null);
      
      console.log('🔍 Rank Calculation Debug:', {
        uniqueResultsCount: uniqueResults.length,
        examIdForRank: examIdForRank,
        studentClass: student.class,
        studentId: student.studentId,
        studentName: student.name
      });
      
      if (uniqueResults.length > 0 && examIdForRank) {
        try {
          // Get all results for this exam
          const allExamResults = await examResultQueries.getExamResults(examIdForRank);
          
          // Get all students for this class
          const classStudents = await studentQueries.getStudentsByClass(student.class);
          
          // Transform all students' results (same logic as current student)
          const allStudentsResults: ExamResult[] = [];
          
          for (const classStudent of classStudents) {
            // Handle different field names: studentId, uid, or id
            const studentIdentifier = classStudent.studentId || classStudent.uid || classStudent.id || '';
            const studentResults = allExamResults.filter(r => r.studentId === studentIdentifier);
            
            if (studentResults.length === 0) continue;
            
            // Same transformation logic as current student
            const studentSubjects = studentResults.map(r => {
              const subjectName = (r.subject || '').trim();
              const normalizedName = subjectName.toLowerCase();
              const nameWithoutExtraSpaces = subjectName.replace(/\s+/g, ' ').trim();
              
              let subjectCode = (r as any).subjectCode || '';
              
              if (!subjectCode && subjectName) {
                subjectCode = examSubjectCodeMap.get(subjectName) || '';
              }
              if (!subjectCode && subjectName) {
                subjectCode = examSubjectCodeMap.get(normalizedName) || '';
              }
              if (!subjectCode && subjectName) {
                subjectCode = examSubjectCodeMap.get(nameWithoutExtraSpaces) || '';
              }
              
              const subObtainedMarks = r.obtainedMarks || 0;
              const subTotalMarks = r.totalMarks || r.fullMarks || 100;
              const subGPA = r.gpa || (subTotalMarks > 0 ? (subObtainedMarks / subTotalMarks) * 5 : 0);
              const subPercentage = subTotalMarks > 0 ? (subObtainedMarks / subTotalMarks) * 100 : 0;
              
              return {
                subject: r.subject || '',
                subjectCode: subjectCode,
                obtainedMarks: subObtainedMarks,
                totalMarks: subTotalMarks,
                grade: r.grade || '',
                gpa: subGPA,
                percentage: subPercentage
              };
            });

            const totalObtained = studentSubjects.reduce((sum, s) => sum + s.obtainedMarks, 0);
            const totalMarks = studentSubjects.reduce((sum, s) => sum + s.totalMarks, 0);
            
            const averagePercentage = studentSubjects.length > 0
              ? studentSubjects.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) / studentSubjects.length
              : 0;

            const averageGPA = studentSubjects.length > 0
              ? studentSubjects.reduce((sum: number, s: any) => sum + (s.gpa || 0), 0) / studentSubjects.length
              : 0;
            
            let overallGrade = 'F';
            if (averagePercentage >= 80) overallGrade = 'A+';
            else if (averagePercentage >= 70) overallGrade = 'A';
            else if (averagePercentage >= 60) overallGrade = 'A-';
            else if (averagePercentage >= 50) overallGrade = 'B';
            else if (averagePercentage >= 40) overallGrade = 'C';
            else if (averagePercentage >= 33) overallGrade = 'D';

            const isPass = !studentSubjects.some(subject => {
              const { obtainedMarks, totalMarks } = subject;
              if (!obtainedMarks || obtainedMarks === 0) return true;
              if (totalMarks === 100) return obtainedMarks < 33;
              else if (totalMarks === 50) return obtainedMarks < 17;
              else {
                const passPercentage = 33;
                const requiredMarks = Math.ceil((totalMarks * passPercentage) / 100);
                return obtainedMarks < requiredMarks;
              }
            });

            allStudentsResults.push({
              id: studentResults[0].id || '',
              studentName: classStudent.name || classStudent.displayName || '',
              studentId: studentIdentifier,
              class: classStudent.class || '',
              examName: studentResults[0].examName || '',
              examType: studentResults[0].examType || '',
              examDate: studentResults[0].examDate || (studentResults[0].enteredAt?.toDate?.()?.toISOString() || ''),
              examId: examIdForRank,
              subjects: studentSubjects,
              totalObtainedMarks: totalObtained,
              totalMarks: totalMarks,
              overallGPA: Math.round(averageGPA * 100) / 100,
              overallGrade: overallGrade,
              position: 0,
              status: isPass ? 'pass' : 'fail',
              remarks: ''
            });
          }

          // Sort by total marks (descending), then by GPA (descending)
          allStudentsResults.sort((a, b) => {
            if (b.totalObtainedMarks !== a.totalObtainedMarks) {
              return b.totalObtainedMarks - a.totalObtainedMarks;
            }
            return b.overallGPA - a.overallGPA;
          });

          // Assign positions (handle ties - same marks get same rank)
          let currentRank = 1;
          for (let i = 0; i < allStudentsResults.length; i++) {
            if (i > 0) {
              const prevResult = allStudentsResults[i - 1];
              const currentResult = allStudentsResults[i];
              // If marks are different, update rank
              if (currentResult.totalObtainedMarks !== prevResult.totalObtainedMarks || 
                  currentResult.overallGPA !== prevResult.overallGPA) {
                currentRank = i + 1;
              }
            }
            allStudentsResults[i].position = currentRank;
          }

          // Update position for current student's results
          const currentStudentIdentifier = student.studentId || student.uid || student.id || '';
          console.log('🔍 Looking for student:', {
            currentStudentIdentifier,
            allStudentsResults: allStudentsResults.map(r => ({ 
              studentId: r.studentId, 
              name: r.studentName, 
              marks: r.totalObtainedMarks, 
              position: r.position 
            }))
          });
          
          const currentStudentResult = allStudentsResults.find(r => 
            r.studentId === currentStudentIdentifier ||
            r.studentId?.toLowerCase() === currentStudentIdentifier.toLowerCase()
          );
          
          if (currentStudentResult) {
            uniqueResults.forEach(result => {
              result.position = currentStudentResult.position;
            });
            console.log(`✅ Rank calculated: Student ${student.name} - Rank ${currentStudentResult.position} (Total: ${currentStudentResult.totalObtainedMarks}, GPA: ${currentStudentResult.overallGPA})`);
            console.log(`✅ Rank assigned to uniqueResults:`, uniqueResults.map(r => ({ position: r.position, examId: r.examId })));
          } else {
            console.warn('⚠️ Current student not found in rank calculation', {
              searched: currentStudentIdentifier,
              available: allStudentsResults.map(r => r.studentId)
            });
          }
        } catch (error) {
          console.error('Error calculating rank:', error);
          // If rank calculation fails, keep existing position or use index
        }
      } else {
        console.warn('⚠️ Cannot calculate rank: examId not found or no results');
      }
      
      // Navigate to results view page with query parameters
      const params = new URLSearchParams();
      params.set('examination', formData.examination);
      params.set('year', formData.year);
      params.set('board', formData.board);
      params.set('roll', formData.roll);
      params.set('regNo', formData.regNo);
      
      // Store results in sessionStorage temporarily for the new page
      console.log('💾 Storing results to sessionStorage:', uniqueResults.map(r => ({ 
        position: r.position, 
        examId: r.examId,
        studentName: r.studentName,
        totalMarks: r.totalObtainedMarks
      })));
      sessionStorage.setItem('examResults', JSON.stringify(uniqueResults));
      sessionStorage.setItem('studentInfo', JSON.stringify({
        name: student.name || student.displayName,
        class: student.class,
        studentId: student.studentId,
        rollNumber: student.rollNumber || student.studentId,
        registrationNumber: (student as any).registrationNumber,
        fatherName: student.fatherName,
        motherName: student.motherName,
        dateOfBirth: student.dateOfBirth,
        board: formData.board,
        group: (student as any).group
      }));
      
      // Navigate to results view page
      router.push(`/results/view?${params.toString()}`);
      
    } catch (error) {
      console.error('Error searching results:', error);
      setErrors({ roll: 'ফলাফল লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
      setResults([]);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      examination: '',
      year: currentYear,
      board: '',
      roll: '',
      regNo: '',
      captcha: ''
    });
    setErrors({});
    setShowResults(false);
    setResults([]);
    generateCaptcha();
  };

  const getStatusColor = (status: string) => {
    try {
      if (!status) return 'text-gray-600 bg-gray-100';
      switch (status) {
        case 'pass': return 'text-green-600 bg-green-100';
        case 'fail': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    } catch (error) {
      console.error('Error in getStatusColor:', error);
      return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pass': return 'Pass';
      case 'fail': return 'Fail';
      default: return status;
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.includes('A+')) return 'text-green-600 bg-green-100';
    if (grade.includes('A')) return 'text-blue-600 bg-blue-100';
    if (grade.includes('B+')) return 'text-yellow-600 bg-yellow-100';
    if (grade.includes('B')) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date formatting error';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Award className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">পরীক্ষার ফলাফল</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              নিচের তথ্যগুলো দিয়ে আপনার পরীক্ষার ফলাফল দেখুন
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Examination */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  পরীক্ষা :
                </label>
                <select
                  value={formData.examination}
                  onChange={(e) => handleInputChange('examination', e.target.value)}
                  disabled={loadingExams}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.examination ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${loadingExams ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">
                    {loadingExams ? 'পরীক্ষা লোড হচ্ছে...' : 'পরীক্ষা নির্বাচন করুন'}
                  </option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.name || exam.id}>
                      {exam.name || 'নামহীন পরীক্ষা'}
                    </option>
                  ))}
                </select>
                {errors.examination && (
                  <p className="text-red-600 text-sm mt-1">{errors.examination}</p>
                )}
              </div>

              {/* Year / Session */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  বছর (সেশন) :
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.year ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">বছর নির্বাচন করুন</option>
                  {sessions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors.year && (
                  <p className="text-red-600 text-sm mt-1">{errors.year}</p>
                )}
              </div>

              {/* Board */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  বোর্ড :
                </label>
                <select
                  value={formData.board}
                  onChange={(e) => handleInputChange('board', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.board ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">বোর্ড নির্বাচন করুন</option>
                  {generalSettings?.board && (
                    <option value={generalSettings.board}>{generalSettings.board}</option>
                  )}
                </select>
                {errors.board && (
                  <p className="text-red-600 text-sm mt-1">{errors.board}</p>
                )}
              </div>

              {/* Roll */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  রোল :
                </label>
                <input
                  type="text"
                  value={formData.roll}
                  onChange={(e) => handleInputChange('roll', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.roll ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="রোল নম্বর দিন"
                />
                {errors.roll && (
                  <p className="text-red-600 text-sm mt-1">{errors.roll}</p>
                )}
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  রেজি: নং :
                </label>
                <input
                  type="text"
                  value={formData.regNo}
                  onChange={(e) => handleInputChange('regNo', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.regNo ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="রেজিস্ট্রেশন নম্বর দিন"
                />
                {errors.regNo && (
                  <p className="text-red-600 text-sm mt-1">{errors.regNo}</p>
                )}
              </div>

              {/* Captcha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {captcha.num1} + {captcha.num2} =
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.captcha}
                    onChange={(e) => handleInputChange('captcha', e.target.value)}
                    className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.captcha ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="উত্তর"
                  />
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
                {errors.captcha && (
                  <p className="text-red-600 text-sm mt-1">{errors.captcha}</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-center space-x-4 pt-6">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                রিসেট
              </button>
              <button
                type="submit"
                disabled={searching}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>খুঁজছি...</span>
                  </div>
                ) : (
                  'জমা দিন'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results Display */}
      {showResults && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {results.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">কোন ফলাফল পাওয়া যায়নি</h3>
                <p className="text-gray-600">প্রদত্ত তথ্যের জন্য কোন ফলাফল পাওয়া যায়নি। অনুগ্রহ করে আপনার তথ্য পরীক্ষা করে আবার চেষ্টা করুন।</p>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">আপনার ফলাফল</h2>
                {results.map((result) => (
                  <div key={result.id} className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{result.studentName}</h3>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-600">
                            #{result.position}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.status)}`}>
                            {getStatusText(result.status)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(result.overallGrade)}`}>
                            {result.overallGrade} ({result.overallGPA})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{result.studentId}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{result.class}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Award className="w-4 h-4" />
                            <span>{result.examName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(result.examDate)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm">
                          <div>
                            <span className="text-gray-500">মোট নম্বর:</span>
                            <span className="font-semibold text-gray-900 ml-1">
                              {result.totalObtainedMarks}/{result.totalMarks}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">GPA:</span>
                            <span className="font-semibold text-gray-900 ml-1">{result.overallGPA}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">গ্রেড:</span>
                            <span className="font-semibold text-gray-900 ml-1">{result.overallGrade}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subject-wise Results */}
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2" />
                        বিষয়ভিত্তিক ফলাফল
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.subjects.map((subject, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{subject.subject}</div>
                              <div className="text-sm text-gray-600">
                                {subject.obtainedMarks}/{subject.totalMarks} নম্বর
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`px-2 py-1 rounded text-sm font-medium ${getGradeColor(subject.grade)}`}>
                                {subject.grade}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">GPA: {subject.gpa}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">ই</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">{generalSettings?.schoolName || 'আমার স্কুল'}</h3>
            <p className="text-gray-400 mb-4">{generalSettings?.schoolDescription || 'ভালোবাসা দিয়ে শিক্ষা, ইসলামিক মূল্যবোধে জীবন গড়া'}</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>📞 {generalSettings?.schoolPhone || '+৮৮০ ১৭১১ ২৩৪৫৬৭'}</span>
              <span>✉️ {generalSettings?.schoolEmail || 'info@iqraschool.edu'}</span>
              <span>📍 {generalSettings?.schoolAddress || 'ঢাকা, বাংলাদেশ'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PublicResultsPageWrapper() {
  return <PublicResultsPage />;
}