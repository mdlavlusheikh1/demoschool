'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { studentQueries, User as StudentUser, settingsQueries, classQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Home,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  GraduationCap,
  Building,
  CreditCard,
  TrendingUp,
  Search,
  Bell,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Package,
  Heart,
  ArrowLeft,
  Camera,
  Upload,
  AlertCircle,
  CheckCircle,
  Save,
  X as XIcon,
  Globe,
  FileText,
  BookOpen as BookOpenIcon,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  Users as UsersIcon
} from 'lucide-react';
import AlertDialog from '@/components/ui/alert-dialog';

function StudentEditPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();

  const getDateInputValue = (value: any) => {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return '';
    }
    if (value?.toDate) {
      const date = value.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return '';
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }
    return '';
  };
  const searchParams = useSearchParams();
  const studentId = searchParams.get('id');

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  useEffect(() => {
    let firestoreUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        if (studentId) {
          await loadStudent(studentId);
          // Set up real-time listener (only when not actively editing)
          firestoreUnsubscribe = setupRealtimeListener(studentId);
        }
        await loadSettings();
        await loadClassData();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [router, studentId]);

  // Real-time listener for student updates (only updates when not actively saving)
  const setupRealtimeListener = (id: string) => {
    if (!id) return;
    
    const studentRef = doc(db, 'students', id);
    
    const unsubscribe = onSnapshot(studentRef, (docSnapshot) => {
      // Don't update if currently saving to avoid conflicts
      if (isSaving) {
        console.log('⏸️ Skipping real-time update - currently saving');
        return;
      }

      if (docSnapshot.exists()) {
        const studentData = { uid: docSnapshot.id, ...docSnapshot.data() } as StudentUser;
        console.log('🔄 Real-time update received in edit page:', studentData);
        setStudent(studentData);
        if (studentData.profileImage) {
          setImagePreview(studentData.profileImage);
        }
      }
    }, (error) => {
      console.error('Error in real-time listener:', error);
    });

    return unsubscribe;
  };

  const loadStudent = async (id: string) => {
    setStudentLoading(true);
    setError('');

    try {
      const studentData = await studentQueries.getStudentById(id);
      if (studentData) {
        setStudent(studentData);
        if (studentData.profileImage) {
          setImagePreview(studentData.profileImage);
        }
      } else {
        setError('শিক্ষার্থী পাওয়া যায়নি');
      }
    } catch (error) {
      console.error('Error loading student:', error);
      setError('শিক্ষার্থী লোড করতে সমস্যা হয়েছে');
    } finally {
      setStudentLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settingsData = await settingsQueries.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadClassData = async () => {
    try {
      const allClasses = await classQueries.getAllClasses();
      const classNames = [...new Set(allClasses.map(cls => cls.className).filter((name): name is string => Boolean(name)))];
      const sectionNames = [...new Set(allClasses.map(cls => cls.section).filter((section): section is string => Boolean(section)))];
      const groupNames = [...new Set(allClasses.map(cls => cls.group).filter((group): group is string => Boolean(group && group.trim() !== '')))];

      setClasses(classNames.length > 0 ? classNames : ['ক্লাস ১', 'ক্লাস ২', 'ক্লাস ৩', 'ক্লাস ৪', 'ক্লাস ৫', 'ক্লাস ৬', 'ক্লাস ৭', 'ক্লাস ৮', 'ক্লাস ৯', 'ক্লাস ১০']);
      setSections(sectionNames.length > 0 ? sectionNames : ['ক', 'খ', 'গ', 'ঘ']);
      setGroups(groupNames.length > 0 ? groupNames : ['বিজ্ঞান', 'মানবিক', 'বাণিজ্য']);
    } catch (error) {
      console.error('Error loading class data:', error);
      setClasses(['ক্লাস ১', 'ক্লাস ২', 'ক্লাস ৩', 'ক্লাস ৪', 'ক্লাস ৫', 'ক্লাস ৬', 'ক্লাস ৭', 'ক্লাস ৮', 'ক্লাস ৯', 'ক্লাস ১০']);
      setSections(['ক', 'খ', 'গ', 'ঘ']);
      setGroups(['বিজ্ঞান', 'মানবিক', 'বাণিজ্য']);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (student) {
      setStudent({ ...student, [field]: value });
      if (errors[field]) {
        setErrors({ ...errors, [field]: '' });
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && student) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, profileImage: 'ফাইলের আকার ১০MB এর বেশি হতে পারবে না' });
        return;
      }

      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, profileImage: 'শুধুমাত্র ছবি ফাইল আপলোড করুন' });
        return;
      }

      try {
        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

        if (!publicKey || !urlEndpoint) {
          setErrors({ ...errors, profileImage: 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।' });
          setImagePreview(null);
          setStudent({ ...student, profileImage: '' });
          return;
        }

        setErrors({ ...errors, profileImage: '' });

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = event => {
          setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to ImageKit
        const authResponse = await fetch('/api/imagekit');
        if (!authResponse.ok) {
          const authError = await authResponse.json().catch(() => null);
          console.error('ImageKit auth error:', authError);
          setErrors({ ...errors, profileImage: authError?.message || 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।' });
          setImagePreview(null);
          setStudent({ ...student, profileImage: '' });
          return;
        }

        const authData = await authResponse.json();
        const schoolId = settings?.schoolCode || 'AMAR-2026';
        const studentId = student.studentId || `temp-${Date.now()}`;
        const fileName = `student-${studentId}-${Date.now()}`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', fileName);
        formData.append('folder', `/school-management/students/${schoolId}`);
        formData.append('tags', `student,profile,${schoolId},${studentId}`);
        formData.append('publicKey', publicKey);
        formData.append('token', authData.token);
        formData.append('expire', authData.expire?.toString() || '');
        formData.append('signature', authData.signature);

        const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: formData
        });

        const uploadPayload = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok || !uploadPayload?.url) {
          console.error('ImageKit upload failed:', uploadPayload);
          setErrors({ ...errors, profileImage: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
          setImagePreview(null);
          setStudent({ ...student, profileImage: '' });
          return;
        }

        console.log('✅ Image uploaded successfully:', uploadPayload);
        setStudent({ ...student, profileImage: uploadPayload.url as string });
        setImagePreview(uploadPayload.url as string);
      } catch (error) {
        console.error('❌ Error uploading image:', error);
        setErrors({ ...errors, profileImage: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
        setImagePreview(null);
        setStudent({ ...student, profileImage: '' });
      }
    }
  };

  const removeImage = () => {
    if (student) {
      setStudent({ ...student, profileImage: '' });
      setImagePreview(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!student?.name?.trim()) {
      newErrors.name = 'নাম প্রয়োজনীয়';
    }

    if (student?.email && !/\S+@\S+\.\S+/.test(student.email)) {
      newErrors.email = 'সঠিক ইমেইল ফরম্যাট দিন';
    }

    // Validate guardian phone (from father or mother)
    const guardianPhone = (student as any)?.fatherPhone || (student as any)?.motherPhone || student?.guardianPhone;
    if (guardianPhone && !/^01[3-9]\d{8}$/.test(guardianPhone)) {
      newErrors.guardianPhone = 'সঠিক ফোন নম্বর দিন';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveStudent = async () => {
    if (!student || !validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Auto-set guardian info from father (preferred) or mother
      // Typically use father as guardian
      const guardianName = student.fatherName || student.motherName || student.guardianName || '';
      const guardianPhone = (student as any).fatherPhone || (student as any).motherPhone || student.guardianPhone || '';

      // Prepare update data with only the fields that should be updated
      const updateData: any = {
        name: student.name,
        displayName: student.displayName || student.name,
        email: student.email,
        guardianName: guardianName,
        guardianPhone: guardianPhone,
        address: student.address,
        class: student.class,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        dateOfBirth: student.dateOfBirth,
        isActive: student.isActive,
        updatedAt: new Date()
      };

      // Add optional fields only if they have values (not undefined or empty)
      if (student.gender) updateData.gender = student.gender;
      if (student.fatherName) updateData.fatherName = student.fatherName;
      if (student.fatherPhone) updateData.fatherPhone = student.fatherPhone;
      if (student.fatherOccupation) updateData.fatherOccupation = student.fatherOccupation;
      if (student.motherName) updateData.motherName = student.motherName;
      if (student.motherPhone) updateData.motherPhone = student.motherPhone;
      if (student.motherOccupation) updateData.motherOccupation = student.motherOccupation;
      if (student.presentAddress) updateData.presentAddress = student.presentAddress;
      if (student.permanentAddress) updateData.permanentAddress = student.permanentAddress;
      if (student.city) updateData.city = student.city;
      if (student.district) updateData.district = student.district;
      if (student.postalCode) updateData.postalCode = student.postalCode;
      if (student.previousSchool) updateData.previousSchool = student.previousSchool;
      if (student.previousClass) updateData.previousClass = student.previousClass;
      if (student.previousSchoolAddress) updateData.previousSchoolAddress = student.previousSchoolAddress;
      if (student.reasonForLeaving) updateData.reasonForLeaving = student.reasonForLeaving;
      if (student.previousGPA) updateData.previousGPA = student.previousGPA;

      // Only include profileImage if it exists and is not empty
      // Skip if it's a base64 string (data:image) as it's too large for Firestore
      if (student.profileImage && student.profileImage.trim() !== '') {
        // Only save if it's a URL, not a base64 data URL
        if (!student.profileImage.startsWith('data:image')) {
          updateData.profileImage = student.profileImage;
        } else {
          console.warn('Skipping base64 image - too large for Firestore. Please upload to ImageKit first.');
        }
      }

      // Filter out any undefined or null values to prevent Firestore errors
      const cleanedUpdateData: any = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== null) {
          cleanedUpdateData[key] = updateData[key];
        }
      });

      console.log('Updating student with data:', cleanedUpdateData);

      await studentQueries.updateStudent(student.uid, cleanedUpdateData);

      // Show success message with custom alert
      setShowSuccessMessage(true);
      
      // Navigate after showing success
      setTimeout(() => {
        router.push(`/admin/students/view?id=${student.uid}`);
      }, 2000);
    } catch (error) {
      console.error('Error saving student:', error);
      setError('শিক্ষার্থী সংরক্ষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
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
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: true },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: false },
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
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-800 p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">ই</span>
            </div>
            <span className={`text-lg font-bold text-gray-900 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'}`}>
              সুপার অ্যাডমিন
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`text-gray-500 hover:text-gray-700 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </a>
          ))}

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষার্থী সম্পাদনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">শিক্ষার্থীর তথ্য সম্পাদনা করুন</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                  {((userData as any)?.photoURL || user?.photoURL) && !imageError ? (
                    <img
                      src={(userData as any)?.photoURL || user?.photoURL || ''}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <span className="text-white font-medium text-sm">
                      {(user?.email?.charAt(0) || userData?.email?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 bg-gray-50 overflow-y-auto">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push(`/admin/students/view?id=${studentId}`)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>শিক্ষার্থী দেখুন পৃষ্ঠায় ফিরে যান</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Loading State */}
          {studentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">শিক্ষার্থী লোড হচ্ছে...</span>
            </div>
          ) : !student ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">শিক্ষার্থী পাওয়া যায়নি</h3>
              <p className="mt-1 text-sm text-gray-500">এই শিক্ষার্থীটি আর বিদ্যমান নেই</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Student Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {student.displayName?.split(' ')[0].charAt(0) || student.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{student.displayName || student.name || 'Unknown Student'}</h2>
                      <p className="text-gray-600">ID: {student.studentId || 'N/A'}</p>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
                        student.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => router.push(`/admin/students/view?id=${student.uid}`)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>দেখুন</span>
                    </button>
                    <button
                      onClick={handleSaveStudent}
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-6">
                {/* Profile Image Upload */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">প্রোফাইল ছবি</h3>
                  <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">ছবি আপলোড করুন</label>
                      <div className="flex space-x-3">
                        <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                          <Upload className="w-4 h-4" />
                          <span>ছবি নির্বাচন করুন</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        {imagePreview && (
                          <button
                            onClick={removeImage}
                            className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                          >
                            ছবি সরান
                          </button>
                        )}
                      </div>
                      {errors.profileImage && (
                        <p className="text-red-600 text-sm mt-2 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.profileImage}
                        </p>
                      )}
                      <p className="text-gray-500 text-sm mt-2">সর্বোচ্চ ৫MB, JPG, PNG বা GIF ফরম্যাট</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">মৌলিক তথ্য</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">নাম *</label>
                      <input
                        type="text"
                        value={student.name || student.displayName || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="শিক্ষার্থীর পুরো নাম"
                      />
                      {errors.name && (
                        <p className="text-red-600 text-sm mt-1 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ইমেইল</label>
                      <input
                        type="email"
                        value={student.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="student@example.com"
                      />
                      {errors.email && (
                        <p className="text-red-600 text-sm mt-1 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">শিক্ষার্থী আইডি</label>
                      <input
                        type="text"
                        value={student.studentId || ''}
                        onChange={(e) => handleInputChange('studentId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="STD001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">রোল নম্বর</label>
                      <input
                        type="text"
                        value={student.rollNumber || ''}
                        onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="০০১"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">জন্ম তারিখ</label>
                      <input
                        type="date"
                        value={getDateInputValue(student.dateOfBirth)}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাস</label>
                      <select
                        value={student.class || ''}
                        onChange={(e) => handleInputChange('class', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">ক্লাস নির্বাচন করুন</option>
                        {classes.map((className) => (
                          <option key={className} value={className}>
                            {className}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস</label>
                      <select
                        value={student.isActive ? 'active' : 'inactive'}
                        onChange={(e) => {
                          const isActive = e.target.value === 'active';
                          setStudent({ ...student, isActive });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">সক্রিয়</option>
                        <option value="inactive">নিষ্ক্রিয়</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">ঠিকানা</label>
                      <textarea
                        value={student.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="পুরো ঠিকানা"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">পিতার তথ্য</h3>
                  <p className="text-sm text-gray-600 mb-4">পিতার তথ্য অভিভাবক হিসেবে ব্যবহার করা হবে</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পিতার নাম</label>
                      <input
                        type="text"
                        value={student.fatherName || ''}
                        onChange={(e) => handleInputChange('fatherName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="পিতার নাম"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পিতার ফোন</label>
                      <input
                        type="tel"
                        value={student.fatherPhone || ''}
                        onChange={(e) => handleInputChange('fatherPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="01712345678"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পিতার পেশা</label>
                      <input
                        type="text"
                        value={student.fatherOccupation || ''}
                        onChange={(e) => handleInputChange('fatherOccupation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="পিতার পেশা"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">মাতার তথ্য</h3>
                  <p className="text-sm text-gray-600 mb-4">পিতার তথ্য না থাকলে মাতার তথ্য অভিভাবক হিসেবে ব্যবহার করা হবে</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">মাতার নাম</label>
                      <input
                        type="text"
                        value={student.motherName || ''}
                        onChange={(e) => handleInputChange('motherName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="মাতার নাম"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">মাতার ফোন</label>
                      <input
                        type="tel"
                        value={student.motherPhone || ''}
                        onChange={(e) => handleInputChange('motherPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="01712345678"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">মাতার পেশা</label>
                      <input
                        type="text"
                        value={student.motherOccupation || ''}
                        onChange={(e) => handleInputChange('motherOccupation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="মাতার পেশা"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">পূর্ববর্তী স্কুল তথ্য</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী স্কুল</label>
                      <input
                        type="text"
                        value={student.previousSchool || ''}
                        onChange={(e) => handleInputChange('previousSchool', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="পূর্ববর্তী স্কুল"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী ক্লাস</label>
                      <input
                        type="text"
                        value={student.previousClass || ''}
                        onChange={(e) => handleInputChange('previousClass', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="পূর্ববর্তী ক্লাস"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী GPA</label>
                      <input
                        type="text"
                        value={student.previousGPA || ''}
                        onChange={(e) => handleInputChange('previousGPA', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="GPA"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">স্কুল পরিবর্তনের কারণ</label>
                      <textarea
                        value={student.reasonForLeaving || ''}
                        onChange={(e) => handleInputChange('reasonForLeaving', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="কারণ"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Alert Dialog */}
      <AlertDialog
        isOpen={showSuccessMessage}
        onClose={() => {
          setShowSuccessMessage(false);
          router.push(`/admin/students/view?id=${student?.uid}`);
        }}
        type="success"
        title="সফল!"
        message="শিক্ষার্থীর তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!"
        confirmText="ঠিক আছে"
      />
    </div>
  );
}

export default function StudentEditPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <StudentEditPage />
    </ProtectedRoute>
  );
}
