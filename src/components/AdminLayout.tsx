'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import {
  Home,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  GraduationCap,
  Building,
  CreditCard,
  TrendingUp,
  Search,
  Bell,
  Package,
  Award,
  BookOpen as BookOpenIcon,
  FileText,
  Target,
  TrendingDown,
  CheckSquare,
  Users as UsersIcon,
  Phone,
  Mail,
  MapPin,
  GraduationCap as StudentIcon,
  CheckCircle,
  Clock,
  Filter,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Globe,
  MessageSquare,
  Gift,
  AlertCircle,
  Sparkles,
  Clipboard,
  UserCircle,
  ChevronDown,
  CalendarClock,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title = 'ড্যাশবোর্ড', subtitle = 'স্বাগতম' }: AdminLayoutProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { userData, loading: authLoading } = useAuth();
  
  // Session timeout: 30 minutes of inactivity
  useSessionTimeout();

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Block unauthorized access - redirect BEFORE rendering to prevent flash
  useEffect(() => {
    if (!loading && !authLoading && userData?.role && pathname?.startsWith('/admin/')) {
      const role = userData.role;
      
      // If user is teacher, redirect to teacher dashboard IMMEDIATELY
      if (role === 'teacher') {
        const teacherPath = pathname.replace('/admin/', '/teacher/');
        if (teacherPath !== pathname && teacherPath !== '/teacher/') {
          router.replace(teacherPath);
          return;
        }
        router.replace('/teacher/dashboard');
        return;
      }
      
      // If user is parent, redirect to parent dashboard
      if (role === 'parent') {
        router.replace('/parent/dashboard');
        return;
      }
      
      // If user is student, redirect to student dashboard
      if (role === 'student') {
        router.replace('/student/dashboard');
        return;
      }
      
      // Only allow admin and super_admin to access admin routes
      if (role !== 'admin' && role !== 'super_admin') {
        router.replace('/');
        return;
      }
    }
  }, [loading, authLoading, userData, pathname, router]);

  // Determine dashboard route based on user role
  const isTeacher = userData?.role === 'teacher';
  const baseRoute = isTeacher ? '/teacher' : '/admin';
  
  // Check if user has access to admin panel
  const hasAdminAccess = userData?.role === 'admin' || userData?.role === 'super_admin';
  
  const menuItems = [
    { 
      icon: Home, 
      label: 'ড্যাশবোর্ড', 
      href: `${baseRoute}/dashboard`, 
      active: pathname === `${baseRoute}/dashboard` || pathname === '/admin/dashboard' || pathname === '/teacher/dashboard' 
    },
    { 
      icon: Users, 
      label: 'শিক্ষার্থী', 
      href: `${baseRoute}/students`, 
      active: pathname?.startsWith(`${baseRoute}/students`) || pathname?.startsWith('/admin/students') || pathname?.startsWith('/teacher/students') 
    },
    { 
      icon: GraduationCap, 
      label: 'শিক্ষক', 
      href: `${baseRoute}/teachers`, 
      active: pathname?.startsWith(`${baseRoute}/teachers`) || pathname?.startsWith('/admin/teachers') || pathname?.startsWith('/teacher/teachers') 
    },
    { 
      icon: Building, 
      label: 'অভিভাবক', 
      href: `${baseRoute}/parents`, 
      active: pathname?.startsWith(`${baseRoute}/parents`) || pathname?.startsWith('/admin/parents') || pathname?.startsWith('/teacher/parents') 
    },
    { 
      icon: BookOpen, 
      label: 'ক্লাস', 
      href: `${baseRoute}/classes`, 
      active: pathname?.startsWith(`${baseRoute}/classes`) || pathname?.startsWith('/admin/classes') || pathname?.startsWith('/teacher/classes') 
    },
    { 
      icon: CalendarClock, 
      label: 'রুটিন', 
      href: `${baseRoute}/routine`, 
      active: pathname?.startsWith(`${baseRoute}/routine`) || pathname?.startsWith('/admin/routine') || pathname?.startsWith('/teacher/routine') 
    },
    { 
      icon: ClipboardList, 
      label: 'উপস্থিতি', 
      href: `${baseRoute}/attendance`, 
      active: pathname?.startsWith(`${baseRoute}/attendance`) || pathname?.startsWith('/admin/attendance') || pathname?.startsWith('/teacher/attendance') 
    },
    { 
      icon: Calendar, 
      label: 'ইভেন্ট', 
      href: `${baseRoute}/events`, 
      active: pathname?.startsWith(`${baseRoute}/events`) || pathname?.startsWith('/admin/events') || pathname?.startsWith('/teacher/events') 
    },
    { 
      icon: CreditCard, 
      label: 'হিসাব', 
      href: `${baseRoute}/accounting`, 
      active: pathname?.startsWith(`${baseRoute}/accounting`) || pathname?.startsWith('/admin/accounting') || pathname?.startsWith('/teacher/accounting') 
    },
    { 
      icon: Gift, 
      label: 'Donation', 
      href: `${baseRoute}/donation`, 
      active: pathname?.startsWith(`${baseRoute}/donation`) || pathname?.startsWith('/admin/donation') || pathname?.startsWith('/teacher/donation') 
    },
    { 
      icon: Award, 
      label: 'পরীক্ষা', 
      href: `${baseRoute}/exams`, 
      active: pathname?.startsWith(`${baseRoute}/exams`) || pathname?.startsWith('/admin/exams') || pathname?.startsWith('/teacher/exams') 
    },
    { 
      icon: BookOpenIcon, 
      label: 'বিষয়', 
      href: `${baseRoute}/subjects`, 
      active: pathname?.startsWith(`${baseRoute}/subjects`) || pathname?.startsWith('/admin/subjects') || pathname?.startsWith('/teacher/subjects') 
    },
    { 
      icon: UsersIcon, 
      label: 'সাপোর্ট', 
      href: `${baseRoute}/support`, 
      active: pathname?.startsWith(`${baseRoute}/support`) || pathname?.startsWith('/admin/support') || pathname?.startsWith('/teacher/support') 
    },
    { 
      icon: MessageSquare, 
      label: 'বার্তা', 
      href: `${baseRoute}/message`, 
      active: pathname?.startsWith(`${baseRoute}/message`) || pathname?.startsWith('/admin/message') || pathname?.startsWith('/teacher/message') 
    },
    { 
      icon: Sparkles, 
      label: 'Generate', 
      href: `${baseRoute}/generate`, 
      active: pathname?.startsWith(`${baseRoute}/generate`) || pathname?.startsWith('/admin/generate') || pathname?.startsWith('/teacher/generate') 
    },
    { 
      icon: Clipboard, 
      label: 'বাড়ির কাজ', 
      href: `${baseRoute}/homework`, 
      active: pathname?.startsWith(`${baseRoute}/homework`) || pathname?.startsWith('/admin/homework') || pathname?.startsWith('/teacher/homework') 
    },
    { 
      icon: Bell, 
      label: 'নোটিশ', 
      href: `${baseRoute}/notice`, 
      active: pathname?.startsWith(`${baseRoute}/notice`) || pathname?.startsWith('/admin/notice') || pathname?.startsWith('/teacher/notice') 
    },
    { 
      icon: Package, 
      label: 'ইনভেন্টরি', 
      href: `${baseRoute}/inventory`, 
      active: pathname?.startsWith(`${baseRoute}/inventory`) || pathname?.startsWith('/admin/inventory') || pathname?.startsWith('/teacher/inventory') 
    },
    { 
      icon: AlertCircle, 
      label: 'অভিযোগ', 
      href: `${baseRoute}/complaint`, 
      active: pathname?.startsWith(`${baseRoute}/complaint`) || pathname?.startsWith('/admin/complaint') || pathname?.startsWith('/teacher/complaint') 
    },
    { 
      icon: Globe, 
      label: 'পাবলিক পেজ', 
      href: `${baseRoute}/public-pages-control`, 
      active: pathname?.startsWith(`${baseRoute}/public-pages-control`) || pathname?.startsWith('/admin/public-pages-control') || pathname?.startsWith('/teacher/public-pages-control') 
    },
    { 
      icon: Settings, 
      label: 'সেটিংস', 
      href: `${baseRoute}/settings`, 
      active: pathname?.startsWith(`${baseRoute}/settings`) || pathname?.startsWith('/admin/settings') || pathname?.startsWith('/teacher/settings') 
    },
  ];

  // Wait for both auth and userData to load before rendering
  // Also wait if we need to redirect (to prevent flash)
  const needsRedirect = !loading && !authLoading && userData?.role && pathname?.startsWith('/admin/') && 
    (userData.role === 'teacher' || userData.role === 'parent' || userData.role === 'student' || 
     (userData.role !== 'admin' && userData.role !== 'super_admin'));

  // Only show loading if we're still loading auth OR if we need to redirect
  // Don't block rendering if userData is null but auth is loaded (might be a guest or loading issue)
  if (loading || authLoading || needsRedirect) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show access denied if user doesn't have admin access and is on admin route
  // Only show this if userData is loaded (not null) and doesn't have access
  if (pathname?.startsWith('/admin/') && userData && !hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">অ্যাক্সেস অস্বীকৃত</h1>
          <p className="text-gray-600 mb-4">আপনার এই পেজে অ্যাক্সেসের অনুমতি নেই।</p>
          <button
            onClick={() => {
              const role = userData?.role;
              if (role === 'teacher') {
                router.push('/teacher/dashboard');
              } else if (role === 'parent') {
                router.push('/parent/dashboard');
              } else if (role === 'student') {
                router.push('/student/dashboard');
              } else {
                router.push('/');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ড্যাশবোর্ডে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen
          ? 'translate-x-0'
          : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            {isTeacher ? (
              <>
                <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">শিক্ষক প্যানেল</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ই</span>
                </div>
                <span className="text-lg font-bold text-gray-900">সুপার অ্যাডমিন</span>
              </>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href || '#'}
              className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active
                  ? isTeacher
                    ? 'bg-green-50 text-green-700 border-r-2 border-green-700'
                    : 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Link>
          ))}

          <button
            onClick={() => auth.signOut()}
            className="flex items-center w-full px-6 py-2 mt-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-screen transition-all duration-300 ease-in-out lg:ml-64">
        {/* Top Navigation */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">{title}</h1>
                  <p className="text-sm text-gray-600 leading-tight">{subtitle}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
                <NotificationBell />
                
                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
                      isTeacher
                        ? 'bg-gradient-to-br from-green-600 to-green-700'
                        : 'bg-gradient-to-br from-green-600 to-blue-600'
                    }`}>
                      {((userData as any)?.photoURL || user?.photoURL) && !imageError ? (
                        <img
                          src={(userData as any)?.photoURL || user?.photoURL || ''}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={() => {
                            setImageError(true);
                          }}
                        />
                      ) : (
                        <span className="text-white font-medium text-sm">
                          {(user?.email?.charAt(0) || userData?.email?.charAt(0) || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </button>

                  {showUserMenu && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        {/* User Info */}
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                              isTeacher
                                ? 'bg-gradient-to-br from-green-600 to-green-700'
                                : 'bg-gradient-to-br from-green-600 to-blue-600'
                            }`}>
                              {((userData as any)?.photoURL || user?.photoURL) && !imageError ? (
                                <img
                                  src={(userData as any)?.photoURL || user?.photoURL || ''}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                  onError={() => {
                                    setImageError(true);
                                  }}
                                />
                              ) : (
                                <span className="text-white font-medium text-lg">
                                  {(user?.email?.charAt(0) || userData?.email?.charAt(0) || 'U').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {(userData as any)?.displayName || (userData as any)?.name || user?.email?.split('@')[0]}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {user?.email}
                              </p>
                              {userData?.role && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                  {userData.role === 'super_admin' ? 'সুপার অ্যাডমিন' : 
                                   userData.role === 'admin' ? 'অ্যাডমিন' :
                                   userData.role === 'teacher' ? 'শিক্ষক' : userData.role}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <Link
                            href={`${baseRoute}/profile`}
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <UserCircle className="w-4 h-4 mr-3" />
                            প্রোফাইল
                          </Link>
                          <Link
                            href={`${baseRoute}/settings`}
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Settings className="w-4 h-4 mr-3" />
                            সেটিংস
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-200">
                          <button
                            onClick={() => {
                              auth.signOut();
                              setShowUserMenu(false);
                            }}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            লগআউট
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
