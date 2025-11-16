'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { studentQueries, classQueries } from '@/lib/database-queries';
import {
  CheckCircle,
  XCircle,
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BookOpen,
  Clock,
  Users,
  Check,
  X,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Settings,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface PendingStudent {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  class: string;
  studentId: string;
  rollNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  dateOfBirth?: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherPhone?: string;
  motherOccupation?: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  previousSchool?: string;
  previousClass?: string;
  reasonForLeaving?: string;
  previousGPA?: string;
  profileImage?: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

function ApproveStudentPage() {
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<PendingStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmStudentId, setConfirmStudentId] = useState<string | null>(null);
  const [confirmStudentName, setConfirmStudentName] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successType, setSuccessType] = useState<'approve' | 'reject' | null>(null);
  const router = useRouter();

  // Load pending students and classes
  useEffect(() => {
    loadPendingStudents();
    loadClasses();
  }, []);

  // Filter students based on search and class filter
  useEffect(() => {
    let filtered = pendingStudents;

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phoneNumber.includes(searchTerm) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (classFilter) {
      filtered = filtered.filter(student => student.class === classFilter);
    }

    setFilteredStudents(filtered);
  }, [pendingStudents, searchTerm, classFilter]);

  const loadPendingStudents = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading pending students...');
      const students = await studentQueries.getPendingStudents();
      const pendingStudents: PendingStudent[] = students.map(student => ({
        id: student.uid,
        name: student.name || '',
        email: student.email,
        phoneNumber: student.phoneNumber || (student as any).phone || '',
        class: student.class || '',
        studentId: student.studentId || '',
        rollNumber: (student as any).rollNumber,
        guardianName: (student as any).guardianName,
        guardianPhone: (student as any).guardianPhone,
        address: (student as any).address,
        dateOfBirth: (student as any).dateOfBirth,
        fatherName: (student as any).fatherName,
        fatherPhone: (student as any).fatherPhone,
        fatherOccupation: (student as any).fatherOccupation,
        motherName: (student as any).motherName,
        motherPhone: (student as any).motherPhone,
        motherOccupation: (student as any).motherOccupation,
        emergencyContact: (student as any).emergencyContact,
        emergencyRelation: (student as any).emergencyRelation,
        previousSchool: (student as any).previousSchool,
        previousClass: (student as any).previousClass,
        reasonForLeaving: (student as any).reasonForLeaving,
        previousGPA: (student as any).previousGPA,
        profileImage: (student as any).profileImage,
        isApproved: (student as any).isApproved || false,
        isActive: (student as any).isActive || false,
        createdAt: (student as any).createdAt,
        updatedAt: (student as any).updatedAt
      }));
      setPendingStudents(pendingStudents);
      console.log('✅ Loaded pending students:', pendingStudents.length);
    } catch (error) {
      console.error('❌ Error loading pending students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const allClasses = await classQueries.getAllClasses();
      const classNames = [...new Set(allClasses.map(cls => cls.className).filter((name): name is string => Boolean(name)))];
      setClasses(classNames.length > 0 ? classNames : ['১ম শ্রেণি', '২য় শ্রেণি', '৩য় শ্রেণি', '৪র্থ শ্রেণি', '৫ম শ্রেণি', '৬ষ্ঠ শ্রেণি', '৭ম শ্রেণি', '৮ম শ্রেণি', '৯ম শ্রেণি', '১০ম শ্রেণি']);
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses(['১ম শ্রেণি', '২য় শ্রেণি', '৩য় শ্রেণি', '৪র্থ শ্রেণি', '৫ম শ্রেণি', '৬ষ্ঠ শ্রেণি', '৭ম শ্রেণি', '৮ম শ্রেণি', '৯ম শ্রেণি', '১০ম শ্রেণি']);
    }
  };

  const handleApprove = async (studentId: string) => {
    const student = pendingStudents.find(s => s.id === studentId);
    if (student) {
      setConfirmAction('approve');
      setConfirmStudentId(studentId);
      setConfirmStudentName(student.name);
      setShowConfirmModal(true);
    }
  };

  const handleReject = async (studentId: string) => {
    const student = pendingStudents.find(s => s.id === studentId);
    if (student) {
      setConfirmAction('reject');
      setConfirmStudentId(studentId);
      setConfirmStudentName(student.name);
      setShowConfirmModal(true);
    }
  };

  const confirmActionHandler = async () => {
    if (!confirmAction || !confirmStudentId) return;

    try {
      setIsProcessing(true);
      
      if (confirmAction === 'approve') {
        await studentQueries.approveStudent(confirmStudentId);
        setSuccessMessage('শিক্ষার্থীর আবেদন সফলভাবে অনুমোদন করা হয়েছে');
        setSuccessType('approve');
      } else {
        await studentQueries.rejectStudent(confirmStudentId);
        setSuccessMessage('শিক্ষার্থীর আবেদন সম্পূর্ণভাবে মুছে ফেলা হয়েছে');
        setSuccessType('reject');
        
        // Remove student from local state immediately
        setPendingStudents(prev => prev.filter(student => student.id !== confirmStudentId));
        setFilteredStudents(prev => prev.filter(student => student.id !== confirmStudentId));
      }

      // Show success modal
      setShowSuccessModal(true);
      
      // Close confirmation modal
      setShowConfirmModal(false);
      setConfirmAction(null);
      setConfirmStudentId(null);
      setConfirmStudentName('');
      
      // Refresh the list for approved students
      if (confirmAction === 'approve') {
        await loadPendingStudents();
      }
    } catch (error) {
      console.error(`Error ${confirmAction}ing student:`, error);
      setSuccessMessage(`শিক্ষার্থী ${confirmAction === 'approve' ? 'অনুমোদন' : 'বাতিল'} করতে ত্রুটি হয়েছে`);
      setSuccessType(null);
      setShowSuccessModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const viewStudentDetails = (student: PendingStudent) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('bn-BD');
  };

  if (isLoading) {
    return (
      <AdminLayout title="শিক্ষার্থী অনুমোদন" subtitle="অনলাইন ভর্তি আবেদনসমূহ অনুমোদন করুন">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="mr-2 text-gray-600">লোড হচ্ছে...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="শিক্ষার্থী অনুমোদন" subtitle="অনলাইন ভর্তি আবেদনসমূহ অনুমোদন করুন">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">শিক্ষার্থী অনুমোদন</h1>
                    <p className="text-gray-600">অনলাইন ভর্তি আবেদনসমূহ অনুমোদন করুন</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{filteredStudents.length}</div>
                    <div className="text-sm text-gray-500">মোট আবেদন</div>
                  </div>
                  <div className="flex space-x-2">
                    {/* Back Button */}
                    <button
                      onClick={() => router.back()}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
                      title="পিছনে যান"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">পিছনে</span>
                    </button>
                    
                    {/* Refresh Button */}
                    <button
                      onClick={loadPendingStudents}
                      disabled={isLoading}
                      className="flex items-center space-x-2 px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="ডেটা রিফ্রেশ করুন"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">রিফ্রেশ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="নাম, ফোন বা আইডি দিয়ে খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">সব ক্লাস</option>
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">কোনো পেন্ডিং আবেদন নেই</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          শিক্ষার্থী
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ক্লাস
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          যোগাযোগ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          আবেদনের তারিখ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          অ্যাকশন
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {student.profileImage ? (
                                  <img
                                    src={student.profileImage}
                                    alt={student.name}
                                    className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center">
                                    <User className="h-5 w-5 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  আইডি: {student.studentId}
                                  {student.rollNumber && ` | রোল: ${student.rollNumber}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.class}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.phoneNumber}</div>
                            {student.guardianName && (
                              <div className="text-sm text-gray-500">
                                অভিভাবক: {student.guardianName}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(student.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => viewStudentDetails(student)}
                                className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                              >
                                <Eye className="w-4 h-4" />
                                <span>দেখুন</span>
                              </button>
                              <button
                                onClick={() => handleApprove(student.id)}
                                disabled={isProcessing}
                                className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>অনুমোদন</span>
                              </button>
                              <button
                                onClick={() => handleReject(student.id)}
                                disabled={isProcessing}
                                className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>বাতিল</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden transform transition-all duration-300 scale-100">
            {/* Header with gradient background */}
            <div className={`p-8 text-white text-center ${
              confirmAction === 'approve' 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border-2 border-white/30">
                {confirmAction === 'approve' ? (
                  <CheckCircle className="w-10 h-10 text-white" />
                ) : (
                  <XCircle className="w-10 h-10 text-white" />
                )}
              </div>
              <h3 className="text-2xl font-bold mb-3">
                {confirmAction === 'approve' ? 'অনুমোদন করুন' : 'বাতিল করুন'}
              </h3>
              <p className="text-white/90 text-base">
                {confirmAction === 'approve' 
                  ? 'শিক্ষার্থীর আবেদন অনুমোদন করতে চান?' 
                  : 'শিক্ষার্থীর আবেদন সম্পূর্ণভাবে মুছে ফেলতে চান?'
                }
              </p>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <div className="mb-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  confirmAction === 'approve' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <User className={`w-12 h-12 ${
                    confirmAction === 'approve' ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  {confirmStudentName}
                </h4>
                <p className="text-gray-600 text-base leading-relaxed">
                  {confirmAction === 'approve' 
                    ? 'এই শিক্ষার্থীর ভর্তি আবেদন অনুমোদন করা হবে।' 
                    : 'এই শিক্ষার্থীর ভর্তি আবেদন সম্পূর্ণভাবে ডেটাবেস থেকে মুছে ফেলা হবে।'
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmAction(null);
                    setConfirmStudentId(null);
                    setConfirmStudentName('');
                  }}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium"
                >
                  বাতিল
                </button>
                <button
                  onClick={confirmActionHandler}
                  disabled={isProcessing}
                  className={`flex-1 px-6 py-3 text-white rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium ${
                    confirmAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>প্রসেসিং...</span>
                    </div>
                  ) : (
                    confirmAction === 'approve' ? 'অনুমোদন করুন' : 'বাতিল করুন'
                  )}
                </button>
              </div>

              {/* Footer Text */}
              <p className="text-sm text-gray-500 mt-6">
                {confirmAction === 'approve' 
                  ? 'এই অ্যাকশনটি পূর্বাবস্থায় ফেরানো যাবে না' 
                  : 'এই অ্যাকশনটি পূর্বাবস্থায় ফেরানো যাবে না - ডেটা সম্পূর্ণভাবে মুছে যাবে'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">শিক্ষার্থীর বিস্তারিত তথ্য</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Profile Image */}
              {selectedStudent.profileImage && (
                <div className="mb-6 text-center">
                  <div className="inline-block">
                    <img
                      src={selectedStudent.profileImage}
                      alt={selectedStudent.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    ব্যক্তিগত তথ্য
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">নাম</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">শিক্ষার্থী আইডি</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.studentId}</p>
                  </div>

                  {selectedStudent.rollNumber && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">রোল নম্বর</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.rollNumber}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ক্লাস</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.class}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ফোন নম্বর</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.phoneNumber}</p>
                  </div>

                  {selectedStudent.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ইমেইল</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.email}</p>
                    </div>
                  )}

                  {selectedStudent.dateOfBirth && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">জন্ম তারিখ</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedStudent.dateOfBirth)}</p>
                    </div>
                  )}

                  {selectedStudent.address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ঠিকানা</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.address}</p>
                    </div>
                  )}
                </div>

                {/* Parents Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    অভিভাবকের তথ্য
                  </h3>

                  {selectedStudent.fatherName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">পিতার নাম</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.fatherName}</p>
                    </div>
                  )}

                  {selectedStudent.fatherPhone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">পিতার ফোন</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.fatherPhone}</p>
                    </div>
                  )}

                  {selectedStudent.fatherOccupation && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">পিতার পেশা</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.fatherOccupation}</p>
                    </div>
                  )}

                  {selectedStudent.motherName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">মাতার নাম</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.motherName}</p>
                    </div>
                  )}

                  {selectedStudent.motherPhone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">মাতার ফোন</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.motherPhone}</p>
                    </div>
                  )}

                  {selectedStudent.motherOccupation && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">মাতার পেশা</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.motherOccupation}</p>
                    </div>
                  )}

                  {selectedStudent.guardianName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">অভিভাবকের নাম</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.guardianName}</p>
                    </div>
                  )}

                  {selectedStudent.guardianPhone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">অভিভাবকের ফোন</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStudent.guardianPhone}</p>
                    </div>
                  )}

                  {selectedStudent.emergencyContact && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">জরুরী যোগাযোগ</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.emergencyContact}
                        {selectedStudent.emergencyRelation && ` (${selectedStudent.emergencyRelation})`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Previous School Information */}
                {(selectedStudent.previousSchool || selectedStudent.previousClass || selectedStudent.previousGPA) && (
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      পূর্ববর্তী স্কুলের তথ্য
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.previousSchool && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">স্কুলের নাম</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedStudent.previousSchool}</p>
                        </div>
                      )}

                      {selectedStudent.previousClass && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">ক্লাস</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedStudent.previousClass}</p>
                        </div>
                      )}

                      {selectedStudent.previousGPA && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">GPA/Grade</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedStudent.previousGPA}</p>
                        </div>
                      )}
                    </div>

                    {selectedStudent.reasonForLeaving && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">স্কুল পরিবর্তনের কারণ</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedStudent.reasonForLeaving}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  বন্ধ করুন
                </button>
                <button
                  onClick={() => {
                    handleApprove(selectedStudent.id);
                    setShowDetailsModal(false);
                  }}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                      প্রসেসিং...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 inline" />
                      অনুমোদন করুন
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden transform transition-all duration-300 scale-100">
            {/* Header with gradient background */}
            <div className={`p-8 text-white text-center ${
              successType === 'approve' 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : successType === 'reject'
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : 'bg-gradient-to-r from-gray-500 to-gray-600'
            }`}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border-2 border-white/30">
                {successType === 'approve' ? (
                  <CheckCircle className="w-10 h-10 text-white" />
                ) : successType === 'reject' ? (
                  <XCircle className="w-10 h-10 text-white" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-white" />
                )}
              </div>
              <h3 className="text-2xl font-bold mb-3">
                {successType === 'approve' ? 'অনুমোদন সফল' : 
                 successType === 'reject' ? 'মুছে ফেলা সফল' : 
                 'নোটিশ'}
              </h3>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <div className="mb-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  successType === 'approve' ? 'bg-green-100' : 
                  successType === 'reject' ? 'bg-red-100' : 
                  'bg-gray-100'
                }`}>
                  {successType === 'approve' ? (
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  ) : successType === 'reject' ? (
                    <XCircle className="w-12 h-12 text-red-600" />
                  ) : (
                    <AlertCircle className="w-12 h-12 text-gray-600" />
                  )}
                </div>
                <p className="text-gray-700 text-base leading-relaxed">
                  {successMessage}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                  setSuccessType(null);
                }}
                className={`w-full px-6 py-3 text-white rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 transform hover:scale-105 font-medium ${
                  successType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : successType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                }`}
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function ApproveStudentPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ApproveStudentPage />
    </ProtectedRoute>
  );
}