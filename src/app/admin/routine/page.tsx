'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { classQueries, settingsQueries, subjectQueries, teacherQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import {
  CalendarClock,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Clock,
  BookOpen,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ClassRoutine {
  id?: string;
  classId: string;
  className: string;
  section: string;
  schoolId: string;
  schedule: DaySchedule[];
  includeFriday?: boolean; // Optional: whether to include Friday (holiday)
  createdAt?: any;
  updatedAt?: any;
}

interface DaySchedule {
  day: string;
  periods: Period[];
}

interface Period {
  time: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
}

const DAYS_OF_WEEK = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
const DEFAULT_PERIODS = [
  { time: '08:00', endTime: '08:45', label: '১ম পিরিয়ড' },
  { time: '08:45', endTime: '09:30', label: '২য় পিরিয়ড' },
  { time: '09:30', endTime: '10:15', label: '৩য় পিরিয়ড' },
  { time: '10:15', endTime: '10:30', label: 'বিরতি', isBreak: true },
  { time: '10:30', endTime: '11:15', label: '৪র্থ পিরিয়ড' },
  { time: '11:15', endTime: '12:00', label: '৫ম পিরিয়ড' },
  { time: '12:00', endTime: '12:45', label: '৬ষ্ঠ পিরিয়ড' },
];

