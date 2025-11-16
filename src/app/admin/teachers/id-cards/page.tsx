'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { teacherQueries, User as TeacherUser, settingsQueries } from '@/lib/database-queries';
import { QRUtils } from '@/lib/qr-utils';
import {
  Home,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  GraduationCap,
  Building,
  CreditCard,
  TrendingUp,
  Search,
  Bell,
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  QrCode,
  Camera,
  CameraOff,
  RefreshCw,
  AlertCircle,
  Save,
  IdCard,
  ArrowLeft,
  Printer,
  Filter,
  Globe,
  FileText,
  BookOpen as BookOpenIcon,
  Award,
  MessageSquare,
  Gift,
  Sparkles,
  Users as UsersIcon
} from 'lucide-react';

function TeacherIdCardsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherUser[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());
  const [loadingQRCodes, setLoadingQRCodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const [schoolId, setSchoolId] = useState('102330');
  const [schoolName, setSchoolName] = useState('ইকরা নূরানী একাডেমি');
  const router = useRouter();
  const { userData } = useAuth();

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadTeachers();
        loadSchoolSettings();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadSchoolSettings = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      if (settings) {
        if (settings.schoolCode) {
          setSchoolId(settings.schoolCode);
        }
        if (settings.schoolName) {
          setSchoolName(settings.schoolName);
        }
      }
    } catch (error) {
      console.error('Error loading school settings:', error);
    }
  };

  useEffect(() => {
    filterTeachers();
  }, [teachers, selectedSubject, searchTerm]);

  const loadTeachers = async () => {
    if (!user) return;

    try {
      setError('');
      const teachersData = await teacherQueries.getAllTeachers();
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading teachers:', error);
      setError('শিক্ষক লোড করতে সমস্যা হয়েছে');
    }
  };

  const filterTeachers = () => {
    let filtered = teachers;

    // Filter by subject
    if (selectedSubject) {
      filtered = filtered.filter(teacher => teacher.subject === selectedSubject);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(teacher =>
        (teacher.displayName || teacher.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTeachers(filtered);
  };

  const generateQRCode = async (teacher: TeacherUser) => {
    if (qrCodes.has(teacher.uid)) return;

    setLoadingQRCodes(prev => new Set([...prev, teacher.uid]));

    try {
      const { qrCode } = await QRUtils.generateTeacherQR(
        teacher.uid,
        schoolId,
        schoolName,
        teacher.subject || 'Teacher'
      );
      setQrCodes(prev => new Map(prev.set(teacher.uid, qrCode)));
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoadingQRCodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(teacher.uid);
        return newSet;
      });
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

  const printIdCards = () => {
    window.print();
  };

  const getUniqueSubjects = () => {
    const subjects = teachers.map(teacher => teacher.subject).filter(Boolean);
    return [...new Set(subjects)];
  };

  const downloadAllQRCodes = async () => {
    if (qrCodes.size === 0) {
      setError('প্রথমে সকল শিক্ষকের QR কোড তৈরি করুন');
      return;
    }

    try {
      const downloadPromises = Array.from(qrCodes.entries()).map(async ([teacherId, qrCodeDataUrl]) => {
        const teacher = teachers.find(t => t.uid === teacherId);
        if (!teacher) return;

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            downloadQRCode(qrCodeDataUrl, teacher);
            resolve();
          }, Math.random() * 1000);
        });
      });

      await Promise.all(downloadPromises);

      setError('');
      alert(`সকল ${qrCodes.size} টি QR কোড ডাউনলোড করা হয়েছে!`);
    } catch (error) {
      console.error('Error downloading all QR codes:', error);
      setError('সকল QR কোড ডাউনলোড করতে সমস্যা হয়েছে');
    }
  };

  const downloadQRCode = (qrCodeDataUrl: string, teacher: TeacherUser) => {
    try {
      let base64Data = qrCodeDataUrl;
      if (qrCodeDataUrl.startsWith('data:image')) {
        base64Data = qrCodeDataUrl.split(',')[1];
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      const teacherName = (teacher.displayName || teacher.name || 'Teacher')
        .replace(/[^a-zA-Z0-9\u0980-\u09FF\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 20);

      const subject = teacher.subject || 'Unknown';
      const timestamp = new Date().toISOString().slice(0, 10);

      const filename = `Teacher_QR_${teacherName}_${subject}_${timestamp}.png`;

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);

      console.log(`QR Code downloaded: ${filename}`);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      window.open(qrCodeDataUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'ড্যাশবোর্ড', href: '/admin/dashboard', active: false },
    { icon: Users, label: 'শিক্ষার্থী', href: '/admin/students', active: false },
    { icon: GraduationCap, label: 'শিক্ষক', href: '/admin/teachers', active: true },
    { icon: Building, label: 'অভিভাবক', href: '/admin/parents', active: false },
    { icon: BookOpen, label: 'ক্লাস', href: '/admin/classes', active: false },
    { icon: BookOpenIcon, label: 'বিষয়', href: '/admin/subjects', active: false },
    { icon: FileText, label: 'বাড়ির কাজ', href: '/admin/homework', active: false },
    { icon: ClipboardList, label: 'উপস্থিতি', href: '/admin/attendance', active: false },
    { icon: Award, label: 'পরীক্ষা', href: '/admin/exams', active: false },
    { icon: Bell, label: 'নোটিশ', href: '/admin/notice', active: false },
    { icon: Calendar, label: 'ইভেন্ট', href: '/admin/events', active: false },
    { icon: MessageSquare, label: 'বার্তা', href: '/admin/message', active: false },
    { icon: AlertCircle, label: 'অভিযোগ', href: '/admin/complaint', active: false },
    { icon: CreditCard, label: 'হিসাব', href: '/admin/accounting', active: false },
    { icon: Gift, label: 'Donation', href: '/admin/donation', active: false },
    { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', active: false },
    { icon: Sparkles, label: 'Generate', href: '/admin/generate', active: false },
    { icon: UsersIcon, label: 'সাপোর্ট', href: '/admin/support', active: false },
    { icon: Globe, label: 'পাবলিক পেজ', href: '/admin/public-pages-control', active: false },
    { icon: Settings, label: 'সেটিংস', href: '/admin/settings', active: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-800 p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">ই</span>
            </div>
            <span className={`text-lg font-bold text-gray-900 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'}`}>
              সুপার অ্যাডমিন
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`text-gray-500 hover:text-gray-700 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </a>
          ))}

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-6 py-2 mt-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            লগআউট
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center h-full">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <button
                  onClick={() => router.back()}
                  className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-1" />
                  ফিরে যান
                </button>
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight">শিক্ষক আইডি কার্ড</h1>
                  <p className="text-sm text-gray-600 leading-tight">সকল শিক্ষকের আইডি কার্ড তৈরি করুন</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full">
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
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">খুঁজুন</label>
                <input
                  type="text"
                  placeholder="নাম বা বিষয় দিয়ে খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">বিষয় ফিল্টার</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">সকল বিষয়</option>
                  {getUniqueSubjects().map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={loadTeachers}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>রিফ্রেশ</span>
                </button>
                <button
                  onClick={printIdCards}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন</span>
                </button>
                {qrCodes.size > 0 && (
                  <button
                    onClick={downloadAllQRCodes}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>সকল QR ডাউনলোড</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ID Cards with Front and Back Sides */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <div key={teacher.uid} className="flex flex-col items-center space-y-4">
                {/* Front Side */}
                <div
                  className="bg-white border-2 border-gray-300 overflow-hidden relative print:shadow-none"
                  style={{
                    width: '240px',
                    height: '380px',
                    fontFamily: 'SolaimanLipi, Arial, sans-serif'
                  }}
                >
                  {/* Header */}
                  <div className="p-3 text-center bg-white">
                    <h2 className="font-bold text-lg text-blue-900 leading-tight mb-1">
                      আমার স্কুল নুরানী একাডেমী
                    </h2>
                    <p className="text-xs text-gray-700 leading-tight mb-1">
                      চান্দাইকোনা, রায়গঞ্জ, সিরাজগঞ্জ
                    </p>
                    <p className="text-xs text-gray-700 mb-2">স্থাপিতঃ ২০১৮ ঈঃ</p>
                    <div className="border-t border-blue-300 pt-2">
                      <h3 className="text-blue-800 font-bold text-sm">শিক্ষক আইডি কার্ড</h3>
                    </div>
                  </div>

                  {/* Photo Circle */}
                  <div className="flex justify-center mt-2 mb-2">
                    <div className="w-20 h-20 border-2 border-blue-400 rounded-full flex items-center justify-center bg-gray-50 overflow-hidden">
                      {teacher.profileImage ? (
                        <img
                          src={teacher.profileImage}
                          alt={teacher.displayName || 'Teacher'}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-blue-600 font-bold text-2xl">
                          {(teacher.displayName || teacher.name || 'T').charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teacher Name */}
                  <div className="text-center mb-3 px-4">
                    <h4 className="font-bold text-base text-gray-900 leading-tight">
                      {teacher.displayName || teacher.name || 'শিক্ষকের নাম'}
                    </h4>
                  </div>

                  {/* Teacher Details */}
                  <div className="px-4 space-y-1 text-sm mb-4" style={{fontFamily: 'SolaimanLipi, Arial, sans-serif'}}>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-20 flex-shrink-0">বিষয়</span>
                      <span className="text-gray-600 mr-1">:</span>
                      <span className="font-medium flex-1" style={{wordBreak: 'keep-all', overflowWrap: 'normal'}}>{teacher.subject || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-20 flex-shrink-0">যোগ্যতা</span>
                      <span className="text-gray-600 mr-1">:</span>
                      <span className="font-medium flex-1" style={{wordBreak: 'keep-all', overflowWrap: 'normal'}}>{teacher.qualification || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-20 flex-shrink-0">অভিজ্ঞতা</span>
                      <span className="text-gray-600 mr-1">:</span>
                      <span className="font-medium flex-1" style={{wordBreak: 'keep-all', overflowWrap: 'normal'}}>{teacher.experience || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-20 flex-shrink-0">মোবাইল</span>
                      <span className="text-gray-600 mr-1">:</span>
                      <span className="font-medium flex-1" style={{wordBreak: 'keep-all', overflowWrap: 'normal'}}>
                        {teacher.phoneNumber || teacher.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-20 flex-shrink-0">ইমেইল</span>
                      <span className="text-gray-600 mr-1">:</span>
                      <span className="font-medium flex-1 text-xs" style={{wordBreak: 'break-all', overflowWrap: 'break-word'}}>
                        {teacher.email || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-blue-800 text-white text-center py-2 absolute bottom-0 left-0 right-0">
                    <div className="flex justify-between items-center px-4 text-xs">
                      <span className="font-bold">পরিচালক</span>
                      <span className="font-bold">০১৭১৫-৬৭৬৫৫০৭</span>
                    </div>
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className="bg-white border-2 border-gray-300 overflow-hidden relative print:shadow-none"
                  style={{
                    width: '240px',
                    height: '380px',
                    fontFamily: 'SolaimanLipi, Arial, sans-serif'
                  }}
                >
                  {/* School Information Header */}
                  <div className="p-3 text-center bg-white">
                    <h2 className="font-bold text-base text-blue-900 leading-tight mb-1">
                      আমার স্কুল নুরানী একাডেমী
                    </h2>
                    <p className="text-xs text-gray-700 leading-tight mb-1">
                      চান্দাইকোনা, রায়গঞ্জ, সিরাজগঞ্জ
                    </p>
                    <p className="text-xs text-gray-700 mb-2">স্থাপিতঃ ২০১৮ ঈঃ</p>
                  </div>

                  {/* QR Code Label */}
                  <div className="text-center mb-2">
                    <p className="text-sm font-medium text-gray-700" style={{fontFamily: 'SolaimanLipi, Arial, sans-serif'}}>
                      শিক্ষকের তথ্য যাচাইয়ের জন্য স্ক্যান করুন
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Scan for Teacher Verification</p>
                  </div>

                  {/* Large QR Code Section */}
                  <div className="flex justify-center my-4">
                    <div className="w-40 h-40 bg-gray-50 border-2 border-gray-300 rounded-lg flex items-center justify-center relative group">
                      {loadingQRCodes.has(teacher.uid) ? (
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      ) : qrCodes.has(teacher.uid) ? (
                        <div className="relative">
                          <img
                            src={qrCodes.get(teacher.uid)}
                            alt="QR Code"
                            className="w-full h-full object-contain cursor-pointer"
                            onClick={() => downloadQRCode(qrCodes.get(teacher.uid)!, teacher)}
                            title="Click to download QR Code"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-black bg-opacity-50 rounded-full p-2">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l4-4m-4 4l-4-4m8 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => generateQRCode(teacher)}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-base hover:bg-blue-700"
                        >
                          Generate QR
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-blue-800 text-white text-center py-2 absolute bottom-0 left-0 right-0">
                    <div className="flex justify-between items-center px-4 text-xs">
                      <span className="font-bold">পরিচালক</span>
                      <span className="font-bold">০১৭১৫-৬৭৬৫৫০৭</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredTeachers.length === 0 && (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {teachers.length === 0 ? 'কোন শিক্ষক নেই' : 'কোন শিক্ষক পাওয়া যায়নি'}
              </h3>
              <p className="text-gray-600">
                {teachers.length === 0
                  ? 'প্রথমে কিছু শিক্ষক যোগ করুন'
                  : 'আপনার অনুসন্ধান বা ফিল্টার পরিবর্তন করুন'
                }
              </p>
            </div>
          )}

          {/* Print Styles */}
          <style jsx global>{`
            @media print {
              .print\\:hidden { display: none !important; }
              .print\\:shadow-none { box-shadow: none !important; }
              .print\\:border-2 { border-width: 2px !important; }
              body {
                background: white !important;
                margin: 0;
                padding: 10mm;
              }
              .min-h-screen { min-height: auto !important; }
              .grid { display: grid !important; }
              .grid-cols-1 { grid-template-columns: repeat(1, 1fr) !important; }
              @page {
                size: A4;
                margin: 10mm;
              }
              .bg-gradient-to-r { background: linear-gradient(to right, #2563eb, #9333ea) !important; }
              .bg-gradient-to-br { background: linear-gradient(to bottom right, #3b82f6, #8b5cf6) !important; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

export default function TeacherIdCardsPageWrapper() {
  return (
    <ProtectedRoute requireAuth={true}>
      <TeacherIdCardsPage />
    </ProtectedRoute>
  );
}
