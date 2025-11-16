'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { studentQueries } from '@/lib/queries/student-queries';
import { settingsQueries } from '@/lib/database-queries';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Loader2,
  Users,
} from 'lucide-react';

type StudentGuardian = {
  uid: string;
  studentName: string;
  class?: string;
  section?: string;
  guardianName?: string;
  guardianPhone?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  address?: string;
};

function ParentsPage() {
  const [parents, setParents] = useState<StudentGuardian[]>([]);
  const [parentsLoading, setParentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { userData } = useAuth();

  // Filter parents based on search term
  const filteredParents = parents.filter(parent => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      parent.studentName?.toLowerCase().includes(search) ||
      parent.guardianName?.toLowerCase().includes(search) ||
      parent.fatherName?.toLowerCase().includes(search) ||
      parent.motherName?.toLowerCase().includes(search) ||
      parent.guardianPhone?.includes(search) ||
      parent.fatherPhone?.includes(search) ||
      parent.motherPhone?.includes(search) ||
      parent.class?.toLowerCase().includes(search) ||
      parent.address?.toLowerCase().includes(search)
    );
  });

  // Fetch parents data from Firestore
  useEffect(() => {
    const fetchParents = async () => {
      try {
        setParentsLoading(true);
        setError(null);

        const settings = await settingsQueries.getSettings();
        const schoolId = settings?.schoolCode || '';
        const studentsData = await studentQueries.getStudentsBySchool(schoolId);
        const activeApprovedStudents = studentsData.filter(student => student.isActive && student.isApproved !== false);

        const guardians = activeApprovedStudents.map(student => ({
          uid: student.uid,
          studentName: student.name || 'নাম নেই',
          class: student.class,
          section: student.section,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          fatherName: (student as any).fatherName,
          fatherPhone: (student as any).fatherPhone,
          motherName: (student as any).motherName,
          motherPhone: (student as any).motherPhone,
          address: student.address
        })) as StudentGuardian[];

        setParents(guardians);
      } catch (err) {
        console.error('Error fetching parents:', err);
        setError('অভিভাবকের তথ্য লোড করতে ত্রুটি হয়েছে');
      } finally {
        setParentsLoading(false);
      }
    };

    if (userData) {
      fetchParents();
    }
  }, [userData]);

  const handleCreateSampleData = async () => {
    setError('নমুনা অভিভাবক তৈরি এখন সমর্থিত নয়');
  };

  return (
    <AdminLayout title="অভিভাবক ব্যবস্থাপনা" subtitle="সকল অভিভাবকের তথ্য দেখুন এবং পরিচালনা করুন">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="অভিভাবক খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">অভিভাবক তালিকা</h2>
          <p className="text-gray-600">মোট {filteredParents.length} টি পরিবার</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>নতুন অভিভাবক যোগ করুন</span>
        </button>
      </div>

      {/* Loading State */}
      {parentsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">অভিভাবকের তথ্য লোড হচ্ছে...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-600 mr-3">⚠️</div>
            <div className="text-red-800">{error}</div>
          </div>
        </div>
      )}

      {/* Parents Grid */}
      {!parentsLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredParents.map((parent) => {
            const studentInitial = (parent.studentName || '').trim().charAt(0) || '?';
            const classLabel = parent.class ? `${parent.class}${parent.section ? ` - ${parent.section}` : ''}` : 'ক্লাস নেই';
            const contacts = [
              { label: 'পিতা', name: parent.fatherName, phone: parent.fatherPhone },
              { label: 'মাতা', name: parent.motherName, phone: parent.motherPhone },
              { label: 'অভিভাবক', name: parent.guardianName, phone: parent.guardianPhone }
            ].filter(contact => contact.name || contact.phone);

            return (
              <div key={parent.uid} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {studentInitial}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{parent.studentName}</h3>
                    <p className="text-sm text-gray-600">{classLabel}</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 bg-green-100 text-green-800">
                      সক্রিয়
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">অভিভাবকের তথ্য</p>
                    <div className="space-y-2">
                      {contacts.map(contact => (
                        <div key={`${parent.uid}-${contact.label}`} className="text-sm text-blue-700">
                          <div className="font-semibold text-blue-900">{contact.label}</div>
                          <div>{contact.name || 'তথ্য নেই'}</div>
                          <div className="text-xs text-blue-600">{contact.phone || 'ফোন নম্বর নেই'}</div>
                        </div>
                      ))}
                      {contacts.length === 0 && (
                        <div className="text-sm text-blue-700">কোনো অভিভাবক সংযুক্ত নেই</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {parent.address || 'ঠিকানা নেই'}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-100 flex items-center justify-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>দেখুন</span>
                  </button>
                  <button className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm hover:bg-green-100 flex items-center justify-center space-x-1">
                    <Edit className="w-4 h-4" />
                    <span>সম্পাদনা</span>
                  </button>
                  <button className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!parentsLoading && !error && filteredParents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">কোনো অভিভাবক নেই</h3>
          <p className="text-gray-600 mb-6">এখনও কোনো অভিভাবকের তথ্য যোগ করা হয়নি।</p>

          {/* Sample Data Creation Button */}
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={handleCreateSampleData}
              disabled={parentsLoading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parentsLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  <span>নমুনা অভিভাবক তৈরি করুন</span>
                </>
              )}
            </button>
            <p className="text-sm text-gray-500 max-w-md">
              এটি কিছু নমুনা অভিভাবক এবং তাদের সাথে সম্পর্কিত শিক্ষার্থীর তথ্য তৈরি করবে।
              এটি শুধুমাত্র ডেমো এবং টেস্টিং এর জন্য।
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function ParentsPageWrapper() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Block unauthorized access - only admin and super_admin can access
    if (!loading && userData?.role) {
      const role = userData.role;
      
      if (role === 'teacher') {
        router.push('/teacher/parents');
        return;
      }
      
      if (role === 'parent') {
        router.push('/parent/dashboard');
        return;
      }
      
      if (role === 'student') {
        router.push('/student/dashboard');
        return;
      }
      
      // Only allow admin and super_admin
      if (role !== 'admin' && role !== 'super_admin') {
        router.push('/');
        return;
      }
    }
  }, [userData, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <ParentsPage />
    </ProtectedRoute>
  );
}
