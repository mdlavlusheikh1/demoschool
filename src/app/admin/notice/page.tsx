'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Bell,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  X,
  Save,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc, Timestamp, addDoc } from 'firebase/firestore';

interface Notice {
  id: string;
  title: string;
  description: string;
  category: 'all' | 'teachers' | 'students' | 'parents';
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'archived';
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  expiresAt?: Timestamp;
  attachments?: string[];
}

function NoticeManagementPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [newNotice, setNewNotice] = useState({
    title: '',
    description: '',
    category: 'all' as 'all' | 'teachers' | 'students' | 'parents',
    priority: 'medium' as 'high' | 'medium' | 'low',
    expiresAt: ''
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadNotices();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadNotices = async () => {
    try {
      setLoading(true);
      const noticesRef = collection(db, 'notices');
      const q = query(noticesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const noticesData: Notice[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        noticesData.push({
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'all',
          priority: data.priority || 'medium',
          status: data.status || 'active',
          createdBy: data.createdBy || '',
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt,
          expiresAt: data.expiresAt,
          attachments: data.attachments || []
        });
      });

      setNotices(noticesData);
      setFilteredNotices(noticesData);
    } catch (error) {
      console.error('Error loading notices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...notices];

    if (searchTerm) {
      filtered = filtered.filter(notice =>
        notice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory && selectedCategory !== 'সকল বিভাগ') {
      filtered = filtered.filter(notice => notice.category === selectedCategory);
    }

    if (selectedStatus && selectedStatus !== 'সকল অবস্থা') {
      filtered = filtered.filter(notice => notice.status === selectedStatus);
    }

    if (selectedPriority && selectedPriority !== 'সকল অগ্রাধিকার') {
      filtered = filtered.filter(notice => notice.priority === selectedPriority);
    }

    setFilteredNotices(filtered);
  }, [searchTerm, selectedCategory, selectedStatus, selectedPriority, notices]);

  const handleDelete = async () => {
    if (!noticeToDelete) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'notices', noticeToDelete.id));
      await loadNotices();
      setShowDeleteModal(false);
      setNoticeToDelete(null);
      showMessage('নোটিশ সফলভাবে মুছে ফেলা হয়েছে', true);
    } catch (error) {
      console.error('Error deleting notice:', error);
      showMessage('নোটিশ মুছতে ত্রুটি হয়েছে', false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddNotice = async () => {
    if (!newNotice.title || !newNotice.description) {
      showMessage('শিরোনাম এবং বিবরণ আবশ্যক', false);
      return;
    }

    setIsSaving(true);
    try {
      const noticeData: any = {
        title: newNotice.title,
        description: newNotice.description,
        category: newNotice.category,
        priority: newNotice.priority,
        status: 'active',
        createdBy: user?.email || 'Unknown',
        createdAt: Timestamp.now(),
        attachments: []
      };

      if (newNotice.expiresAt) {
        noticeData.expiresAt = Timestamp.fromDate(new Date(newNotice.expiresAt));
      }

      await addDoc(collection(db, 'notices'), noticeData);
      await loadNotices();
      setShowAddModal(false);
      setNewNotice({
        title: '',
        description: '',
        category: 'all',
        priority: 'medium',
        expiresAt: ''
      });
      showMessage('নোটিশ সফলভাবে যুক্ত হয়েছে', true);
    } catch (error) {
      console.error('Error adding notice:', error);
      showMessage('নোটিশ যুক্ত করতে ত্রুটি হয়েছে', false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditNotice = async () => {
    if (!editingNotice) return;

    setIsSaving(true);
    try {
      const updateData: any = {
        title: editingNotice.title,
        description: editingNotice.description,
        category: editingNotice.category,
        priority: editingNotice.priority,
        updatedAt: Timestamp.now()
      };

      if (editingNotice.expiresAt) {
        updateData.expiresAt = editingNotice.expiresAt;
      }

      await updateDoc(doc(db, 'notices', editingNotice.id), updateData);
      await loadNotices();
      setShowEditModal(false);
      setEditingNotice(null);
      showMessage('নোটিশ সফলভাবে আপডেট হয়েছে', true);
    } catch (error) {
      console.error('Error updating notice:', error);
      showMessage('নোটিশ আপডেট করতে ত্রুটি হয়েছে', false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveNotice = async (notice: Notice) => {
    try {
      await updateDoc(doc(db, 'notices', notice.id), {
        status: notice.status === 'active' ? 'archived' : 'active',
        updatedAt: Timestamp.now()
      });
      await loadNotices();
      showMessage(
        notice.status === 'active' ? 'নোটিশ আর্কাইভ করা হয়েছে' : 'নোটিশ সক্রিয় করা হয়েছে',
        true
      );
    } catch (error) {
      console.error('Error archiving notice:', error);
      showMessage('অবস্থা পরিবর্তন করতে ত্রুটি হয়েছে', false);
    }
  };

  const showMessage = (text: string, isSuccess: boolean) => {
    setMessageText(text);
    if (isSuccess) {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } else {
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 3000);
    }
  };

  const formatDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return 'তারিখ নেই';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return AlertCircle;
      case 'low': return Info;
      default: return Bell;
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: { [key: string]: string } = {
      all: 'সকল',
      teachers: 'শিক্ষক',
      students: 'শিক্ষার্থী',
      parents: 'অভিভাবক'
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <AdminLayout title="নোটিশ পরিচালনা" subtitle="সকল নোটিশ দেখুন এবং পরিচালনা করুন">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <AdminLayout title="নোটিশ পরিচালনা" subtitle="সকল নোটিশ দেখুন এবং পরিচালনা করুন">
        {/* Success/Error Messages */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{messageText}</span>
          </div>
        )}
        {showErrorMessage && (
          <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <X className="w-5 h-5" />
            <span>{messageText}</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">নোটিশ তালিকা</h2>
            <p className="text-gray-600 mt-1">মোট {filteredNotices.length}টি নোটিশ</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>নতুন নোটিশ</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="নোটিশ খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">সকল বিভাগ</option>
              <option value="all">সকল</option>
              <option value="teachers">শিক্ষক</option>
              <option value="students">শিক্ষার্থী</option>
              <option value="parents">অভিভাবক</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">সকল অগ্রাধিকার</option>
              <option value="high">উচ্চ</option>
              <option value="medium">মধ্যম</option>
              <option value="low">নিম্ন</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">সকল অবস্থা</option>
              <option value="active">সক্রিয়</option>
              <option value="archived">আর্কাইভ</option>
            </select>
          </div>
        </div>

        {/* Notice List */}
        <div className="space-y-4">
          {filteredNotices.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">কোন নোটিশ পাওয়া যায়নি</h3>
              <p className="text-gray-600">নতুন নোটিশ যুক্ত করতে উপরের বাটনে ক্লিক করুন</p>
            </div>
          ) : (
            filteredNotices.map((notice) => {
              const PriorityIcon = getPriorityIcon(notice.priority);
              return (
                <div key={notice.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{notice.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(notice.priority)} flex items-center space-x-1`}>
                            <PriorityIcon className="w-4 h-4" />
                            <span>{notice.priority === 'high' ? 'জরুরি' : notice.priority === 'medium' ? 'গুরুত্বপূর্ণ' : 'সাধারণ'}</span>
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {getCategoryLabel(notice.category)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            notice.status === 'active' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                          }`}>
                            {notice.status === 'active' ? 'সক্রিয়' : 'আর্কাইভ'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3 line-clamp-2">{notice.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(notice.createdAt)}</span>
                          </div>
                          {notice.expiresAt && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>মেয়াদ শেষ: {formatDate(notice.expiresAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingNotice(notice);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="সম্পাদনা করুন"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleArchiveNotice(notice)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title={notice.status === 'active' ? 'আর্কাইভ করুন' : 'সক্রিয় করুন'}
                        >
                          {notice.status === 'active' ? <Clock className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => {
                            setNoticeToDelete(notice);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {expandedNotice === notice.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedNotice === notice.id && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="font-semibold text-gray-900 mb-2">সম্পূর্ণ বিবরণ:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{notice.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Notice Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">নতুন নোটিশ যুক্ত করুন</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম *</label>
                  <input
                    type="text"
                    value={newNotice.title}
                    onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="নোটিশের শিরোনাম লিখুন"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">বিবরণ *</label>
                  <textarea
                    value={newNotice.description}
                    onChange={(e) => setNewNotice({ ...newNotice, description: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="নোটিশের বিস্তারিত বিবরণ লিখুন"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বিভাগ</label>
                    <select
                      value={newNotice.category}
                      onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">সকল</option>
                      <option value="teachers">শিক্ষক</option>
                      <option value="students">শিক্ষার্থী</option>
                      <option value="parents">অভিভাবক</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">অগ্রাধিকার</label>
                    <select
                      value={newNotice.priority}
                      onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">নিম্ন</option>
                      <option value="medium">মধ্যম</option>
                      <option value="high">উচ্চ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">মেয়াদ শেষ (ঐচ্ছিক)</label>
                  <input
                    type="datetime-local"
                    value={newNotice.expiresAt}
                    onChange={(e) => setNewNotice({ ...newNotice, expiresAt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    onClick={handleAddNotice}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>সংরক্ষণ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Notice Modal */}
        {showEditModal && editingNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">নোটিশ সম্পাদনা করুন</h3>
                  <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম *</label>
                  <input
                    type="text"
                    value={editingNotice.title}
                    onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">বিবরণ *</label>
                  <textarea
                    value={editingNotice.description}
                    onChange={(e) => setEditingNotice({ ...editingNotice, description: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">বিভাগ</label>
                    <select
                      value={editingNotice.category}
                      onChange={(e) => setEditingNotice({ ...editingNotice, category: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">সকল</option>
                      <option value="teachers">শিক্ষক</option>
                      <option value="students">শিক্ষার্থী</option>
                      <option value="parents">অভিভাবক</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">অগ্রাধিকার</label>
                    <select
                      value={editingNotice.priority}
                      onChange={(e) => setEditingNotice({ ...editingNotice, priority: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">নিম্ন</option>
                      <option value="medium">মধ্যম</option>
                      <option value="high">উচ্চ</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    onClick={handleEditNotice}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
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
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">নোটিশ মুছে ফেলবেন?</h3>
                <p className="text-gray-600">
                  আপনি কি নিশ্চিত যে আপনি "{noticeToDelete?.title}" নোটিশটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
                </p>
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>মুছে ফেলা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      <span>মুছে ফেলুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}

export default NoticeManagementPage;
