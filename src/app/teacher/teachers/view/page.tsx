'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import TeacherLayout from '@/components/TeacherLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { teacherQueries, User as TeacherUser } from '@/lib/database-queries';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  Award,
  Calendar as CalendarIcon,
  Briefcase,
  AlertCircle,
  Info,
  GraduationCap,
  Building,
} from 'lucide-react';

function TeacherViewPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get('id');

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

  const loadTeacher = async (id: string) => {
    setTeacherLoading(true);
    setError('');

    try {
      const teacherData = await teacherQueries.getTeacherById(id);
      if (teacherData) {
        setTeacher(teacherData);
      } else {
        setError('শিক্ষক পাওয়া যায়নি');
      }
    } catch (error) {
      console.error('Error loading teacher:', error);
      setError('শিক্ষক লোড করতে সমস্যা হয়েছে');
    } finally {
      setTeacherLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!teacher && !teacherLoading) {
    return (
      <TeacherLayout title="শিক্ষক দেখুন" subtitle="শিক্ষকের বিস্তারিত তথ্য">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">শিক্ষক পাওয়া যায়নি</h3>
          <p className="mt-1 text-sm text-gray-500">এই শিক্ষকের তথ্য পাওয়া যাচ্ছে না</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/teacher/teachers')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              শিক্ষক তালিকায় ফিরে যান
            </button>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="শিক্ষক দেখুন" subtitle={teacher ? (teacher.displayName || teacher.name) : ''}>
      <div className="space-y-6">
        {/* Loading State */}
        {teacherLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">শিক্ষকের তথ্য লোড হচ্ছে...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Teacher Information */}
        {!teacherLoading && teacher && (
          <div className="space-y-6">
            {/* Header with Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center overflow-hidden">
                    {teacher.profileImage ? (
                      <img
                        src={teacher.profileImage}
                        alt={teacher.displayName || teacher.name || 'Teacher'}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-white font-bold text-2xl">
                        {(teacher.displayName || teacher.name || 'T').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{teacher.displayName || teacher.name}</h2>
                    <p className="text-gray-600">{teacher.subject || 'শিক্ষক'}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        teacher.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {teacher.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                      {(teacher as any).employeeId && (
                        <span className="text-sm text-gray-500">কর্মচারী আইডি: {(teacher as any).employeeId}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push('/teacher/teachers')}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>ফিরে যান</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Information Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  ব্যক্তিগত তথ্য
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">ইমেইল</p>
                      <p className="font-medium">{teacher.email || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">ফোন নম্বর</p>
                      <p className="font-medium">{teacher.phoneNumber || teacher.phone || 'N/A'}</p>
                    </div>
                  </div>

                  {teacher.dateOfBirth && (
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">জন্ম তারিখ</p>
                        <p className="font-medium">
                          {typeof teacher.dateOfBirth === 'string' 
                            ? new Date(teacher.dateOfBirth).toLocaleDateString('bn-BD')
                            : teacher.dateOfBirth?.toDate?.().toLocaleDateString('bn-BD') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {teacher.gender && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">লিঙ্গ</p>
                        <p className="font-medium">
                          {teacher.gender === 'male' ? 'পুরুষ' : 
                           teacher.gender === 'female' ? 'মহিলা' : 
                           teacher.gender}
                        </p>
                      </div>
                    </div>
                  )}

                  {(teacher as any).maritalStatus && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">বৈবাহিক অবস্থা</p>
                        <p className="font-medium">
                          {(teacher as any).maritalStatus === 'single' ? 'অবিবাহিত' :
                           (teacher as any).maritalStatus === 'married' ? 'বিবাহিত' :
                           (teacher as any).maritalStatus === 'divorced' ? 'তালাকপ্রাপ্ত' :
                           (teacher as any).maritalStatus === 'widowed' ? 'বিধবা/বিপত্নীক' : 
                           (teacher as any).maritalStatus}
                        </p>
                      </div>
                    </div>
                  )}

                  {(teacher as any).fatherName && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">পিতার নাম</p>
                        <p className="font-medium">{(teacher as any).fatherName}</p>
                      </div>
                    </div>
                  )}

                  {(teacher as any).motherName && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">মাতার নাম</p>
                        <p className="font-medium">{(teacher as any).motherName}</p>
                      </div>
                    </div>
                  )}

                  {(teacher as any).nationalId && (
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">জাতীয় পরিচয়পত্র নম্বর</p>
                        <p className="font-medium">{(teacher as any).nationalId}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  পেশাগত তথ্য
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <GraduationCap className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">বিষয়</p>
                      <p className="font-medium">{teacher.subject || 'N/A'}</p>
                    </div>
                  </div>

                  {teacher.qualification && (
                    <div className="flex items-center">
                      <Award className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">যোগ্যতা</p>
                        <p className="font-medium">{teacher.qualification}</p>
                      </div>
                    </div>
                  )}

                  {teacher.experience && (
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">অভিজ্ঞতা</p>
                        <p className="font-medium">{teacher.experience}</p>
                      </div>
                    </div>
                  )}

                  {teacher.joinDate && (
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">যোগদানের তারিখ</p>
                        <p className="font-medium">
                          {typeof teacher.joinDate === 'string'
                            ? new Date(teacher.joinDate).toLocaleDateString('bn-BD')
                            : teacher.joinDate?.toDate?.().toLocaleDateString('bn-BD') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(teacher as any).employeeId && (
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">কর্মচারী আইডি</p>
                        <p className="font-medium">{(teacher as any).employeeId}</p>
                      </div>
                    </div>
                  )}

                  {teacher.department && (
                    <div className="flex items-center">
                      <Building className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">বিভাগ</p>
                        <p className="font-medium">{teacher.department}</p>
                      </div>
                    </div>
                  )}

                  {teacher.designation && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">পদবী</p>
                        <p className="font-medium">{teacher.designation}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  ঠিকানা তথ্য
                </h3>

                <div className="space-y-4">
                  {teacher.address && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">বর্তমান ঠিকানা</p>
                      <p className="font-medium">{teacher.address}</p>
                    </div>
                  )}

                  {(teacher as any).city && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">শহর</p>
                        <p className="font-medium">{(teacher as any).city}</p>
                      </div>
                    </div>
                  )}

                  {(teacher as any).district && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">জেলা</p>
                        <p className="font-medium">{(teacher as any).district}</p>
                      </div>
                    </div>
                  )}

                  {(teacher as any).emergencyContactName && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">জরুরী যোগাযোগ</p>
                        <p className="font-medium">
                          {(teacher as any).emergencyContactName}
                          {(teacher as any).emergencyContactPhone && ` (${(teacher as any).emergencyContactPhone})`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  অতিরিক্ত তথ্য
                </h3>

                <div className="space-y-4">
                  {(teacher as any).languages && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">ভাষা জ্ঞান</p>
                      <p className="font-medium">{(teacher as any).languages}</p>
                    </div>
                  )}

                  {(teacher as any).skills && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">দক্ষতা</p>
                      <p className="font-medium">{(teacher as any).skills}</p>
                    </div>
                  )}

                  {(teacher as any).achievements && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">অর্জনসমূহ</p>
                      <p className="font-medium">{(teacher as any).achievements}</p>
                    </div>
                  )}

                  {(teacher as any).publications && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">প্রকাশনা</p>
                      <p className="font-medium">{(teacher as any).publications}</p>
                    </div>
                  )}

                  {(teacher as any).researchInterests && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">গবেষণা আগ্রহ</p>
                      <p className="font-medium">{(teacher as any).researchInterests}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}

export default function TeacherViewPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <TeacherViewPage />
    </ProtectedRoute>
  );
}
