'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  UserPlus, 
  Users, 
  Shield, 
  Database, 
  Settings, 
  BarChart3, 
  School, 
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react';

function AdminTools() {
  const router = useRouter();
  const { userData } = useAuth();

  const superAdminTools = [
    {
      title: 'সিস্টেম অ্যানালিটিক্স',
      description: 'সম্পূর্ণ সিস্টেমের পারফরমেন্স রিপোর্ট',
      icon: BarChart3,
      href: '/super-admin/analytics',
      color: 'from-blue-600 to-purple-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      access: ['super_admin']
    },
    {
      title: 'স্কুল ম্যানেজমেন্ট',
      description: 'সকল স্কুল ও শাখা পরিচালনা',
      icon: School,
      href: '/super-admin/schools',
      color: 'from-green-600 to-teal-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      access: ['super_admin']
    },
    {
      title: 'ডেটাবেস ব্যাকআপ',
      description: 'সিস্টেম ডেটা ব্যাকআপ ও রিস্টোর',
      icon: Database,
      href: '/super-admin/backup',
      color: 'from-purple-600 to-pink-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      access: ['super_admin']
    }
  ];

  const schoolAdminTools = [
    {
      title: 'উপস্থিতি রিপোর্ট',
      description: 'দৈনিক ও মাসিক উপস্থিতি বিশ্লেষণ',
      icon: Clock,
      href: '/admin/attendance',
      color: 'from-green-600 to-emerald-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      access: ['super_admin', 'admin', 'school_admin']
    },
    {
      title: 'শিক্ষার্থী ব্যবস্থাপনা',
      description: 'শিক্ষার্থী তথ্য ও ক্লাস বিন্যাস',
      icon: Users,
      href: '/admin/students',
      color: 'from-yellow-600 to-orange-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      access: ['super_admin', 'admin', 'school_admin']
    },
    {
      title: 'সিস্টেম সেটিংস',
      description: 'স্কুলের কনফিগারেশন ও সেটিংস',
      icon: Settings,
      href: '/admin/settings',
      color: 'from-gray-600 to-slate-600',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      access: ['super_admin', 'admin', 'school_admin']
    }
  ];

  const quickStats = [
    {
      title: 'সক্রিয় ব্যবহারকারী',
      value: '১,২৪৫',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'আজকের উপস্থিতি',
      value: '৯৮%',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'মোট ক্লাস',
      value: '২৪',
      icon: School,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'সিস্টেম স্ট্যাটাস',
      value: 'সক্রিয়',
      icon: Activity,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ];

  const hasAccess = (requiredAccess: string[]) => {
    if (!userData) return false;
    if (userData.email === 'mdlavlusheikh220@gmail.com') return true; // Special access for teacher
    return requiredAccess.includes(userData.role);
  };

  const getAccessibleTools = () => {
    const accessible = [];
    
    // Add super admin tools if accessible
    const accessibleSuperAdmin = superAdminTools.filter(tool => hasAccess(tool.access));
    if (accessibleSuperAdmin.length > 0) {
      accessible.push({ category: 'সুপার অ্যাডমিন টুলস', tools: accessibleSuperAdmin });
    }
    
    // Add school admin tools if accessible
    const accessibleSchoolAdmin = schoolAdminTools.filter(tool => hasAccess(tool.access));
    if (accessibleSchoolAdmin.length > 0) {
      accessible.push({ category: 'স্কুল অ্যাডমিন টুলস', tools: accessibleSchoolAdmin });
    }
    
    return accessible;
  };

  const accessibleToolCategories = getAccessibleTools();

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">অ্যাডমিন টুলস ড্যাশবোর্ড</h1>
          <p className="text-gray-600">শক্তিশালী ম্যানেজমেন্ট টুলস এবং সিস্টেম কন্ট্রোল</p>
          <div className="mt-4 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700">
              লগইনকৃত: <strong>{userData.name || userData.email}</strong> ({userData.role})
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Tools */}
        {accessibleToolCategories.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">কোনো অ্যাডমিন টুল অ্যাক্সেসযোগ্য নয়</h3>
            <p className="text-gray-600">আপনার বর্তমান রোল ({userData.role}) দিয়ে এই টুলসগুলো অ্যাক্সেস করা যাচ্ছে না।</p>
          </div>
        ) : (
          <div className="space-y-8">
            {accessibleToolCategories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{category.category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.tools.map((tool, index) => (
                    <div 
                      key={index} 
                      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(tool.href)}
                    >
                      <div className="p-6">
                        <div className={`w-12 h-12 ${tool.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                          <tool.icon className={`w-6 h-6 ${tool.textColor}`} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{tool.title}</h3>
                        <p className="text-gray-600 text-sm mb-4">{tool.description}</p>
                        <button 
                          className={`w-full bg-gradient-to-r ${tool.color} text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105`}
                        >
                          অ্যাক্সেস করুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Access Buttons */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">দ্রুত অ্যাক্সেস</h2>
            <p className="text-blue-100">সরাসরি ড্যাশবোর্ড এবং গুরুত্বপূর্ণ পেইজে যান</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userData.role === 'super_admin' && (
              <button
                onClick={() => router.push('/super-admin/dashboard')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                🔴 সুপার অ্যাডমিন ড্যাশবোর্ড
              </button>
            )}
            
            {['super_admin', 'admin', 'school_admin'].includes(userData.role) && (
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                🔵 অ্যাডমিন ড্যাশবোর্ড
              </button>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold transition-all"
            >
              🏠 হোম পেইজ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminToolsWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <AdminTools />
    </ProtectedRoute>
  );
}