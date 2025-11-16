'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TeacherLayout from '@/components/TeacherLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { subjectQueries, settingsQueries, Subject } from '@/lib/database-queries';
import {
  Search, Plus, Edit, Eye, Loader2, RefreshCw, BookOpen, Award
} from 'lucide-react';

function SubjectsPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      loadSubjects();
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

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const schoolId = settings?.schoolCode || '102330';
      let subjectsData = await subjectQueries.getActiveSubjects(schoolId);
      // Filter out exam-specific subjects
      subjectsData = subjectsData.filter(subject => !subject.isExamSubject);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.teacherName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TeacherLayout title="বিষয় ব্যবস্থাপনা" subtitle="সকল বিষয়ের তথ্য দেখুন এবং পরিচালনা করুন">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="বিষয় খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSubjects}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>
        </div>

        {/* Subjects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                কোন বিষয় পাওয়া যায়নি
              </div>
            ) : (
              filteredSubjects.map((subject) => (
                <div
                  key={(subject as any).subjectId || subject.code}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <BookOpen className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                        <p className="text-sm text-gray-600">{subject.code}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      শিক্ষক: {subject.teacherName || 'নির্ধারিত নয়'}
                    </div>
                    <div className="text-sm text-gray-600">
                      ধরন: {subject.type || 'মূল'}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Award className="w-4 h-4 mr-2" />
                      <span>মোট নম্বর: {subject.totalMarks || 100}</span>
                    </div>
                    {subject.classes && subject.classes.length > 0 && (
                      <div className="text-sm text-gray-600">
                        ক্লাস: {subject.classes.length} টি
                      </div>
                    )}
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
      <SubjectsPage />
    </ProtectedRoute>
  );
}
