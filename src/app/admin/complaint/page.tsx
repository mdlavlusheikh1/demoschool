'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { SCHOOL_ID } from '@/lib/constants';
import { 
  Home, Users, BookOpen, ClipboardList, Calendar, Settings, LogOut, Menu, X,
  UserCheck, GraduationCap, Building, CreditCard, TrendingUp, Search, Bell,
  Plus, AlertTriangle, MessageCircle, FileText, Clock, CheckCircle,
  Package,
  Globe,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  AlertCircle,
  BookOpen as BookOpenIcon,
  Users as UsersIcon,
  Loader2,
} from 'lucide-react';

interface Complaint {
  id: string;
  complainant?: string;
  complainantName?: string;
  complainantType?: string;
  complainantEmail?: string;
  category?: string;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  submittedDate?: string | Timestamp;
  createdAt?: Timestamp;
  assignedTo?: string;
  schoolId?: string;
  userId?: string;
}

function ComplaintPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const schoolId = SCHOOL_ID;
  const { userData } = useAuth();

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadComplaints();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Load complaints from Firestore
  const loadComplaints = async () => {
    try {
      setLoading(true);
      const complaintsRef = collection(db, 'complaints');
      
      // Try to order by createdAt, if it fails, get all without ordering
      let querySnapshot;
      try {
        const q = query(complaintsRef, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(q);
      } catch (orderError) {
        // If ordering fails (e.g., no index), just get all documents
        console.warn('Could not order by createdAt, fetching all:', orderError);
        querySnapshot = await getDocs(complaintsRef);
      }
      
      const complaintsData: Complaint[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        complaintsData.push({
          id: doc.id,
          ...data,
        } as Complaint);
      });
      
      // Sort manually by createdAt if orderBy failed
      complaintsData.sort((a, b) => {
        const dateA = a.createdAt || a.submittedDate;
        const dateB = b.createdAt || b.submittedDate;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        const timeA = dateA instanceof Timestamp ? dateA.toMillis() : new Date(dateA as string).getTime();
        const timeB = dateB instanceof Timestamp ? dateB.toMillis() : new Date(dateB as string).getTime();
        return timeB - timeA; // Descending order
      });
      
      setComplaints(complaintsData);
    } catch (error) {
      console.error('Error loading complaints:', error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: false },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Award, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: Bell, label: 'নোটিশ', href: '/admin/notice', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: true },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

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
        year: 'numeric' 
      });
    } catch (error) {
      return '-';
    }
  };

  // Filter complaints based on search
  const filteredComplaints = complaints.filter(complaint => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      complaint.complainant?.toLowerCase().includes(query) ||
      complaint.complainantName?.toLowerCase().includes(query) ||
      complaint.subject?.toLowerCase().includes(query) ||
      complaint.description?.toLowerCase().includes(query) ||
      complaint.category?.toLowerCase().includes(query)
    );
  });

  const complaintStats = {
    total: complaints.length,
    new: complaints.filter(c => c.status === 'নতুন' || c.status === 'new').length,
    inProgress: complaints.filter(c => c.status === 'প্রক্রিয়াধীন' || c.status === 'in_progress' || c.status === 'inProgress').length,
    resolved: complaints.filter(c => c.status === 'সমাধান' || c.status === 'resolved').length
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">ই</span>
            </div>
            <span className="text-lg font-bold text-gray-900">সুপার অ্যাডমিন</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {menuItems.map((item) => (
            <a key={item.label} href={item.href} className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </a>
          ))}
          <button onClick={handleLogout} className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Navigation */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 mr-4">
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">অভিযোগ ব্যবস্থাপনা</h1>
                  <p className="text-sm text-gray-600 leading-tight">সকল অভিযোগ ও সমস্যা সমাধান</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 h-full">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="অভিযোগ খুঁজুন..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10" 
                  />
                </div>
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
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
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
          {/* Complaint Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">মোট অভিযোগ</p>
                  <p className="text-2xl font-bold text-gray-900">{complaintStats.total}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">নতুন</p>
                  <p className="text-2xl font-bold text-red-600">{complaintStats.new}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">প্রক্রিয়াধীন</p>
                  <p className="text-2xl font-bold text-yellow-600">{complaintStats.inProgress}</p>
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
                  <p className="text-2xl font-bold text-green-600">{complaintStats.resolved}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Complaints List */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">সকল অভিযোগ</h3>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredComplaints.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো অভিযোগ পাওয়া যায়নি</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchQuery ? 'আপনার অনুসন্ধানের সাথে মিলে যায় এমন কোনো অভিযোগ নেই' : 'এখনও কোনো অভিযোগ জমা দেওয়া হয়নি'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredComplaints.map((complaint) => (
                      <div key={complaint.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium text-gray-900">
                                {complaint.complainant || complaint.complainantName || 'অজানা'}
                              </span>
                              {complaint.complainantType && (
                                <span className="text-sm text-gray-500">({complaint.complainantType})</span>
                              )}
                              {complaint.category && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {complaint.category}
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">
                              {complaint.subject || 'বিষয় নেই'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                              {complaint.description || 'কোনো বিবরণ নেই'}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <span className="text-xs text-gray-500">
                                  জমা: {formatDate(complaint.submittedDate || complaint.createdAt)}
                                </span>
                                {complaint.assignedTo && (
                                  <span className="text-xs text-gray-500">
                                    দায়িত্বপ্রাপ্ত: {complaint.assignedTo}
                                  </span>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                {complaint.priority && (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    complaint.priority === 'উচ্চ' || complaint.priority === 'high' ? 'bg-red-100 text-red-800' : 
                                    complaint.priority === 'মাঝারি' || complaint.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {complaint.priority}
                                  </span>
                                )}
                                {complaint.status && (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    complaint.status === 'নতুন' || complaint.status === 'new' ? 'bg-red-100 text-red-800' : 
                                    complaint.status === 'প্রক্রিয়াধীন' || complaint.status === 'in_progress' || complaint.status === 'inProgress' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {complaint.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ComplaintPage />
    </ProtectedRoute>
  );
}

