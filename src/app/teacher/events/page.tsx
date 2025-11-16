'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import TeacherLayout from '@/components/TeacherLayout';
import { eventQueries, Event } from '@/lib/database-queries';
import { SCHOOL_ID } from '@/lib/constants';
import { 
  Calendar, 
  CalendarDays, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Search,
  Loader2,
  RefreshCw,
  Grid3x3,
  List
} from 'lucide-react';

function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    category: 'অন্যান্য' as Event['category'],
    status: 'পরিকল্পনা' as Event['status'],
    organizer: '',
    participants: '',
    isPublic: true,
    targetAudience: 'all' as Event['targetAudience']
  });
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

  // Set up real-time listener for events
  useEffect(() => {
    if (!user || !schoolId) return;

    console.log('Setting up real-time listener for events...');
    
    // Initial load
    const loadEvents = async () => {
      try {
        setLoading(true);
        const eventsData = await eventQueries.getAllEvents(schoolId);
        setEvents(eventsData);
        console.log('Loaded events:', eventsData.length);
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();

    // Set up real-time listener
    const unsubscribe = eventQueries.subscribeToEvents(
      schoolId,
      (eventsData) => {
        console.log('Real-time events update:', eventsData.length);
        setEvents(eventsData);
        setLoading(false);
      }
    );

    return () => {
      console.log('Unsubscribing from events listener');
      unsubscribe();
    };
  }, [user, schoolId]);

  // Get status display text
  const getStatusText = (status: string | undefined) => {
    if (!status) return 'পরিকল্পনা';
    const statusMap: { [key: string]: string } = {
      'ongoing': 'আসছে',
      'completed': 'সম্পন্ন',
      'planning': 'পরিকল্পনা',
      'cancelled': 'বাতিল',
      'আসছে': 'আসছে',
      'সম্পন্ন': 'সম্পন্ন',
      'পরিকল্পনা': 'পরিকল্পনা',
      'বাতিল': 'বাতিল'
    };
    return statusMap[status] || status;
  };

  // Get category display text
  const getCategoryText = (category: string | undefined) => {
    if (!category) return 'অন্যান্য';
    const categoryMap: { [key: string]: string } = {
      'sports': 'ক্রীড়া',
      'education': 'শিক্ষা',
      'meeting': 'সভা',
      'cultural': 'সাংস্কৃতিক',
      'field_trip': 'শিক্ষা সফর',
      'other': 'অন্যান্য',
      'ক্রীড়া': 'ক্রীড়া',
      'শিক্ষা': 'শিক্ষা',
      'সভা': 'সভা',
      'সাংস্কৃতিক': 'সাংস্কৃতিক',
      'শিক্ষা সফর': 'শিক্ষা সফর',
      'অন্যান্য': 'অন্যান্য'
    };
    return categoryMap[category] || category;
  };

  // Format date for display
  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return date;
      return dateObj.toLocaleDateString('bn-BD', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (error) {
      return date;
    }
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        event.title?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.organizer?.toLowerCase().includes(query) ||
        getCategoryText(event.category).toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const eventStatus = getStatusText(event.status);
      if (statusFilter === 'upcoming' && eventStatus !== 'আসছে') return false;
      if (statusFilter === 'completed' && eventStatus !== 'সম্পন্ন') return false;
      if (statusFilter === 'planning' && eventStatus !== 'পরিকল্পনা') return false;
    }

    return true;
  });

  // Calculate stats
  const eventStats = {
    total: events.length,
    upcoming: events.filter(e => {
      const status = getStatusText(e.status);
      return status === 'আসছে' || e.status === 'ongoing';
    }).length,
    completed: events.filter(e => {
      const status = getStatusText(e.status);
      return status === 'সম্পন্ন' || e.status === 'completed';
    }).length,
    planning: events.filter(e => {
      const status = getStatusText(e.status);
      return status === 'পরিকল্পনা' || e.status === 'planning';
    }).length
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEventForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setEventForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle form submission
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventForm.title.trim() || !eventForm.description.trim() || !eventForm.date) {
      alert('শিরোনাম, বিবরণ এবং তারিখ প্রয়োজন');
      return;
    }

    setIsSubmitting(true);
    try {
      // Format time
      let timeDisplay = '';
      if (eventForm.startTime && eventForm.endTime) {
        timeDisplay = `${eventForm.startTime} - ${eventForm.endTime}`;
      } else if (eventForm.startTime) {
        timeDisplay = eventForm.startTime;
      }

      const newEvent: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        date: eventForm.date,
        startTime: eventForm.startTime || undefined,
        endTime: eventForm.endTime || undefined,
        time: timeDisplay || undefined,
        location: eventForm.location.trim() || undefined,
        category: eventForm.category,
        status: eventForm.status,
        organizer: eventForm.organizer.trim() || undefined,
        participants: eventForm.participants ? parseInt(eventForm.participants) : undefined,
        isPublic: eventForm.isPublic,
        targetAudience: eventForm.targetAudience,
        schoolId: schoolId,
        createdBy: user?.email || user?.uid || 'admin'
      };

      await eventQueries.createEvent(newEvent);
      
      // Reset form
      setEventForm({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        category: 'অন্যান্য',
        status: 'পরিকল্পনা',
        organizer: '',
        participants: '',
        isPublic: true,
        targetAudience: 'all'
      });
      
      setShowCreateModal(false);
      alert('ইভেন্ট সফলভাবে তৈরি হয়েছে!');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('ইভেন্ট তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && events.length === 0) {
    return (
      <ProtectedRoute requireAuth={true}>
        <TeacherLayout title="ইভেন্ট ব্যবস্থাপনা" subtitle="স্কুলের সকল ইভেন্ট ও অনুষ্ঠান পরিচালনা করুন">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </TeacherLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <TeacherLayout title="ইভেন্ট ব্যবস্থাপনা" subtitle="স্কুলের সকল ইভেন্ট ও অনুষ্ঠান পরিচালনা করুন">
        {/* Event Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">মোট ইভেন্ট</p>
                <p className="text-2xl font-bold text-gray-900">{eventStats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">আসছে</p>
                <p className="text-2xl font-bold text-green-600">{eventStats.upcoming}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">সম্পন্ন</p>
                <p className="text-2xl font-bold text-blue-600">{eventStats.completed}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">পরিকল্পনা</p>
                <p className="text-2xl font-bold text-orange-600">{eventStats.planning}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ইভেন্ট তালিকা</h2>
            <p className="text-gray-600">মোট {events.length} টি ইভেন্ট</p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                const loadEvents = async () => {
                  setLoading(true);
                  try {
                    const eventsData = await eventQueries.getAllEvents(schoolId);
                    setEvents(eventsData);
                  } catch (error) {
                    console.error('Error refreshing events:', error);
                  } finally {
                    setLoading(false);
                  }
                };
                loadEvents();
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
                placeholder="ইভেন্ট খুঁজুন..." 
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
              <option value="upcoming">আসছে</option>
              <option value="completed">সম্পন্ন</option>
              <option value="planning">পরিকল্পনা</option>
            </select>
            <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="গ্রিড ভিউ"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="লিস্ট ভিউ"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Events Display */}
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো ইভেন্ট পাওয়া যায়নি</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' 
                ? 'আপনার অনুসন্ধানের সাথে মিলে যায় এমন কোনো ইভেন্ট নেই' 
                : 'এখনও কোনো ইভেন্ট যোগ করা হয়নি'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    getStatusText(event.status) === 'আসছে' || event.status === 'ongoing'
                      ? 'bg-green-100 text-green-800' 
                      : getStatusText(event.status) === 'সম্পন্ন' || event.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : getStatusText(event.status) === 'পরিকল্পনা' || event.status === 'planning'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusText(event.status)}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {getCategoryText(event.category)}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarDays className="w-4 h-4 mr-2 text-blue-500" />
                    {formatDate(event.date)}
                  </div>
                  {event.time && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2 text-green-500" />
                      {event.time}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 text-red-500" />
                      {event.location}
                    </div>
                  )}
                  {event.participants !== undefined && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2 text-purple-500" />
                      {event.participants} জন অংশগ্রহণকারী
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  {event.organizer && (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">আয়োজক:</span>
                      <span className="text-sm font-medium text-gray-900">{event.organizer}</span>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-100 flex items-center justify-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>দেখুন</span>
                    </button>
                    <button className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm hover:bg-green-100 flex items-center justify-center space-x-1">
                      <Edit className="w-4 h-4" />
                      <span>সম্পাদনা</span>
                    </button>
                    <button 
                      onClick={async () => {
                        if (event.id && confirm('আপনি কি এই ইভেন্টটি মুছে ফেলতে চান?')) {
                          try {
                            await eventQueries.deleteEvent(event.id);
                          } catch (error) {
                            console.error('Error deleting event:', error);
                            alert('ইভেন্ট মুছে ফেলতে সমস্যা হয়েছে');
                          }
                        }
                      }}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ইভেন্ট</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">তারিখ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">সময়</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থান</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ক্যাটেগরি</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">অবস্থা</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">{event.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(event.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.time || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getCategoryText(event.category)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getStatusText(event.status) === 'আসছে' || event.status === 'ongoing'
                            ? 'bg-green-100 text-green-800' 
                            : getStatusText(event.status) === 'সম্পন্ন' || event.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : getStatusText(event.status) === 'পরিকল্পনা' || event.status === 'planning'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getStatusText(event.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (event.id && confirm('আপনি কি এই ইভেন্টটি মুছে ফেলতে চান?')) {
                                try {
                                  await eventQueries.deleteEvent(event.id);
                                } catch (error) {
                                  console.error('Error deleting event:', error);
                                  alert('ইভেন্ট মুছে ফেলতে সমস্যা হয়েছে');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">নতুন ইভেন্ট তৈরি করুন</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    শিরোনাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={eventForm.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ইভেন্টের শিরোনাম"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    বিবরণ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={eventForm.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ইভেন্টের বিস্তারিত বিবরণ"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      তারিখ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={eventForm.date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ক্যাটেগরি <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={eventForm.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ক্রীড়া">ক্রীড়া</option>
                      <option value="শিক্ষা">শিক্ষা</option>
                      <option value="সভা">সভা</option>
                      <option value="সাংস্কৃতিক">সাংস্কৃতিক</option>
                      <option value="শিক্ষা সফর">শিক্ষা সফর</option>
                      <option value="অন্যান্য">অন্যান্য</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      শুরুর সময়
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={eventForm.startTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      শেষের সময়
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={eventForm.endTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      অবস্থান
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={eventForm.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ইভেন্টের অবস্থান"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      অবস্থা
                    </label>
                    <select
                      name="status"
                      value={eventForm.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="পরিকল্পনা">পরিকল্পনা</option>
                      <option value="আসছে">আসছে</option>
                      <option value="সম্পন্ন">সম্পন্ন</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      আয়োজক
                    </label>
                    <input
                      type="text"
                      name="organizer"
                      value={eventForm.organizer}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="আয়োজকের নাম"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      অংশগ্রহণকারী সংখ্যা
                    </label>
                    <input
                      type="number"
                      name="participants"
                      value={eventForm.participants}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="অংশগ্রহণকারী সংখ্যা"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      লক্ষ্য শ্রোতা
                    </label>
                    <select
                      name="targetAudience"
                      value={eventForm.targetAudience}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">সকল</option>
                      <option value="students">শিক্ষার্থী</option>
                      <option value="teachers">শিক্ষক</option>
                      <option value="parents">অভিভাবক</option>
                      <option value="staff">স্টাফ</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isPublic"
                        checked={eventForm.isPublic}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">পাবলিক ইভেন্ট (সকলের জন্য দৃশ্যমান)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEventForm({
                        title: '',
                        description: '',
                        date: '',
                        startTime: '',
                        endTime: '',
                        location: '',
                        category: 'অন্যান্য',
                        status: 'পরিকল্পনা',
                        organizer: '',
                        participants: '',
                        isPublic: true,
                        targetAudience: 'all'
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>তৈরি হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>ইভেন্ট তৈরি করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </TeacherLayout>
    </ProtectedRoute>
  );
}

export default EventsPage;
