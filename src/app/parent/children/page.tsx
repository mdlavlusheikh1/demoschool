'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { studentQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { 
  Users, 
  GraduationCap, 
  Award, 
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  className: string;
  section?: string;
  rollNumber: string;
  gender: string;
  photoURL?: string;
  guardianPhone?: string;
  fatherPhone?: string;
  motherPhone?: string;
}

function ChildrenPage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get parent's phone number from userData
    const parentPhone = (userData as any)?.phone || user?.phoneNumber;
    
    if (!parentPhone) {
      console.log('No parent phone number found');
      setLoading(false);
      return;
    }

    // Initial load
    loadChildren(parentPhone);
    
    // Set up real-time listener
    const q = query(
      collection(db, 'students'),
      where('role', '==', 'student'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allStudents = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as any));
      
      // Filter students by guardian/parent phone
      const myChildren = allStudents.filter((student: any) => {
        const guardianPhone = student.guardianPhone || '';
        const fatherPhone = student.fatherPhone || '';
        const motherPhone = student.motherPhone || '';
        
        return guardianPhone === parentPhone || 
               fatherPhone === parentPhone || 
               motherPhone === parentPhone;
      });

      setChildren(myChildren.map((s: any) => ({
        id: s.id || s.uid || '',
        name: s.name || s.displayName || '',
        className: s.class || s.className || '',
        section: s.section || s.section,
        rollNumber: s.rollNumber || '',
        gender: s.gender || '',
        photoURL: s.profileImage || s.photoURL,
        guardianPhone: s.guardianPhone,
        fatherPhone: s.fatherPhone,
        motherPhone: s.motherPhone,
      })));
      
      setLoading(false);
      console.log('🔄 Real-time update - children list:', myChildren.length);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData, user]);

  const loadChildren = async (parentPhone: string) => {
    try {
      setLoading(true);
      
      // Get all students
      const allStudents = await studentQueries.getAllStudents();
      
      // Filter students by guardian/parent phone
      const myChildren = allStudents.filter(student => {
        const guardianPhone = (student as any).guardianPhone || '';
        const fatherPhone = (student as any).fatherPhone || '';
        const motherPhone = (student as any).motherPhone || '';
        
        return guardianPhone === parentPhone || 
               fatherPhone === parentPhone || 
               motherPhone === parentPhone;
      });

      setChildren(myChildren.map(s => ({
        id: (s as any).id || (s as any).uid || '',
        name: s.name || s.displayName || '',
        className: s.class || (s as any).className || '',
        section: s.section || (s as any).section,
        rollNumber: (s as any).rollNumber || '',
        gender: s.gender || '',
        photoURL: (s as any).profileImage || (s as any).photoURL,
        guardianPhone: (s as any).guardianPhone,
        fatherPhone: (s as any).fatherPhone,
        motherPhone: (s as any).motherPhone,
      })));
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ParentLayout title="আমার সন্তান" subtitle="সন্তানদের তথ্য দেখুন">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="আমার সন্তান" subtitle="সন্তানদের সম্পূর্ণ তথ্য">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">মোট সন্তান</p>
              <p className="text-3xl font-bold text-gray-900">{children.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">সক্রিয় শিক্ষার্থী</p>
              <p className="text-3xl font-bold text-green-600">{children.filter((c: any) => c.isActive).length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">গড় উপস্থিতি</p>
              <p className="text-3xl font-bold text-purple-600">95%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Children List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">সন্তানদের তালিকা</h2>
        </div>
        
        <div className="p-6">
          {children.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">কোনো সন্তান পাওয়া যায়নি</p>
              <p className="text-sm text-gray-500 mt-1">আপনার ফোন নম্বরের সাথে মিল রয়েছে এমন কোনো শিক্ষার্থী নেই</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {children.map((child) => (
                <div key={child.id} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                      {child.photoURL ? (
                        <img src={child.photoURL} alt={child.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-xl">{child.name.charAt(0)}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{child.name}</h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <GraduationCap className="w-4 h-4 mr-1" />
                        {child.className} {child.section ? `- বিভাগ ${child.section}` : ''}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <Award className="w-4 h-4 mr-1" />
                        রোল: {child.rollNumber}
                      </p>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">উপস্থিতি</span>
                          <span className="text-green-600 font-semibold">95%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-gray-600">পরীক্ষার ফলাফল</span>
                          <span className="text-blue-600 font-semibold">A+</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => router.push(`/parent/children/view?uid=${child.id}`)}
                        className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        বিস্তারিত দেখুন
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <ChildrenPage />
    </ProtectedRoute>
  );
}
