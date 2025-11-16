'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { supportQueries, SupportTicket, contactMessageQueries, ContactMessage } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Plus,
  Search,
  Loader2,
  Eye,
  Edit,
  RefreshCw
} from 'lucide-react';

function SupportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'tickets' | 'messages'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();
  const schoolId = SCHOOL_ID;

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

  // Set up real-time listeners for support tickets and contact messages
  useEffect(() => {
    if (!user || !schoolId) return;

    console.log('Setting up real-time listeners...');
    
    // Initial load
    const loadData = async () => {
      try {
        setLoading(true);
        const [tickets, messages] = await Promise.all([
          supportQueries.getAllSupportTickets(schoolId),
          contactMessageQueries.getAllContactMessages(schoolId)
        ]);
        setSupportTickets(tickets);
        setContactMessages(messages);
        console.log('Loaded support tickets:', tickets.length, 'contact messages:', messages.length);
      } catch (error) {
        console.error('Error loading data:', error);
        setSupportTickets([]);
        setContactMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listeners
    const unsubscribeTickets = supportQueries.subscribeToSupportTickets(
      schoolId,
      (tickets) => {
        console.log('Real-time support tickets update:', tickets.length);
        setSupportTickets(tickets);
      }
    );

    const unsubscribeMessages = contactMessageQueries.subscribeToContactMessages(
      schoolId,
      (messages) => {
        console.log('Real-time contact messages update:', messages.length);
        setContactMessages(messages);
      }
    );

    return () => {
      console.log('Unsubscribing from listeners');
      unsubscribeTickets();
      unsubscribeMessages();
    };
  }, [user, schoolId]);

  // Format date for display
  const formatDate = (date: string | Timestamp | undefined) => {
    if (!date) return '-';
    try {
      let dateObj: Date;
      if (date instanceof Timestamp) {
        dateObj = date.toDate();
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        return '-';
      }
      if (isNaN(dateObj.getTime())) return '-';
      return dateObj.toLocaleDateString('bn-BD', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  };

  // Get status display text
  const getStatusText = (status: string | undefined) => {
    if (!status) return 'খোলা';
    const statusMap: { [key: string]: string } = {
      'open': 'খোলা',
      'in_progress': 'প্রক্রিয়াধীন',
      'resolved': 'সমাধান',
      'closed': 'বন্ধ',
      'খোলা': 'খোলা',
      'প্রক্রিয়াধীন': 'প্রক্রিয়াধীন',
      'সমাধান': 'সমাধান',
      'বন্ধ': 'বন্ধ'
    };
    return statusMap[status] || status;
  };

  // Get priority display text
  const getPriorityText = (priority: string | undefined) => {
    if (!priority) return 'মাঝারি';
    const priorityMap: { [key: string]: string } = {
      'high': 'উচ্চ',
      'medium': 'মাঝারি',
      'low': 'নিম্ন',
      'উচ্চ': 'উচ্চ',
      'মাঝারি': 'মাঝারি',
      'নিম্ন': 'নিম্ন'
    };
    return priorityMap[priority] || priority;
  };

  // Get category display text
  const getCategoryText = (category: string | undefined) => {
    if (!category) return 'অন্যান্য';
    const categoryMap: { [key: string]: string } = {
      'technical': 'টেকনিক্যাল',
      'payment': 'পেমেন্ট',
      'data': 'ডেটা',
      'report': 'রিপোর্ট',
      'other': 'অন্যান্য',
      'টেকনিক্যাল': 'টেকনিক্যাল',
      'পেমেন্ট': 'পেমেন্ট',
      'ডেটা': 'ডেটা',
      'রিপোর্ট': 'রিপোর্ট',
      'অন্যান্য': 'অন্যান্য'
    };
    return categoryMap[category] || category;
  };

  // Filter tickets based on search and status
  const filteredTickets = supportTickets.filter(ticket => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        ticket.title?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.userName?.toLowerCase().includes(query) ||
        ticket.userEmail?.toLowerCase().includes(query) ||
        getCategoryText(ticket.category).toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const ticketStatus = getStatusText(ticket.status);
      if (statusFilter === 'open' && ticketStatus !== 'খোলা') return false;
      if (statusFilter === 'in_progress' && ticketStatus !== 'প্রক্রিয়াধীন') return false;
      if (statusFilter === 'resolved' && ticketStatus !== 'সমাধান') return false;
    }

    return true;
  });

  // Filter contact messages
  const filteredMessages = contactMessages.filter(message => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        message.name?.toLowerCase().includes(query) ||
        message.email?.toLowerCase().includes(query) ||
        message.subject?.toLowerCase().includes(query) ||
        message.message?.toLowerCase().includes(query) ||
        message.phone?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'open' && message.status !== 'new') return false;
      if (statusFilter === 'in_progress' && message.status !== 'read') return false;
      if (statusFilter === 'resolved' && message.status !== 'replied' && message.status !== 'archived') return false;
    }

    return true;
  });

  // Calculate stats
  const supportStats = {
    total: supportTickets.length,
    open: supportTickets.filter(t => {
      const status = getStatusText(t.status);
      return status === 'খোলা' || t.status === 'open';
    }).length,
    inProgress: supportTickets.filter(t => {
      const status = getStatusText(t.status);
      return status === 'প্রক্রিয়াধীন' || t.status === 'in_progress';
    }).length,
    resolved: supportTickets.filter(t => {
      const status = getStatusText(t.status);
      return status === 'সমাধান' || status === 'বন্ধ' || t.status === 'resolved' || t.status === 'closed';
    }).length
  };

  // Calculate contact message stats
  const messageStats = {
    total: contactMessages.length,
    new: contactMessages.filter(m => m.status === 'new' || !m.read).length,
    read: contactMessages.filter(m => m.status === 'read' && m.read).length,
    replied: contactMessages.filter(m => m.status === 'replied').length
  };

  if (loading && supportTickets.length === 0) {
    return (
      <ProtectedRoute requireAuth={true}>
        <AdminLayout title="সাপোর্ট সেন্টার" subtitle="সহায়তা টিকিট ও সমস্যা সমাধান">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <AdminLayout title="সাপোর্ট সেন্টার" subtitle="সহায়তা টিকিট ও সমস্যা সমাধান">
          {/* Support Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট টিকিট</p>
                  <p className="text-2xl font-bold text-gray-900">{supportStats.total}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">খোলা</p>
                  <p className="text-2xl font-bold text-red-600">{supportStats.open}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">প্রক্রিয়াধীন</p>
                  <p className="text-2xl font-bold text-yellow-600">{supportStats.inProgress}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">সমাধান</p>
                  <p className="text-2xl font-bold text-green-600">{supportStats.resolved}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ফোন সাপোর্ট</h3>
                  <p className="text-sm text-gray-600">+৮৮০১৭১২৩৪৫৬১০</p>
                  <p className="text-xs text-gray-500">সকাল ৯টা - রাত ৬টা</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ইমেইল সাপোর্ট</h3>
                  <p className="text-sm text-gray-600">support@iqraschool.com</p>
                <p className="text-xs text-gray-500">২৪ ঘন্টা পরিষেবা</p>
              </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">লাইভ চ্যাট</h3>
                  <p className="text-sm text-gray-600">তাৎক্ষণিক সহায়তা</p>
                  <p className="text-xs text-gray-500">সকাল ৮টা - রাত ১০টা</p>
                </div>
              </div>
            </div>
          </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>যোগাযোগ বার্তা ({messageStats.total})</span>
                {messageStats.new > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {messageStats.new}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'tickets'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>সাপোর্ট টিকিট ({supportStats.total})</span>
              </div>
            </button>
          </div>
        </div>

        {/* Action Buttons and Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {activeTab === 'messages' ? 'যোগাযোগ বার্তা' : 'সাপোর্ট টিকিট'}
            </h2>
            <p className="text-gray-600">
              {activeTab === 'messages' ? 'সকল যোগাযোগ বার্তা' : 'সকল সহায়তা অনুরোধ'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>নতুন টিকিট</span>
            </button>
            <button 
              onClick={() => {
                const loadTickets = async () => {
                  setLoading(true);
                  try {
                    const tickets = await supportQueries.getAllSupportTickets(schoolId);
                    setSupportTickets(tickets);
                  } catch (error) {
                    console.error('Error refreshing tickets:', error);
                  } finally {
                    setLoading(false);
                  }
                };
                loadTickets();
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>রিফ্রেশ</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="টিকিট খুঁজুন..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">সকল অবস্থা</option>
              {activeTab === 'messages' ? (
                <>
                  <option value="open">নতুন</option>
                  <option value="in_progress">পড়া হয়েছে</option>
                  <option value="resolved">উত্তর দেওয়া</option>
                </>
              ) : (
                <>
                  <option value="open">খোলা</option>
                  <option value="in_progress">প্রক্রিয়াধীন</option>
                  <option value="resolved">সমাধান</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'messages' ? (
          /* Contact Messages Table */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              {loading && contactMessages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো বার্তা পাওয়া যায়নি</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'আপনার অনুসন্ধানের সাথে মিলে যায় এমন কোনো বার্তা নেই' 
                      : 'এখনও কোনো যোগাযোগ বার্তা পাওয়া যায়নি'}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">নাম</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ইমেইল/ফোন</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">বিষয়</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">বার্তা</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থা</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">তারিখ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">কার্যক্রম</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMessages.map((message) => (
                      <tr 
                        key={message.id} 
                        className={`hover:bg-gray-50 ${!message.read ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {message.name}
                            {!message.read && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                নতুন
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{message.email}</div>
                            {message.phone && (
                              <div className="text-sm text-gray-500">{message.phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {message.subject}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {message.message}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            message.status === 'new' || !message.read
                              ? 'bg-red-100 text-red-800' : 
                            message.status === 'read'
                              ? 'bg-yellow-100 text-yellow-800' : 
                            message.status === 'replied'
                              ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                            {message.status === 'new' ? 'নতুন' :
                             message.status === 'read' ? 'পড়া হয়েছে' :
                             message.status === 'replied' ? 'উত্তর দেওয়া' :
                             message.status === 'archived' ? 'আর্কাইভ' : message.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(message.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={async () => {
                                if (message.id) {
                                  try {
                                    await contactMessageQueries.markAsRead(message.id, user?.uid);
                                  } catch (error) {
                                    console.error('Error marking as read:', error);
                                  }
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="পড়া হয়েছে হিসাবে চিহ্নিত করুন"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (message.id) {
                                  try {
                                    await contactMessageQueries.updateMessageStatus(message.id, 'replied', user?.uid);
                                  } catch (error) {
                                    console.error('Error updating status:', error);
                                  }
                                }
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="উত্তর দেওয়া হিসাবে চিহ্নিত করুন"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* Support Tickets Table */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              {loading && supportTickets.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো টিকিট পাওয়া যায়নি</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'আপনার অনুসন্ধানের সাথে মিলে যায় এমন কোনো টিকিট নেই' 
                      : 'এখনও কোনো সাপোর্ট টিকিট জমা দেওয়া হয়নি'}
                  </p>
                </div>
              ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">টিকিট</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ব্যবহারকারী</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্যাটেগরি</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অগ্রাধিকার</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থা</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">তারিখ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                            <div className="text-sm font-medium text-gray-900">
                              #{ticket.id?.substring(0, 8)} - {ticket.title}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {ticket.description}
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ticket.userName || 'অজানা'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {ticket.userType || 'N/A'}
                            </div>
                            {ticket.userEmail && (
                              <div className="text-xs text-gray-400">
                                {ticket.userEmail}
                              </div>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getCategoryText(ticket.category)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            getPriorityText(ticket.priority) === 'উচ্চ' || ticket.priority === 'high' 
                              ? 'bg-red-100 text-red-800' : 
                            getPriorityText(ticket.priority) === 'মাঝারি' || ticket.priority === 'medium' 
                              ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                          }`}>
                            {getPriorityText(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            getStatusText(ticket.status) === 'খোলা' || ticket.status === 'open' 
                              ? 'bg-red-100 text-red-800' : 
                            getStatusText(ticket.status) === 'প্রক্রিয়াধীন' || ticket.status === 'in_progress' 
                              ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                          }`}>
                            {getStatusText(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(ticket.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}

export default SupportPage;
