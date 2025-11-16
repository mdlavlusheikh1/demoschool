/**
 * Utility functions for route management based on user role
 */

/**
 * Convert admin route to appropriate route based on user role
 * @param route - The admin route (e.g., '/admin/students')
 * @param userRole - The current user role
 * @returns The appropriate route for the user role
 */
export function getRouteForRole(route: string, userRole?: string): string {
  if (userRole === 'teacher' && route.startsWith('/admin/')) {
    return route.replace('/admin/', '/teacher/');
  }
  return route;
}

/**
 * Get base route based on user role
 * @param userRole - The current user role
 * @returns Base route prefix ('/teacher' or '/admin')
 */
export function getBaseRoute(userRole?: string): string {
  return userRole === 'teacher' ? '/teacher' : '/admin';
}

/**
 * Convert admin route path to teacher route if needed
 * @param route - The route path (e.g., '/admin/students/add')
 * @param userRole - The current user role
 * @returns Converted route if teacher, otherwise original route
 */
export function convertRoute(route: string, userRole?: string): string {
  if (!route) return route;
  
  if (userRole === 'teacher') {
    // Convert /admin/... to /teacher/...
    if (route.startsWith('/admin/')) {
      return route.replace('/admin/', '/teacher/');
    }
  }
  
  return route;
}

