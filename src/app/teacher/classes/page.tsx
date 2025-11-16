'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TeacherLayout from '@/components/TeacherLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { classQueries, settingsQueries, Class } from '@/lib/database-queries';
import {
  Search, Plus, Edit, Eye, Loader2, RefreshCw, Users
} from 'lucide-react';

function ClassesPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      loadClasses();
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      const settingsData = await settingsQueries.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const schoolId = settings?.schoolCode || 'AMAR-2026';
      const classesData = await classQueries.getClassesBySchool(schoolId);
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.teacherName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TeacherLayout title="ক্লাস ব্যবস্থাপনা" subtitle="সকল ক্লাসের তথ্য দেখুন এবং পরিচালনা করুন">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ক্লাস খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadClasses}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                কোন ক্লাস পাওয়া যায়নি
              </div>
            ) : (
              filteredClasses.map((cls) => (
                <div
                  key={cls.classId}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cls.className} - {cls.section}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        শিক্ষক: {cls.teacherName || 'নির্ধারিত নয়'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      cls.isActive !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cls.isActive !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{cls.totalStudents || 0} জন শিক্ষার্থী</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      শিক্ষাবর্ষ: {cls.academicYear || '-'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ClassesPage />
    </ProtectedRoute>
  );
}
