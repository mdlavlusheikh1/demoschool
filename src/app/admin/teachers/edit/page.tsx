'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { teacherQueries, settingsQueries, User as TeacherUser } from '@/lib/database-queries';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';
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
  Edit,
  Trash2,
  Eye,
  Package,
  Upload,
  Camera,
  AlertCircle,
  CheckCircle,
  Info,
  MapPin,
  Briefcase,
  Award,
  Calendar as CalendarIcon,
  DollarSign,
  Phone,
  Mail,
  User,
  FileText,
  Save,
  ArrowLeft,
  Globe,
  BookOpen as BookOpenIcon,
  MessageSquare,
  Gift,
  Sparkles,
  Users as UsersIcon
} from 'lucide-react';

function EditTeacherPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get('id');
  const { userData } = useAuth();

  // Teacher form state
  const [editTeacher, setEditTeacher] = useState({
    // Personal Information
    name: '',
    displayName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    nationality: 'বাংলাদেশী',
    religion: '',
    bloodGroup: '',
    fatherName: '',
    motherName: '',
    nationalId: '',
    nidNumber: '',

    // Professional Information
    subject: '',
    qualification: '',
    experience: '',
    specialization: '',
    joinDate: '',
    employeeId: '',
    department: '',
    designation: '',
    salary: '',
    employmentType: 'full-time',

    // Address Information
    presentAddress: '',
    permanentAddress: '',
    city: '',
    district: '',
    postalCode: '',
    country: 'Bangladesh',

    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',

    // Additional Information
    profileImage: null as File | null,
    resume: null as File | null,
    certificates: [] as File[],
    languages: '',
    skills: '',
    achievements: '',
    publications: '',
    researchInterests: '',

    // System Fields
    isActive: true,
    role: 'teacher' as const,
    schoolId: '',
    schoolName: ''
  });

  // Subject options
  const subjectOptions = [
    'বাংলা', 'ইংরেজি', 'গণিত', 'বিজ্ঞান', 'সামাজিক বিজ্ঞান', 'ধর্মীয় শিক্ষা',
    'আরবি', 'কুরআন', 'হাদিস', 'ফিকহ', 'আকাইদ', 'তাজবিদ', 'কম্পিউটার',
    'শারীরিক শিক্ষা', 'চারুকলা', 'সংগীত', 'নাচ', 'ভাষা শিক্ষা'
  ];

  const qualificationOptions = [
    'এসএসসি', 'এইচএসসি', 'স্নাতক', 'স্নাতকোত্তর', 'ডক্টরেট',
    'মাদ্রাসা শিক্ষা', 'দাওরা হাদিস', 'তাকমিল', 'আলিম', 'ফাজিল', 'কামিল'
  ];

  const experienceOptions = [
    '১ বছরের কম', '১-২ বছর', '২-৫ বছর', '৫-১০ বছর',
    '১০-১৫ বছর', '১৫-২০ বছর', '২০ বছরের বেশি'
  ];

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        if (teacherId) {
          loadTeacher(teacherId);
        }
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, teacherId]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const systemSettings = await settingsQueries.getSettings();
        setSettings(systemSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const loadTeacher = async (id: string) => {
    setTeacherLoading(true);

    try {
      const teacherData = await teacherQueries.getTeacherById(id);
      if (teacherData) {
        setTeacher(teacherData);
        // Populate form with existing data
        setEditTeacher({
          name: teacherData.name || '',
          displayName: teacherData.displayName || '',
          email: teacherData.email || '',
          phoneNumber: teacherData.phoneNumber || teacherData.phone || '',
          dateOfBirth: teacherData.dateOfBirth || '',
          gender: teacherData.gender || '',
          maritalStatus: teacherData.maritalStatus || '',
          nationality: teacherData.nationality || 'বাংলাদেশী',
          religion: teacherData.religion || '',
          bloodGroup: teacherData.bloodGroup || '',
          fatherName: teacherData.fatherName || '',
          motherName: teacherData.motherName || '',
          nationalId: teacherData.nationalId || '',
          nidNumber: teacherData.nidNumber || '',

          subject: teacherData.subject || '',
          qualification: teacherData.qualification || '',
          experience: teacherData.experience || '',
          specialization: teacherData.specialization || '',
          joinDate: teacherData.joinDate || '',
          employeeId: teacherData.employeeId || '',
          department: teacherData.department || '',
          designation: teacherData.designation || '',
          salary: teacherData.salary?.toString() || '',
          employmentType: teacherData.employmentType || 'full-time',

          presentAddress: teacherData.address || '',
          permanentAddress: teacherData.permanentAddress || '',
          city: teacherData.city || '',
          district: teacherData.district || '',
          postalCode: teacherData.postalCode || '',
          country: teacherData.country || 'Bangladesh',

          emergencyContactName: teacherData.emergencyContactName || '',
          emergencyContactPhone: teacherData.emergencyContactPhone || '',
          emergencyContactRelation: teacherData.emergencyContactRelation || '',

          profileImage: teacherData.profileImage || null,
          resume: null,
          certificates: [],
          languages: teacherData.languages || '',
          skills: teacherData.skills || '',
          achievements: teacherData.achievements || '',
          publications: teacherData.publications || '',
          researchInterests: teacherData.researchInterests || '',

          isActive: teacherData.isActive,
          role: 'teacher',
          schoolId: teacherData.schoolId || '',
          schoolName: teacherData.schoolName || ''
        });

        // Set image preview if exists
        if (teacherData.profileImage) {
          setImagePreview(teacherData.profileImage);
        }
      } else {
        alert('শিক্ষক পাওয়া যায়নি');
        router.push('/admin/teachers');
      }
    } catch (error) {
      console.error('Error loading teacher:', error);
      alert('শিক্ষক লোড করতে সমস্যা হয়েছে');
      router.push('/admin/teachers');
    } finally {
      setTeacherLoading(false);
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
    setEditTeacher({ ...editTeacher, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

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
        setImagePreview(teacher?.profileImage || null);
        setEditTeacher(prev => ({ ...prev, profileImage: null }));
        return;
      }

      setErrors({ ...errors, profileImage: '' });

      const reader = new FileReader();
      reader.onload = event => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      const authResponse = await fetch('/api/imagekit', { cache: 'no-store' });
      if (!authResponse.ok) {
        const authError = await authResponse.json().catch(() => null);
        console.error('ImageKit auth error:', authError);
        setErrors({ ...errors, profileImage: authError?.message || 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।' });
        setImagePreview(teacher?.profileImage || null);
        setEditTeacher(prev => ({ ...prev, profileImage: null }));
        return;
      }

      const authData = await authResponse.json();
      const settings = await settingsQueries.getSettings();
      const schoolId = settings?.schoolCode || SCHOOL_ID;
      const teacherIdValue = teacher?.employeeId || `teacher-${teacher?.uid || Date.now()}`;
      const fileName = `teacher-${teacherIdValue}-${Date.now()}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('folder', `/school-management/teachers/${schoolId}`);
      formData.append('tags', `teacher,profile,${schoolId},${teacherIdValue}`);
      formData.append('publicKey', publicKey);
      formData.append('token', authData.token);
      formData.append('expire', authData.expire?.toString() || '');
      formData.append('signature', authData.signature);

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData,
        cache: 'no-store'
      });

      const uploadPayload = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok || !uploadPayload?.url) {
        console.error('ImageKit upload failed:', uploadPayload);
        setErrors({ ...errors, profileImage: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
        setImagePreview(teacher?.profileImage || null);
        setEditTeacher(prev => ({ ...prev, profileImage: null }));
        return;
      }

      setEditTeacher(prev => ({
        ...prev,
        profileImage: uploadPayload.url as string
      }));
      setImagePreview(uploadPayload.url as string);
      setTeacher(prev => prev ? { ...prev, profileImage: uploadPayload.url as string } : prev);
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      setErrors({ ...errors, profileImage: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
      setImagePreview(teacher?.profileImage || null);
      setEditTeacher(prev => ({ ...prev, profileImage: null }));
    }
  };

  const removeImage = () => {
    setEditTeacher({ ...editTeacher, profileImage: null });
    setImagePreview(teacher?.profileImage || null);
    setTeacher(prev => prev ? { ...prev, profileImage: null } : prev);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!editTeacher.name.trim()) {
      newErrors.name = 'নাম প্রয়োজনীয়';
    }

    if (!editTeacher.email.trim()) {
      newErrors.email = 'ইমেইল প্রয়োজনীয়';
    } else if (!/\S+@\S+\.\S+/.test(editTeacher.email)) {
      newErrors.email = 'সঠিক ইমেইল ফরম্যাট দিন';
    }

    if (!editTeacher.phoneNumber.trim()) {
      newErrors.phoneNumber = 'ফোন নম্বর প্রয়োজনীয়';
    } else if (!/^01[3-9]\d{8}$/.test(editTeacher.phoneNumber)) {
      newErrors.phoneNumber = 'সঠিক ফোন নম্বর দিন';
    }

    if (!editTeacher.subject.trim()) {
      newErrors.subject = 'বিষয় প্রয়োজনীয়';
    }

    if (!editTeacher.qualification.trim()) {
      newErrors.qualification = 'যোগ্যতা প্রয়োজনীয়';
    }

    if (!editTeacher.experience.trim()) {
      newErrors.experience = 'অভিজ্ঞতা প্রয়োজনীয়';
    }

    if (!editTeacher.joinDate.trim()) {
      newErrors.joinDate = 'যোগদানের তারিখ প্রয়োজনীয়';
    }

    if (!editTeacher.department.trim()) {
      newErrors.department = 'বিভাগ প্রয়োজনীয়';
    }

    if (!editTeacher.designation.trim()) {
      newErrors.designation = 'পদবী প্রয়োজনীয়';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveTeacher = async () => {
    if (!validateForm() || !teacher) {
      return;
    }

    setIsSaving(true);
    try {
      const teacherData: Partial<TeacherUser> = {
        name: editTeacher.name,
        displayName: editTeacher.name,
        email: editTeacher.email,
        phoneNumber: editTeacher.phoneNumber,
        dateOfBirth: editTeacher.dateOfBirth,
        gender: editTeacher.gender,
        maritalStatus: editTeacher.maritalStatus,
        nationality: editTeacher.nationality,
        religion: editTeacher.religion,
        bloodGroup: editTeacher.bloodGroup,
        fatherName: editTeacher.fatherName,
        motherName: editTeacher.motherName,
        nationalId: editTeacher.nationalId,

        // Professional Information
        subject: editTeacher.subject,
        qualification: editTeacher.qualification,
        experience: editTeacher.experience,
        specialization: editTeacher.specialization,
        joinDate: editTeacher.joinDate,
        employeeId: editTeacher.employeeId,
        department: editTeacher.department,
        designation: editTeacher.designation,
        salary: parseFloat(editTeacher.salary) || 0,
        employmentType: editTeacher.employmentType,

        // Address Information
        address: editTeacher.presentAddress,
        city: editTeacher.city,
        district: editTeacher.district,
        postalCode: editTeacher.postalCode,
        country: editTeacher.country,

        // Emergency Contact
        emergencyContactName: editTeacher.emergencyContactName,
        emergencyContactPhone: editTeacher.emergencyContactPhone,
        emergencyContactRelation: editTeacher.emergencyContactRelation,

        // Additional Information
        languages: editTeacher.languages,
        skills: editTeacher.skills,
        achievements: editTeacher.achievements,
        publications: editTeacher.publications,
        researchInterests: editTeacher.researchInterests,

        // System Fields
        isActive: editTeacher.isActive,
        role: 'teacher',
        schoolId: editTeacher.schoolId,
        schoolName: editTeacher.schoolName
      };

      // Add profile image if it was uploaded or updated (should be a string URL after upload)
      if (editTeacher.profileImage && typeof editTeacher.profileImage === 'string') {
        teacherData.profileImage = editTeacher.profileImage;
      } else if (teacher.profileImage) {
        // Keep existing profile image if no new one uploaded
        teacherData.profileImage = teacher.profileImage;
      }

      console.log('💾 Updating teacher with profileImage:', teacherData.profileImage);

      await teacherQueries.updateTeacher(teacher.uid, teacherData);

      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/admin/teachers/view?id=${teacher.uid}`);
      }, 2000);
    } catch (error) {
      console.error('Error updating teacher:', error);
      alert('শিক্ষক আপডেট করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || teacherLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white shadow-sm border-b border-gray-200 h-16">
            <div className="h-full px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-full">
                <div className="flex items-center h-full">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
                  >
                    <ArrowLeft className="w-5 h-5 mr-1" />
                    ফিরে যান
                  </button>
                  <div className="flex flex-col justify-center h-full">
                    <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষক সম্পাদনা</h1>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 lg:p-6 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">শিক্ষক পাওয়া যায়নি</h3>
              <p className="mt-1 text-sm text-gray-500">এই শিক্ষকের তথ্য পাওয়া যাচ্ছে না</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/admin/teachers')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  শিক্ষক তালিকায় ফিরে যান
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: true },
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
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">ই</span>
            </div>
            <span className="text-lg font-bold text-gray-900">সুপার অ্যাডমিন</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-500 hover:text-gray-700"
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
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-1" />
                  ফিরে যান
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষক সম্পাদনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">{teacher.displayName || teacher.name}</p>
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
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">শিক্ষকের তথ্য সম্পাদনা করুন</h2>
            <p className="text-gray-600">শিক্ষকের তথ্য আপডেট করুন</p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'personal', label: 'ব্যক্তিগত তথ্য', icon: User },
                  { id: 'professional', label: 'পেশাগত তথ্য', icon: Briefcase },
                  { id: 'address', label: 'ঠিকানা', icon: MapPin },
                  { id: 'additional', label: 'অতিরিক্ত তথ্য', icon: Info }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Form Sections */}
          <div className="space-y-6">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  ব্যক্তিগত তথ্য
                </h3>

                {/* Profile Image */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">প্রোফাইল ছবি</label>
                  <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : teacher.profileImage ? (
                        <img
                          src={teacher.profileImage}
                          alt="Current profile"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex space-x-3">
                        <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                          <Upload className="w-4 h-4" />
                          <span>নতুন ছবি নির্বাচন করুন</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        {(imagePreview || teacher.profileImage) && (
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
                      <p className="text-gray-500 text-sm mt-2">সর্বোচ্চ ১০MB, JPG, PNG, GIF ফরম্যাট</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">পুরো নাম *</label>
                    <input
                      type="text"
                      value={editTeacher.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="শিক্ষকের পুরো নাম"
                    />
                    {errors.name && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ইমেইল *</label>
                    <input
                      type="email"
                      value={editTeacher.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="teacher@school.com"
                    />
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ফোন নম্বর *</label>
                    <input
                      type="tel"
                      value={editTeacher.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="01712345678"
                    />
                    {errors.phoneNumber && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">জন্ম তারিখ</label>
                    <input
                      type="date"
                      value={editTeacher.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">লিঙ্গ</label>
                    <select
                      value={editTeacher.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">লিঙ্গ নির্বাচন করুন</option>
                      <option value="male">পুরুষ</option>
                      <option value="female">মহিলা</option>
                      <option value="other">অন্যান্য</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বৈবাহিক অবস্থা</label>
                    <select
                      value={editTeacher.maritalStatus}
                      onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">বৈবাহিক অবস্থা নির্বাচন করুন</option>
                      <option value="single">অবিবাহিত</option>
                      <option value="married">বিবাহিত</option>
                      <option value="divorced">তালাকপ্রাপ্ত</option>
                      <option value="widowed">বিধবা/বিপত্নীক</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">জাতীয়তা</label>
                    <input
                      type="text"
                      value={editTeacher.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="বাংলাদেশী"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ধর্ম</label>
                    <input
                      type="text"
                      value={editTeacher.religion}
                      onChange={(e) => handleInputChange('religion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ইসলাম"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">রক্তের গ্রুপ</label>
                    <select
                      value={editTeacher.bloodGroup}
                      onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">রক্তের গ্রুপ নির্বাচন করুন</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">পিতার নাম</label>
                    <input
                      type="text"
                      value={editTeacher.fatherName}
                      onChange={(e) => handleInputChange('fatherName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="পিতার পুরো নাম"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">মাতার নাম</label>
                    <input
                      type="text"
                      value={editTeacher.motherName}
                      onChange={(e) => handleInputChange('motherName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="মাতার পুরো নাম"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">জাতীয় পরিচয়পত্র নম্বর</label>
                    <input
                      type="text"
                      value={editTeacher.nationalId}
                      onChange={(e) => handleInputChange('nationalId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="১২৩৪৫৬৭৮৯০১২৩৪"
                      maxLength={17}
                    />
                    <p className="text-gray-500 text-xs mt-1">১৭ সংখ্যার NID নম্বর</p>
                  </div>
                </div>
              </div>
            )}

            {/* Professional Information Tab */}
            {activeTab === 'professional' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  পেশাগত তথ্য
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বিষয় *</label>
                    <select
                      value={editTeacher.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.subject ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">বিষয় নির্বাচন করুন</option>
                      {subjectOptions.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">যোগ্যতা *</label>
                    <select
                      value={editTeacher.qualification}
                      onChange={(e) => handleInputChange('qualification', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.qualification ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">যোগ্যতা নির্বাচন করুন</option>
                      {qualificationOptions.map((qual) => (
                        <option key={qual} value={qual}>
                          {qual}
                        </option>
                      ))}
                    </select>
                    {errors.qualification && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.qualification}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">অভিজ্ঞতা *</label>
                    <select
                      value={editTeacher.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.experience ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">অভিজ্ঞতা নির্বাচন করুন</option>
                      {experienceOptions.map((exp) => (
                        <option key={exp} value={exp}>
                          {exp}
                        </option>
                      ))}
                    </select>
                    {errors.experience && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.experience}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বিশেষজ্ঞতা</label>
                    <input
                      type="text"
                      value={editTeacher.specialization}
                      onChange={(e) => handleInputChange('specialization', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="যেমন: উচ্চতর গণিত, ইংরেজি সাহিত্য"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">যোগদানের তারিখ *</label>
                    <input
                      type="date"
                      value={editTeacher.joinDate}
                      onChange={(e) => handleInputChange('joinDate', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.joinDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.joinDate && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.joinDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">কর্মচারী আইডি</label>
                    <input
                      type="text"
                      value={editTeacher.employeeId}
                      onChange={(e) => handleInputChange('employeeId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="TCH001"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বিভাগ *</label>
                    <input
                      type="text"
                      value={editTeacher.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.department ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="যেমন: বিজ্ঞান, মানবিক, বাণিজ্য"
                    />
                    {errors.department && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.department}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">পদবী *</label>
                    <input
                      type="text"
                      value={editTeacher.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.designation ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="যেমন: সহকারী শিক্ষক, সিনিয়র শিক্ষক"
                    />
                    {errors.designation && (
                      <p className="text-red-600 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.designation}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বেতন</label>
                    <input
                      type="number"
                      value={editTeacher.salary}
                      onChange={(e) => handleInputChange('salary', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="৩৫০০০"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">কর্মসংস্থানের ধরন</label>
                    <select
                      value={editTeacher.employmentType}
                      onChange={(e) => handleInputChange('employmentType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="full-time">পূর্ণকালীন</option>
                      <option value="part-time">খণ্ডকালীন</option>
                      <option value="contract">চুক্তিভিত্তিক</option>
                      <option value="temporary">অস্থায়ী</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস</label>
                    <select
                      value={editTeacher.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setEditTeacher(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">সক্রিয়</option>
                      <option value="inactive">নিষ্ক্রিয়</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Address Information Tab */}
            {activeTab === 'address' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  ঠিকানা তথ্য
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">বর্তমান ঠিকানা</label>
                    <textarea
                      value={editTeacher.presentAddress}
                      onChange={(e) => handleInputChange('presentAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="বর্তমান ঠিকানা"
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">স্থায়ী ঠিকানা</label>
                    <textarea
                      value={editTeacher.permanentAddress}
                      onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="স্থায়ী ঠিকানা"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">শহর</label>
                    <input
                      type="text"
                      value={editTeacher.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="শহরের নাম"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">জেলা</label>
                    <input
                      type="text"
                      value={editTeacher.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="জেলার নাম"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">পোস্টাল কোড</label>
                    <input
                      type="text"
                      value={editTeacher.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="১২০০"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">দেশ</label>
                    <input
                      type="text"
                      value={editTeacher.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bangladesh"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">জরুরী যোগাযোগের নাম</label>
                    <input
                      type="text"
                      value={editTeacher.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="জরুরী যোগাযোগের ব্যক্তির নাম"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">জরুরী যোগাযোগের ফোন</label>
                    <input
                      type="tel"
                      value={editTeacher.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="01712345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">সম্পর্ক</label>
                    <input
                      type="text"
                      value={editTeacher.emergencyContactRelation}
                      onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="যেমন: ভাই, বোন, স্বামী"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information Tab */}
            {activeTab === 'additional' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  অতিরিক্ত তথ্য
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ভাষা জ্ঞান</label>
                    <input
                      type="text"
                      value={editTeacher.languages}
                      onChange={(e) => handleInputChange('languages', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="যেমন: বাংলা, ইংরেজি, আরবি"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">দক্ষতা</label>
                    <input
                      type="text"
                      value={editTeacher.skills}
                      onChange={(e) => handleInputChange('skills', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="যেমন: MS Office, Programming, Leadership"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">অর্জনসমূহ</label>
                    <textarea
                      value={editTeacher.achievements}
                      onChange={(e) => handleInputChange('achievements', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="শিক্ষকের বিশেষ অর্জন বা পুরস্কার"
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">প্রকাশনা</label>
                    <textarea
                      value={editTeacher.publications}
                      onChange={(e) => handleInputChange('publications', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="গবেষণা পত্র বা প্রকাশিত বই"
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">গবেষণা আগ্রহ</label>
                    <textarea
                      value={editTeacher.researchInterests}
                      onChange={(e) => handleInputChange('researchInterests', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="গবেষণা বা বিশেষ আগ্রহের ক্ষেত্র"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Success Notification */}
          {showSuccess && (
            <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>শিক্ষকের তথ্য সফলভাবে আপডেট করা হয়েছে!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push(`/admin/teachers/view?id=${teacher.uid}`)}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isSaving}
            >
              বাতিল
            </button>
            <button
              onClick={handleSaveTeacher}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>আপডেট হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>আপডেট করুন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditTeacherPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <EditTeacherPage />
    </ProtectedRoute>
  );
}
