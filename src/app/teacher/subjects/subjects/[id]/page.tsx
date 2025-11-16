'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { subjectQueries, Subject, classQueries } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { useAlert } from '@/hooks/useAlert';
import AlertDialog from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Save, Loader2, BookOpen, Users, Award, Calendar, Edit, Trash2
} from 'lucide-react';

function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const schoolId = SCHOOL_ID;
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    code: '',
    teacherName: '',
    selectedClasses: [] as string[],
    type: 'মূল' as 'মূল' | 'ধর্মীয়' | 'ঐচ্ছিক',
    description: '',
    credits: 4,
    students: 0
  });

  const { isOpen, alertOptions, showSuccess, showError, showConfirm, closeAlert } = useAlert();

  useEffect(() => {
    loadSubject();
    loadClasses();
  }, [subjectId]);

  const loadSubject = async () => {
    try {
      setLoading(true);
      const subjectData = await subjectQueries.getSubjectById(subjectId);
      
      if (subjectData) {
        setSubject(subjectData);
        setFormData({
          name: subjectData.name,
          nameEn: subjectData.nameEn || '',
          code: subjectData.code,
          teacherName: subjectData.teacherName,
          selectedClasses: subjectData.classes || [],
          type: subjectData.type,
          description: subjectData.description,
          credits: subjectData.credits,
          students: subjectData.students
        });
      } else {
        showError('বিষয় পাওয়া যায়নি।');
        router.push('/admin/subjects');
      }
    } catch (error) {
      console.error('Error loading subject:', error);
      showError('বিষয় লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const classesData = await classQueries.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleClassToggle = (className: string) => {
    setFormData(prev => {
      const newClasses = prev.selectedClasses.includes(className)
        ? prev.selectedClasses.filter(c => c !== className)
        : [...prev.selectedClasses, className];
      return { ...prev, selectedClasses: newClasses };
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      showError('অনুগ্রহ করে বিষয়ের নাম এবং কোড পূরণ করুন।');
      return;
    }

    try {
      setSaving(true);
      
      await subjectQueries.updateSubject(subjectId, {
        name: formData.name,
        nameEn: formData.nameEn,
        code: formData.code,
        teacherName: formData.teacherName,
        classes: formData.selectedClasses,
        type: formData.type,
        description: formData.description,
        credits: formData.credits,
        students: formData.students
      });

      showSuccess('বিষয় সফলভাবে আপডেট করা হয়েছে।');
      setEditing(false);
      loadSubject();
    } catch (error) {
      console.error('Error updating subject:', error);
      showError('বিষয় আপডেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    showConfirm(
      'আপনি কি নিশ্চিত যে এই বিষয়টি মুছে ফেলতে চান? এটি পুনরুদ্ধার করা যাবে না।',
      async () => {
        try {
          await subjectQueries.deleteSubject(subjectId);
          showSuccess('বিষয় সফলভাবে মুছে ফেলা হয়েছে।');
          router.push('/admin/subjects');
        } catch (error) {
          console.error('Error deleting subject:', error);
          showError('বিষয় মুছে ফেলতে ব্যর্থ হয়েছে।');
        }
      }
    );
  };

  if (loading) {
    return (
      <AdminLayout title="বিষয়ের বিস্তারিত" subtitle="লোড হচ্ছে...">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!subject) {
    return (
      <AdminLayout title="বিষয়ের বিস্তারিত" subtitle="পাওয়া যায়নি">
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">বিষয় পাওয়া যায়নি</h3>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={subject.name} subtitle="বিষয়ের বিস্তারিত">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/subjects')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>পিছনে যান</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(false);
                      loadSubject();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    বাতিল করুন
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>সংরক্ষণ করুন</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>সম্পাদনা করুন</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>মুছে ফেলুন</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Subject Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">বিষয় কোড</p>
                <p className="text-lg font-semibold text-gray-900">{subject.code}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">শিক্ষার্থী</p>
                <p className="text-lg font-semibold text-gray-900">{subject.students}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ক্রেডিট</p>
                <p className="text-lg font-semibold text-gray-900">{subject.credits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ক্লাস</p>
                <p className="text-lg font-semibold text-gray-900">{subject.classes?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">বিষয়ের তথ্য</h3>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  বিষয়ের নাম (বাংলা) *
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{subject.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  বিষয়ের নাম (ইংরেজি)
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <p className="text-gray-900">{subject.nameEn || '-'}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  বিষয় কোড *
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{subject.code}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  শিক্ষকের নাম
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <p className="text-gray-900">{subject.teacherName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  বিষয়ের ধরন
                </label>
                {editing ? (
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="মূল">মূল বিষয়</option>
                    <option value="ধর্মীয়">ধর্মীয় বিষয়</option>
                    <option value="ঐচ্ছিক">ঐচ্ছিক বিষয়</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    subject.type === 'মূল' ? 'bg-blue-100 text-blue-800' :
                    subject.type === 'ধর্মীয়' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {subject.type}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ক্রেডিট
                </label>
                {editing ? (
                  <input
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="1"
                    max="10"
                  />
                ) : (
                  <p className="text-gray-900">{subject.credits}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  শিক্ষার্থী সংখ্যা
                </label>
                {editing ? (
                  <input
                    type="number"
                    value={formData.students}
                    onChange={(e) => setFormData({ ...formData, students: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                  />
                ) : (
                  <p className="text-gray-900">{subject.students}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                বিবরণ
              </label>
              {editing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <p className="text-gray-900">{subject.description || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ক্লাসসমূহ
              </label>
              {editing ? (
                <div className="border border-gray-300 rounded-lg p-4">
                  {loadingClasses ? (
                    <p className="text-gray-500">লোড হচ্ছে...</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {classes.map((cls) => (
                        <label key={cls.classId} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.selectedClasses.includes(cls.className)}
                            onChange={() => handleClassToggle(cls.className)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">{cls.className}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subject.classes && subject.classes.length > 0 ? (
                    subject.classes.map((cls, idx) => (
                      <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {cls}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">কোনো ক্লাস নির্বাচিত নেই</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={isOpen}
        onClose={closeAlert}
        title={alertOptions.title}
        message={alertOptions.message}
        type={alertOptions.type}
        confirmText={alertOptions.confirmText}
        onConfirm={alertOptions.onConfirm}
        showCancelButton={alertOptions.showCancelButton}
        cancelText={alertOptions.cancelText}
      />
    </AdminLayout>
  );
}

export default SubjectDetailPage;
