'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface TeacherRouteWrapperProps {
  children: React.ReactNode;
  adminRoute?: string; // Optional: admin route to redirect non-teachers
}

/**
 * Wrapper component for teacher routes that ensures:
 * 1. User is authenticated
 * 2. User is a teacher
 * 3. Admin pages only load after role verification (prevents flash)
 */
export default function TeacherRouteWrapper({ children, adminRoute }: TeacherRouteWrapperProps) {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!userData) {
        router.push('/auth/login');
        return;
      }
      if (userData.role !== 'teacher') {
        if (adminRoute) {
          router.push(adminRoute);
        } else {
          router.push('/admin/dashboard');
        }
        return;
      }
      // Only load content if user is teacher
      setShouldLoad(true);
    }
  }, [userData, loading, router, adminRoute]);

  if (loading || !shouldLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      {children}
    </ProtectedRoute>
  );
}

