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
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  Save,
  Edit,
  Camera,
  X
} from 'lucide-react';

function StudentEditPage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentUid = searchParams.get('uid');
  
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [realtimeUpdateMessage, setRealtimeUpdateMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    guardianName: '',
    guardianPhone: '',
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    address: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (studentUid) {
      const loadData = async () => {
        try {
          await loadSettings();
          await loadStudent(studentUid);
        } catch (error) {
          console.error('Error loading data:', error);
          setError('তথ্য লোড করতে সমস্যা হয়েছে');
        }
      };
      
      loadData();
      
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
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Don't set error state for settings, it's not critical
    }
  };

  // Real-time listener for student updates (only updates when not actively saving)
  const setupRealtimeListener = (uid: string) => {
    if (!uid) return () => {};
    
    try {
      const studentRef = doc(db, 'students', uid);
      
      const unsubscribe = onSnapshot(studentRef, (docSnapshot) => {
        try {
          // Don't update if currently saving to avoid conflicts
          if (saving) {
            console.log('⏸️ Skipping real-time update - currently saving');
            return;
          }

          if (docSnapshot.exists()) {
            const studentData = { uid: docSnapshot.id, ...docSnapshot.data() } as StudentUser;
            console.log('🔄 Real-time update received in parent edit page:', studentData);
            
            // Verify that this student belongs to the parent
            const parentPhone = (userData as any)?.phone || user?.phoneNumber;
            const guardianPhone = (studentData as any).guardianPhone || '';
            const fatherPhone = (studentData as any).fatherPhone || '';
            const motherPhone = (studentData as any).motherPhone || '';
            
            if (parentPhone && 
                guardianPhone !== parentPhone && 
                fatherPhone !== parentPhone && 
                motherPhone !== parentPhone) {
              setError('আপনার এই শিক্ষার্থীর তথ্য সম্পাদনা করার অনুমতি নেই');
              return;
            }
            
            setStudent(studentData);
            
            // Update image preview if profile image exists
            if ((studentData as any).profileImage) {
              setImagePreview((studentData as any).profileImage);
            }
            
            // Check if data has changed
            setFormData(prevFormData => {
              const newFormData = {
                guardianName: (studentData as any).guardianName || '',
                guardianPhone: (studentData as any).guardianPhone || '',
                fatherName: studentData.fatherName || '',
                fatherPhone: (studentData as any).fatherPhone || '',
                motherName: studentData.motherName || '',
                motherPhone: (studentData as any).motherPhone || '',
                address: (studentData as any).address || ''
              };
              
              // Check if any field has changed
              const hasChanged = 
                prevFormData.guardianName !== newFormData.guardianName ||
                prevFormData.guardianPhone !== newFormData.guardianPhone ||
                prevFormData.fatherName !== newFormData.fatherName ||
                prevFormData.fatherPhone !== newFormData.fatherPhone ||
                prevFormData.motherName !== newFormData.motherName ||
                prevFormData.motherPhone !== newFormData.motherPhone ||
                prevFormData.address !== newFormData.address;
              
              if (hasChanged) {
                // Show notification
                setRealtimeUpdateMessage('তথ্য আপডেট হয়েছে। নতুন তথ্য দেখানো হচ্ছে...');
                setTimeout(() => {
                  setRealtimeUpdateMessage('');
                }, 3000);
                
                return newFormData;
              }
              
              return prevFormData;
            });
          }
        } catch (error) {
          console.error('Error processing real-time update:', error);
        }
      }, (error) => {
        console.error('Error in real-time listener:', error);
        setError('Real-time update লোড করতে সমস্যা হয়েছে');
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
      return () => {};
    }
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
        setError('আপনার এই শিক্ষার্থীর তথ্য সম্পাদনা করার অনুমতি নেই');
        return;
      }
      
      setStudent(studentData);
      
      // Set image preview
      if ((studentData as any).profileImage) {
        setImagePreview((studentData as any).profileImage);
      }
      
      // Set form data
      setFormData({
        guardianName: (studentData as any).guardianName || '',
        guardianPhone: (studentData as any).guardianPhone || '',
        fatherName: studentData.fatherName || '',
        fatherPhone: (studentData as any).fatherPhone || '',
        motherName: studentData.motherName || '',
        motherPhone: (studentData as any).motherPhone || '',
        address: (studentData as any).address || ''
      });
    } catch (error: any) {
      console.error('Error loading student:', error);
      setError('শিক্ষার্থী লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.guardianPhone && !/^01[3-9]\d{8}$/.test(formData.guardianPhone.replace(/\D/g, ''))) {
      newErrors.guardianPhone = 'সঠিক ফোন নম্বর দিন (01XXXXXXXXX)';
    }

    if (formData.fatherPhone && !/^01[3-9]\d{8}$/.test(formData.fatherPhone.replace(/\D/g, ''))) {
      newErrors.fatherPhone = 'সঠিক ফোন নম্বর দিন (01XXXXXXXXX)';
    }

    if (formData.motherPhone && !/^01[3-9]\d{8}$/.test(formData.motherPhone.replace(/\D/g, ''))) {
      newErrors.motherPhone = 'সঠিক ফোন নম্বর দিন (01XXXXXXXXX)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        setSuccessMessage('ছবি সফলভাবে আপডেট হয়েছে');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
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

  const handleSave = async () => {
    if (!student || !validateForm()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      // Clean phone numbers (remove non-digits)
      const cleanGuardianPhone = formData.guardianPhone.replace(/\D/g, '');
      const cleanFatherPhone = formData.fatherPhone.replace(/\D/g, '');
      const cleanMotherPhone = formData.motherPhone.replace(/\D/g, '');

      // Prepare update data - only parent/guardian related fields
      const updateData: any = {
        updatedAt: new Date()
      };

      // Only update fields that have values
      if (formData.guardianName) updateData.guardianName = formData.guardianName;
      if (cleanGuardianPhone) updateData.guardianPhone = cleanGuardianPhone;
      if (formData.fatherName) updateData.fatherName = formData.fatherName;
      if (cleanFatherPhone) updateData.fatherPhone = cleanFatherPhone;
      if (formData.motherName) updateData.motherName = formData.motherName;
      if (cleanMotherPhone) updateData.motherPhone = cleanMotherPhone;
      if (formData.address) updateData.address = formData.address;

      await studentQueries.updateStudent(student.uid, updateData);

      setSuccessMessage('তথ্য সফলভাবে আপডেট হয়েছে');
      setTimeout(() => {
        router.push(`/parent/children/view?uid=${studentUid}`);
      }, 1500);
    } catch (error: any) {
      console.error('Error updating student:', error);
      setError('তথ্য আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ParentLayout title="শিক্ষার্থী সম্পাদনা" subtitle="শিক্ষার্থীর তথ্য সম্পাদনা করুন">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="শিক্ষার্থী সম্পাদনা" subtitle="শিক্ষার্থীর তথ্য সম্পাদনা করুন">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/parent/children/view?uid=${studentUid}`)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>বিস্তারিত দেখুন</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {/* Real-time Update Notification */}
      {realtimeUpdateMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center animate-pulse">
          <Loader2 className="w-5 h-5 text-blue-600 mr-2 animate-spin" />
          <span className="text-blue-800">{realtimeUpdateMessage}</span>
        </div>
      )}

      {/* Student Information */}
      {!error && student && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Info Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>দ্রষ্টব্য:</strong> আপনি শুধুমাত্র অভিভাবক এবং যোগাযোগের তথ্য সম্পাদনা করতে পারবেন। একাডেমিক তথ্য (ক্লাস, রোল নম্বর ইত্যাদি) সম্পাদনা করতে হলে অ্যাডমিনের সাথে যোগাযোগ করুন।
            </p>
          </div>

          {/* Student Basic Info (Read-only) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">শিক্ষার্থীর তথ্য</h3>
              {realtimeUpdateMessage && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  আপডেট হয়েছে
                </span>
              )}
            </div>
            
            {/* Profile Image Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                প্রোফাইল ছবি
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
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
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    ছবি পরিবর্তন করতে উপরের ক্যামেরা আইকনে ক্লিক করুন
                  </p>
                  {imageError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-800">{imageError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">নাম</p>
                <p className="font-medium">{student.displayName || student.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">শিক্ষার্থী ID</p>
                <p className="font-medium">{student.studentId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ক্লাস</p>
                <p className="font-medium">{student.class || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">রোল নম্বর</p>
                <p className="font-medium">{student.rollNumber || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Editable Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">অভিভাবক ও যোগাযোগের তথ্য</h3>
            
            <div className="space-y-6">
              {/* Guardian Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  অভিভাবকের তথ্য
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      অভিভাবকের নাম
                    </label>
                    <input
                      type="text"
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="অভিভাবকের নাম"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      অভিভাবকের ফোন <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.guardianPhone
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="01XXXXXXXXX"
                    />
                    {errors.guardianPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.guardianPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Father Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  পিতার তথ্য
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      পিতার নাম
                    </label>
                    <input
                      type="text"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="পিতার নাম"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      পিতার ফোন
                    </label>
                    <input
                      type="tel"
                      value={formData.fatherPhone}
                      onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.fatherPhone
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="01XXXXXXXXX"
                    />
                    {errors.fatherPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.fatherPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mother Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  মাতার তথ্য
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      মাতার নাম
                    </label>
                    <input
                      type="text"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="মাতার নাম"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      মাতার ফোন
                    </label>
                    <input
                      type="tel"
                      value={formData.motherPhone}
                      onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.motherPhone
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="01XXXXXXXXX"
                    />
                    {errors.motherPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.motherPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  ঠিকানা
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    বাসস্থানের ঠিকানা
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="বাসস্থানের সম্পূর্ণ ঠিকানা"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => router.push(`/parent/children/view?uid=${studentUid}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                বাতিল
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        </div>
      )}
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <StudentEditPage />
    </ProtectedRoute>
  );
}

