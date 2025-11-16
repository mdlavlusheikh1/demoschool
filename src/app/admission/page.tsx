'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { emailUtils, settingsQueries, studentQueries, classQueries, SystemSettings } from '@/lib/database-queries';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDivisions, getDistricts, getUpazilas, getUnions } from '@/lib/bangladesh-locations';
import { IKContext } from 'imagekitio-react';
import {
  Upload,
  Camera,
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Calendar,
  FileText,
  ArrowLeft,
  Loader2,
  Star,
  Award,
  BookOpen,
  Heart,
  Shield,
  Send,
  Users,
  FileCheck,
  X
} from 'lucide-react';

function PublicAdmissionPage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    class: '',
    studentId: '',
    rollNumber: '',
    registrationNumber: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
    profileImage: null as File | null,
    dateOfBirth: '',
    gender: '',
    studentType: 'new',
    // Location fields
    division: '',
    district: '',
    upazila: '',
    union: '',
    postalCode: '',
    // Parents Information
    fatherName: '',
    fatherPhone: '',
    fatherOccupation: '',
    motherName: '',
    motherPhone: '',
    motherOccupation: '',
    // Documents
    studentBirthCertificate: null as File | null,
    studentVaccinationCard: null as File | null,
    fatherBirthCertificate: null as File | null,
    fatherVoterId: null as File | null,
    motherBirthCertificate: null as File | null,
    motherVoterId: null as File | null,
    // Previous School Info
    previousSchool: '',
    previousClass: '',
    reasonForLeaving: '',
    previousGPA: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [generalSettings, setGeneralSettings] = useState<SystemSettings | null>(null);
  const router = useRouter();
  const isNewStudent = newStudent.studentType === 'new';
  const isOldStudent = newStudent.studentType === 'old';
  
  // Location dropdown states
  const [divisions, setDivisions] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [upazilas, setUpazilas] = useState<string[]>([]);
  const [unions, setUnions] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Real-time listener for settings
  useEffect(() => {
    const settingsRef = doc(db, 'system', 'settings');
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as SystemSettings;
          setGeneralSettings(data);
        }
      },
      (error) => {
        console.error('Error listening to settings:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Helper function to format roll number for display
  const formatRollNumber = (rollNumber: string | undefined): string => {
    if (!rollNumber) return 'N/A';

    // If roll number is in format "STDxxx", extract just the number part
    const match = rollNumber.match(/^STD(\d+)$/i);
    if (match) {
      return match[1].padStart(4, '0');
    }

    // If it's already just a number, pad to 4 digits and return
    const numericRoll = rollNumber.replace(/\D/g, '');
    if (numericRoll) {
      return numericRoll.padStart(4, '0');
    }
    
    return rollNumber;
  };

  // Generate separate student ID and roll number
  const generateStudentId = async (overrideType?: 'new' | 'old', selectedClass?: string) => {
    try {
      const actualClass = selectedClass || newStudent.class;
      console.log('🔢 Generating new student ID and roll number...');
      console.log('📚 Selected class for roll number:', actualClass);
      const students = await studentQueries.getAllStudents(false);
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
      console.log(`🔢 Generated new roll number for ${selectedClass || 'all classes'}:`, newRollNumber);
      console.log('🔍 Final verification - ID exists in database:', existingStudentIds.includes(newId));

      // Generate Registration Number = 26 + School Code + Roll Number (4 digits)
      // Get school code from settings or use default
      const settings = await settingsQueries.getSettings();
      const schoolCode = settings?.schoolCode || SCHOOL_ID;
      
      // Registration number format: 26 + schoolCode + rollNumber (e.g., "261023300001")
      const newRegNumber = `26${schoolCode}${newRollNumber}`;
      console.log('🔢 Generated new registration number:', newRegNumber);
      console.log('📚 School code:', schoolCode, 'Roll number:', newRollNumber);

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

  // Load classes from Firebase
  useEffect(() => {
    const loadClassData = async () => {
      try {
        const allClasses = await classQueries.getAllClasses();
        const classNames = [...new Set(allClasses.map(cls => cls.className).filter((name): name is string => Boolean(name)))];

        setClasses(classNames.length > 0 ? classNames : ['১ম শ্রেণি', '২য় শ্রেণি', '৩য় শ্রেণি', '৪র্থ শ্রেণি', '৫ম শ্রেণি', '৬ষ্ঠ শ্রেণি', '৭ম শ্রেণি', '৮ম শ্রেণি', '৯ম শ্রেণি', '১০ম শ্রেণি']);
      } catch (error) {
        console.error('Error loading class data:', error);
        setClasses(['১ম শ্রেণি', '২য় শ্রেণি', '৩য় শ্রেণি', '৪র্থ শ্রেণি', '৫ম শ্রেণি', '৬ষ্ঠ শ্রেণি', '৭ম শ্রেণি', '৮ম শ্রেণি', '৯ম শ্রেণি', '১০ম শ্রেণি']);
      }
    };

    loadClassData();
  }, []);

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

  // Auto-generate email when name is typed
  useEffect(() => {
    if (newStudent.name.trim()) {
      const generatedEmail = emailUtils.generateStudentEmail(
        newStudent.name,
        newStudent.studentId || '001',
        'iqra'
      );
      setNewStudent(prev => ({ ...prev, email: generatedEmail }));
    } else {
      setNewStudent(prev => ({ ...prev, email: '' }));
    }
  }, [newStudent.name, newStudent.studentId]);

  const handleInputChange = async (field: string, value: string) => {
    setNewStudent({ ...newStudent, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }

    // Regenerate roll number when class changes for new students
    // IMPORTANT: Preserve registration number when class changes
    if (field === 'class' && newStudent.studentType === 'new' && value.trim()) {
      console.log('🔄 Class changed, regenerating roll number for class:', value);
      // Save the existing registration number before regenerating
      const existingRegistrationNumber = newStudent.registrationNumber;
      await generateStudentId('new', value);
      // Restore the registration number after regenerating (it should not change)
      if (existingRegistrationNumber && existingRegistrationNumber.trim()) {
        setNewStudent(prev => ({
          ...prev,
          registrationNumber: existingRegistrationNumber
        }));
      }
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
      await generateStudentId('new');
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
        if (!process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || !process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
          setErrors({ ...errors, profileImage: 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।' });
          setIsUploading(false);
          setUploadProgress(0);
          setImagePreview(null);
          setUploadedImageUrl(null);
          return;
        }

        setErrors({ ...errors, profileImage: '' });
        setIsUploading(true);
        setUploadProgress(0);

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to ImageKit
        const uploadSucceeded = await uploadToImageKit(file);
        if (!uploadSucceeded) {
          return;
        }
      } catch (error) {
        console.error('Error handling file:', error);
        setErrors({ ...errors, profileImage: 'ফাইল প্রসেস করতে সমস্যা হয়েছে' });
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const uploadToImageKit = async (file: File) => {
    try {
      console.log('📸 Starting ImageKit upload...');
      console.log('🔐 Getting authentication parameters...');
      const authResponse = await fetch('/api/imagekit');
      console.log('🔐 Auth response status:', authResponse.status);
      const authData = await authResponse.json();
      console.log('🔐 Auth data:', authData);

      if (!authResponse.ok) {
        console.warn('❌ Authentication unavailable:', authData);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedImageUrl(null);
        setImagePreview(null);
        setErrors({ ...errors, profileImage: authData.message || 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।' });
        return false;
      }

      const formData = new FormData();
      const fileName = `student-${newStudent.studentId || 'temp'}-${Date.now()}`;

      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('folder', '/school-management/students');
      formData.append('tags', 'student,profile,admission');
      formData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');
      formData.append('token', authData.token);
      formData.append('expire', authData.expire.toString());
      formData.append('signature', authData.signature);

      console.log('📦 Form data prepared:');
      console.log('📦 File name:', fileName);
      console.log('📦 File size:', file.size);
      console.log('📦 File type:', file.type);
      console.log('📦 Public Key:', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || 'NOT_CONFIGURED');
      console.log('📦 Token:', authData.token);
      console.log('📦 Expire:', authData.expire);
      console.log('📦 Signature:', authData.signature);

      return await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            console.log(`📊 Upload progress: ${progress}%`);
          }
        });

        xhr.addEventListener('load', () => {
          console.log('📡 Upload response status:', xhr.status);
          console.log('📡 Upload response:', xhr.responseText);

          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('✅ ImageKit upload successful:', response);
              setUploadedImageUrl(response.url);
              setImagePreview(response.url);
              setIsUploading(false);
              setUploadProgress(100);
              setErrors({ ...errors, profileImage: '' });
              resolve(true);
            } catch (parseError) {
              console.error('❌ Failed to parse upload response:', parseError);
              setIsUploading(false);
              setUploadProgress(0);
              setUploadedImageUrl(null);
              setImagePreview(null);
              setErrors({ ...errors, profileImage: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
              resolve(false);
            }
          } else {
            console.error('❌ Upload failed with status:', xhr.status);
            console.error('❌ Upload response:', xhr.responseText);
            setIsUploading(false);
            setUploadProgress(0);
            setUploadedImageUrl(null);
            setImagePreview(null);
            setErrors({ ...errors, profileImage: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
            resolve(false);
          }
        });

        xhr.addEventListener('error', (error) => {
          console.error('❌ Upload network error:', error);
          setIsUploading(false);
          setUploadProgress(0);
          setUploadedImageUrl(null);
          setImagePreview(null);
          setErrors({ ...errors, profileImage: 'নেটওয়ার্ক সমস্যার কারণে আপলোড ব্যর্থ হয়েছে।' });
          resolve(false);
        });

        xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
        xhr.send(formData);
      });
    } catch (error) {
      console.error('❌ ImageKit upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedImageUrl(null);
      setImagePreview(null);
      setErrors({ ...errors, profileImage: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
      return false;
    }
  };

  const removeImage = () => {
    setNewStudent({ ...newStudent, profileImage: null });
    setImagePreview(null);
    setUploadedImageUrl(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  // Upload document to ImageKit
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
      const settings = await settingsQueries.getSettings();
      const schoolId = settings?.schoolCode || SCHOOL_ID;
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
      setNewStudent(prev => ({ ...prev, [documentType]: file }));
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

  const generateEmail = async () => {
    if (!newStudent.name.trim()) {
      setErrors({ ...errors, email: 'নাম দিয়ে ইমেইল তৈরি করুন' });
      return;
    }

    // For new students, use roll number; for old students, use student ID
    let identifierForEmail = '';
    
    if (newStudent.studentType === 'new') {
      // Generate roll number if not available
      if (!newStudent.rollNumber.trim()) {
        await generateStudentId('new', newStudent.class);
      }
      identifierForEmail = newStudent.rollNumber;
    } else {
      // For old students, use student ID
      if (!newStudent.studentId.trim()) {
        await generateStudentId('old', newStudent.class);
      }
      identifierForEmail = newStudent.studentId;
    }
    
    // Generate email using name and identifier (roll number for new, student ID for old)
    console.log('📧 Generating email with:', {
      name: newStudent.name,
      identifier: identifierForEmail,
      studentType: newStudent.studentType
    });
    const generatedEmail = emailUtils.generateStudentEmail(newStudent.name, identifierForEmail);
    console.log('📧 Generated email:', generatedEmail);
    setNewStudent(prev => ({ ...prev, email: generatedEmail }));
  };

  const validateForm = () => {
    console.log('🔍 Validating form...');
    console.log('📝 Current form data:', newStudent);

    const newErrors: Record<string, string> = {};

    // Check name
    if (!newStudent.name.trim()) {
      newErrors.name = 'নাম প্রয়োজনীয়';
      console.log('❌ Name validation failed: empty');
    } else {
      console.log('✅ Name validation passed:', newStudent.name);
    }

    // Check class
    if (!newStudent.class.trim()) {
      newErrors.class = 'ক্লাস নির্বাচন করুন';
      console.log('❌ Class validation failed: empty');
    } else {
      console.log('✅ Class validation passed:', newStudent.class);
    }

    if (!newStudent.gender.trim()) {
      newErrors.gender = 'লিঙ্গ নির্বাচন করুন';
      console.log('❌ Gender validation failed: empty');
    } else {
      console.log('✅ Gender validation passed:', newStudent.gender);
    }

    // Check email format if provided
    if (newStudent.email.trim()) {
      if (!/\S+@\S+\.\S+/.test(newStudent.email)) {
      newErrors.email = 'সঠিক ইমেইল ফরম্যাট দিন';
        console.log('❌ Email validation failed: invalid format');
      } else {
        console.log('✅ Email validation passed:', newStudent.email);
      }
    } else {
      console.log('✅ Email validation skipped: empty (optional)');
    }

    // Check guardian phone if provided
    if (newStudent.guardianPhone && newStudent.guardianPhone.trim()) {
      if (!/^01[3-9]\d{8}$/.test(newStudent.guardianPhone)) {
      newErrors.guardianPhone = 'সঠিক ফোন নম্বর দিন';
        console.log('❌ Guardian phone validation failed: invalid format');
      } else {
        console.log('✅ Guardian phone validation passed:', newStudent.guardianPhone);
      }
    }

    console.log('❌ Final validation errors:', newErrors);
    console.log('📊 Total errors count:', Object.keys(newErrors).length);

    Object.entries(newErrors).forEach(([field, error]) => {
      console.log(`❌ ${field}: ${error}`);
    });

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('✅ Form is valid:', isValid);
    return isValid;
  };

  const handleSaveStudent = async () => {
    console.log('🔄 Starting form submission...');
    console.log('📝 Form data:', newStudent);
    console.log('📊 Current step:', currentStep);

    // Ensure we're on the final step
    if (currentStep < 3) {
      console.log('❌ Not on final step, moving to step 3');
      setCurrentStep(3);
      return;
    }

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('✅ Form validation passed');
    setIsSaving(true);

    try {
      console.log('🔍 Getting settings...');
      const settings = await settingsQueries.getSettings();
      console.log('⚙️ Settings:', settings);

      // Check if student ID is already provided and preserve it
      let finalStudentId = newStudent.studentId;
      console.log('📝 Current student ID in form:', finalStudentId);

      if (!finalStudentId || finalStudentId.trim() === '') {
        // Only generate new student ID if none provided
        console.log('🔢 No student ID provided, generating new one...');
        finalStudentId = await generateStudentId(newStudent.studentType === 'old' ? 'old' : 'new');
        console.log('✅ Generated student ID:', finalStudentId);

        // The generateStudentId function now ensures proper sequential IDs
        console.log('✅ Using generated sequential ID:', finalStudentId);
      } else {
        // Check if existing student ID is already taken
        console.log('🔍 Checking if existing student ID is available:', finalStudentId);
        const existingStudent = await studentQueries.getStudentByStudentId(finalStudentId);
        if (existingStudent) {
          console.log('⚠️ Student ID already exists, generating new one...');
          finalStudentId = await generateStudentId(newStudent.studentType === 'old' ? 'old' : 'new', newStudent.class);
          console.log('✅ Generated new student ID:', finalStudentId);
        } else {
          console.log('✅ Existing student ID is available:', finalStudentId);
        }
      }

      // Use uploaded ImageKit URL
      const profileImageUrl = uploadedImageUrl || '';

      // Generate registration number if not already set (26 + School Code + Roll Number with 4 digits)
      let finalRegistrationNumber = newStudent.registrationNumber;
      if (!finalRegistrationNumber || finalRegistrationNumber.trim() === '') {
        const schoolCode = settings?.schoolCode || SCHOOL_ID;
        const paddedRoll = newStudent.rollNumber?.toString().padStart(4, '0') || '0001';
        finalRegistrationNumber = `26${schoolCode}${paddedRoll}`;
      }

      const studentData = {
        name: newStudent.name,
        displayName: newStudent.name,
        email: newStudent.email,
        class: newStudent.class,
        gender: newStudent.gender,
        studentId: finalStudentId,
        rollNumber: newStudent.rollNumber,
        registrationNumber: finalRegistrationNumber,
        guardianName: newStudent.guardianName,
        guardianPhone: newStudent.guardianPhone,
        address: newStudent.address,
        division: newStudent.division,
        district: newStudent.district,
        upazila: newStudent.upazila,
        union: newStudent.union,
        postalCode: newStudent.postalCode,
        dateOfBirth: newStudent.dateOfBirth,
        profileImage: profileImageUrl, // Add profile image
        // Parents Information
        fatherName: newStudent.fatherName,
        fatherPhone: newStudent.fatherPhone,
        fatherOccupation: newStudent.fatherOccupation,
        motherName: newStudent.motherName,
        motherPhone: newStudent.motherPhone,
        motherOccupation: newStudent.motherOccupation,
        gender: newStudent.gender,
        // Documents
        studentBirthCertificate: uploadedDocuments.studentBirthCertificate || '',
        studentVaccinationCard: uploadedDocuments.studentVaccinationCard || '',
        fatherBirthCertificate: uploadedDocuments.fatherBirthCertificate || '',
        fatherVoterId: uploadedDocuments.fatherVoterId || '',
        motherBirthCertificate: uploadedDocuments.motherBirthCertificate || '',
        motherVoterId: uploadedDocuments.motherVoterId || '',
        // Previous School Info
        previousSchool: newStudent.previousSchool,
        previousClass: newStudent.previousClass,
        reasonForLeaving: newStudent.reasonForLeaving,
        previousGPA: newStudent.previousGPA,
        role: 'student' as const,
        schoolId: settings?.schoolCode || SCHOOL_ID,
        schoolName: settings?.schoolName || 'আমার স্কুল',
        isActive: false, // Inactive until approved
        isApproved: false, // For online admission, needs approval
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('💾 Creating student with data:', studentData);
      
      try {
        const result = await studentQueries.createStudentWithAutoEmail(studentData as any);
        console.log('✅ Student created with ID:', result);

        // Update the form with the generated student ID for display
        setNewStudent(prev => ({ ...prev, studentId: finalStudentId }));
        console.log('📝 Updated form with student ID:', finalStudentId);

        // Show success modal with the generated student ID
      setShowSuccess(true);
        console.log('✅ Success modal will show student ID:', finalStudentId);
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
          const result = await studentQueries.createStudentWithAutoEmail(updatedStudentData as any);
          console.log('✅ Student created with new ID:', result);
          
          // Update the form with the new student ID for display
          setNewStudent(prev => ({ ...prev, studentId: finalStudentId }));
          console.log('📝 Updated form with new student ID:', finalStudentId);
          
          // Show success modal with the new student ID
          setShowSuccess(true);
          console.log('✅ Success modal will show new student ID:', finalStudentId);
        } else {
          throw error; // Re-throw if it's not a duplicate ID error
        }
      }
    } catch (error) {
      console.error('❌ Error saving student:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErrors({ general: 'ভর্তি আবেদন জমা দিতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। ত্রুটি: ' + errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    console.log('⏭️ Next step clicked, current step:', currentStep);

    // Validate current step before proceeding
    if (currentStep === 1) {
      const step1Errors: Record<string, string> = {};
      if (!newStudent.name.trim()) step1Errors.name = 'নাম প্রয়োজনীয়';
      if (!newStudent.class.trim()) step1Errors.class = 'ক্লাস নির্বাচন করুন';

      if (Object.keys(step1Errors).length > 0) {
        console.log('❌ Step 1 validation failed:', step1Errors);
        setErrors(step1Errors);
        return;
      }
    }

    if (currentStep < 3) {
      console.log('⏭️ Moving to step:', currentStep + 1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Navigation */}
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-2xl">
                <GraduationCap className="w-14 h-14 text-white" />
                </div>
              </div>
            <h1 className="text-6xl font-bold mb-6 text-shadow-lg">ভর্তি আবেদন</h1>
            <p className="text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed">
              আমার স্কুলে আপনার সন্তানের ভবিষ্যৎ গড়ে তুলুন। 
              অনলাইনে সহজেই ভর্তি আবেদন করুন এবং উত্তম শিক্ষার সুযোগ গ্রহণ করুন।
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-base">
              <div className="flex items-center space-x-3 bg-white/10 px-6 py-3 rounded-full backdrop-blur-sm">
                <Shield className="w-6 h-6" />
                <span className="font-medium">নিরাপদ পরিবেশ</span>
            </div>
              <div className="flex items-center space-x-3 bg-white/10 px-6 py-3 rounded-full backdrop-blur-sm">
                <Award className="w-6 h-6" />
                <span className="font-medium">মানসম্পন্ন শিক্ষা</span>
            </div>
              <div className="flex items-center space-x-3 bg-white/10 px-6 py-3 rounded-full backdrop-blur-sm">
                <Heart className="w-6 h-6" />
                <span className="font-medium">ইসলামিক মূল্যবোধ</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/10 px-6 py-3 rounded-full backdrop-blur-sm">
                <Users className="w-6 h-6" />
                <span className="font-medium">দক্ষ শিক্ষক</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-6xl mx-auto p-4 lg:p-8 -mt-8 relative z-10">
        {/* Progress Indicator */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">ভর্তি আবেদন ফর্ম</h2>
                <p className="text-gray-600">সহজ ৩টি ধাপে আবেদন সম্পন্ন করুন</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">ধাপ {currentStep}/3</div>
              <div className="text-sm text-gray-500">প্রগতি</div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full transform -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-full transform -translate-y-1/2 z-10" 
                 style={{width: `${(currentStep - 1) * 50}%`}}></div>
            
            <div className={`flex flex-col items-center space-y-2 relative z-20 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                currentStep >= 1 ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
              }`}>১</div>
              <span className="text-sm font-medium text-center">ব্যক্তিগত<br/>তথ্য</span>
          </div>

            <div className={`flex flex-col items-center space-y-2 relative z-20 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                currentStep >= 2 ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
              }`}>২</div>
              <span className="text-sm font-medium text-center">অভিভাবকের<br/>তথ্য</span>
            </div>
            
            <div className={`flex flex-col items-center space-y-2 relative z-20 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                currentStep >= 3 ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
              }`}>৩</div>
              <span className="text-sm font-medium text-center">অন্যান্য<br/>তথ্য</span>
            </div>
          </div>
        </div>

        {/* General Error Display */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">ত্রুটি</span>
            </div>
            <p className="text-red-700 mt-2 text-sm">{errors.general}</p>
          </div>
        )}

          {/* Form Sections */}
          <div className="space-y-8">
          {/* Step 1: Profile Image & Basic Info */}
          {currentStep === 1 && (
            <>
              {/* Student Type Selection */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">শিক্ষার্থীর ধরন *</span>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => handleStudentTypeChange('new')}
                    className={`flex items-center justify-center space-x-2 px-6 py-3 border-2 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
                      isNewStudent
                        ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white border-transparent shadow-lg'
                        : 'bg-white text-gray-700 border-blue-100 hover:border-blue-300'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isNewStudent ? 'text-white' : 'text-blue-500'}`} />
                    <span className="text-sm font-semibold tracking-wide">নতুন শিক্ষার্থী</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStudentTypeChange('old')}
                    className={`flex items-center justify-center space-x-2 px-6 py-3 border-2 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
                      isOldStudent
                        ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white border-transparent shadow-lg'
                        : 'bg-white text-gray-700 border-blue-100 hover:border-blue-300'
                    }`}
                  >
                    <User className={`w-4 h-4 ${isOldStudent ? 'text-white' : 'text-blue-500'}`} />
                    <span className="text-sm font-semibold tracking-wide">পুরাতন শিক্ষার্থী</span>
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">প্রোফাইল ছবি</h3>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">ঐচ্ছিক</span>
                </div>
                
                <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-50 to-green-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors overflow-hidden">
                      {isUploading ? (
                        <div className="text-center w-full">
                          <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
                          <p className="text-xs text-blue-600 font-medium mb-2">আপলোড হচ্ছে...</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600">{uploadProgress}%</p>
                        </div>
                      ) : (imagePreview || uploadedImageUrl) ? (
                        <img
                          src={imagePreview || uploadedImageUrl || ''}
                      alt="Profile preview"
                          className="w-full h-full rounded-full object-cover shadow-lg"
                    />
                  ) : (
                        <div className="text-center">
                          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">ছবি যোগ করুন</p>
                        </div>
                  )}
                </div>
                    {(imagePreview || uploadedImageUrl) && !isUploading && (
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                        title="ছবি সরান"
                      >
                        <span className="text-xs">×</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ছবি আপলোড করুন</label>
                 <div className="relative">
                      <input
                        type="file"
                     accept="image/*"
                        onChange={handleImageUpload}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     disabled={isUploading}
                   />
                   <div className={`cursor-pointer inline-flex items-center space-x-2 px-6 py-3 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                     isUploading
                       ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
                       : 'bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700'
                   }`}>
                     {isUploading ? (
                       <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span>আপলোড হচ্ছে... {uploadProgress}%</span>
                       </>
                     ) : (
                       <>
                         <Upload className="w-4 h-4" />
                         <span>ছবি নির্বাচন করুন</span>
                       </>
                    )}
                  </div>
                 </div>
                    </div>
                    
                  {errors.profileImage && (
                   <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                     <AlertCircle className="w-4 h-4" />
                     <span>{errors.profileImage}</span>
                   </div>
                 )}

                 {(imagePreview || uploadedImageUrl) && !isUploading && (
                   <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                     <CheckCircle className="w-4 h-4" />
                     <span>ছবি সফলভাবে আপলোড হয়েছে!</span>
                   </div>
                 )}

                 <div className="text-xs text-gray-500 space-y-1">
                   <p>• সর্বোচ্চ ১০MB আকারের ছবি</p>
                   <p>• JPG, PNG, GIF ফরম্যাট সমর্থিত</p>
                   <p>• ছবি পরিষ্কার এবং স্পষ্ট হতে হবে</p>
                 </div>
                </div>
              </div>
            </div>

            {/* Student Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex flex-col items-center text-center mb-6 space-y-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">শিক্ষার্থীর তথ্য</h3>
                  <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full">প্রয়োজনীয়</span>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                     <User className="w-4 h-4 text-gray-500" />
                     <span>শিক্ষার্থীর নাম *</span>
                   </label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                     className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                       errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    }`}
                     placeholder="যেমন: মোহাম্মদ আব্দুল্লাহ আল মামুন"
                  />
                  {errors.name && (
                   <div className="flex items-center space-x-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-lg">
                     <AlertCircle className="w-4 h-4" />
                     <span>{errors.name}</span>
                   </div>
                  )}
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                     <Mail className="w-4 h-4 text-gray-500" />
                     <span>ইমেইল ঠিকানা</span>
                     <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">ঐচ্ছিক</span>
                  </label>
                   <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                         className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                           errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                      } ${newStudent.email && newStudent.name ? 'bg-green-50 border-green-200' : ''}`}
                      placeholder="নাম লিখলে স্বয়ংক্রিয়ভাবে তৈরি হবে..."
                    />
                    <button
                      type="button"
                      onClick={generateEmail}
                         className="px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm whitespace-nowrap transition-all transform hover:scale-105"
                      title="ইমেইল তৈরি করুন"
                    >
                         <Star className="w-4 h-4 mr-1 inline" />
                      তৈরি করুন
                    </button>
                  </div>
                      
                  {errors.email && (
                       <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                         <AlertCircle className="w-4 h-4" />
                         <span>{errors.email}</span>
                       </div>
                     )}

                  {newStudent.email && newStudent.name && (
                       <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                         <CheckCircle className="w-4 h-4" />
                         <span>স্বয়ংক্রিয়ভাবে তৈরি হয়েছে</span>
                       </div>
                     )}
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>লিঙ্গ *</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['male', 'female'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleInputChange('gender', value)}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          newStudent.gender === value
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        <span>{value === 'male' ? 'ছেলে' : 'মেয়ে'}</span>
                      </button>
                    ))}
                  </div>
                  {errors.gender && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.gender}</span>
                    </div>
                  )}
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                     <BookOpen className="w-4 h-4 text-gray-500" />
                     <span>ক্লাস নির্বাচন করুন *</span>
                   </label>
                  <select
                    value={newStudent.class}
                    onChange={(e) => handleInputChange('class', e.target.value)}
                     className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                       errors.class ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                     }`}
                  >
                    <option value="">ক্লাস নির্বাচন করুন</option>
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                   {errors.class && (
                     <div className="flex items-center space-x-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-lg">
                       <AlertCircle className="w-4 h-4" />
                       <span>{errors.class}</span>
                     </div>
                   )}
                </div>

                 {/* Roll Number Field - Auto for new, Manual for old */}
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
                       className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none"
                        placeholder="স্বয়ংক্রিয়ভাবে তৈরি হবে..."
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Award className="w-4 h-4 text-green-500" />
                </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {newStudent.studentType === 'new'
                        ? 'নতুন শিক্ষার্থীদের জন্য স্বয়ংক্রিয়ভাবে শিক্ষার্থী আইডি ও রোল তৈরি হয়'
                        : 'পুরাতন শিক্ষার্থীদের জন্য বিদ্যমান আইডি বজায় থাকবে'}
                    </p>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>জন্ম তারিখ</span>
                    </label>
                  <input
                    type="date"
                    value={newStudent.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col items-center text-center mb-6 space-y-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">ঠিকানা</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Division Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">বিভাগ *</label>
                  <select
                    value={newStudent.division}
                    onChange={(e) => handleInputChange('division', e.target.value)}
                    disabled={loadingLocations}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                  placeholder="যেমন: গ্রামের নাম, রোড নম্বর, বাড়ি নম্বর ইত্যাদি"
                  rows={3}
                />
              </div>
            </div>
            </>
          )}

          {/* Step 2: Parents Information */}
          {currentStep === 2 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">অভিভাবকের তথ্য</h3>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">ঐচ্ছিক</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পিতার নাম</label>
                  <input
                    type="text"
                    value={newStudent.fatherName}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="পিতার পুরো নাম"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পিতার ফোন</label>
                  <input
                    type="tel"
                    value={newStudent.fatherPhone}
                    onChange={(e) => handleInputChange('fatherPhone', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.fatherPhone ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                    }`}
                    placeholder="০১৭১২৩৪৫৬৭৮"
                  />
                  {errors.fatherPhone && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.fatherPhone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পিতার পেশা</label>
                  <input
                    type="text"
                    value={newStudent.fatherOccupation}
                    onChange={(e) => handleInputChange('fatherOccupation', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="পেশা বা চাকরির ধরন"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">মাতার নাম</label>
                  <input
                    type="text"
                    value={newStudent.motherName}
                    onChange={(e) => handleInputChange('motherName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="মাতার পুরো নাম"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">মাতার ফোন</label>
                  <input
                    type="tel"
                    value={newStudent.motherPhone}
                    onChange={(e) => handleInputChange('motherPhone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="০১৭১২৩৪৫৬৭৮"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">মাতার পেশা</label>
                  <input
                    type="text"
                    value={newStudent.motherOccupation}
                    onChange={(e) => handleInputChange('motherOccupation', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="পেশা বা চাকরির ধরন"
                  />
                </div>
                </div>
                </div>
          )}

          {/* Step 3: Additional Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Previous School Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-orange-600" />
                </div>
                  <h3 className="text-lg font-semibold text-gray-900">পূর্ববর্তী স্কুলের তথ্য</h3>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">ঐচ্ছিক</span>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী স্কুলের নাম</label>
                  <input
                    type="text"
                    value={newStudent.previousSchool}
                    onChange={(e) => handleInputChange('previousSchool', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="পূর্ববর্তী স্কুলের নাম"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী ক্লাস</label>
                  <input
                    type="text"
                    value={newStudent.previousClass}
                    onChange={(e) => handleInputChange('previousClass', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="যেমন: ক্লাস ৯, দশম শ্রেণী"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পূর্ববর্তী GPA/Grade</label>
                  <input
                    type="text"
                    value={newStudent.previousGPA}
                    onChange={(e) => handleInputChange('previousGPA', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="যেমন: 4.50, A+, 85%"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">স্কুল পরিবর্তনের কারণ</label>
                  <textarea
                    value={newStudent.reasonForLeaving}
                    onChange={(e) => handleInputChange('reasonForLeaving', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all"
                    placeholder="পূর্ববর্তী স্কুল থেকে চলে আসার কারণ"
                      rows={3}
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

                  <p className="text-xs text-gray-500 mt-4">
                    • সর্বোচ্চ ১০MB আকারের ফাইল (ছবি বা PDF)<br/>
                    • JPG, PNG, PDF ফরম্যাট সমর্থিত<br/>
                    • ডকুমেন্ট পরিষ্কার এবং স্পষ্ট হতে হবে
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Notification */}
          {showSuccess && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                 {/* Header with gradient background */}
                 <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 text-white text-center">
                   <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                     <CheckCircle className="w-8 h-8 text-white" />
            </div>
                   <h3 className="text-xl font-bold mb-2">আবেদন সফল!</h3>
                   <p className="text-green-100 text-sm">ভর্তি আবেদন সফলভাবে জমা হয়েছে</p>
                 </div>

                 {/* Content */}
                 <div className="p-6 text-center">
                   <div className="mb-6">
                     <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                       {(imagePreview || uploadedImageUrl) ? (
                         <img
                           src={(imagePreview || uploadedImageUrl) as string}
                           alt="Profile"
                           className="w-full h-full object-cover rounded-full"
                         />
                       ) : (
                         <CheckCircle className="w-10 h-10 text-green-600" />
                       )}
                     </div>
                     <h4 className="text-lg font-semibold text-gray-900 mb-2">
                       আপনার ভর্তি আবেদন সফলভাবে জমা হয়েছে!
                     </h4>
                     <p className="text-gray-600 text-sm leading-relaxed">
                       প্রশাসনের অনুমোদনের পর আপনাকে জানানো হবে। ধন্যবাদ আমাদের সাথে যুক্ত হওয়ার জন্য।
                     </p>
                   </div>

                   {/* Student ID, Roll Number, Registration Number, Email and Phone Display */}
                   {newStudent.studentId && (
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                         <div>
                           <div className="flex items-center space-x-2 mb-2">
                             <Award className="w-4 h-4 text-blue-600" />
                             <span className="text-sm font-medium text-blue-800">শিক্ষার্থী আইডি</span>
                           </div>
                           <p className="text-lg font-mono font-bold text-blue-700">{newStudent.studentId}</p>
                           <p className="text-xs text-blue-600 mt-1">এই আইডি সংরক্ষণ করে রাখুন</p>
                         </div>
                         
                         <div>
                           <div className="flex items-center space-x-2 mb-2">
                             <Award className="w-4 h-4 text-blue-600" />
                             <span className="text-sm font-medium text-blue-800">রোল নম্বর</span>
                           </div>
                           <p className="text-lg font-mono font-bold text-blue-700">{formatRollNumber(newStudent.rollNumber)}</p>
                           <p className="text-xs text-blue-600 mt-1">এই রোল নম্বর সংরক্ষণ করে রাখুন</p>
                         </div>

                         <div>
                           <div className="flex items-center space-x-2 mb-2">
                             <FileText className="w-4 h-4 text-blue-600" />
                             <span className="text-sm font-medium text-blue-800">রেজিস্ট্রেশন নম্বর</span>
                           </div>
                           <p className="text-lg font-mono font-bold text-blue-700">{newStudent.registrationNumber || 'প্রস্তুত হচ্ছে...'}</p>
                           <p className="text-xs text-blue-600 mt-1">ফলাফল দেখতে এই নম্বর ব্যবহার করুন</p>
                         </div>
                       </div>
                       
                       {/* Email */}
                       {newStudent.email && (
                         <div className="pt-4 border-t border-blue-200">
                           <div>
                             <div className="flex items-center space-x-2 mb-2">
                               <Mail className="w-4 h-4 text-blue-600" />
                               <span className="text-sm font-medium text-blue-800">ইমেইল</span>
                             </div>
                             <p className="text-base font-semibold text-blue-700 break-all">{newStudent.email}</p>
                             <p className="text-xs text-blue-600 mt-1">এই ইমেইল সংরক্ষণ করে রাখুন</p>
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                   {/* Action Button */}
            <button
                     onClick={() => {
                       setShowSuccess(false);
                       router.push('/');
                     }}
                     className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-green-700 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     ঠিক আছে
            </button>

                   {/* Footer Text */}
                   <p className="text-xs text-gray-500 mt-4">
                     আপনাকে শীঘ্রই যোগাযোগ করা হবে
                   </p>
                 </div>
               </div>
             </div>
           )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div className="flex space-x-4">
              {currentStep > 1 && (
            <button
                  onClick={prevStep}
                  className="flex items-center space-x-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>পিছনে</span>
                </button>
              )}
            </div>

            <div className="flex space-x-4">
              {currentStep < 3 ? (
                <button
                  onClick={nextStep}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all transform hover:scale-105"
                >
                  <span>পরবর্তী ধাপ</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    console.log('🚀 Submit button clicked, current step:', currentStep);
                    if (currentStep < 3) {
                      console.log('⏭️ Auto-moving to step 3');
                      setCurrentStep(3);
                      setTimeout(() => handleSaveStudent(), 100);
                    } else {
                      handleSaveStudent();
                    }
                  }}
              disabled={isSaving}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                  <span>ভর্তি হচ্ছে...</span>
                    </>
              ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>ভর্তি আবেদন জমা দিন</span>
                    </>
              )}
            </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
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
}

export default function PublicAdmissionPageWrapper() {
  return <PublicAdmissionPage />;
}