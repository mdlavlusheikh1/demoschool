'use client';

import { useState, useEffect, useCallback } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { eventQueries } from '@/lib/database-queries';
import { Calendar, MapPin, Clock, Users, Bell, Loader2 } from 'lucide-react';

// Helper function to convert numbers to Bengali numerals
const toBengaliNumerals = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '০';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const formatted = num.toLocaleString('en-US');
  return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

// Helper function to format date
const formatDate = (date: string | Date): string => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
};

// Helper function to format date range
const formatDateRange = (startDate: string | Date, endDate?: string | Date): string => {
  if (!startDate) return '';
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    if (endDate) {
      const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    return formatDate(start);
  } catch {
    return '';
  }
};

function EventsPage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load events from Firebase
      const events = await eventQueries.getAllEvents(SCHOOL_ID);
      const now = new Date();
      
      // Separate upcoming and past events
      const upcoming: any[] = [];
      const past: any[] = [];
      
      events.forEach(event => {
        try {
          const eventDate = new Date(event.date);
          const isUpcoming = eventDate >= now && event.status !== 'completed' && event.status !== 'সম্পন্ন';
          
          if (isUpcoming) {
            upcoming.push(event);
          } else {
            past.push(event);
          }
        } catch (error) {
          console.error('Error processing event date:', error);
        }
      });

      // Sort upcoming events by date (ascending)
      upcoming.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });

      // Sort past events by date (descending)
      past.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      setUpcomingEvents(upcoming.slice(0, 10)); // Show latest 10 upcoming
      setPastEvents(past.slice(0, 5)); // Show latest 5 past events

    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Calculate days until event
  const getDaysUntil = (date: string | Date): number => {
    try {
      const eventDate = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffTime = eventDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  // Get event color based on category
  const getEventColor = (category: string, daysUntil: number) => {
    if (daysUntil <= 7) {
      return {
        bg: 'from-red-50 to-red-100',
        border: 'border-red-200',
        icon: 'bg-red-600',
        badge: 'bg-red-600'
      };
    }
    
    switch (category) {
      case 'শিক্ষা':
      case 'education':
        return {
          bg: 'from-blue-50 to-blue-100',
          border: 'border-blue-200',
          icon: 'bg-blue-600',
          badge: 'bg-blue-600'
        };
      case 'ক্রীড়া':
      case 'sports':
        return {
          bg: 'from-green-50 to-green-100',
          border: 'border-green-200',
          icon: 'bg-green-600',
          badge: 'bg-green-600'
        };
      case 'সাংস্কৃতিক':
      case 'cultural':
        return {
          bg: 'from-purple-50 to-purple-100',
          border: 'border-purple-200',
          icon: 'bg-purple-600',
          badge: 'bg-purple-600'
        };
      default:
        return {
          bg: 'from-gray-50 to-gray-100',
          border: 'border-gray-200',
          icon: 'bg-gray-600',
          badge: 'bg-gray-600'
        };
    }
  };

  if (loading) {
    return (
      <ParentLayout title="ইভেন্ট ও সময়সূচী" subtitle="আসন্ন ইভেন্ট এবং গুরুত্বপূর্ণ তারিখ">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout title="ইভেন্ট ও সময়সূচী" subtitle="আসন্ন ইভেন্ট এবং গুরুত্বপূর্ণ তারিখ">
      {/* Upcoming Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">আসন্ন ইভেন্ট</h2>
        </div>
        
        <div className="p-6">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">কোন আসন্ন ইভেন্ট নেই</p>
              <p className="text-sm mt-1">এই মুহূর্তে কোনো আসন্ন ইভেন্ট নেই</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => {
                const daysUntil = getDaysUntil(event.date);
                const colors = getEventColor(event.category || '', daysUntil);
                const eventDate = new Date(event.date);
                
                return (
                  <div key={event.id} className={`p-4 bg-gradient-to-r ${colors.bg} border ${colors.border} rounded-lg`}>
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${colors.icon} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                        )}
                        <div className="flex items-center text-sm text-gray-600 mt-2">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>
                            {event.startTime && event.endTime 
                              ? `${formatDate(event.date)}, ${event.startTime} - ${event.endTime}`
                              : event.time
                              ? `${formatDate(event.date)}, ${event.time}`
                              : formatDate(event.date)
                            }
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.participants && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Users className="w-4 h-4 mr-1" />
                            <span>{toBengaliNumerals(event.participants)} জন অংশগ্রহণকারী</span>
                          </div>
                        )}
                      </div>
                      <span className={`px-3 py-1 ${colors.badge} text-white text-xs font-medium rounded-full flex-shrink-0`}>
                        {daysUntil <= 0 
                          ? 'আজ' 
                          : daysUntil === 1 
                          ? 'আগামীকাল'
                          : `${toBengaliNumerals(daysUntil)} দিন বাকি`
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">সম্পন্ন ইভেন্ট</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {pastEvents.map((event) => (
                <div key={event.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-600 mt-2">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    <span className="px-3 py-1 bg-gray-400 text-white text-xs font-medium rounded-full flex-shrink-0">
                      সম্পন্ন
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <EventsPage />
    </ProtectedRoute>
  );
}
