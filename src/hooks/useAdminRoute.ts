'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

/**
 * Custom hook to get routes based on user role
 * Returns teacher routes for teachers, admin routes for others
 */
export function useAdminRoute() {
  const { userData } = useAuth();
  const isTeacher = userData?.role === 'teacher';
  const baseRoute = isTeacher ? '/teacher' : '/admin';

  /**
   * Get route for a specific path
   * @param path - The path relative to base (e.g., 'students', 'students/add')
   * @returns Full route path
   */
  const getRoute = useMemo(() => {
    return (path: string): string => {
      // Remove leading slash if present
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `${baseRoute}/${cleanPath}`;
    };
  }, [baseRoute]);

  /**
   * Convert admin route to appropriate route based on role
   * @param route - Admin route (e.g., '/admin/students')
   * @returns Appropriate route for current user role
   */
  const convertRoute = useMemo(() => {
    return (route: string): string => {
      if (!route) return route;
      if (route.startsWith('/admin/')) {
        return isTeacher ? route.replace('/admin/', '/teacher/') : route;
      }
      return route;
    };
  }, [isTeacher]);

  return {
    baseRoute,
    isTeacher,
    getRoute,
    convertRoute,
  };
}

