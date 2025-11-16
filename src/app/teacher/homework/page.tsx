'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import TeacherLayout from '@/components/TeacherLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  BookOpen,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  User as UserIcon,
  Calendar,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Plus,
  X,
  Save
} from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { classQueries } from '@/lib/database-queries';

interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  teacherId: string;
  teacherName: string;
  dueDate: string;
  dueTime: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'archived' | 'deleted';
  attachments?: string[];
  instructions: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  publishedAt?: Timestamp;
}

function HomeworkManagementPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [filteredHomeworks, setFilteredHomeworks] = useState<Homework[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [expandedHomework, setExpandedHomework] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [homeworkToDelete, setHomeworkToDelete] = useState<Homework | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    subject: '',
    class: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    instructions: '',
    attachments: [] as string[]
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadHomeworks();
        loadClasses();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadClasses = async () => {
    try {
      const classesData = await classQueries.getAllClasses();
      const classNames = classesData.map(cls => cls.name || cls.className).filter(Boolean);
      setClasses(classNames);
      
      // Extract unique subjects from existing homeworks
      const uniqueSubjects = new Set(homeworks.map(hw => hw.subject).filter(Boolean));
      setSubjects(Array.from(uniqueSubjects));
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadHomeworks = async () => {
    try {
      setLoading(true);
      const homeworksRef = collection(db, 'homeworks');
      const q = query(homeworksRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const homeworksData: Homework[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        homeworksData.push({
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          subject: data.subject || '',
          class: data.class || '',
          teacherId: data.teacherId || '',
          teacherName: data.teacherName || 'Unknown Teacher',
          dueDate: data.dueDate || '',
          dueTime: data.dueTime || '',
          priority: data.priority || 'medium',
          status: data.status || 'active',
          attachments: data.attachments || [],
          instructions: data.instructions || '',
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt,
          publishedAt: data.publishedAt
        });
      });

      setHomeworks(homeworksData);
      setFilteredHomeworks(homeworksData);
    } catch (error) {
      console.error('Error loading homeworks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...homeworks];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(hw =>
        hw.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.class?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Class filter
    if (selectedClass && selectedClass !== 'সকল ক্লাস') {
      filtered = filtered.filter(hw => hw.class === selectedClass);
    }

    // Subject filter
    if (selectedSubject && selectedSubject !== 'সকল বিষয়') {
      filtered = filtered.filter(hw => hw.subject === selectedSubject);
    }

    // Status filter
    if (selectedStatus && selectedStatus !== 'সকল অবস্থা') {
      filtered = filtered.filter(hw => hw.status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority && selectedPriority !== 'সকল অগ্রাধিকার') {
      filtered = filtered.filter(hw => hw.priority === selectedPriority);
    }

    setFilteredHomeworks(filtered);
  }, [searchTerm, selectedClass, selectedSubject, selectedStatus, selectedPriority, homeworks]);

  const handleDelete = async () => {
    if (!homeworkToDelete) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'homeworks', homeworkToDelete.id));
      await loadHomeworks();
      setShowDeleteModal(false);
      setHomeworkToDelete(null);
    } catch (error) {
      console.error('Error deleting homework:', error);
      alert('বাড়ির কাজ মুছে ফেলতে সমস্যা হয়েছে');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async (homeworkId: string) => {
    try {
      await updateDoc(doc(db, 'homeworks', homeworkId), {
        status: 'archived',
        updatedAt: Timestamp.now()
      });
      await loadHomeworks();
    } catch (error) {
      console.error('Error archiving homework:', error);
      alert('বাড়ির কাজ archive করতে সমস্যা হয়েছে');
    }
  };

  const handleActivate = async (homeworkId: string) => {
    try {
      await updateDoc(doc(db, 'homeworks', homeworkId), {
        status: 'active',
        updatedAt: Timestamp.now()
      });
      await loadHomeworks();
    } catch (error) {
      console.error('Error activating homework:', error);
      alert('বাড়ির কাজ সক্রিয় করতে সমস্যা হয়েছে');
    }
  };

  const validateHomework = () => {
    const homework = editingHomework ? {
      title: editingHomework.title,
      description: editingHomework.description,
      subject: editingHomework.subject,
      class: editingHomework.class,
      dueDate: editingHomework.dueDate,
      dueTime: editingHomework.dueTime || '',
      priority: editingHomework.priority,
      instructions: editingHomework.instructions || ''
    } : newHomework;

    if (!homework.title.trim()) {
      setMessageText('শিরোনাম প্রয়োজন');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return false;
    }
    if (!homework.class) {
      setMessageText('ক্লাস নির্বাচন করুন');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return false;
    }
    if (!homework.subject.trim()) {
      setMessageText('বিষয় প্রয়োজন');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return false;
    }
    if (!homework.dueDate) {
      setMessageText('জমা দেওয়ার তারিখ প্রয়োজন');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
      return false;
    }
    return true;
  };

  const handleAddHomework = async () => {
    if (!user) return;
    if (!validateHomework()) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'homeworks'), {
        title: newHomework.title,
        description: newHomework.description,
        subject: newHomework.subject,
        class: newHomework.class,
        teacherId: user.uid,
        teacherName: user.email || 'Admin',
        dueDate: newHomework.dueDate,
        dueTime: newHomework.dueTime || '23:59',
        priority: newHomework.priority,
        status: 'active',
        attachments: newHomework.attachments,
        instructions: newHomework.instructions,
        createdAt: serverTimestamp(),
        publishedAt: serverTimestamp()
      });

      // Reset form
      setNewHomework({
        title: '',
        description: '',
        subject: '',
        class: '',
        dueDate: '',
        dueTime: '',
        priority: 'medium',
        instructions: '',
        attachments: []
      });
      setShowAddModal(false);
      await loadHomeworks();
      setMessageText('বাড়ির কাজ সফলভাবে যোগ করা হয়েছে');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error adding homework:', error);
      setMessageText('বাড়ির কাজ যোগ করতে সমস্যা হয়েছে');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditHomework = async () => {
    if (!user || !editingHomework) return;
    if (!validateHomework()) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'homeworks', editingHomework.id), {
        title: editingHomework.title,
        description: editingHomework.description,
        subject: editingHomework.subject,
        class: editingHomework.class,
        dueDate: editingHomework.dueDate,
        dueTime: editingHomework.dueTime || '23:59',
        priority: editingHomework.priority,
        instructions: editingHomework.instructions || '',
        attachments: editingHomework.attachments || [],
        updatedAt: Timestamp.now()
      });

      setShowEditModal(false);
      setEditingHomework(null);
      await loadHomeworks();
      setMessageText('বাড়ির কাজ সফলভাবে আপডেট করা হয়েছে');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error updating homework:', error);
      setMessageText('বাড়ির কাজ আপডেট করতে সমস্যা হয়েছে');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (homework: Homework) => {
    setEditingHomework({ ...homework });
    setShowEditModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'archived': return 'bg-gray-100 text-gray-700';
      case 'deleted': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getUniqueValues = (key: keyof Homework) => {
    const values = new Set(homeworks.map(hw => hw[key] as string));
    return Array.from(values).filter(Boolean).sort();
  };

  if (loading) {
    return (
      <ProtectedRoute requireAuth={true}>
        <TeacherLayout title="বাড়ির কাজ ব্যবস্থাপনা" subtitle="শিক্ষকদের প্রকাশিত বাড়ির কাজ নিয়ন্ত্রণ করুন">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </TeacherLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <TeacherLayout title="বাড়ির কাজ ব্যবস্থাপনা" subtitle="শিক্ষকদের প্রকাশিত বাড়ির কাজ নিয়ন্ত্রণ করুন">
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="বাড়ির কাজ, বিষয়, শিক্ষক, ক্লাস অনুসন্ধান করুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Class Filter */}
              <div>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">সকল ক্লাস</option>
                  {getUniqueValues('class').map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">সকল বিষয়</option>
                  {getUniqueValues('subject').map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">সকল অবস্থা</option>
                  <option value="active">সক্রিয়</option>
                  <option value="archived">আর্কাইভ</option>
                </select>
              </div>
            </div>

            {/* Priority Filter */}
            <div className="mt-4">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">সকল অগ্রাধিকার</option>
                <option value="high">উচ্চ</option>
                <option value="medium">মধ্যম</option>
                <option value="low">নিম্ন</option>
              </select>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">মোট বাড়ির কাজ</p>
                  <p className="text-2xl font-bold text-gray-900">{homeworks.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">সক্রিয়</p>
                  <p className="text-2xl font-bold text-green-600">
                    {homeworks.filter(hw => hw.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">আর্কাইভ</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {homeworks.filter(hw => hw.status === 'archived').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-gray-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">দেখানো হচ্ছে</p>
                  <p className="text-2xl font-bold text-blue-600">{filteredHomeworks.length}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Homework List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">বাড়ির কাজের তালিকা</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span>বাড়ির কাজ যোগ করুন</span>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">লোড হচ্ছে...</p>
              </div>
            ) : filteredHomeworks.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">কোন বাড়ির কাজ পাওয়া যায়নি</p>
                <p className="text-gray-500 text-sm">শিক্ষকরা এখনও কোনো বাড়ির কাজ প্রকাশ করেননি</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredHomeworks.map((homework) => (
                  <div key={homework.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{homework.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(homework.priority)}`}>
                            {homework.priority === 'high' ? 'উচ্চ' : homework.priority === 'medium' ? 'মধ্যম' : 'নিম্ন'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(homework.status)}`}>
                            {homework.status === 'active' ? 'সক্রিয়' : 'আর্কাইভ'}
                          </span>
                        </div>

                        <p className="text-gray-600 mb-3 line-clamp-2">{homework.description}</p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{homework.subject}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-4 h-4" />
                            <span>{homework.class}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-4 h-4" />
                            <span>{homework.teacherName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>জমা: {homework.dueDate} {homework.dueTime && `(${homework.dueTime})`}</span>
                          </div>
                        </div>

                        {expandedHomework === homework.id && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium text-gray-700">নির্দেশাবলী:</span>
                                <p className="text-gray-600 mt-1">{homework.instructions || 'কোন নির্দেশনা নেই'}</p>
                              </div>
                              {homework.attachments && homework.attachments.length > 0 && (
                                <div>
                                  <span className="font-medium text-gray-700">সংযুক্তি:</span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {homework.attachments.map((attachment, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                                        {attachment}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                তৈরি: {homework.createdAt?.toDate?.()?.toLocaleString('bn-BD') || 'N/A'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => setExpandedHomework(expandedHomework === homework.id ? null : homework.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="বিস্তারিত দেখুন"
                        >
                          {expandedHomework === homework.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(homework)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="সম্পাদনা করুন"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {homework.status === 'active' ? (
                          <button
                            onClick={() => handleArchive(homework.id)}
                            className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="আর্কাইভ করুন"
                          >
                            <Clock className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(homework.id)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="সক্রিয় করুন"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setHomeworkToDelete(homework);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Success/Error Toast Messages */}
        {showSuccessMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 min-w-[350px] max-w-md border-2 border-green-400 animate-slide-down">
              <div className="bg-white bg-opacity-20 rounded-full p-1.5">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              </div>
              <span className="font-semibold text-base">{messageText}</span>
            </div>
          </div>
        )}

        {showErrorMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 min-w-[350px] max-w-md border-2 border-red-400 animate-slide-down">
              <div className="bg-white bg-opacity-20 rounded-full p-1.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              </div>
              <span className="font-semibold text-base">{messageText}</span>
            </div>
          </div>
        )}

        {/* Add Homework Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && !isSaving && setShowAddModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-modal-enter">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">নতুন বাড়ির কাজ যোগ করুন</h3>
                    <p className="text-blue-100 text-sm">ক্লাস অনুযায়ী বাড়ির কাজ যোগ করুন</p>
                  </div>
                </div>
                <button
                  onClick={() => !isSaving && setShowAddModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  disabled={isSaving}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    শিরোনাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newHomework.title}
                    onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                    placeholder="যেমন: গণিত অধ্যায় ৫"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    বিবরণ
                  </label>
                  <textarea
                    value={newHomework.description}
                    onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                    placeholder="বাড়ির কাজের বিবরণ..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Class */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ক্লাস <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newHomework.class}
                      onChange={(e) => setNewHomework({ ...newHomework, class: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors bg-white"
                      required
                    >
                      <option value="">ক্লাস নির্বাচন করুন</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      বিষয় <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newHomework.subject}
                      onChange={(e) => setNewHomework({ ...newHomework, subject: e.target.value })}
                      placeholder="যেমন: গণিত, বাংলা"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      জমা দেওয়ার তারিখ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newHomework.dueDate}
                      onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      required
                    />
                  </div>

                  {/* Due Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      জমা দেওয়ার সময়
                    </label>
                    <input
                      type="time"
                      value={newHomework.dueTime}
                      onChange={(e) => setNewHomework({ ...newHomework, dueTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      অগ্রাধিকার
                    </label>
                    <select
                      value={newHomework.priority}
                      onChange={(e) => setNewHomework({ ...newHomework, priority: e.target.value as 'high' | 'medium' | 'low' })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors bg-white"
                    >
                      <option value="low">নিম্ন</option>
                      <option value="medium">মধ্যম</option>
                      <option value="high">উচ্চ</option>
                    </select>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    নির্দেশাবলী
                  </label>
                  <textarea
                    value={newHomework.instructions}
                    onChange={(e) => setNewHomework({ ...newHomework, instructions: e.target.value })}
                    placeholder="বাড়ির কাজ সম্পাদনের নির্দেশনা..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-200 p-6 flex justify-end space-x-3">
                <button
                  onClick={() => !isSaving && setShowAddModal(false)}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all font-medium"
                  disabled={isSaving}
                >
                  বাতিল
                </button>
                <button
                  onClick={handleAddHomework}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium shadow-lg shadow-blue-500/30"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>যোগ করা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>যোগ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Homework Modal */}
        {showEditModal && editingHomework && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && !isSaving && setShowEditModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-modal-enter">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">বাড়ির কাজ সম্পাদনা করুন</h3>
                    <p className="text-blue-100 text-sm">বাড়ির কাজের তথ্য আপডেট করুন</p>
                  </div>
                </div>
                <button
                  onClick={() => !isSaving && setShowEditModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  disabled={isSaving}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    শিরোনাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingHomework.title}
                    onChange={(e) => setEditingHomework({ ...editingHomework, title: e.target.value })}
                    placeholder="যেমন: গণিত অধ্যায় ৫"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    বিবরণ
                  </label>
                  <textarea
                    value={editingHomework.description || ''}
                    onChange={(e) => setEditingHomework({ ...editingHomework, description: e.target.value })}
                    placeholder="বাড়ির কাজের বিবরণ..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Class */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ক্লাস <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editingHomework.class}
                      onChange={(e) => setEditingHomework({ ...editingHomework, class: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors bg-white"
                      required
                    >
                      <option value="">ক্লাস নির্বাচন করুন</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      বিষয় <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingHomework.subject}
                      onChange={(e) => setEditingHomework({ ...editingHomework, subject: e.target.value })}
                      placeholder="যেমন: গণিত, বাংলা"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      জমা দেওয়ার তারিখ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingHomework.dueDate}
                      onChange={(e) => setEditingHomework({ ...editingHomework, dueDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      required
                    />
                  </div>

                  {/* Due Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      জমা দেওয়ার সময়
                    </label>
                    <input
                      type="time"
                      value={editingHomework.dueTime || ''}
                      onChange={(e) => setEditingHomework({ ...editingHomework, dueTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      অগ্রাধিকার
                    </label>
                    <select
                      value={editingHomework.priority}
                      onChange={(e) => setEditingHomework({ ...editingHomework, priority: e.target.value as 'high' | 'medium' | 'low' })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors bg-white"
                    >
                      <option value="low">নিম্ন</option>
                      <option value="medium">মধ্যম</option>
                      <option value="high">উচ্চ</option>
                    </select>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    নির্দেশাবলী
                  </label>
                  <textarea
                    value={editingHomework.instructions || ''}
                    onChange={(e) => setEditingHomework({ ...editingHomework, instructions: e.target.value })}
                    placeholder="বাড়ির কাজ সম্পাদনের নির্দেশনা..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-200 p-6 flex justify-end space-x-3">
                <button
                  onClick={() => !isSaving && setShowEditModal(false)}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all font-medium"
                  disabled={isSaving}
                >
                  বাতিল
                </button>
                <button
                  onClick={handleEditHomework}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium shadow-lg shadow-blue-500/30"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>আপডেট করা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>আপডেট করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">বাড়ির কাজ মুছে ফেলুন</h3>
              </div>
              <p className="text-gray-600 mb-6">
                আপনি কি নিশ্চিত যে আপনি "{homeworkToDelete?.title}" বাড়ির কাজটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setHomeworkToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  বাতিল
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>মুছে ফেলছি...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>মুছে ফেলুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </TeacherLayout>
    </ProtectedRoute>
  );
}

export default HomeworkManagementPage;

