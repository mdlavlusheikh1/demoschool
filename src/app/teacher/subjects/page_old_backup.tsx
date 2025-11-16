'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { subjectQueries, classQueries, Subject, Class, settingsQueries } from '@/lib/database-queries';
import {
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Plus, Edit, Trash2, Eye, Clock, Book, FileText,
  Package, Loader2, RefreshCw, ChevronDown,
  Globe,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  AlertCircle,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
  Wallet,
  FolderOpen,
  UserPlus,
  Wrench,
} from 'lucide-react';
import AlertDialog from '@/components/ui/alert-dialog';

function SubjectsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Subject management states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Classes management states
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<any>(null);

  // Form states
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    nameEn: '',
    code: '',
    teacherName: '',
    selectedClasses: [] as string[],
    type: 'মূল' as 'মূল' | 'ধর্মীয়' | 'ঐচ্ছিক',
    description: '',
    totalMarks: 100
  });

  // Dropdown states
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  // Alert dialog states
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Load settings first, then subjects and classes
        await loadSettings();
        loadSubjects();
        loadClasses();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    // Reload subjects when window regains focus (in case subjects were created in other pages)
    const handleFocus = () => {
      console.log('🔄 Subjects page focused, reloading from Firebase...');
      loadSubjects();
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (isClassDropdownOpen && !(event.target as Element).closest('.class-dropdown')) {
        setIsClassDropdownOpen(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('click', handleClickOutside);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [router, isClassDropdownOpen]);

  // Reload subjects when settings change
  useEffect(() => {
    if (settings && user) {
      console.log('🔄 Settings updated, reloading subjects...');
      loadSubjects();
    }
  }, [settings]);

  // Load settings from Firebase
  const loadSettings = async () => {
    try {
      const settingsData = await settingsQueries.getSettings();
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Load subjects from Firebase
  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const schoolId = settings?.schoolCode || '102330';
      let subjectsData = await subjectQueries.getActiveSubjects(schoolId);

      // Filter out exam-specific subjects - only show regular subjects in main subjects page
      subjectsData = subjectsData.filter(subject => !subject.isExamSubject);

      // Show only real subjects, don't create samples automatically
      console.log('Loaded subjects from Firebase:', subjectsData.length);
      console.log('Filtered out exam-specific subjects');

      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
      setSubjects([]);
      setSubjectsError('বিষয়সমূহ লোড করতে ব্যর্থ হয়েছে। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।');
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Load classes from Firebase
  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      console.log('🔄 Starting to load classes from database...');

      const schoolId = settings?.schoolCode || '102330';
      console.log('🏫 Loading classes for school ID:', schoolId);

      let classesData = await classQueries.getClassesBySchool(schoolId);
      console.log('📋 Classes data received:', classesData);

      setClasses(classesData);
      console.log('✅ Classes loaded from database:', classesData.length, 'classes');
    } catch (error) {
      console.error('❌ Error loading classes:', error);
      setClasses([]); // Set empty array on error
    } finally {
      setLoadingClasses(false);
    }
  };

  // Handle create subject
  const handleCreateSubject = async () => {
    if (!subjectForm.name || !subjectForm.code || subjectForm.selectedClasses.length === 0 || !subjectForm.totalMarks) {
      setAlertDialog({
        isOpen: true,
        type: 'warning',
        title: 'সতর্কতা!',
        message: 'অনুগ্রহ করে বিষয়ের নাম, কোড, ক্লাস এবং মোট নম্বর নির্ধারণ করুন।'
      });
      return;
    }

    try {
      const subjectData = {
        name: subjectForm.name,
        nameEn: subjectForm.nameEn || subjectForm.name,
        code: subjectForm.code,
        teacherName: subjectForm.teacherName,
        classes: subjectForm.selectedClasses,
        students: 0, // Default value
        credits: 1, // Default value
        type: subjectForm.type,
        description: subjectForm.description,
        totalMarks: subjectForm.totalMarks,
        schoolId: settings?.schoolCode || '102330',
        createdBy: user?.email || 'admin',
        isActive: true
      };

      await subjectQueries.createSubject(subjectData);
      setShowCreateDialog(false);
      resetForm();
      loadSubjects(); // Reload subjects
      setAlertDialog({
        isOpen: true,
        type: 'success',
        title: 'সফল!',
        message: 'বিষয় সফলভাবে তৈরি করা হয়েছে!'
      });
    } catch (error) {
      console.error('Error creating subject:', error);
      setAlertDialog({
        isOpen: true,
        type: 'error',
        title: 'ত্রুটি!',
        message: 'বিষয় তৈরি করতে ত্রুটি হয়েছে।'
      });
    }
  };

  // Handle edit subject
  const handleEditSubject = async () => {
    if (!selectedSubject || !subjectForm.name || !subjectForm.code || subjectForm.selectedClasses.length === 0 || !subjectForm.totalMarks) {
      setAlertDialog({
        isOpen: true,
        type: 'warning',
        title: 'সতর্কতা!',
        message: 'অনুগ্রহ করে বিষয়ের নাম, কোড, ক্লাস এবং মোট নম্বর নির্ধারণ করুন।'
      });
      return;
    }

    if (!selectedSubject.id) {
      setAlertDialog({
        isOpen: true,
        type: 'error',
        title: 'ত্রুটি!',
        message: 'বিষয়ের আইডি পাওয়া যায়নি।'
      });
      return;
    }

    try {
      // Build updates object, only including fields that need to be updated
      const updates: Partial<Subject> = {
        name: subjectForm.name,
        nameEn: subjectForm.nameEn || subjectForm.name,
        code: subjectForm.code,
        teacherName: subjectForm.teacherName || '',
        classes: subjectForm.selectedClasses,
        type: subjectForm.type,
        description: subjectForm.description || '',
        totalMarks: subjectForm.totalMarks
      };

      // Preserve existing values if they exist
      if (selectedSubject.students !== undefined) {
        updates.students = selectedSubject.students;
      }
      if (selectedSubject.credits !== undefined) {
        updates.credits = selectedSubject.credits;
      }
      if (selectedSubject.schoolId) {
        updates.schoolId = selectedSubject.schoolId;
      }
      if (selectedSubject.createdBy) {
        updates.createdBy = selectedSubject.createdBy;
      }
      if (selectedSubject.isActive !== undefined) {
        updates.isActive = selectedSubject.isActive;
      }
      if (selectedSubject.isExamSubject !== undefined) {
        updates.isExamSubject = selectedSubject.isExamSubject;
      }

      console.log('🔄 Updating subject:', {
        id: selectedSubject.id,
        updates: updates,
        originalSubject: selectedSubject
      });

      if (!selectedSubject.id || !selectedSubject.id.trim()) {
        throw new Error('Invalid subject ID');
      }

      await subjectQueries.updateSubject(selectedSubject.id, updates);
      
      console.log('✅ Subject updated successfully');
      
      setShowEditDialog(false);
      setSelectedSubject(null);
      resetForm();
      await loadSubjects(); // Reload subjects
      setAlertDialog({
        isOpen: true,
        type: 'success',
        title: 'সফল!',
        message: 'বিষয় সফলভাবে আপডেট করা হয়েছে!'
      });
    } catch (error) {
      console.error('❌ Error updating subject:', error);
      console.error('Subject ID:', selectedSubject?.id);
      console.error('Selected Subject:', selectedSubject);
      setAlertDialog({
        isOpen: true,
        type: 'error',
        title: 'ত্রুটি!',
        message: `বিষয় আপডেট করতে ত্রুটি হয়েছে: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle delete subject
  const handleDeleteSubject = async () => {
    if (!selectedSubject || !selectedSubject.id) return;

    try {
      await subjectQueries.deleteSubject(selectedSubject.id);
      setShowDeleteDialog(false);
      setSelectedSubject(null);
      loadSubjects(); // Reload subjects
      setAlertDialog({
        isOpen: true,
        type: 'success',
        title: 'সফল!',
        message: 'বিষয় সফলভাবে মুছে ফেলা হয়েছে!'
      });
    } catch (error) {
      console.error('Error deleting subject:', error);
      setAlertDialog({
        isOpen: true,
        type: 'error',
        title: 'ত্রুটি!',
        message: 'বিষয় মুছে ফেলতে ত্রুটি হয়েছে।'
      });
    }
  };

  // Generate next sequential subject code
  const generateNextSubjectCode = (): string => {
    if (!subjects || subjects.length === 0) {
      return '101'; // Start from 101 if no subjects exist
    }

    // Extract numeric codes from existing subjects
    const numericCodes = subjects
      .map(sub => {
        const code = sub.code || '';
        // Extract numeric part (could be pure number like "101" or with prefix like "BAN101")
        const numericMatch = code.match(/\d+/);
        return numericMatch ? parseInt(numericMatch[0], 10) : null;
      })
      .filter((num): num is number => num !== null && num >= 100 && num < 10000); // Filter valid codes (100-9999)

    if (numericCodes.length === 0) {
      return '101'; // Default start if no valid codes found
    }

    // Find the highest code
    const highestCode = Math.max(...numericCodes);
    
    // Generate next sequential code
    const nextCode = highestCode + 1;
    
    // Return as 3-digit string (101, 102, 103...)
    return nextCode.toString().padStart(3, '0');
  };

  // Open edit dialog with subject data
  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setSubjectForm({
      name: subject.name || '',
      nameEn: subject.nameEn || '',
      code: subject.code || '',
      teacherName: subject.teacherName || '',
      selectedClasses: subject.classes || [],
      type: subject.type || 'মূল',
      description: subject.description || '',
      totalMarks: (subject.totalMarks !== undefined) ? subject.totalMarks : 100
    });
    setShowEditDialog(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowDeleteDialog(true);
  };

  // Reset form
  const resetForm = () => {
    const nextCode = generateNextSubjectCode();
    setSubjectForm({
      name: '',
      nameEn: '',
      code: nextCode, // Auto-generate next sequential code
      teacherName: '',
      selectedClasses: [],
      type: 'মূল' as 'মূল' | 'ধর্মীয়' | 'ঐচ্ছিক',
      description: '',
      totalMarks: 100
    });
    setIsClassDropdownOpen(false);
  };

  // Handle class selection
  const handleClassToggle = (className: string) => {
    setSubjectForm(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(className)
        ? prev.selectedClasses.filter(c => c !== className)
        : [...prev.selectedClasses, className]
    }));
  };

  // Filter subjects based on search
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    if (!auth) {
      console.error('Auth not initialized');
      return;
    }

    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: true },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Award, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: Bell, label: 'নোটিশ', href: '/admin/notice', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];


  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">ই</span>
            </div>
            <span className="text-lg font-bold text-gray-900">সুপার অ্যাডমিন</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {menuItems.map((item) => (
            <a key={item.label} href={item.href} className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </a>
          ))}
          <button onClick={handleLogout} className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 mr-4">
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">বিষয় ব্যবস্থাপনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">সকল বিষয়ের তথ্য দেখুন এবং পরিচালনা করুন</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 h-full">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="বিষয় খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                  />
                </div>
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{user?.email?.charAt(0).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">বিষয় তালিকা</h2>
              <p className="text-gray-600">মোট {filteredSubjects.length} টি বিষয়</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setSubjectsError('');
                  loadSubjects();
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>রিফ্রেশ</span>
              </button>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন বিষয়</span>
              </button>
            </div>
          </div>

          {subjectsError ? (
            <div className="col-span-full text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h3 className="text-lg font-medium text-red-900 mb-2">লোড করতে ত্রুটি হয়েছে</h3>
                <p className="text-red-700 mb-4">{subjectsError}</p>
                <button
                  onClick={() => {
                    setSubjectsError('');
                    loadSubjects();
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>আবার চেষ্টা করুন</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {loadingSubjects ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">বিষয় লোড হচ্ছে...</span>
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Book className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো বিষয় পাওয়া যায়নি</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'অনুসন্ধান ফিল্টার পরিবর্তন করুন' : 'নতুন বিষয় যোগ করুন'}
                  </p>
                </div>
              ) : (
              filteredSubjects.map((subject) => (
              <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Book className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                      <p className="text-sm text-gray-500">{subject.code}</p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    subject.type === 'মূল' ? 'bg-blue-100 text-blue-800' : 
                    subject.type === 'ধর্মীয়' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {subject.type}
                  </span>
                </div>
                
                <div className="space-y-3 mb-4">
                 <div className="flex items-center text-sm text-gray-600">
                   <GraduationCap className="w-4 h-4 mr-2 text-blue-500" />
                   <span>{subject.teacherName}</span>
                 </div>
                 <div className="flex items-center text-sm text-gray-600">
                   <Users className="w-4 h-4 mr-2 text-green-500" />
                   <span>{subject.students} জন শিক্ষার্থী</span>
                 </div>
                 <div className="flex items-center text-sm text-gray-600">
                   <FileText className="w-4 h-4 mr-2 text-orange-500" />
                   <span>{subject.credits} ক্রেডিট</span>
                 </div>
                 <div className="flex items-center text-sm text-gray-600">
                   <Book className="w-4 h-4 mr-2 text-purple-500" />
                   <span>{subject.totalMarks || 100} নম্বর</span>
                 </div>
                 <div className="text-sm text-gray-600">
                   <span className="font-medium">ক্লাসঃ </span>
                   {subject.classes.join(', ')}
                 </div>
               </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 line-clamp-2">{subject.description}</p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/admin/subjects/${subject.id}`)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-100 flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>দেখুন</span>
                  </button>
                  <button
                    onClick={() => openEditDialog(subject)}
                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm hover:bg-green-100 flex items-center justify-center space-x-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span>সম্পাদনা</span>
                  </button>
                  <button
                    onClick={() => openDeleteDialog(subject)}
                    className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
            )}
          </div>
        )}
        </div>
      </div>

      {/* Create Subject Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">নতুন বিষয় যোগ করুন</h2>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    বিষয়ের নাম (বাংলা) *
                  </label>
                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="যেমন: গণিত"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    বিষয়ের নাম (ইংরেজি)
                  </label>
                  <input
                    type="text"
                    value={subjectForm.nameEn}
                    onChange={(e) => setSubjectForm({...subjectForm, nameEn: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mathematics (ঐচ্ছিক)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    কোড *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={subjectForm.code}
                      onChange={(e) => setSubjectForm({...subjectForm, code: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="101"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nextCode = generateNextSubjectCode();
                        setSubjectForm({...subjectForm, code: nextCode});
                      }}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium whitespace-nowrap"
                      title="পরবর্তী ক্রমিক কোড জেনারেট করুন"
                    >
                      Auto
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">সিরিয়াল: 101, 102, 103, 104... (Auto বাটনে ক্লিক করুন)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    শিক্ষকের নাম
                  </label>
                  <input
                    type="text"
                    value={subjectForm.teacherName}
                    onChange={(e) => setSubjectForm({...subjectForm, teacherName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="শিক্ষকের নাম (ঐচ্ছিক)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ক্লাস নির্বাচন করুন *
                  </label>
                  <div className="relative class-dropdown">
                    <button
                      type="button"
                      onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between"
                      disabled={loadingClasses}
                    >
                      <span className="text-gray-700">
                        {subjectForm.selectedClasses.length === 0
                          ? 'ক্লাস নির্বাচন করুন'
                          : `${subjectForm.selectedClasses.length} টি ক্লাস নির্বাচিত`
                        }
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {isClassDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loadingClasses ? (
                          <div className="px-3 py-2 text-gray-500">ক্লাস লোড হচ্ছে...</div>
                        ) : classes.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500">কোনো ক্লাস পাওয়া যায়নি</div>
                        ) : (
                          classes.map((classItem) => (
                            <div
                              key={classItem.classId}
                              className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center"
                              onClick={() => handleClassToggle(classItem.className)}
                            >
                              <input
                                type="checkbox"
                                checked={subjectForm.selectedClasses.includes(classItem.className)}
                                onChange={() => {}} // Handled by onClick
                                className="mr-2"
                              />
                              <span className="text-sm">
                                {classItem.className} {classItem.section ? `(${classItem.section})` : ''}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {subjectForm.selectedClasses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {subjectForm.selectedClasses.map((className) => (
                        <span
                          key={className}
                          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {className}
                          <button
                            type="button"
                            onClick={() => handleClassToggle(className)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ধরন
                  </label>
                  <select
                    value={subjectForm.type}
                    onChange={(e) => setSubjectForm({...subjectForm, type: e.target.value as 'মূল' | 'ধর্মীয়' | 'ঐচ্ছিক'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="মূল">মূল</option>
                    <option value="ধর্মীয়">ধর্মীয়</option>
                    <option value="ঐচ্ছিক">ঐচ্ছিক</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  মোট নম্বর *
                </label>
                <input
                  type="text"
                  value={subjectForm.totalMarks}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow Bengali numerals and convert to English for storage
                    const englishNumber = value.replace(/[০-৯]/g, (match) => {
                      const bengaliToEnglish: {[key: string]: string} = {
                        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
                        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
                      };
                      return bengaliToEnglish[match] || match;
                    });
                    setSubjectForm({...subjectForm, totalMarks: parseInt(englishNumber) || 100});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="১০০"
                />
                <p className="text-xs text-gray-500 mt-1">
                  বিষয়ের জন্য সর্বমোট নম্বর (সাধারণত ১০০)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  বিবরণ
                </label>
                <textarea
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({...subjectForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="বিষয়ের বিস্তারিত বিবরণ..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleCreateSubject}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>তৈরি করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Dialog */}
      {showEditDialog && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">বিষয় সম্পাদনা করুন</h2>
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedSubject(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Same form fields as create dialog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    বিষয়ের নাম (বাংলা) *
                  </label>
                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    বিষয়ের নাম (ইংরেজি)
                  </label>
                  <input
                    type="text"
                    value={subjectForm.nameEn}
                    onChange={(e) => setSubjectForm({...subjectForm, nameEn: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mathematics (ঐচ্ছিক)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    কোড *
                  </label>
                  <input
                    type="text"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({...subjectForm, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    শিক্ষকের নাম
                  </label>
                  <input
                    type="text"
                    value={subjectForm.teacherName}
                    onChange={(e) => setSubjectForm({...subjectForm, teacherName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="শিক্ষকের নাম (ঐচ্ছিক)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ক্লাস নির্বাচন করুন *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between"
                      disabled={loadingClasses}
                    >
                      <span className="text-gray-700">
                        {subjectForm.selectedClasses.length === 0
                          ? 'ক্লাস নির্বাচন করুন'
                          : `${subjectForm.selectedClasses.length} টি ক্লাস নির্বাচিত`
                        }
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {isClassDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loadingClasses ? (
                          <div className="px-3 py-2 text-gray-500">ক্লাস লোড হচ্ছে...</div>
                        ) : classes.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500">কোনো ক্লাস পাওয়া যায়নি</div>
                        ) : (
                          classes.map((classItem) => (
                            <div
                              key={classItem.classId}
                              className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center"
                              onClick={() => handleClassToggle(classItem.className)}
                            >
                              <input
                                type="checkbox"
                                checked={subjectForm.selectedClasses.includes(classItem.className)}
                                onChange={() => {}} // Handled by onClick
                                className="mr-2"
                              />
                              <span className="text-sm">
                                {classItem.className} {classItem.section ? `(${classItem.section})` : ''}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {subjectForm.selectedClasses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {subjectForm.selectedClasses.map((className) => (
                        <span
                          key={className}
                          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {className}
                          <button
                            type="button"
                            onClick={() => handleClassToggle(className)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ধরন
                  </label>
                  <select
                    value={subjectForm.type}
                    onChange={(e) => setSubjectForm({...subjectForm, type: e.target.value as 'মূল' | 'ধর্মীয়' | 'ঐচ্ছিক'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="মূল">মূল</option>
                    <option value="ধর্মীয়">ধর্মীয়</option>
                    <option value="ঐচ্ছিক">ঐচ্ছিক</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  মোট নম্বর *
                </label>
                <input
                  type="text"
                  value={subjectForm.totalMarks}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow Bengali numerals and convert to English for storage
                    const englishNumber = value.replace(/[০-৯]/g, (match) => {
                      const bengaliToEnglish: {[key: string]: string} = {
                        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
                        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
                      };
                      return bengaliToEnglish[match] || match;
                    });
                    setSubjectForm({...subjectForm, totalMarks: parseInt(englishNumber) || 100});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="১০০"
                />
                <p className="text-xs text-gray-500 mt-1">
                  বিষয়ের জন্য সর্বমোট নম্বর (সাধারণত ১০০)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  বিবরণ
                </label>
                <textarea
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({...subjectForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedSubject(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleEditSubject}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>আপডেট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">বিষয় মুছে ফেলুন</h2>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedSubject(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    আপনি কি নিশ্চিত যে <strong>{selectedSubject.name}</strong> বিষয়টি মুছে ফেলতে চান?
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    এই কাজটি অপরিবর্তনীয় এবং সকল সম্পর্কিত ডেটা মুছে যাবে।
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedSubject(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleDeleteSubject}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        type={alertDialog.type}
        title={alertDialog.title}
        message={alertDialog.message}
        confirmText="ঠিক আছে"
      />
    </div>
  );
}

export default function SubjectsPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <SubjectsPage />
    </ProtectedRoute>
  );
}
