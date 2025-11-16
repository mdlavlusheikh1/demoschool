'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { studentQueries, User as StudentUser, settingsQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Building,
  FileText,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Camera,
  Upload,
  Briefcase,
  School,
  X
} from 'lucide-react';

function StudentViewPage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentUid = searchParams.get('uid');
  
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (studentUid) {
      loadSettings();
      loadStudent(studentUid);
      // Set up real-time listener
      const unsubscribe = setupRealtimeListener(studentUid);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      setError('শিক্ষার্থী ID পাওয়া যায়নি');
      setLoading(false);
    }
  }, [studentUid]);

  const loadSettings = async () => {
    try {
      const settingsData = await settingsQueries.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Real-time listener for student updates
  const setupRealtimeListener = (uid: string) => {
    if (!uid) return;
    
    const studentRef = doc(db, 'students', uid);
    
    const unsubscribe = onSnapshot(studentRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const studentData = { uid: docSnapshot.id, ...docSnapshot.data() } as StudentUser;
        console.log('🔄 Real-time update received:', studentData);
        
        // Verify that this student belongs to the parent
        const parentPhone = (userData as any)?.phone || user?.phoneNumber;
        const guardianPhone = (studentData as any).guardianPhone || '';
        const fatherPhone = (studentData as any).fatherPhone || '';
        const motherPhone = (studentData as any).motherPhone || '';
        
        if (parentPhone && 
            guardianPhone !== parentPhone && 
            fatherPhone !== parentPhone && 
            motherPhone !== parentPhone) {
          setError('আপনার এই শিক্ষার্থীর তথ্য দেখার অনুমতি নেই');
          return;
        }
        
        setStudent(studentData);
        if ((studentData as any).profileImage) {
          setImagePreview((studentData as any).profileImage);
        }
      } else {
        setError('শিক্ষার্থী পাওয়া যায়নি');
      }
    }, (error) => {
      console.error('Error in real-time listener:', error);
    });

    return unsubscribe;
  };

  const loadStudent = async (uid: string) => {
    try {
      setLoading(true);
      setError('');
      
      const studentData = await studentQueries.getStudentById(uid);
      
      if (!studentData) {
        setError('শিক্ষার্থী পাওয়া যায়নি');
        return;
      }

      // Verify that this student belongs to the parent
      const parentPhone = (userData as any)?.phone || user?.phoneNumber;
      const guardianPhone = (studentData as any).guardianPhone || '';
      const fatherPhone = (studentData as any).fatherPhone || '';
      const motherPhone = (studentData as any).motherPhone || '';
      
      if (parentPhone && 
          guardianPhone !== parentPhone && 
          fatherPhone !== parentPhone && 
          motherPhone !== parentPhone) {
        setError('আপনার এই শিক্ষার্থীর তথ্য দেখার অনুমতি নেই');
        return;
      }
      
      setStudent(studentData);
      if ((studentData as any).profileImage) {
        setImagePreview((studentData as any).profileImage);
      }
    } catch (error: any) {
      console.error('Error loading student:', error);
      setError('শিক্ষার্থী লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && student) {
      if (file.size > 10 * 1024 * 1024) {
        setImageError('ফাইলের আকার ১০MB এর বেশি হতে পারবে না');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setImageError('শুধুমাত্র ছবি ফাইল আপলোড করুন');
        return;
      }

      try {
        setUploadingImage(true);
        setImageError('');

        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

        if (!publicKey || !urlEndpoint) {
          setImageError('ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।');
          setUploadingImage(false);
          return;
        }

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
          setImageError(authError?.message || 'ImageKit কনফিগার করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।');
          setImagePreview(null);
          setUploadingImage(false);
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
          setImageError('ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
          setImagePreview(null);
          setUploadingImage(false);
          return;
        }

        console.log('✅ Image uploaded successfully:', uploadPayload);
        
        // Update student profile image
        await studentQueries.updateStudent(student.uid, {
          profileImage: uploadPayload.url
        } as any);

        setStudent({ ...student, profileImage: uploadPayload.url as string });
        setImagePreview(uploadPayload.url as string);
        setImageError('');
      } catch (error) {
        console.error('❌ Error uploading image:', error);
        setImageError('ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        setImagePreview(null);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const removeImage = () => {
    if (student) {
      setStudent({ ...student, profileImage: '' });
      setImagePreview(null);
    }
  };

  if (loading) {
    return (
      <ParentLayout title="শিক্ষার্থী দেখুন" subtitle="শিক্ষার্থীর বিস্তারিত তথ্য">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="শিক্ষার্থী দেখুন" subtitle="শিক্ষার্থীর বিস্তারিত তথ্য">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/parent/children')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>সন্তানদের তালিকায় ফিরে যান</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Student Information */}
      {!error && student && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Student Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
                    {imagePreview || (student as any).profileImage ? (
                      <img
                        src={imagePreview || (student as any).profileImage}
                        alt={student.displayName || student.name || 'Student'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-2xl">
                        {(student.displayName || student.name || 'S').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Image Upload Button */}
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {student.displayName || student.name || 'Unknown Student'}
                  </h2>
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
              <button
                onClick={() => router.push(`/parent/children/edit?uid=${studentUid}`)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>সম্পাদনা</span>
              </button>
            </div>
            {imageError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-red-800 text-sm">{imageError}</span>
              </div>
            )}
          </div>

          {/* Student Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                মৌলিক তথ্য
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">নাম</p>
                    <p className="font-medium">{student.displayName || student.name || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">ইমেইল</p>
                    <p className="font-medium">{student.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">ফোন নম্বর</p>
                    <p className="font-medium">{student.phoneNumber || (student as any).phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">যোগদানের তারিখ</p>
                    <p className="font-medium">
                      {student.createdAt ? new Date((student.createdAt as any).toDate()).toLocaleDateString('bn-BD') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2" />
                একাডেমিক তথ্য
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Building className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">ক্লাস</p>
                    <p className="font-medium">{student.class || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="w-4 h-4 mr-3 text-gray-400">বি</span>
                  <div>
                    <p className="text-sm text-gray-600">বিভাগ</p>
                    <p className="font-medium">{student.section || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="w-4 h-4 mr-3 text-gray-400">গ্রু</span>
                  <div>
                    <p className="text-sm text-gray-600">গ্রুপ</p>
                    <p className="font-medium">{student.group || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="w-4 h-4 mr-3 text-gray-400">ID</span>
                  <div>
                    <p className="text-sm text-gray-600">রোল নম্বর</p>
                    <p className="font-medium">{student.rollNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">রেজিস্ট্রেশন নম্বর</p>
                    <p className="font-medium font-mono">{(student as any).registrationNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                ব্যক্তিগত তথ্য
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">জন্ম তারিখ</p>
                  <p className="font-medium">{student.dateOfBirth || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">লিঙ্গ</p>
                  <p className="font-medium">{student.gender || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">রক্তের গ্রুপ</p>
                  <p className="font-medium">{(student as any).bloodGroup || 'N/A'}</p>
                </div>

                {(student as any).address && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-3 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">ঠিকানা</p>
                      <p className="font-medium">{(student as any).address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Guardian Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                অভিভাবকের তথ্য
              </h3>
              <div className="space-y-4">
                {(student as any).guardianName && (
                  <div>
                    <p className="text-sm text-gray-600">অভিভাবকের নাম</p>
                    <p className="font-medium">{(student as any).guardianName}</p>
                  </div>
                )}

                {(student as any).guardianPhone && (
                  <div>
                    <p className="text-sm text-gray-600">অভিভাবকের ফোন</p>
                    <p className="font-medium">{(student as any).guardianPhone}</p>
                  </div>
                )}

                {student.fatherName && (
                  <div>
                    <p className="text-sm text-gray-600">পিতার নাম</p>
                    <p className="font-medium">{student.fatherName}</p>
                  </div>
                )}

                {(student as any).fatherPhone && (
                  <div>
                    <p className="text-sm text-gray-600">পিতার ফোন</p>
                    <p className="font-medium">{(student as any).fatherPhone}</p>
                  </div>
                )}

                {(student as any).fatherOccupation && (
                  <div className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-3 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">পিতার পেশা</p>
                      <p className="font-medium">{(student as any).fatherOccupation}</p>
                    </div>
                  </div>
                )}

                {student.motherName && (
                  <div>
                    <p className="text-sm text-gray-600">মাতার নাম</p>
                    <p className="font-medium">{student.motherName}</p>
                  </div>
                )}

                {(student as any).motherPhone && (
                  <div>
                    <p className="text-sm text-gray-600">মাতার ফোন</p>
                    <p className="font-medium">{(student as any).motherPhone}</p>
                  </div>
                )}

                {(student as any).motherOccupation && (
                  <div className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-3 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">মাতার পেশা</p>
                      <p className="font-medium">{(student as any).motherOccupation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Previous School Information */}
            {((student as any).previousSchool || (student as any).previousClass || (student as any).previousGPA) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <School className="w-5 h-5 mr-2" />
                  পূর্ববর্তী শিক্ষাপ্রতিষ্ঠানের তথ্য
                </h3>
                <div className="space-y-4">
                  {(student as any).previousSchool && (
                    <div>
                      <p className="text-sm text-gray-600">প্রতিষ্ঠানের নাম</p>
                      <p className="font-medium">{(student as any).previousSchool}</p>
                    </div>
                  )}

                  {(student as any).previousClass && (
                    <div>
                      <p className="text-sm text-gray-600">ক্লাস</p>
                      <p className="font-medium">{(student as any).previousClass}</p>
                    </div>
                  )}

                  {(student as any).previousGPA && (
                    <div>
                      <p className="text-sm text-gray-600">GPA</p>
                      <p className="font-medium">{(student as any).previousGPA}</p>
                    </div>
                  )}

                  {(student as any).previousSchoolAddress && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-3 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">ঠিকানা</p>
                        <p className="font-medium">{(student as any).previousSchoolAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address Information */}
            {((student as any).presentAddress || (student as any).permanentAddress || (student as any).city || (student as any).district) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  ঠিকানা
                </h3>
                <div className="space-y-4">
                  {(student as any).presentAddress && (
                    <div>
                      <p className="text-sm text-gray-600">বর্তমান ঠিকানা</p>
                      <p className="font-medium">{(student as any).presentAddress}</p>
                    </div>
                  )}

                  {(student as any).permanentAddress && (
                    <div>
                      <p className="text-sm text-gray-600">স্থায়ী ঠিকানা</p>
                      <p className="font-medium">{(student as any).permanentAddress}</p>
                    </div>
                  )}

                  {(student as any).city && (
                    <div>
                      <p className="text-sm text-gray-600">শহর</p>
                      <p className="font-medium">{(student as any).city}</p>
                    </div>
                  )}

                  {(student as any).district && (
                    <div>
                      <p className="text-sm text-gray-600">জেলা</p>
                      <p className="font-medium">{(student as any).district}</p>
                    </div>
                  )}

                  {(student as any).postalCode && (
                    <div>
                      <p className="text-sm text-gray-600">পোস্টাল কোড</p>
                      <p className="font-medium">{(student as any).postalCode}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <StudentViewPage />
    </ProtectedRoute>
  );
}

