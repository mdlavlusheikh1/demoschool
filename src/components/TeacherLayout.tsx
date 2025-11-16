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
  GraduationCap,
  Building,
  CreditCard,
  Package,
  Award,
  FileText,
  MessageSquare,
  Gift,
  AlertCircle,
  Sparkles,
  Bell,
  UserCircle,
  ChevronDown,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

interface TeacherLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function TeacherLayout({ children, title = 'ড্যাশবোর্ড', subtitle = 'স্বাগতম' }: TeacherLayoutProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useAuth();
  
  // Session timeout: 30 minutes of inactivity
  useSessionTimeout();

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

  // Menu items
  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/teacher/dashboard', active: pathname === '/teacher/dashboard' },
    { icon: Users, label: 'শিক্ষার্থী', href: '/teacher/students', active: pathname?.startsWith('/teacher/students') },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/teacher/teachers', active: pathname?.startsWith('/teacher/teachers') },
    { icon: BookOpen, label: 'ক্লাস', href: '/teacher/classes', active: pathname?.startsWith('/teacher/classes') },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/teacher/attendance', active: pathname?.startsWith('/teacher/attendance') },
    { icon: Calendar, label: 'ইভেন্ট', href: '/teacher/events', active: pathname?.startsWith('/teacher/events') },
    { icon: CreditCard, label: 'হিসাব', href: '/teacher/accounting', active: pathname?.startsWith('/teacher/accounting') },
    { icon: Award, label: 'পরীক্ষা', href: '/teacher/exams', active: pathname?.startsWith('/teacher/exams') },
    { icon: BookOpen, label: 'বিষয়', href: '/teacher/subjects', active: pathname?.startsWith('/teacher/subjects') },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/teacher/homework', active: pathname?.startsWith('/teacher/homework') },
    { icon: MessageSquare, label: 'বার্তা', href: '/teacher/messages', active: pathname?.startsWith('/teacher/messages') },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen
          ? 'translate-x-0'
          : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">শিক্ষক প্যানেল</span>
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
              href={item.href}
              className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-green-50 text-green-700 border-r-2 border-green-700'
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
                    <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center overflow-hidden">
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
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowUserMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center overflow-hidden">
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
                                <span className="text-white font-medium">
                                  {(user?.email?.charAt(0) || userData?.email?.charAt(0) || 'U').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {(userData as any)?.name || user?.displayName || user?.email?.split('@')[0] || 'শিক্ষক'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user?.email || (userData as any)?.email || ''}
                              </p>
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                শিক্ষক
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/teacher/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <UserCircle className="w-4 h-4 mr-3" />
                            প্রোফাইল
                          </Link>
                          <Link
                            href="/teacher/settings"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Settings className="w-4 h-4 mr-3" />
                            সেটিংস
                          </Link>
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              auth.signOut();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
