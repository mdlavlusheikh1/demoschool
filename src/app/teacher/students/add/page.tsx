'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { emailUtils as emailUtilsGlobal, userQueries, settingsQueries, studentQueries, classQueries } from '@/lib/database-queries';
import { studentQueries as studentQueriesImport } from '@/lib/queries/student-queries';
import { classQueries as classQueriesImport } from '@/lib/queries/class-queries';
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
  Package,
  Upload,
  Camera,
  AlertCircle,
  CheckCircle,
  Info,
  Award,
  Star,
  User,
  Globe,
  FileText,
  MapPin,
  FileCheck,
  BookOpen as BookOpenIcon,
  MessageSquare,
  Gift,
  Sparkles,
  Users as UsersIcon
} from 'lucide-react';
import AlertDialog from '@/components/ui/alert-dialog';
import { getDivisions, getDistricts, getUpazilas, getUnions } from '@/lib/bangladesh-locations';

function AddStudentPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  
  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await settingsQueries.getSettings();
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    class: '',
    studentId: '',
    rollNumber: '',
    registrationNumber: '',
    studentType: 'new',
    guardianName: '',
    guardianPhone: '',
    address: '',
    section: '',
    group: '',
    profileImage: null as string | null,
    dateOfBirth: '',
    gender: '',
    // Parents Information
    fatherName: '',
    fatherPhone: '',
    fatherOccupation: '',
    motherName: '',
    motherPhone: '',
    motherOccupation: '',
    // Documents
    studentBirthCertificate: null as string | null,
    studentVaccinationCard: null as string | null,
    fatherBirthCertificate: null as string | null,
    fatherVoterId: null as string | null,
    motherBirthCertificate: null as string | null,
    motherVoterId: null as string | null,
    // Full Address
    division: '',
    district: '',
    upazila: '',
    union: '',
    postalCode: '',
    // Previous School Info
    previousSchool: '',
    previousClass: '',
    previousSchoolAddress: '',
    reasonForLeaving: '',
    previousGPA: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Documents upload states
  const [uploadedDocuments, setUploadedDocuments] = useState<{
    studentBirthCertificate?: string;
    studentVaccinationCard?: string;
    fatherBirthCertificate?: string;
    fatherVoterId?: string;
    motherBirthCertificate?: string;
    motherVoterId?: string;
  }>({});
  const [uploadingDocuments, setUploadingDocuments] = useState<{
    [key: string]: boolean;
  }>({});
  const [documentProgress, setDocumentProgress] = useState<{
    [key: string]: number;
  }>({});
  
  const router = useRouter();
  
  // Location dropdown states
  const [divisions, setDivisions] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [upazilas, setUpazilas] = useState<string[]>([]);
  const [unions, setUnions] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Email utility functions
  const emailUtils = emailUtilsGlobal;

  // Generate separate student ID and roll number
  const generateStudentId = async (overrideType?: 'new' | 'old', selectedClass?: string) => {
    try {
      const actualClass = selectedClass || newStudent.class;
      console.log('🔢 Generating new student ID and roll number...');
      console.log('📚 Selected class for roll number:', actualClass);
      const students = await studentQueriesImport.getAllStudents();
      console.log('📊 Total students found:', students.length);

      // Filter students by selected class if provided - IMPORTANT: Roll numbers are class-specific
      const relevantStudents = actualClass && actualClass.trim()
        ? students.filter(student => student.class === actualClass)
        : students;

      console.log(`📊 Students in ${actualClass || 'all classes'}:`, relevantStudents.length);

      // Log students for debugging
      relevantStudents.forEach((student, index) => {
        console.log(`📝 Student ${index + 1}:`, {
          name: student.name,
          studentId: student.studentId,
          rollNumber: student.rollNumber,
          class: student.class,
          isApproved: student.isApproved
        });
      });

      // Get all existing student IDs and roll numbers
      const existingStudentIds = students
        .map(s => s.studentId)
        .filter((id): id is string => Boolean(id));

      const existingRollNumbers = relevantStudents
        .map(s => s.rollNumber)
        .filter((roll): roll is string => Boolean(roll));

      console.log('📋 All existing student IDs:', existingStudentIds);
      console.log(`📋 Existing roll numbers in ${selectedClass || 'all classes'}:`, existingRollNumbers);

      // Generate Student ID (STD001, STD002, etc.) - Global across all classes
      const idNumbers = existingStudentIds
        .map(id => {
          const match = id.match(/^STD(\d{1,})$/i);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((num): num is number => num !== null);

      const highestIdNumber = idNumbers.length > 0 ? Math.max(...idNumbers) : 0;
      let candidateIdNumber = highestIdNumber + 1;
      if (candidateIdNumber < 1) {
        candidateIdNumber = 1;
      }

      let candidateId = `STD${candidateIdNumber.toString().padStart(3, '0')}`;
      while (existingStudentIds.includes(candidateId)) {
        candidateIdNumber += 1;
        candidateId = `STD${candidateIdNumber.toString().padStart(3, '0')}`;
      }

      // Generate Roll Number (001, 002, 003, etc.) - Class-specific
      const rollNumbers = existingRollNumbers
        .map(roll => {
          const numericPart = parseInt(roll.replace(/\D/g, ''), 10);
          return Number.isNaN(numericPart) ? null : numericPart;
        })
        .filter((num): num is number => num !== null);

      const highestRollNumber = rollNumbers.length > 0 ? Math.max(...rollNumbers) : 0;
      let candidateRollNumber = highestRollNumber + 1;
      if (candidateRollNumber < 1) {
        candidateRollNumber = 1;
      }

      let candidateRoll = candidateRollNumber.toString().padStart(4, '0');
      while (existingRollNumbers.includes(candidateRoll)) {
        candidateRollNumber += 1;
        candidateRoll = candidateRollNumber.toString().padStart(4, '0');
      }

      const newId = candidateId;
      const newRollNumber = candidateRoll;

      console.log('🔢 Generated new student ID:', newId);
      console.log(`🔢 Generated new roll number for ${actualClass || 'all classes'}:`, newRollNumber);
      console.log('🔍 Final verification - ID exists in database:', existingStudentIds.includes(newId));

      // Generate Registration Number = 26 + School Code + Roll Number (4 digits)
      // Get school code from settings or use default
      const schoolCode = settings?.schoolCode || '102330';
      
      // Registration number format: 26 + schoolCode + rollNumber (e.g., "261023300001")
      const newRegNumber = `26${schoolCode}${newRollNumber}`;
      console.log('🔢 Generated registration number:', newRegNumber);
      console.log('📚 School code:', schoolCode, 'Roll number:', newRollNumber);

      // Update both studentId and rollNumber in the form
      setNewStudent(prev => {
        const targetType = overrideType ?? prev.studentType ?? 'new';
        return {
          ...prev,
          studentId: newId,
          rollNumber: targetType === 'old' ? prev.rollNumber : newRollNumber,
          registrationNumber: targetType === 'old' ? prev.registrationNumber : newRegNumber
        };
      });

      return newId;
    } catch (error) {
      console.error('❌ Error generating student ID:', error);
      // Use timestamp-based fallback instead of STD001
      const timestamp = Date.now().toString().slice(-6);
      const fallbackId = `STD${timestamp}`;
      const fallbackRoll = timestamp;
      console.log('🔄 Using timestamp fallback ID:', fallbackId);

      // Update both fields
      setNewStudent(prev => {
        const targetType = overrideType ?? prev.studentType ?? 'new';
        return {
          ...prev,
          studentId: fallbackId,
          rollNumber: targetType === 'old' ? prev.rollNumber : fallbackRoll
        };
      });

      return fallbackId;
    }
  };

  useEffect(() => {
    if (!auth) return;

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

  // Load classes, sections, and groups from Firebase
  useEffect(() => {
    const loadClassData = async () => {
      try {
        // Load all classes from Firebase
        const allClasses = await classQueriesImport.getAllClasses();
        console.log('Loaded classes:', allClasses);

        // Extract unique class names
        const classNames = [...new Set(allClasses.map(cls => cls.className).filter((name): name is string => Boolean(name)))];
        setClasses(classNames.length > 0 ? classNames : ['ক্লাস ১', 'ক্লাস ২', 'ক্লাস ৩', 'ক্লাস ৪', 'ক্লাস ৫', 'ক্লাস ৬', 'ক্লাস ৭', 'ক্লাস ৮', 'ক্লাস ৯', 'ক্লাস ১০']);

        // Extract unique sections from classes
        const sectionNames = [...new Set(allClasses.map(cls => cls.section).filter((section): section is string => Boolean(section)))];
        setSections(sectionNames.length > 0 ? sectionNames : ['ক', 'খ', 'গ', 'ঘ']);

        // Extract unique groups from classes (if available)
        const groupNames = [...new Set(allClasses
          .map(cls => cls.group)
          .filter((group): group is string => Boolean(group && group.trim() !== ''))
        )];
        setGroups(groupNames.length > 0 ? groupNames : ['বিজ্ঞান', 'মানবিক', 'বাণিজ্য']);

        console.log('Class names:', classNames);
        console.log('Section names:', sectionNames);
        console.log('Group names:', groupNames);

      } catch (error) {
        console.error('Error loading class data:', error);
        // Fallback to default values
        setClasses(['ক্লাস ১', 'ক্লাস ২', 'ক্লাস ৩', 'ক্লাস ৪', 'ক্লাস ৫', 'ক্লাস ৬', 'ক্লাস ৭', 'ক্লাস ৮', 'ক্লাস ৯', 'ক্লাস ১০']);
        setSections(['ক', 'খ', 'গ', 'ঘ']);
        setGroups(['বিজ্ঞান', 'মানবিক', 'বাণিজ্য']);
      }
    };

    loadClassData();
  }, []);

  // Auto-generate student ID when component loads
  useEffect(() => {
    const generateId = async () => {
      console.log('🔢 Auto-generating student ID on page load...');
      console.log('📝 Current studentId in state:', newStudent.studentId);
      const newId = await generateStudentId('new', newStudent.class);
      console.log('✅ Auto-generated student ID:', newId);
    };
    generateId();
  }, []);

  // Regenerate roll number when class changes
  useEffect(() => {
    if (newStudent.class && newStudent.studentType === 'new') {
      const regenerateRollNumber = async () => {
        console.log('🔄 Regenerating roll number for class:', newStudent.class);
        await generateStudentId('new', newStudent.class);
      };
      regenerateRollNumber();
    }
  }, [newStudent.class, newStudent.studentType]);

  // Auto-generate email when name is typed
  useEffect(() => {
    if (newStudent.name.trim()) {
      // Auto-generate email using roll number for new students
      const identifierForEmail = newStudent.rollNumber || newStudent.studentId || '001';
      console.log('📧 Admin generating email with:', {
        name: newStudent.name,
        identifier: identifierForEmail,
        rollNumber: newStudent.rollNumber,
        studentId: newStudent.studentId
      });
      const generatedEmail = emailUtils.generateStudentEmail(
        newStudent.name,
        identifierForEmail,
        'iqra'
      );
      console.log('📧 Admin generated email:', generatedEmail);
      setNewStudent(prev => ({ ...prev, email: generatedEmail }));
    } else {
      // Clear email when name is cleared
      setNewStudent(prev => ({ ...prev, email: '' }));
    }
  }, [newStudent.name, newStudent.rollNumber, newStudent.studentId]);

  // Load divisions on mount
  useEffect(() => {
    const loadDivisions = async () => {
      setLoadingLocations(true);
      try {
        const divisionList = await getDivisions();
        setDivisions(divisionList);
      } catch (error) {
        console.error('Error loading divisions:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadDivisions();
  }, []);

  // Load districts when division changes
  useEffect(() => {
    const loadDistrictsForDivision = async () => {
      if (!newStudent.division) {
        setDistricts([]);
        setUpazilas([]);
        return;
      }

      setLoadingLocations(true);
      try {
        const districtList = await getDistricts(newStudent.division);
        setDistricts(districtList);
        // Reset district and upazila when division changes
        setUpazilas([]);
        // Only reset if district/upazila were previously set
        if (newStudent.district || newStudent.upazila) {
          setNewStudent(prev => ({ ...prev, district: '', upazila: '' }));
        }
      } catch (error) {
        console.error('Error loading districts:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadDistrictsForDivision();
  }, [newStudent.division]);

  // Load upazilas when district changes
  useEffect(() => {
    const loadUpazilasForDistrict = async () => {
      if (!newStudent.division || !newStudent.district) {
        setUpazilas([]);
        setUnions([]);
        return;
      }

      setLoadingLocations(true);
      try {
        const upazilaList = await getUpazilas(newStudent.division, newStudent.district);
        setUpazilas(upazilaList);
        // Only reset if upazila was previously set
        if (newStudent.upazila) {
          setNewStudent(prev => ({ ...prev, upazila: '', union: '' }));
        }
        setUnions([]);
      } catch (error) {
        console.error('Error loading upazilas:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadUpazilasForDistrict();
  }, [newStudent.division, newStudent.district]);

  // Load unions when upazila changes
  useEffect(() => {
    const loadUnionsForUpazila = async () => {
      if (!newStudent.division || !newStudent.district || !newStudent.upazila) {
        setUnions([]);
        return;
      }

      setLoadingLocations(true);
      try {
        const unionList = await getUnions(newStudent.division, newStudent.district, newStudent.upazila);
        setUnions(unionList);
        // Only reset if union was previously set
        if (newStudent.union) {
          setNewStudent(prev => ({ ...prev, union: '' }));
        }
      } catch (error) {
        console.error('Error loading unions:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadUnionsForUpazila();
  }, [newStudent.division, newStudent.district, newStudent.upazila]);

  const handleLogout = async () => {
    try {
      if (auth) {
        await auth.signOut();
      }
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleInputChange = async (field: string, value: string) => {
    setNewStudent({ ...newStudent, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }

    // Regenerate roll number when class changes for new students
    if (field === 'class' && newStudent.studentType === 'new' && value.trim()) {
      console.log('🔄 Class changed, regenerating roll number for class:', value);
      await generateStudentId('new', value);
    }
  };

  const handleStudentTypeChange = async (value: 'new' | 'old') => {
    setNewStudent(prev => ({
      ...prev,
      studentType: value,
      rollNumber: value === 'old' ? '' : prev.rollNumber
    }));
    setErrors(prev => ({ ...prev, rollNumber: '' }));
    if (value === 'new') {
      await generateStudentId('new', newStudent.class);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
          setNewStudent(prev => ({ ...prev, profileImage: null }));
          return;
        }

        setErrors({ ...errors, profileImage: '' });

        const reader = new FileReader();
        reader.onload = event => {
          setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        const authResponse = await fetch('/api/imagekit');
        if (!authResponse.ok) {
          const authError = await authResponse.json().catch(() => null);
          console.error('ImageKit auth error:', authError);
          setErrors({ ...errors, profileImage: authError?.message || 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।' });
          setImagePreview(null);
          setNewStudent(prev => ({ ...prev, profileImage: null }));
          return;
        }

        const authData = await authResponse.json();
        const settings = await settingsQueries.getSettings();
        const schoolId = settings?.schoolCode || 'AMAR-2026';
        const studentId = newStudent.studentId || `temp-${Date.now()}`;
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
          setNewStudent(prev => ({ ...prev, profileImage: null }));
          return;
        }

        console.log('✅ Image uploaded successfully:', uploadPayload);
        setNewStudent(prev => ({
          ...prev,
          profileImage: uploadPayload.url as string
        }));
        setImagePreview(uploadPayload.url as string);
      } catch (error) {
        console.error('❌ Error uploading image:', error);
        setErrors({ ...errors, profileImage: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
        setImagePreview(null);
        setNewStudent(prev => ({ ...prev, profileImage: null }));
      }
    }
  };

  const removeImage = () => {
    setNewStudent({ ...newStudent, profileImage: null });
    setImagePreview(null);
  };

  // Generate email address automatically
  const generateEmail = () => {
    if (!newStudent.name.trim() || !newStudent.studentId.trim()) {
      alert('নাম এবং রোল নম্বর দিয়ে ইমেইল তৈরি করুন');
      return;
    }

    const generatedEmail = emailUtils.generateStudentEmail(newStudent.name, newStudent.studentId);
    setNewStudent({ ...newStudent, email: generatedEmail });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!newStudent.name.trim()) {
      newErrors.name = 'নাম প্রয়োজনীয়';
    }

    // Email is now optional, but if provided, validate format
    if (newStudent.email.trim() && !/\S+@\S+\.\S+/.test(newStudent.email)) {
      newErrors.email = 'সঠিক ইমেইল ফরম্যাট দিন';
    }

    if (!newStudent.gender.trim()) {
      newErrors.gender = 'লিঙ্গ নির্বাচন করুন';
    }

    if (newStudent.phoneNumber && !/^01[3-9]\d{8}$/.test(newStudent.phoneNumber)) {
      newErrors.phoneNumber = 'সঠিক ফোন নম্বর দিন';
    }

    if (newStudent.guardianPhone && !/^01[3-9]\d{8}$/.test(newStudent.guardianPhone)) {
      newErrors.guardianPhone = 'সঠিক ফোন নম্বর দিন';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadDocumentToImageKit = async (file: File, documentType: string): Promise<string | null> => {
    try {
      console.log(`📄 Starting document upload for ${documentType}...`);
      setUploadingDocuments(prev => ({ ...prev, [documentType]: true }));
      setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));

      const authResponse = await fetch('/api/imagekit');
      if (!authResponse.ok) {
        const authError = await authResponse.json().catch(() => null);
        console.error('ImageKit auth error:', authError);
        setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
        setErrors({ ...errors, [documentType]: authError?.message || 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।' });
        return null;
      }

      const authData = await authResponse.json();
      const loadedSettings = await settingsQueries.getSettings();
      const schoolId = loadedSettings?.schoolCode || 'default';
      const studentId = newStudent.studentId || `temp-${Date.now()}`;
      const fileName = `doc-${documentType}-${studentId}-${Date.now()}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('folder', `/school-management/students/${schoolId}/documents`);
      formData.append('tags', `document,${documentType},student,${schoolId},${studentId}`);
      formData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');
      formData.append('token', authData.token);
      formData.append('expire', authData.expire?.toString() || '');
      formData.append('signature', authData.signature);

      return await new Promise<string | null>((resolve) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setDocumentProgress(prev => ({ ...prev, [documentType]: progress }));
            console.log(`📊 Upload progress for ${documentType}: ${progress}%`);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log(`✅ Document upload successful for ${documentType}:`, response);
              setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
              setDocumentProgress(prev => ({ ...prev, [documentType]: 100 }));
              setErrors({ ...errors, [documentType]: '' });
              resolve(response.url);
            } catch (parseError) {
              console.error(`❌ Failed to parse upload response for ${documentType}:`, parseError);
              setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
              setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));
              setErrors({ ...errors, [documentType]: 'ডকুমেন্ট আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
              resolve(null);
            }
          } else {
            console.error(`❌ Upload failed for ${documentType} with status:`, xhr.status);
            setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
            setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));
            setErrors({ ...errors, [documentType]: 'ডকুমেন্ট আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
            resolve(null);
          }
        });

        xhr.addEventListener('error', (error) => {
          console.error(`❌ Upload network error for ${documentType}:`, error);
          setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
          setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));
          setErrors({ ...errors, [documentType]: 'নেটওয়ার্ক সমস্যার কারণে আপলোড ব্যর্থ হয়েছে।' });
          resolve(null);
        });

        xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
        xhr.send(formData);
      });
    } catch (error) {
      console.error(`❌ Document upload error for ${documentType}:`, error);
      setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
      setDocumentProgress(prev => ({ ...prev, [documentType]: 0 }));
      setErrors({ ...errors, [documentType]: 'ডকুমেন্ট আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
      return null;
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, [documentType]: 'ফাইলের আকার ১০MB এর বেশি হতে পারবে না' });
      return;
    }

    // Accept images and PDFs
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrors({ ...errors, [documentType]: 'শুধুমাত্র ছবি বা PDF ফাইল আপলোড করুন' });
      return;
    }

    setErrors({ ...errors, [documentType]: '' });
    const uploadedUrl = await uploadDocumentToImageKit(file, documentType);
    
    if (uploadedUrl) {
      setUploadedDocuments(prev => ({ ...prev, [documentType]: uploadedUrl }));
      setNewStudent(prev => ({ ...prev, [documentType]: uploadedUrl }));
    }
  };

  const removeDocument = (documentType: string) => {
    setUploadedDocuments(prev => {
      const updated = { ...prev };
      delete updated[documentType as keyof typeof updated];
      return updated;
    });
    setNewStudent(prev => ({ ...prev, [documentType]: null }));
    setErrors({ ...errors, [documentType]: '' });
  };

  const handleSaveStudent = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Get settings to use school information
      const settings = await settingsQueries.getSettings();

      // Check if student ID is already provided and preserve it
      let finalStudentId = newStudent.studentId;
      console.log('📝 Current student ID in form:', finalStudentId);

      if (!finalStudentId || finalStudentId.trim() === '') {
        // Only generate new student ID if none provided
        console.log('🔢 No student ID provided, generating new one...');
        finalStudentId = await generateStudentId(newStudent.studentType === 'old' ? 'old' : 'new', newStudent.class);
        console.log('✅ Generated student ID:', finalStudentId);
      } else {
        // Check if existing student ID is already taken
        console.log('🔍 Checking if existing student ID is available:', finalStudentId);
        const existingStudent = await studentQueriesImport.getStudentByStudentId(finalStudentId);
        if (existingStudent) {
          console.log('⚠️ Student ID already exists, generating new one...');
          finalStudentId = await generateStudentId(newStudent.studentType === 'old' ? 'old' : 'new', newStudent.class);
          console.log('✅ Generated new student ID:', finalStudentId);
        } else {
          console.log('✅ Existing student ID is available:', finalStudentId);
        }
      }

      // Generate registration number if not already set (26 + School Code + Roll Number with 4 digits)
      let finalRegistrationNumber = newStudent.registrationNumber;
      if (!finalRegistrationNumber || finalRegistrationNumber.trim() === '') {
        const schoolCode = settings?.schoolCode || '102330';
        const paddedRoll = newStudent.rollNumber?.toString().padStart(4, '0') || '0001';
        finalRegistrationNumber = `26${schoolCode}${paddedRoll}`;
      }

      const studentData = {
        name: newStudent.name,
        displayName: newStudent.name,
        email: newStudent.email || emailUtils.generateRandomEmail(newStudent.name, settings?.schoolCode || 'iqra'),
        phoneNumber: newStudent.phoneNumber,
        class: newStudent.class,
        gender: newStudent.gender,
        studentId: finalStudentId,
        rollNumber: newStudent.rollNumber,
        registrationNumber: finalRegistrationNumber,
        guardianName: newStudent.guardianName,
        guardianPhone: newStudent.guardianPhone,
        address: newStudent.address,
        dateOfBirth: newStudent.dateOfBirth,
        section: newStudent.section,
        group: newStudent.group,
        profileImage: newStudent.profileImage,
        // Parents Information
        fatherName: newStudent.fatherName,
        fatherPhone: newStudent.fatherPhone,
        fatherOccupation: newStudent.fatherOccupation,
        motherName: newStudent.motherName,
        motherPhone: newStudent.motherPhone,
        motherOccupation: newStudent.motherOccupation,
        // Documents
        studentBirthCertificate: uploadedDocuments.studentBirthCertificate || newStudent.studentBirthCertificate || null,
        studentVaccinationCard: uploadedDocuments.studentVaccinationCard || newStudent.studentVaccinationCard || null,
        fatherBirthCertificate: uploadedDocuments.fatherBirthCertificate || newStudent.fatherBirthCertificate || null,
        fatherVoterId: uploadedDocuments.fatherVoterId || newStudent.fatherVoterId || null,
        motherBirthCertificate: uploadedDocuments.motherBirthCertificate || newStudent.motherBirthCertificate || null,
        motherVoterId: uploadedDocuments.motherVoterId || newStudent.motherVoterId || null,
        // Full Address Information
        division: newStudent.division,
        district: newStudent.district,
        upazila: newStudent.upazila,
        union: newStudent.union,
        postalCode: newStudent.postalCode,
        // Previous School Information
        previousSchool: newStudent.previousSchool,
        previousClass: newStudent.previousClass,
        previousSchoolAddress: newStudent.previousSchoolAddress,
        reasonForLeaving: newStudent.reasonForLeaving,
        previousGPA: newStudent.previousGPA,
        role: 'student' as const,
        schoolId: settings?.schoolCode || '102330',
        schoolName: settings?.schoolName || 'আমার স্কুল',
        isActive: true,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('💾 Creating student with data:', studentData);
      
      try {
        const studentId = await studentQueriesImport.createStudentWithAutoEmail(studentData as any);
        console.log('✅ Student created with ID:', studentId);

        setShowSuccess(true);
        setTimeout(() => {
          router.push('/teacher/students');
        }, 2000);
      } catch (error) {
        console.error('❌ Error creating student:', error);
        
        // If it's a duplicate ID error, try with a new ID
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log('🔄 Duplicate ID detected, generating new ID...');
          finalStudentId = await generateStudentId(newStudent.studentType === 'old' ? 'old' : 'new', newStudent.class);
          console.log('✅ Generated new student ID:', finalStudentId);
          
          // Update student data with new ID
          const updatedStudentData = {
            ...studentData,
            studentId: finalStudentId
          };
          
          // Try again with new ID
          const studentId = await studentQueriesImport.createStudentWithAutoEmail(updatedStudentData as any);
          console.log('✅ Student created with new ID:', studentId);
          
          setShowSuccess(true);
          setTimeout(() => {
            router.push('/admin/students');
          }, 2000);
        } else {
          throw error; // Re-throw if it's not a duplicate ID error
        }
      }
    } catch (error) {
      console.error('Error saving student:', error);
      // Show error alert with custom dialog
      setShowErrorDialog(true);
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
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/teacher/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/teacher/students', active: true },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/teacher/teachers', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/teacher/classes', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/teacher/attendance', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/teacher/events', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/teacher/accounting', active: false },
    { icon: Award, label: 'পরীক্ষা', href: '/teacher/exams', active: false },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/teacher/subjects', active: false },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/teacher/homework', active: false },
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
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষার্থী যোগ করুন</h1>
                  <p className="text-sm text-gray-600 leading-tight">নতুন শিক্ষার্থীর তথ্য যোগ করুন</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
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
              onClick={() => router.push('/teacher/students')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>শিক্ষার্থী তালিকায় ফিরে যান</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">নতুন শিক্ষার্থী যোগ করুন</h2>
            <p className="text-gray-600">শিক্ষার্থীর সমস্ত তথ্য পূরণ করুন</p>
          </div>

          {/* Form Sections */}
          <div className="space-y-8">
            {/* Student Type Selection - moved before profile image as requested by user */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">শিক্ষার্থীর ধরন *</span>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => handleStudentTypeChange('new')}
                  className={`flex items-center justify-center space-x-2 px-6 py-3 border-2 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
                    newStudent.studentType === 'new'
                      ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white border-transparent shadow-lg'
                      : 'bg-white text-gray-700 border-blue-100 hover:border-blue-300'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-semibold tracking-wide">নতুন শিক্ষার্থী</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStudentTypeChange('old')}
                  className={`flex items-center justify-center space-x-2 px-6 py-3 border-2 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
                    newStudent.studentType === 'old'
                      ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white border-transparent shadow-lg'
                      : 'bg-white text-gray-700 border-blue-100 hover:border-blue-300'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-semibold tracking-wide">পুরাতন শিক্ষার্থী</span>
                </button>
              </div>
            </div>

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
                        accept="image/*,video/*"
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
                  <p className="text-gray-500 text-sm mt-2">সর্বোচ্চ ১০MB, JPG, PNG, GIF, MP4, AVI ফরম্যাট</p>
                </div>
              </div>
            </div>

            {/* Student Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">শিক্ষার্থীর তথ্য</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">নাম *</label>
                  <input
                    type="text"
                    value={newStudent.name}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">লিঙ্গ *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'male', label: 'ছেলে' },
                      { value: 'female', label: 'মেয়ে' }
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('gender', option.value)}
                        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          newStudent.gender === option.value
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {errors.gender && (
                    <p className="text-red-600 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.gender}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ইমেইল
                    <span className="text-gray-500 text-xs ml-1">(ঐচ্ছিক)</span>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      } ${newStudent.email && newStudent.name ? 'bg-green-50 border-green-200' : ''}`}
                      placeholder="নাম লিখলে স্বয়ংক্রিয়ভাবে তৈরি হবে..."
                    />
                    <button
                      type="button"
                      onClick={generateEmail}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm whitespace-nowrap"
                      title="ইমেইল তৈরি করুন"
                    >
                      তৈরি করুন
                    </button>
                  </div>
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </p>
                  )}
                  {newStudent.email && newStudent.name && (
                    <p className="text-green-600 text-xs mt-1 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      স্বয়ংক্রিয়ভাবে তৈরি হয়েছে
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    ফরম্যাট: studentname-roll@school.bd.edu
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ফোন নম্বর</label>
                  <input
                    type="tel"
                    value={newStudent.phoneNumber}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">ক্লাস</label>
                  <select
                    value={newStudent.class}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                    <Award className="w-4 h-4 text-gray-500" />
                    <span>রোল নম্বর</span>
                    {newStudent.studentType === 'new' && (
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">স্বয়ংক্রিয়</span>
                    )}
                    {newStudent.studentType === 'old' && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">ম্যানুয়াল</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newStudent.rollNumber}
                      onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                      readOnly={newStudent.studentType === 'new'}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        newStudent.studentType === 'new'
                          ? 'bg-gray-50 text-gray-700 border-gray-300'
                          : errors.rollNumber
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300 hover:border-blue-400'
                      }`}
                      placeholder={newStudent.studentType === 'new' ? 'স্বয়ংক্রিয়ভাবে তৈরি হবে...' : 'যেমন: ১২৩, ০০১'}
                      required={newStudent.studentType === 'old'}
                    />
                    {newStudent.studentType === 'new' && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Award className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  {newStudent.studentType === 'new' && (
                    <p className="text-xs text-gray-500 mt-1">নতুন শিক্ষার্থীদের জন্য স্বয়ংক্রিয়ভাবে তৈরি হবে</p>
                  )}
                  {errors.rollNumber && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.rollNumber}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                    <Award className="w-4 h-4 text-gray-500" />
                    <span>শিক্ষার্থী আইডি</span>
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">স্বয়ংক্রিয়</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newStudent.studentId}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none"
                      placeholder="স্বয়ংক্রিয়ভাবে তৈরি হবে..."
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Award className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">স্বয়ংক্রিয়ভাবে তৈরি হবে</p>
                  </div>

                {/* Registration Number Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>রেজিস্ট্রেশন নম্বর</span>
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">স্বয়ংক্রিয়</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newStudent.registrationNumber}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none"
                      placeholder="স্বয়ংক্রিয়ভাবে তৈরি হবে..."
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <FileText className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    এই নম্বর দিয়ে ফলাফল দেখতে পারবেন। সংরক্ষণ করে রাখুন।
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">জন্ম তারিখ</label>
                  <input
                    type="date"
                    value={newStudent.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">ঠিকানা</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {/* Division Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">বিভাগ *</label>
                  <select
                    value={newStudent.division}
                    onChange={(e) => handleInputChange('division', e.target.value)}
                    disabled={loadingLocations}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">বিভাগ নির্বাচন করুন</option>
                    {divisions.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">জেলা *</label>
                  <select
                    value={newStudent.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    disabled={!newStudent.division || loadingLocations}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">জেলা নির্বাচন করুন</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upazila Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">উপজেলা *</label>
                  <select
                    value={newStudent.upazila}
                    onChange={(e) => handleInputChange('upazila', e.target.value)}
                    disabled={!newStudent.district || loadingLocations}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">উপজেলা নির্বাচন করুন</option>
                    {upazilas.map((upazila) => (
                      <option key={upazila} value={upazila}>
                        {upazila}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Union Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ইউনিয়ন</label>
                  <select
                    value={newStudent.union}
                    onChange={(e) => handleInputChange('union', e.target.value)}
                    disabled={!newStudent.upazila || loadingLocations}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">ইউনিয়ন নির্বাচন করুন</option>
                    {unions.map((union) => (
                      <option key={union} value={union}>
                        {union}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Postal Code */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">পোস্টাল কোড</label>
                <input
                  type="text"
                  value={newStudent.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                  placeholder="যেমন: ১২৩৪"
                  maxLength={10}
                />
              </div>

              {/* Additional Address Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">বিস্তারিত ঠিকানা (গ্রাম, রোড, বাড়ি নম্বর ইত্যাদি)</label>
                <textarea
                  value={newStudent.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                  placeholder="যেমন: গ্রামের নাম, রোড নম্বর, বাড়ি নম্বর ইত্যাদি"
                  rows={3}
                />
              </div>
            </div>

            {/* Parents Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">অভিভাবকের তথ্য</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পিতার নাম</label>
                  <input
                    type="text"
                    value={newStudent.fatherName}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="পিতার পুরো নাম"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পিতার ফোন</label>
                  <input
                    type="tel"
                    value={newStudent.fatherPhone}
                    onChange={(e) => handleInputChange('fatherPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="01712345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পিতার পেশা</label>
                  <input
                    type="text"
                    value={newStudent.fatherOccupation}
                    onChange={(e) => handleInputChange('fatherOccupation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="পেশা বা চাকরির ধরন"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">মাতার নাম</label>
                  <input
                    type="text"
                    value={newStudent.motherName}
                    onChange={(e) => handleInputChange('motherName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="মাতার পুরো নাম"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">মাতার ফোন</label>
                  <input
                    type="tel"
                    value={newStudent.motherPhone}
                    onChange={(e) => handleInputChange('motherPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="01712345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">মাতার পেশা</label>
                  <input
                    type="text"
                    value={newStudent.motherOccupation}
                    onChange={(e) => handleInputChange('motherOccupation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="পেশা বা চাকরির ধরন"
                  />
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col items-center text-center mb-6 space-y-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">ডকুমেন্টস</h3>
              </div>

              <div className="space-y-6">
                {/* Student Documents */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4">শিক্ষার্থীর ডকুমেন্টস</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Birth Certificate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">জন্ম নিবন্ধন</label>
                      <div className="space-y-2">
                        <div className="relative">
                          <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>ফাইল নির্বাচন করুন</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleDocumentUpload(e, 'studentBirthCertificate')}
                              className="hidden"
                              disabled={uploadingDocuments.studentBirthCertificate}
                            />
                          </label>
                        </div>
                        {uploadingDocuments.studentBirthCertificate && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${documentProgress.studentBirthCertificate || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600">আপলোড হচ্ছে... {documentProgress.studentBirthCertificate || 0}%</p>
                          </div>
                        )}
                        {uploadedDocuments.studentBirthCertificate && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">ডকুমেন্ট আপলোড হয়েছে</span>
                            </div>
                            <button
                              onClick={() => removeDocument('studentBirthCertificate')}
                              className="text-red-600 hover:text-red-800"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {errors.studentBirthCertificate && (
                          <p className="text-red-600 text-xs flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors.studentBirthCertificate}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Student Vaccination Card */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">টিকার কার্ড</label>
                      <div className="space-y-2">
                        <div className="relative">
                          <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>ফাইল নির্বাচন করুন</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleDocumentUpload(e, 'studentVaccinationCard')}
                              className="hidden"
                              disabled={uploadingDocuments.studentVaccinationCard}
                            />
                          </label>
                        </div>
                        {uploadingDocuments.studentVaccinationCard && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${documentProgress.studentVaccinationCard || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600">আপলোড হচ্ছে... {documentProgress.studentVaccinationCard || 0}%</p>
                          </div>
                        )}
                        {uploadedDocuments.studentVaccinationCard && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">ডকুমেন্ট আপলোড হয়েছে</span>
                            </div>
                            <button
                              onClick={() => removeDocument('studentVaccinationCard')}
                              className="text-red-600 hover:text-red-800"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {errors.studentVaccinationCard && (
                          <p className="text-red-600 text-xs flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors.studentVaccinationCard}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parents Documents */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4">পিতা-মাতার ডকুমেন্টস</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Father Birth Certificate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পিতার জন্ম নিবন্ধন</label>
                      <div className="space-y-2">
                        <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>ফাইল নির্বাচন করুন</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleDocumentUpload(e, 'fatherBirthCertificate')}
                            className="hidden"
                            disabled={uploadingDocuments.fatherBirthCertificate}
                          />
                        </label>
                        {uploadingDocuments.fatherBirthCertificate && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${documentProgress.fatherBirthCertificate || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600">আপলোড হচ্ছে... {documentProgress.fatherBirthCertificate || 0}%</p>
                          </div>
                        )}
                        {uploadedDocuments.fatherBirthCertificate && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">ডকুমেন্ট আপলোড হয়েছে</span>
                            </div>
                            <button
                              onClick={() => removeDocument('fatherBirthCertificate')}
                              className="text-red-600 hover:text-red-800"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {errors.fatherBirthCertificate && (
                          <p className="text-red-600 text-xs flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors.fatherBirthCertificate}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Father Voter ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পিতার ভোটার আইডি কার্ড</label>
                      <div className="space-y-2">
                        <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>ফাইল নির্বাচন করুন</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleDocumentUpload(e, 'fatherVoterId')}
                            className="hidden"
                            disabled={uploadingDocuments.fatherVoterId}
                          />
                        </label>
                        {uploadingDocuments.fatherVoterId && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${documentProgress.fatherVoterId || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600">আপলোড হচ্ছে... {documentProgress.fatherVoterId || 0}%</p>
                          </div>
                        )}
                        {uploadedDocuments.fatherVoterId && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">ডকুমেন্ট আপলোড হয়েছে</span>
                            </div>
                            <button
                              onClick={() => removeDocument('fatherVoterId')}
                              className="text-red-600 hover:text-red-800"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {errors.fatherVoterId && (
                          <p className="text-red-600 text-xs flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors.fatherVoterId}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mother Birth Certificate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">মাতার জন্ম নিবন্ধন</label>
                      <div className="space-y-2">
                        <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>ফাইল নির্বাচন করুন</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleDocumentUpload(e, 'motherBirthCertificate')}
                            className="hidden"
                            disabled={uploadingDocuments.motherBirthCertificate}
                          />
                        </label>
                        {uploadingDocuments.motherBirthCertificate && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${documentProgress.motherBirthCertificate || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600">আপলোড হচ্ছে... {documentProgress.motherBirthCertificate || 0}%</p>
                          </div>
                        )}
                        {uploadedDocuments.motherBirthCertificate && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">ডকুমেন্ট আপলোড হয়েছে</span>
                            </div>
                            <button
                              onClick={() => removeDocument('motherBirthCertificate')}
                              className="text-red-600 hover:text-red-800"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {errors.motherBirthCertificate && (
                          <p className="text-red-600 text-xs flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors.motherBirthCertificate}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Mother Voter ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">মাতার ভোটার আইডি কার্ড</label>
                      <div className="space-y-2">
                        <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>ফাইল নির্বাচন করুন</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleDocumentUpload(e, 'motherVoterId')}
                            className="hidden"
                            disabled={uploadingDocuments.motherVoterId}
                          />
                        </label>
                        {uploadingDocuments.motherVoterId && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${documentProgress.motherVoterId || 0}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600">আপলোড হচ্ছে... {documentProgress.motherVoterId || 0}%</p>
                          </div>
                        )}
                        {uploadedDocuments.motherVoterId && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">ডকুমেন্ট আপলোড হয়েছে</span>
                            </div>
                            <button
                              onClick={() => removeDocument('motherVoterId')}
                              className="text-red-600 hover:text-red-800"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {errors.motherVoterId && (
                          <p className="text-red-600 text-xs flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors.motherVoterId}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Previous School Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">পূর্ববর্তী স্কুলের তথ্য</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী স্কুলের নাম</label>
                  <input
                    type="text"
                    value={newStudent.previousSchool}
                    onChange={(e) => handleInputChange('previousSchool', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="পূর্ববর্তী স্কুলের নাম"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী ক্লাস</label>
                  <input
                    type="text"
                    value={newStudent.previousClass}
                    onChange={(e) => handleInputChange('previousClass', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="যেমন: ক্লাস ৯, দশম শ্রেণী"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী GPA/Grade</label>
                  <input
                    type="text"
                    value={newStudent.previousGPA}
                    onChange={(e) => handleInputChange('previousGPA', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="যেমন: 4.50, A+, 85%"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী স্কুলের ঠিকানা</label>
                  <textarea
                    value={newStudent.previousSchoolAddress}
                    onChange={(e) => handleInputChange('previousSchoolAddress', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="পূর্ববর্তী স্কুলের ঠিকানা"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">স্কুল পরিবর্তনের কারণ</label>
                  <textarea
                    value={newStudent.reasonForLeaving}
                    onChange={(e) => handleInputChange('reasonForLeaving', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="পূর্ববর্তী স্কুল থেকে চলে আসার কারণ"
                    rows={2}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Success Notification */}
          {showSuccess && (
            <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>শিক্ষার্থী সফলভাবে যোগ করা হয়েছে!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push('/admin/students')}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isSaving}
            >
              বাতিল
            </button>
            <button
              onClick={handleSaveStudent}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>সংরক্ষণ হচ্ছে...</span>
                </div>
              ) : (
                'সংরক্ষণ করুন'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert Dialog */}
      <AlertDialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        type="error"
        title="ত্রুটি!"
        message="শিক্ষার্থী যোগ করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
        confirmText="ঠিক আছে"
      />
    </div>
  );
}

export default function AddStudentPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AddStudentPage />
    </ProtectedRoute>
  );
}
