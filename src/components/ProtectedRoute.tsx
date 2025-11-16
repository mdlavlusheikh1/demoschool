'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for both auth and userData to be loaded before any redirects
    if (!loading && userData) {
      if (requireAuth && !user) {
        router.push('/auth/login');
      } else if (!requireAuth && user) {
        // Redirect based on user role
        const roleRoutes: Record<string, string> = {
          'super_admin': '/super-admin/dashboard',
          'admin': '/admin/dashboard',
          'teacher': '/teacher/dashboard',
          'parent': '/parent/dashboard',
          'student': '/student/dashboard',
        };
        const redirectRoute = roleRoutes[userData.role] || '/admin/dashboard';
        router.push(redirectRoute);
      }
    } else if (!loading && !userData && requireAuth && !user) {
      // If no userData and no user, redirect to login
      router.push('/auth/login');
    }
  }, [user, userData, loading, requireAuth, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null; // Will redirect to login
  }

  if (!requireAuth && user) {
    return null; // Will redirect to dashboard
  }

  return <>{children}</>;
}