'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Award, LayoutGrid, Ticket } from 'lucide-react';

function GeneratePage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  // Check auth
  useEffect(() => {
    if (!authLoading && userData) {
      if (userData.role !== 'admin' && userData.role !== 'super_admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [userData, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const documentTypes = [
    {
      id: 'testimonial',
      title: 'প্রত্যায়ন পত্র',
      description: 'শিক্ষার্থীদের জন্য প্রত্যায়ন পত্র তৈরি করুন',
      icon: FileText,
      color: 'blue',
      href: '/admin/generate/testimonial'
    },
    {
      id: 'certificate',
      title: 'সার্টিফিকেট',
      description: 'বিভিন্ন ধরনের সার্টিফিকেট তৈরি করুন',
      icon: Award,
      color: 'green',
      href: '/admin/generate/certificate'
    },
    {
      id: 'seat-plan',
      title: 'সিট প্ল্যান',
      description: 'পরীক্ষার জন্য সিট প্ল্যান তৈরি করুন',
      icon: LayoutGrid,
      color: 'orange',
      href: '/admin/generate/seat-plan'
    },
    {
      id: 'admit-card',
      title: 'প্রবেশপত্র',
      description: 'পরীক্ষার প্রবেশপত্র তৈরি করুন',
      icon: Ticket,
      color: 'purple',
      href: '/admin/generate/admit-card'
    },
  ];

  const getColorClasses = (color: string, type: 'bg' | 'text' | 'hover' | 'light') => {
    const colors: { [key: string]: { bg: string; text: string; hover: string; light: string } } = {
      blue: { bg: 'bg-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-700', light: 'bg-blue-100 text-blue-600' },
      green: { bg: 'bg-green-600', text: 'text-green-600', hover: 'hover:bg-green-700', light: 'bg-green-100 text-green-600' },
      orange: { bg: 'bg-orange-600', text: 'text-orange-600', hover: 'hover:bg-orange-700', light: 'bg-orange-100 text-orange-600' },
      purple: { bg: 'bg-purple-600', text: 'text-purple-600', hover: 'hover:bg-purple-700', light: 'bg-purple-100 text-purple-600' },
    };
    return colors[color]?.[type] || colors.blue[type];
  };

  return (
    <AdminLayout title="রিপোর্ট জেনারেটর" subtitle="বিভিন্ন ধরনের ডকুমেন্ট তৈরি, প্রিভিউ এবং ডাউনলোড করুন">
      <div className="space-y-6">
        {/* Document Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {documentTypes.map((docType) => {
            const Icon = docType.icon;
            return (
              <div
                key={docType.id}
                onClick={() => router.push(docType.href)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${getColorClasses(docType.color, 'light')} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{docType.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{docType.description}</p>
                
                <button
                  className={`w-full ${getColorClasses(docType.color, 'bg')} ${getColorClasses(docType.color, 'hover')} text-white py-2 rounded-lg transition-colors`}
                >
                  তৈরি করুন
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function GeneratePageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <GeneratePage />
    </ProtectedRoute>
  );
}
