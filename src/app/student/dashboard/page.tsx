'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function StudentDashboardWrapper() {
  const { userData, user } = useAuth();
  const router = useRouter();
  
  // Redirect student to parent panel (same panel for both student and parent)
  useEffect(() => {
    if (userData || user) {
      router.replace('/parent/dashboard');
    }
  }, [userData, user, router]);

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">রিডাইরেক্ট করা হচ্ছে...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