function RoutinePage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [routines, setRoutines] = useState<ClassRoutine[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<ClassRoutine | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newRoutineClass, setNewRoutineClass] = useState<string>('');
  const [includeFriday, setIncludeFriday] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadRoutines();
    }
  }, [selectedClass]);

  const loadData = async () => {
    try {
      setLoading(true);
      const settings = await settingsQueries.getSettings();
      const schoolId = settings?.schoolCode || SCHOOL_ID;

      // Load classes
      const classesData = await classQueries.getAllClasses();
      setClasses(classesData);

      // Load subjects
      const subjectsData = await subjectQueries.getAllSubjects(schoolId);
      setSubjects(subjectsData);

      // Load teachers
      const teachersData = await teacherQueries.getAllTeachers(true); // Only active teachers
      setTeachers(teachersData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadRoutines = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      const schoolId = settings?.schoolCode || SCHOOL_ID;

      const routinesRef = collection(db, 'classRoutines');
      const q = query(
        routinesRef,
        where('schoolId', '==', schoolId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);

      const routinesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClassRoutine));

      setRoutines(routinesData);
    } catch (error) {
      console.error('Error loading routines:', error);
      setRoutines([]);
    }
  };

  const createRoutine = async () => {
    if (!newRoutineClass) {
      alert('একটি ক্লাস নির্বাচন করুন');
      return;
    }

    try {
      const settings = await settingsQueries.getSettings();
      const schoolId = settings?.schoolCode || SCHOOL_ID;

      const selectedClassData = classes.find(c => c.classId === newRoutineClass);
      if (!selectedClassData) return;

      const defaultSchedule: DaySchedule[] = DAYS_OF_WEEK.map(day => ({
        day,
        periods: DEFAULT_PERIODS.filter(p => !p.isBreak).map(p => ({
          time: p.time,
          endTime: p.endTime,
          subject: '',
          teacher: '',
          room: ''
        }))
      }));

      const routineData = {
        classId: newRoutineClass,
        className: selectedClassData.className,
        section: selectedClassData.section || '',
        schoolId,
        schedule: defaultSchedule,
        includeFriday: includeFriday,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'classRoutines'), routineData);
      await loadRoutines();
      setSelectedClass(newRoutineClass);
      setShowCreateModal(false);
      setNewRoutineClass('');
      setIncludeFriday(false);
    } catch (error) {
      console.error('Error creating routine:', error);
      alert('রুটিন তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const updateRoutine = async () => {
    if (!editingRoutine?.id) return;

    try {
      const docRef = doc(db, 'classRoutines', editingRoutine.id);
      await updateDoc(docRef, {
        schedule: editingRoutine.schedule,
        includeFriday: editingRoutine.includeFriday ?? false,
        updatedAt: serverTimestamp()
      });

      await loadRoutines();
      setShowEditModal(false);
      setEditingRoutine(null);
    } catch (error) {
      console.error('Error updating routine:', error);
      alert('রুটিন আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const deleteRoutine = async (routineId: string) => {
    if (!confirm('আপনি কি এই রুটিন মুছে ফেলতে চান?')) return;

    try {
      await deleteDoc(doc(db, 'classRoutines', routineId));
      await loadRoutines();
    } catch (error) {
      console.error('Error deleting routine:', error);
      alert('রুটিন মুছতে সমস্যা হয়েছে');
    }
  };

  const updatePeriod = (dayIndex: number, periodIndex: number, field: string, value: string) => {
    if (!editingRoutine) return;

    const updatedSchedule = [...editingRoutine.schedule];
    updatedSchedule[dayIndex].periods[periodIndex] = {
      ...updatedSchedule[dayIndex].periods[periodIndex],
      [field]: value
    };

    setEditingRoutine({
      ...editingRoutine,
      schedule: updatedSchedule
    });
  };

  const updatePeriodTime = (dayIndex: number, periodIndex: number, timeField: 'time' | 'endTime', value: string) => {
    if (!editingRoutine) return;

    const updatedSchedule = [...editingRoutine.schedule];
    
    // Update the time for this specific period in all days
    DAYS_OF_WEEK.forEach((_, idx) => {
      if (updatedSchedule[idx] && updatedSchedule[idx].periods[periodIndex]) {
        updatedSchedule[idx].periods[periodIndex][timeField] = value;
      }
    });

    setEditingRoutine({
      ...editingRoutine,
      schedule: updatedSchedule
    });
  };

  const filteredRoutines = routines.filter(routine => {
    if (!selectedClass) return true;
    return routine.classId === selectedClass;
  });

  const viewRoutine = filteredRoutines.find(r => r.classId === selectedClass);

  if (loading) {
    return (
      <AdminLayout title="ক্লাস রুটিন" subtitle="সকল ক্লাসের রুটিন পরিচালনা করুন">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ক্লাস রুটিন" subtitle="সকল ক্লাসের রুটিন পরিচালনা করুন">
      {/* Header Actions */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">সকল ক্লাস</option>
              {classes.map((cls) => (
                <option key={cls.classId} value={cls.classId}>
                  {cls.className} {cls.section}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => loadRoutines()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            রিফ্রেশ
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            রুটিন তৈরি করুন
          </button>
        </div>
      </div>

      {/* Routine Display */}
      {selectedClass && viewRoutine ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {viewRoutine.className} {viewRoutine.section} - ক্লাস রুটিন
                </h3>
                <p className="text-sm text-gray-600 mt-1">সাপ্তাহিক ক্লাস সময়সূচী</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingRoutine(viewRoutine);
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  সম্পাদনা
                </button>
                <button
                  onClick={() => deleteRoutine(viewRoutine.id!)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  মুছুন
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                    সময়
                  </th>
                  {DAYS_OF_WEEK.map((day) => {
                    // Skip Friday if not included
                    if (day === 'শুক্রবার' && !viewRoutine.includeFriday) {
                      return null;
                    }
                    
                    return (
                      <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {day}
                        {day === 'শুক্রবার' && (
                          <span className="ml-2 text-xs text-red-600">(ছুটি)</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {DEFAULT_PERIODS.map((period, idx) => {
                  if (period.isBreak) {
                    return (
                      <tr key={idx} className="bg-yellow-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {period.time} - {period.endTime}
                        </td>
                        <td colSpan={viewRoutine.includeFriday ? 7 : 6} className="px-6 py-4 text-center text-sm font-semibold text-yellow-800">
                          {period.label}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {period.time} - {period.endTime}
                      </td>
                      {DAYS_OF_WEEK.map((day, dayIdx) => {
                        // Skip Friday if not included
                        if (day === 'শুক্রবার' && !viewRoutine.includeFriday) {
                          return null;
                        }
                        
                        const daySchedule = viewRoutine.schedule.find(s => s.day === day);
                        const periodData = daySchedule?.periods[idx < 3 ? idx : idx - 1] || {
                          subject: '',
                          teacher: '',
                          room: ''
                        };

                        return (
                          <td key={day} className="px-6 py-4">
                            {periodData.subject ? (
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-900">{periodData.subject}</p>
                                <p className="text-xs text-gray-600">{periodData.teacher}</p>
                                <p className="text-xs text-blue-600">রুম: {periodData.room}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">খালি</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedClass ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <CalendarClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">এই ক্লাসের জন্য কোনো রুটিন নেই</h3>
          <p className="text-gray-600 mb-6">একটি নতুন রুটিন তৈরি করতে উপরের বাটনে ক্লিক করুন</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">একটি ক্লাস নির্বাচন করুন</h3>
          <p className="text-gray-600">রুটিন দেখতে বা তৈরি করতে উপরে থেকে একটি ক্লাস নির্বাচন করুন</p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRoutine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl my-8">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                রুটিন সম্পাদনা করুন - {editingRoutine.className} {editingRoutine.section}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRoutine(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {DAYS_OF_WEEK.map((day, dayIdx) => {
                // Skip Friday if not included
                if (day === 'শুক্রবার' && !editingRoutine.includeFriday) {
                  return null;
                }
                
                return (
                  <div key={day} className="mb-6">
                    <button
                      onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                      className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{day}</span>
                        {day === 'শুক্রবার' && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">ছুটি</span>
                        )}
                      </div>
                      {expandedDay === day ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>

                  {expandedDay === day && (
                    <div className="mt-4 space-y-4 pl-4">
                      {DEFAULT_PERIODS.filter(p => !p.isBreak).map((period, periodIdx) => {
                        const currentPeriod = editingRoutine.schedule[dayIdx]?.periods[periodIdx];
                        
                        return (
                          <div key={periodIdx} className="border border-gray-200 rounded-lg p-4">
                            <div className="mb-4 pb-3 border-b border-gray-200">
                              <p className="text-sm font-semibold text-gray-900 mb-3">{period.label}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    শুরুর সময়
                                  </label>
                                  <input
                                    type="time"
                                    value={currentPeriod?.time || period.time}
                                    onChange={(e) => updatePeriodTime(dayIdx, periodIdx, 'time', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    শেষের সময়
                                  </label>
                                  <input
                                    type="time"
                                    value={currentPeriod?.endTime || period.endTime}
                                    onChange={(e) => updatePeriodTime(dayIdx, periodIdx, 'endTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-blue-600 mt-2">
                                ⓘ সময় পরিবর্তন সকল দিনের জন্য প্রযোজ্য হবে
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">বিষয়</label>
                                <select
                                  value={currentPeriod?.subject || ''}
                                  onChange={(e) => updatePeriod(dayIdx, periodIdx, 'subject', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                  <option value="">নির্বাচন করুন</option>
                                  {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.name}>
                                      {subject.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">শিক্ষক</label>
                                <select
                                  value={currentPeriod?.teacher || ''}
                                  onChange={(e) => updatePeriod(dayIdx, periodIdx, 'teacher', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                  <option value="">নির্বাচন করুন</option>
                                  {teachers.map((teacher) => (
                                    <option key={teacher.uid} value={teacher.name || teacher.displayName || 'Unknown'}>
                                      {teacher.name || teacher.displayName || 'Unknown'}
                                      {teacher.subject && ` - ${teacher.subject}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">রুম নং</label>
                                <input
                                  type="text"
                                  value={currentPeriod?.room || ''}
                                  onChange={(e) => updatePeriod(dayIdx, periodIdx, 'room', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                  placeholder="রুম নং"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );})}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRoutine(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                বাতিল
              </button>
              <button
                onClick={updateRoutine}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Routine Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">নতুন রুটিন তৈরি করুন</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRoutineClass('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ক্লাস নির্বাচন করুন <span className="text-red-500">*</span>
                </label>
                <select
                  value={newRoutineClass}
                  onChange={(e) => setNewRoutineClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">ক্লাস নির্বাচন করুন</option>
                  {classes
                    .filter(cls => !routines.find(r => r.classId === cls.classId))
                    .map((cls) => (
                      <option key={cls.classId} value={cls.classId}>
                        {cls.className} {cls.section}
                      </option>
                    ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CalendarClock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">রুটিন তৈরির তথ্য</p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• {includeFriday ? '৭ দিনের' : '৬ দিনের'} সাপ্তাহিক রুটিন তৈরি হবে</li>
                      <li>• প্রতিদিন ৬টি পিরিয়ড এবং ১টি বিরতি থাকবে</li>
                      <li>• তৈরির পর আপনি বিষয়, শিক্ষক এবং রুম নম্বর যোগ করতে পারবেন</li>
                      {includeFriday && (
                        <li className="text-red-700">⚠ শুক্রবার সাধারণত ছুটির দিন</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFriday}
                    onChange={(e) => setIncludeFriday(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">শুক্রবার অন্তর্ভুক্ত করুন</span>
                    <p className="text-xs text-gray-600 mt-1">শুক্রবার সাধারণত বাংলাদেশে ছুটির দিন</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoutineClass('');
                  setIncludeFriday(false);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                বাতিল
              </button>
              <button
                onClick={createRoutine}
                disabled={!newRoutineClass}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                তৈরি করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <RoutinePage />
    </ProtectedRoute>
  );
}
