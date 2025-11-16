'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { BookOpen, Calendar, Clock, User, FileText, Download, Search, Filter, ChevronDown, ChevronUp, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { settingsQueries, SystemSettings } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp, where, limit } from 'firebase/firestore';

interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  teacher: string;
  dueDate: string;
  dueTime: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'overdue';
  attachments?: string[];
  instructions: string;
  createdAt: string;
}

const PublicHomeworkPage = () => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [filteredHomeworks, setFilteredHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedHomework, setExpandedHomework] = useState<string | null>(null);
  const [generalSettings, setGeneralSettings] = useState<SystemSettings | null>(null);

  // Load settings once (optimized for public page)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsQueries.getSettings();
        setGeneralSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Load homeworks once (optimized for public page)
  useEffect(() => {
    const loadHomeworks = async () => {
      try {
        setLoading(true);
        // Try to use optimized query with limit
        let q;
        try {
          q = query(
            collection(db, 'homeworks'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(50) // Limit to 50 most recent homeworks
          );
        } catch (e) {
          // If query fails (missing index), use simple query
          q = query(collection(db, 'homeworks'), orderBy('createdAt', 'desc'), limit(50));
        }
        
        const snapshot = await getDocs(q);
        const homeworksData: Homework[] = [];
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Only show active homeworks on public page
          if (data.status === 'active') {
            homeworksData.push({
              id: docSnap.id,
              title: data.title || '',
              description: data.description || '',
              subject: data.subject || '',
              class: data.class || '',
              teacher: data.teacherName || data.teacher || 'Unknown Teacher',
              teacherName: data.teacherName || data.teacher,
              dueDate: data.dueDate || '',
              dueTime: data.dueTime || '',
              priority: data.priority || 'medium',
              status: 'pending', // For display purposes on public page
              attachments: data.attachments || [],
              instructions: data.instructions || '',
              createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            });
          }
        });

        setHomeworks(homeworksData);
        setFilteredHomeworks(homeworksData);
      } catch (error) {
        console.error('Error loading homeworks:', error);
        setHomeworks([]);
        setFilteredHomeworks([]);
      } finally {
        setLoading(false);
      }
    };

    loadHomeworks();
  }, []);

  // Get unique classes and subjects from loaded homeworks dynamically
  const getUniqueValues = (key: 'class' | 'subject') => {
    const values = new Set(homeworks.map(hw => hw[key]).filter(Boolean));
    return Array.from(values).sort();
  };

  // Get unique classes and subjects from loaded homeworks dynamically
  const allClasses = ['সকল ক্লাস', ...getUniqueValues('class')];
  const allSubjects = ['সকল বিষয়', ...getUniqueValues('subject')];
  const statuses = ['সকল অবস্থা', 'pending', 'completed', 'overdue'];

  // Sample data - fallback if no data in Firebase (not used anymore, kept for reference)
  const sampleHomeworks: Homework[] = [
    {
      id: '1',
      title: 'গণিত অধ্যায় ৫: বীজগণিত',
      description: 'বীজগণিতের মৌলিক ধারণা নিয়ে সমস্যা সমাধান করুন',
      subject: 'গণিত',
      class: '১০ম শ্রেণি',
      teacher: 'মো. আব্দুল হামিদ',
      dueDate: '2024-12-25',
      dueTime: '23:59',
      priority: 'high',
      status: 'pending',
      attachments: ['assignment_5.pdf', 'examples.docx'],
      instructions: 'পৃষ্ঠা ৮০-৯৫ থেকে সমস্যা ১-২০ সমাধান করুন। সমাধানগুলো সুন্দর করে লিখুন।',
      createdAt: '2024-12-20'
    },
    {
      id: '2',
      title: 'ইংরেজি রচনা: পরিবেশ দূষণ',
      description: 'পরিবেশ দূষণের কারণ ও সমাধান নিয়ে ৩০০ শব্দের রচনা লিখুন',
      subject: 'ইংরেজি',
      class: '৯ম শ্রেণি',
      teacher: 'মিসেস রোকসানা খান',
      dueDate: '2024-12-28',
      dueTime: '12:00',
      priority: 'medium',
      status: 'pending',
      attachments: ['essay_guidelines.pdf'],
      instructions: 'রচনায় অন্তর্ভুক্ত করুন: ভূমিকা, মূল বিষয়বস্তু, উপসংহার। হস্তাক্ষর সুন্দর হতে হবে।',
      createdAt: '2024-12-21'
    },
    {
      id: '3',
      title: 'বিজ্ঞান প্রজেক্ট: সৌরজগত',
      description: 'সৌরজগতের গ্রহগুলোর মডেল তৈরি করুন',
      subject: 'বিজ্ঞান',
      class: '৮ম শ্রেণি',
      teacher: 'ড. ফাতেমা বেগম',
      dueDate: '2024-12-22',
      dueTime: '15:00',
      priority: 'high',
      status: 'overdue',
      attachments: ['project_guidelines.pdf', 'materials_list.docx'],
      instructions: 'কাগজ, রঙ, এবং অন্যান্য উপকরণ দিয়ে সৌরজগতের মডেল তৈরি করুন। প্রতিটি গ্রহের নাম লিখুন।',
      createdAt: '2024-12-18'
    },
    {
      id: '4',
      title: 'বাংলা কবিতা মুখস্থ',
      description: 'কাজী নজরুল ইসলামের "বিদ্রোহী" কবিতা মুখস্থ করুন',
      subject: 'বাংলা',
      class: '১১ম শ্রেণি',
      teacher: 'প্রফেসর আহমেদ হোসেন',
      dueDate: '2024-12-30',
      dueTime: '10:00',
      priority: 'medium',
      status: 'pending',
      attachments: ['poem_text.pdf'],
      instructions: 'কবিতাটি সুন্দর করে মুখস্থ করুন। আবৃত্তির সময় ভাব প্রকাশ করুন।',
      createdAt: '2024-12-22'
    },
    {
      id: '5',
      title: 'ইতিহাস রিপোর্ট: মুক্তিযুদ্ধ',
      description: '১৯৭১ সালের মুক্তিযুদ্ধ নিয়ে সংক্ষিপ্ত রিপোর্ট লিখুন',
      subject: 'ইতিহাস',
      class: '১০ম শ্রেণি',
      teacher: 'মো. রফিকুল ইসলাম',
      dueDate: '2024-12-26',
      dueTime: '14:00',
      priority: 'low',
      status: 'completed',
      attachments: ['reference_books.pdf'],
      instructions: 'রিপোর্টে অন্তর্ভুক্ত করুন: মুক্তিযুদ্ধের কারণ, ঘটনাবলি, ফলাফল। ৫০০ শব্দের মধ্যে লিখুন।',
      createdAt: '2024-12-19'
    }
  ];

  useEffect(() => {
    try {
      let filtered = homeworks || [];

      // Search filter
      if (searchTerm) {
        filtered = filtered.filter(hw => 
          hw?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          hw?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          hw?.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          hw?.teacher?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Class filter
      if (selectedClass && selectedClass !== 'সকল ক্লাস') {
        filtered = filtered.filter(hw => hw?.class === selectedClass);
      }

      // Subject filter
      if (selectedSubject && selectedSubject !== 'সকল বিষয়') {
        filtered = filtered.filter(hw => hw?.subject === selectedSubject);
      }

      // Status filter
      if (selectedStatus && selectedStatus !== 'সকল অবস্থা') {
        filtered = filtered.filter(hw => hw?.status === selectedStatus);
      }

      // Sort
      filtered.sort((a, b) => {
        try {
          let aValue, bValue;
          
          switch (sortBy) {
            case 'dueDate':
              aValue = new Date(a?.dueDate || '').getTime();
              bValue = new Date(b?.dueDate || '').getTime();
              break;
            case 'priority':
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              aValue = priorityOrder[a?.priority as keyof typeof priorityOrder] || 0;
              bValue = priorityOrder[b?.priority as keyof typeof priorityOrder] || 0;
              break;
            case 'createdAt':
              aValue = new Date(a?.createdAt || '').getTime();
              bValue = new Date(b?.createdAt || '').getTime();
              break;
            default:
              aValue = 0;
              bValue = 0;
          }

          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        } catch (error) {
          console.error('Error sorting homeworks:', error);
          return 0;
        }
      });

      setFilteredHomeworks(filtered);
    } catch (error) {
      console.error('Error filtering homeworks:', error);
      setFilteredHomeworks([]);
    }
  }, [homeworks, searchTerm, selectedClass, selectedSubject, selectedStatus, sortBy, sortOrder]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'সম্পন্ন';
      case 'overdue': return 'মেয়াদ উত্তীর্ণ';
      case 'pending': return 'অপেক্ষমান';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'তারিখ নেই';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'অবৈধ তারিখ';
      return date.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'তারিখ ফরম্যাট করতে ত্রুটি';
    }
  };

  const isOverdue = (dueDate: string, dueTime: string) => {
    try {
      if (!dueDate || !dueTime) return false;
      const now = new Date();
      const due = new Date(`${dueDate}T${dueTime}`);
      return now > due;
    } catch (error) {
      console.error('Error checking overdue:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">বাড়ির কাজ লোড হচ্ছে...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">বাড়ির কাজ</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              আপনার সন্তানের বাড়ির কাজগুলো এখানে দেখুন এবং সম্পন্ন করুন
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="বাড়ির কাজ খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {allClasses.map((cls) => (
                  <option key={cls} value={cls === 'সকল ক্লাস' ? '' : cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {allSubjects.map((subject) => (
                  <option key={subject} value={subject === 'সকল বিষয়' ? '' : subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statuses.map((status) => (
                  <option key={status} value={status === 'সকল অবস্থা' ? '' : status}>
                    {status === 'সকল অবস্থা' ? status : getStatusText(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Options */}
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <span className="text-sm text-gray-600">সাজান:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dueDate">মেয়াদ অনুযায়ী</option>
              <option value="priority">অগ্রাধিকার অনুযায়ী</option>
              <option value="createdAt">তৈরি তারিখ অনুযায়ী</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="text-sm">{sortOrder === 'asc' ? 'আরোহী' : 'অবরোহী'}</span>
              {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredHomeworks.length}টি বাড়ির কাজ পাওয়া গেছে
          </p>
        </div>

        {/* Homework List */}
        <div className="space-y-6">
          {filteredHomeworks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">কোন বাড়ির কাজ পাওয়া যায়নি</h3>
              <p className="text-gray-600">আপনার অনুসন্ধানের সাথে মিলে যায় এমন কোন বাড়ির কাজ নেই</p>
            </div>
          ) : (
            filteredHomeworks.map((homework) => (
              <div key={homework.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{homework.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(homework.priority)}`}>
                          {homework.priority === 'high' ? 'উচ্চ' : homework.priority === 'medium' ? 'মধ্যম' : 'নিম্ন'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(homework.status)}`}>
                          {getStatusText(homework.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{homework.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{homework.subject}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{homework.teacher}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(homework.dueDate)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{homework.dueTime}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedHomework(expandedHomework === homework.id ? null : homework.id)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedHomework === homework.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedHomework === homework.id && (
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            নির্দেশাবলী
                          </h4>
                          <p className="text-gray-700 leading-relaxed">{homework.instructions}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Download className="w-4 h-4 mr-2" />
                            সংযুক্তি
                          </h4>
                          {homework.attachments && homework.attachments.length > 0 ? (
                            <div className="space-y-2">
                              {homework.attachments.map((attachment, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <span className="text-sm text-gray-700">{attachment}</span>
                                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    ডাউনলোড
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">কোন সংযুক্তি নেই</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">ই</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">{generalSettings?.schoolName || 'আমার স্কুল'}</h3>
            <p className="text-gray-400 mb-4">{generalSettings?.schoolDescription || 'ভালোবাসা দিয়ে শিক্ষা, ইসলামিক মূল্যবোধে জীবন গড়া'}</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>📞 {generalSettings?.schoolPhone || '+৮৮০ ১৭১১ ২৩৪৫৬৭'}</span>
              <span>✉️ {generalSettings?.schoolEmail || 'info@iqraschool.edu'}</span>
              <span>📍 {generalSettings?.schoolAddress || 'ঢাকা, বাংলাদেশ'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PublicHomeworkPageWrapper() {
  return <PublicHomeworkPage />;
}
