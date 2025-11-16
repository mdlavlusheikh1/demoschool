'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { Phone, Mail, MapPin, ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { settingsQueries, SystemSettings, studentQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, where, Timestamp, getDocs, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';

export default function HomePage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<Array<{
    id: number | string;
    title: string;
    subtitle: string;
    bgGradient: string;
    aiText: string;
    aiSubtext: string;
    imageUrl?: string;
    order?: number;
    isActive?: boolean;
  }>>([
    {
      id: 1,
      title: "আমার স্কুল",
      subtitle: "আধুনিক শিক্ষা ও প্রযুক্তির সমন্বয়",
      bgGradient: "from-blue-900 via-purple-900 to-teal-800",
      aiText: "AI",
      aiSubtext: "Smart Education"
    },
    {
      id: 2,
      title: "ডিজিটাল শিক্ষা ব্যবস্থা",
      subtitle: "QR কোড এবং স্মার্ট উপস্থিতি ট্র্যাকিং",
      bgGradient: "from-green-900 via-emerald-900 to-cyan-800",
      aiText: "QR",
      aiSubtext: "Attendance System"
    },
    {
      id: 3,
      title: "রিয়েল-টাইম ড্যাশবোর্ড",
      subtitle: "লাইভ মনিটরিং এবং পারফরমেন্স ট্র্যাকিং",
      bgGradient: "from-purple-900 via-pink-900 to-indigo-800",
      aiText: "DB",
      aiSubtext: "Real-time Reports"
    }
  ]);
  const [notices, setNotices] = useState<Array<{
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
    createdAt?: Timestamp;
  }>>([]);
  const [admissionContent, setAdmissionContent] = useState({
    title: 'ভর্তি চলছে সেশন ২০২৪',
    applyNow: '🎓 আবেদন করুন এখনই',
    classes: '৭ম-১০ম',
    classesLabel: 'শ্রেণী সমূহ',
    open: 'খোলা',
    openLabel: 'আবেদন প্রক্রিয়া',
    deadline: 'আবেদনের শেষ তারিখ: ৩০ ডিসেম্বর ২০২৪',
    admitNow: 'এখনই ভর্তি হন',
    officeHours: '০৮:০০ - ১৫:০০',
    contactPhone: '০১৭৮৮-৮৮৮৮',
    experience: '১৫ বছর',
    enabled: true
  });
  const [generalSettings, setGeneralSettings] = useState<SystemSettings | null>(null);
  const [topStudents, setTopStudents] = useState<Array<{
    id: string;
    name: string;
    className: string;
    achievement?: string;
    photoUrl?: string;
    isActive: boolean;
    order: number;
    studentId?: string;
    uid?: string;
    section?: string;
    group?: string;
  }>>([]);
  const [topStudentsEnabled, setTopStudentsEnabled] = useState(true);
  const [topStudentsTitle, setTopStudentsTitle] = useState('কৃতি');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [links, setLinks] = useState<Array<{
    id: string;
    title: string;
    url: string;
    isActive: boolean;
    order: number;
  }>>([]);
  const [linksEnabled, setLinksEnabled] = useState(true);
  const [linksTitle, setLinksTitle] = useState('লিঙ্ক');
  const [message, setMessage] = useState<{
    author: string;
    authorTitle: string;
    message: string;
    photoUrl?: string;
  } | null>(null);
  const [messageEnabled, setMessageEnabled] = useState(true);
  const [messageTitle, setMessageTitle] = useState('বানী');
  const [testimonials, setTestimonials] = useState<Array<{
    id: string;
    name: string;
    designation: string;
    message: string;
    photoUrl?: string;
    isActive: boolean;
    order: number;
  }>>([]);
  const [testimonialsEnabled, setTestimonialsEnabled] = useState(true);
  const [testimonialsTitle, setTestimonialsTitle] = useState('মতামত');

  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToHeroSlide = (index: number) => {
    setCurrentHeroSlide(index);
  };

  // Load notices once (optimized for public page)
  // Real-time listener for notices
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      // Real-time listener for active notices
      const noticesQuery = query(
        collection(db, 'notices'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(20) // Limit to 20 most recent notices
      );

      unsubscribe = onSnapshot(
        noticesQuery,
        (snapshot) => {
          const noticesData: Array<{
            id: string;
            title: string;
            priority: 'high' | 'medium' | 'low';
            category: string;
            expiresAt?: Timestamp;
            createdAt?: Timestamp;
          }> = [];

          const now = new Date();
          snapshot.forEach((docSnap) => {
            try {
              const data = docSnap.data();
              
              // Check if notice has expired
              let isExpired = false;
              if (data.expiresAt) {
                try {
                  const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
                  isExpired = expiresAt < now;
                } catch (e) {
                  console.warn('Error parsing expiresAt:', e);
                }
              }

              if (!isExpired) {
                noticesData.push({
                  id: docSnap.id,
                  title: data.title || '',
                  priority: (data.priority || 'medium') as 'high' | 'medium' | 'low',
                  category: data.category || 'all',
                  expiresAt: data.expiresAt,
                  createdAt: data.createdAt,
                });
              }
            } catch (error) {
              console.error('Error processing notice document:', error, docSnap.id);
            }
          });

          // Sort by priority (high first) then by date (newest first)
          noticesData.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            if (priorityDiff !== 0) return priorityDiff;
            
            try {
              const dateA = a.createdAt?.toMillis?.() || 0;
              const dateB = b.createdAt?.toMillis?.() || 0;
              return dateB - dateA;
            } catch (e) {
              return 0;
            }
          });

          setNotices(noticesData);
        },
        (error) => {
          console.error('Home page: Error in notices listener:', error);
          // If query fails (e.g., missing index), try simple query without filters
          try {
            const simpleQuery = query(collection(db, 'notices'), limit(20));
            const fallbackUnsubscribe = onSnapshot(
              simpleQuery,
              (snapshot) => {
                const noticesData: Array<{
                  id: string;
                  title: string;
                  priority: 'high' | 'medium' | 'low';
                  category: string;
                  expiresAt?: Timestamp;
                  createdAt?: Timestamp;
                }> = [];

                const now = new Date();
                snapshot.forEach((docSnap) => {
                  const data = docSnap.data();
                  if (data.status === 'active') {
                    let isExpired = false;
                    if (data.expiresAt) {
                      try {
                        const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
                        isExpired = expiresAt < now;
                      } catch (e) {
                        // Ignore errors
                      }
                    }
                    if (!isExpired) {
                      noticesData.push({
                        id: docSnap.id,
                        title: data.title || '',
                        priority: (data.priority || 'medium') as 'high' | 'medium' | 'low',
                        category: data.category || 'all',
                        expiresAt: data.expiresAt,
                        createdAt: data.createdAt,
                      });
                    }
                  }
                });
                setNotices(noticesData);
              },
              (fallbackError) => {
                console.error('Home page: Fallback query also failed:', fallbackError);
                setNotices([]);
              }
            );
            unsubscribe = fallbackUnsubscribe;
          } catch (fallbackError) {
            console.error('Home page: Error setting up fallback listener:', fallbackError);
            setNotices([]);
          }
        }
      );
    } catch (error) {
      console.error('Home page: Error setting up notices listener:', error);
      setNotices([]);
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Real-time listener for settings
  useEffect(() => {
    setIsLoading(true);
    const settingsDocRef = doc(db, 'system', 'settings');
    
    const unsubscribe = onSnapshot(
      settingsDocRef,
      async (docSnap) => {
        try {
          let settings: SystemSettings | null = null;
          
          if (docSnap.exists()) {
            settings = { id: docSnap.id, ...docSnap.data() } as SystemSettings;
          } else {
            // Return default settings if none exist
            settings = await settingsQueries.getSettings();
          }
          
          if (settings) {
          // Load slider slides
          if (settings.homeSliderSlides && settings.homeSliderSlides.length > 0) {
            const activeSlides = settings.homeSliderSlides
              .filter((slide: any) => slide.isActive !== false)
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((slide: any) => ({
                id: slide.id || slide.title || Math.random().toString(),
                title: slide.title || '',
                subtitle: slide.subtitle || '',
                bgGradient: slide.bgGradient || 'from-blue-900 via-purple-900 to-teal-800',
                aiText: slide.aiText || '',
                aiSubtext: slide.aiSubtext || '',
                imageUrl: slide.imageUrl,
                order: slide.order,
                isActive: slide.isActive
              }));
            if (activeSlides.length > 0) {
              setHeroSlides(activeSlides);
            }
          }

          // Load admission content
          if (settings.homeAdmissionEnabled !== undefined) {
            setAdmissionContent({
              title: settings.homeAdmissionTitle || admissionContent.title,
              applyNow: settings.homeAdmissionApplyNow || admissionContent.applyNow,
              classes: settings.homeAdmissionClasses || admissionContent.classes,
              classesLabel: settings.homeAdmissionClassesLabel || admissionContent.classesLabel,
              open: settings.homeAdmissionOpen || admissionContent.open,
              openLabel: settings.homeAdmissionOpenLabel || admissionContent.openLabel,
              deadline: settings.homeAdmissionDeadline || admissionContent.deadline,
              admitNow: settings.homeAdmissionAdmitNow || admissionContent.admitNow,
              officeHours: settings.homeAdmissionOfficeHours || admissionContent.officeHours,
              contactPhone: settings.homeAdmissionContactPhone || admissionContent.contactPhone,
              experience: settings.homeAdmissionExperience || admissionContent.experience,
              enabled: settings.homeAdmissionEnabled
            });
          }

          // Load general settings for footer
          setGeneralSettings(settings);

          // Load top students (কৃতি)
          if ((settings as any).homeTopStudentsEnabled !== undefined) {
            setTopStudentsEnabled((settings as any).homeTopStudentsEnabled);
          }
          if ((settings as any).homeTopStudentsTitle) {
            setTopStudentsTitle((settings as any).homeTopStudentsTitle);
          }
          if ((settings as any).homeTopStudents && Array.isArray((settings as any).homeTopStudents)) {
            const activeStudents = (settings as any).homeTopStudents
              .filter((student: any) => student.isActive !== false)
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            
            // First set the students from settings (will show manual data if no uid/studentId)
            setTopStudents(activeStudents);
            
            // Then fetch real student data if uid or studentId exists (async, will update later)
            const loadRealStudentData = async (students: Array<{
              id: string;
              name: string;
              className: string;
              achievement?: string;
              photoUrl?: string;
              isActive: boolean;
              order: number;
              studentId?: string;
              uid?: string;
            }>) => {
              try {
                const studentsWithRealData = await Promise.all(
                  students.map(async (student) => {
                    // If student has uid or studentId, fetch real data
                    if (student.uid || student.studentId) {
                      try {
                        let realStudent = null;
                        if (student.uid) {
                          realStudent = await studentQueries.getStudentById(student.uid);
                        } else if (student.studentId) {
                          realStudent = await studentQueries.getStudentByStudentId(student.studentId);
                        }

                        if (realStudent) {
                          // Build class name with section and group
                          let className = realStudent.class || '';
                          const section = realStudent.section || '';
                          const group = realStudent.group || '';
                          
                          // Format: "Class (Section) - Group" or just "Class" if no section/group
                          if (className) {
                            if (section && !className.includes(section)) {
                              className += ` (${section})`;
                            }
                            if (group && !className.includes(group)) {
                              className += ` - ${group}`;
                            }
                          } else {
                            // If no class name, use the one from settings as fallback
                            className = student.className || '';
                          }

                          return {
                            ...student,
                            name: realStudent.name || realStudent.displayName || student.name,
                            className: className || student.className || '',
                            section: section,
                            group: group,
                            photoUrl: realStudent.profileImage || student.photoUrl || '',
                            // Keep achievement from settings if exists
                            achievement: student.achievement || ''
                          };
                        }
                      } catch (error) {
                        console.error(`Error loading student data for ${student.uid || student.studentId}:`, error);
                      }
                    }
                    // Return original student data if no uid/studentId or fetch failed
                    return student;
                  })
                );

                setTopStudents(studentsWithRealData);
              } catch (error) {
                console.error('Error loading real student data:', error);
                // Fallback to original students data
                setTopStudents(students);
              }
            };

            if (activeStudents.some((s: any) => s.uid || s.studentId)) {
              loadRealStudentData(activeStudents);
            }
          }

          // Load links (লিঙ্ক)
          if ((settings as any).homeLinksEnabled !== undefined) {
            setLinksEnabled((settings as any).homeLinksEnabled);
          }
          if ((settings as any).homeLinksTitle) {
            setLinksTitle((settings as any).homeLinksTitle);
          }
          if ((settings as any).homeLinks && Array.isArray((settings as any).homeLinks)) {
            const activeLinks = (settings as any).homeLinks
              .filter((link: any) => link.isActive !== false)
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setLinks(activeLinks);
          }

          // Load message (বানী)
          if ((settings as any).homeMessageEnabled !== undefined) {
            setMessageEnabled((settings as any).homeMessageEnabled);
          }
          if ((settings as any).homeMessageTitle) {
            setMessageTitle((settings as any).homeMessageTitle);
          }
          if ((settings as any).homeMessage) {
            setMessage((settings as any).homeMessage);
          }

          // Load testimonials (মতামত)
          if ((settings as any).homeTestimonialsEnabled !== undefined) {
            setTestimonialsEnabled((settings as any).homeTestimonialsEnabled);
          } else {
            // Default to true if not set
            setTestimonialsEnabled(true);
          }
          if ((settings as any).homeTestimonialsTitle) {
            setTestimonialsTitle((settings as any).homeTestimonialsTitle);
          }
          if ((settings as any).homeTestimonials && Array.isArray((settings as any).homeTestimonials)) {
            const allTestimonials = (settings as any).homeTestimonials;
            const activeTestimonials = allTestimonials
              .filter((t: any) => {
                // Only show active and approved testimonials with a valid message
                // If isApproved is undefined (old testimonials), treat as approved for backward compatibility
                if (!t || typeof t !== 'object') {
                  return false;
                }
                
                const hasValidMessage = t.message && typeof t.message === 'string' && t.message.trim().length > 0;
                const isActive = t.isActive !== false;
                const isApproved = t.isApproved === true || t.isApproved === undefined;
                const hasValidName = t.name && typeof t.name === 'string' && t.name.trim().length > 0;
                const shouldShow = isActive && isApproved && hasValidMessage && hasValidName;
                
                // Debug logging
                if (!shouldShow) {
                  console.log('Testimonial filtered out:', {
                    id: t.id,
                    name: t.name,
                    isActive,
                    isApproved,
                    hasValidMessage,
                    hasValidName,
                    message: t.message
                  });
                }
                
                return shouldShow;
              })
              .map((t: any) => ({
                id: t.id || `testimonial-${Date.now()}-${Math.random()}`,
                name: t.name || 'অভিভাবক',
                designation: t.designation || 'অভিভাবক',
                message: t.message || '',
                photoUrl: t.photoUrl || '',
                isActive: t.isActive !== false,
                order: t.order || 0
              }))
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            
            console.log('Testimonials loaded:', {
              total: allTestimonials.length,
              active: activeTestimonials.length,
              enabled: testimonialsEnabled
            });
            
            setTestimonials(activeTestimonials);
          } else {
            // If no testimonials in settings, clear the list
            console.log('No testimonials in settings');
            setTestimonials([]);
          }

          }
        } catch (error) {
          console.error('Error processing settings:', error);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Error in settings listener:', error);
        setIsLoading(false);
      }
    );

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-slide functionality for hero
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const heroInterval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000); // Change hero slide every 6 seconds

    return () => clearInterval(heroInterval);
  }, [heroSlides.length]);


  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <Info className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  // Content for home page specific sections
  const content = {
    notice: {
      badge: 'নোটিশ',
      notices: notices
    },
    aboutUs: {
      title: 'আমাদের সম্পর্কে',
      description1: 'আমার স্কুল ২০১৮ সালে প্রতিষ্ঠিত হয়। প্রতিষ্ঠার শুরু থেকেই আমাদের দান শিক্ষার মানোন্নয়ন ও নৈতিক শিক্ষার সমান গুরুত্ব সাথে প্রদান করে আসছে।',
      description2: 'আমাদের লক্ষ্য হচ্ছে শিক্ষার্থীদের নৈতিকতা, চরিত্র গঠন এবং আধুনিক জ্ঞানে দক্ষ করে গড়ে তোলা। আমরা বিশ্বাস করি প্রতিটি শিক্ষার্থী অসীম সম্ভাবনার অধিকারী।',
      readMore: 'বিস্তারিত পড়ুন'
    },
    admission: admissionContent
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Notice Bar - Real-time Scrolling Headline */}
      {notices.length > 0 && (
        <div className="bg-gray-100 text-black py-2 fixed w-full top-20 z-40 border-b border-gray-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex items-center mr-4 flex-shrink-0">
                <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  {content.notice.badge}
                </span>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <div 
                  className="flex items-center space-x-8 animate-scroll-forever whitespace-nowrap"
                  style={{
                    animationDuration: `${notices.length * 8}s`,
                  }}
                >
                  {/* Duplicate items for seamless loop */}
                  {[...notices, ...notices].map((notice, index) => {
                    try {
                      const PriorityIcon = getPriorityIcon(notice.priority || 'medium');
                      return (
                        <div 
                          key={`${notice.id}-${index}`}
                          className="flex items-center space-x-2 flex-shrink-0"
                        >
                          {PriorityIcon}
                          <span className="text-sm font-medium text-gray-900">
                            {notice.title || 'নোটিশ'}
                          </span>
                          <span className="text-gray-400">•</span>
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering notice in ticker:', error, notice);
                      return null;
                    }
                  }).filter(Boolean)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scroll-forever {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll-forever {
          animation: scroll-forever linear infinite;
        }
      `}</style>

      {/* Hero Section - Now a Slider */}
      <section className={`pb-16 text-white min-h-screen flex items-center relative overflow-hidden ${notices.length > 0 ? 'pt-32' : 'pt-24'}`}>
        {/* Hero Slider Container */}
        <div className="absolute inset-0">
          <div 
            className="flex transition-transform duration-1000 ease-in-out h-full"
            style={{ transform: `translateX(-${currentHeroSlide * 100}%)` }}
          >
            {heroSlides.map((slide) => (
              <div key={slide.id} className={`w-full flex-shrink-0 h-full relative`}>
                {slide.imageUrl ? (
                  <>
                    <img 
                      src={slide.imageUrl} 
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40"></div>
                  </>
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${slide.bgGradient}`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content Overlay */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            {/* Dynamic Heading */}
            <div className="mb-12">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight transition-all duration-500">
                <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                  {heroSlides[currentHeroSlide].title}
                </span>
              </h1>
              <p className="text-2xl text-blue-200 font-medium mb-8 transition-all duration-500">
                {heroSlides[currentHeroSlide].subtitle}
              </p>
            </div>
          </div>
        </div>
        
        {/* Hero Navigation Arrows */}
        <button 
          onClick={prevHeroSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-4 rounded-full transition-all duration-300 hover:scale-110 z-20"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        
        <button 
          onClick={nextHeroSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-4 rounded-full transition-all duration-300 hover:scale-110 z-20"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
        
        {/* Hero Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToHeroSlide(index)}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                currentHeroSlide === index 
                  ? 'bg-white w-10' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </section>

      {/* About Us and Notice Board Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* About Us and Admission - Left Column (3/4 width) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{content.aboutUs.title}</h2>
                <div className="space-y-6 text-gray-600 mb-6 p-6 border border-gray-300 rounded-xl bg-gray-50">
                  <div className="flex items-start gap-6">
                    <div className="flex-1">
                      <p className="text-base leading-relaxed mb-4">
                        {content.aboutUs.description1}
                      </p>
                      <p className="text-base leading-relaxed">
                        {content.aboutUs.description2}
                      </p>
                    </div>
                    
                    {/* AI Creative Section - Bigger */}
                    <div className="flex-shrink-0">
                      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 flex items-center justify-center shadow-2xl border-8 border-white">
                        <div className="text-white text-center">
                          <div className="text-3xl font-bold mb-2">AI</div>
                          <div className="text-sm font-medium">Creative AI</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl text-base font-semibold transition-colors transform hover:scale-105">
                      {content.aboutUs.readMore}
                    </button>
                  </div>
                </div>
              </div>

              {/* Admission Section - Much Bigger */}
              {content.admission.enabled && (
                <div className="bg-white rounded-2xl shadow-xl p-10">
                  <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{content.admission.title}</h2>
                  <div className="text-center mb-10">
                    <div className="inline-block bg-gradient-to-r from-green-500 to-blue-500 text-white px-10 py-5 rounded-full text-xl font-bold mb-6">
                      {content.admission.applyNow}
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="text-center p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                        <div className="text-4xl font-bold text-blue-600 mb-2">{content.admission.classes}</div>
                        <div className="text-lg text-gray-700 font-semibold">{content.admission.classesLabel}</div>
                      </div>
                      <div className="text-center p-6 bg-green-50 rounded-2xl border-2 border-green-200">
                        <div className="text-4xl font-bold text-green-600 mb-2">{content.admission.open}</div>
                        <div className="text-lg text-gray-700 font-semibold">{content.admission.openLabel}</div>
                      </div>
                    </div>
                    
                    <div className="text-center bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-200">
                      <p className="text-lg text-gray-700 mb-6 font-medium">{content.admission.deadline}</p>
                      <button 
                        onClick={() => router.push('/admission')}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-110 shadow-lg"
                      >
                        {content.admission.admitNow}
                      </button>
                    </div>
                    
                    {/* Additional Information */}
                    <div className="grid grid-cols-3 gap-6 mt-8">
                      <div className="text-center p-4 bg-purple-50 rounded-xl">
                        <div className="text-xl font-bold text-purple-600 mb-2">{content.admission.officeHours}</div>
                        <div className="text-sm text-gray-600">অফিস সময়</div>
                      </div>
                      <div className="text-center p-4 bg-indigo-50 rounded-xl">
                        <div className="text-xl font-bold text-indigo-600 mb-2">{content.admission.contactPhone}</div>
                        <div className="text-sm text-gray-600">যোগাযোগ নম্বর</div>
                      </div>
                      <div className="text-center p-4 bg-teal-50 rounded-xl">
                        <div className="text-xl font-bold text-teal-600 mb-2">{content.admission.experience}</div>
                        <div className="text-sm text-gray-600">শিক্ষার অভিজ্ঞতা</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Section (বানী) */}
              {messageEnabled && message && (
                <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{messageTitle}</h3>
                  <div className="flex flex-col md:flex-row gap-6">
                    {message.photoUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={message.photoUrl}
                          alt={message.author}
                          className="w-32 h-32 object-cover rounded-full border-4 border-blue-100"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-gray-700 text-base leading-relaxed mb-4 italic">
                        "{message.message}"
                      </p>
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold text-gray-900">{message.author}</p>
                        <p className="text-sm text-gray-600">{message.authorTitle}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Testimonials Section (মতামত) */}
              {testimonialsEnabled && testimonials.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-4 mt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{testimonialsTitle}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testimonials.map((testimonial, index) => {
                      // Safe access with fallbacks
                      const testimonialId = testimonial?.id || `testimonial-${index}`;
                      const testimonialName = testimonial?.name || 'অভিভাবক';
                      const testimonialDesignation = testimonial?.designation || 'অভিভাবক';
                      const testimonialMessage = testimonial?.message || '';
                      const testimonialPhotoUrl = testimonial?.photoUrl;
                      
                      // Skip if no message
                      if (!testimonialMessage || testimonialMessage.trim().length === 0) {
                        return null;
                      }
                      
                      const firstLetter = testimonialName ? testimonialName.charAt(0) : '?';
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
                      const colorIndex = testimonialName ? testimonialName.charCodeAt(0) % colors.length : 0;
                      const avatarColor = colors[colorIndex];

                      return (
                        <div key={testimonialId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start space-x-3">
                            {testimonialPhotoUrl && testimonialPhotoUrl.trim() ? (
                              <img
                                src={testimonialPhotoUrl}
                                alt={testimonialName}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  // Hide image on error
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center`}>
                                <span className="text-white text-sm font-bold">{firstLetter}</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 mb-2 italic">"{testimonialMessage}"</p>
                              <p className="text-sm font-semibold text-gray-900">{testimonialName}</p>
                              <p className="text-xs text-gray-600">{testimonialDesignation}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column - Bigger but still compact (1/4 width) */}
            <div className="lg:col-span-1 space-y-4">
              {/* Notice Board - Bigger - Real-time */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">নোটিশ</h3>
                </div>
                
                <div className="space-y-2">
                  {notices.length > 0 ? (
                    notices.slice(0, 3).map((notice) => {
                      try {
                        const PriorityIcon = getPriorityIcon(notice.priority || 'medium');
                        const priorityColors = {
                          high: 'bg-red-500',
                          medium: 'bg-yellow-500',
                          low: 'bg-green-500'
                        };

                        // Get relative time helper
                        const getRelativeTime = (timestamp: Timestamp | undefined): string => {
                          if (!timestamp) return '';
                          try {
                            // Handle Firestore Timestamp
                            let date: Date;
                            if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
                              date = (timestamp as Timestamp).toDate();
                            } else if (timestamp && Object.prototype.toString.call(timestamp) === '[object Date]') {
                              date = timestamp as unknown as Date;
                            } else {
                              return '';
                            }

                            const now = new Date();
                            const diffInMs = now.getTime() - date.getTime();
                            const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

                            if (diffInDays === 0) return 'আজ';
                            if (diffInDays === 1) return 'গতকাল';
                            if (diffInDays < 7) return `${diffInDays} দিন আগে`;
                            if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} সপ্তাহ আগে`;
                            if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} মাস আগে`;
                            return `${Math.floor(diffInDays / 365)} বছর আগে`;
                          } catch (e) {
                            console.warn('Error calculating relative time:', e);
                            return '';
                          }
                        };

                        const priorityKey = notice.priority || 'medium';
                        const priorityColor = priorityColors[priorityKey as keyof typeof priorityColors] || 'bg-blue-500';

                        return (
                          <div key={notice.id} className="flex items-start p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => router.push('/notice')}>
                            <div className={`w-6 h-6 ${priorityColor} rounded-full flex items-center justify-center mr-3 flex-shrink-0`}>
                              {PriorityIcon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 line-clamp-1">{notice.title || 'নোটিশ'}</div>
                              <div className="text-xs text-gray-600">{getRelativeTime(notice.createdAt)}</div>
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error('Error rendering notice:', error, notice);
                        return null;
                      }
                    }).filter(Boolean)
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-sm text-gray-500">কোনো নোটিশ নেই</div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 text-center">
                  <span 
                    onClick={() => router.push('/notice')}
                    className="text-sm text-green-600 font-medium cursor-pointer hover:text-green-700"
                  >
                    সব দেখুন
                  </span>
                </div>
              </div>

              {/* Quick Links - Bigger */}
              {linksEnabled && links.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{linksTitle}</h3>
                  <div className="space-y-2">
                    {links.map((link) => {
                      // Generate color based on link title for consistent icon color
                      const colors = ['bg-green-600', 'bg-blue-600', 'bg-purple-600', 'bg-yellow-600', 'bg-red-600', 'bg-indigo-600'];
                      const colorIndex = link.title ? link.title.charCodeAt(0) % colors.length : 0;
                      const linkColor = colors[colorIndex];

                      return (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <div className="flex items-center">
                            <div className={`w-4 h-4 ${linkColor} rounded mr-3`}></div>
                            <span className="text-sm font-medium text-gray-900">{link.title}</span>
                          </div>
                          <span className="text-sm text-blue-600 font-medium hover:text-blue-700">ভিজিট</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Students - Bigger */}
              {topStudentsEnabled && topStudents.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{topStudentsTitle}</h3>
                    <span className="text-sm text-green-600 font-medium cursor-pointer hover:text-green-700">সব দেখুন</span>
                  </div>
                  
                  <div className="space-y-3">
                    {topStudents.slice(0, 5).map((student) => {
                      // Get first letter of name for avatar
                      const firstLetter = student.name ? student.name.charAt(0) : '?';
                      // Generate a color based on student name for consistent avatar color
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
                      const colorIndex = student.name ? student.name.charCodeAt(0) % colors.length : 0;
                      const avatarColor = colors[colorIndex];
                      const hasImageError = imageErrors[student.id] || false;

                      return (
                        <div key={student.id} className="flex items-center">
                          {student.photoUrl && !hasImageError ? (
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-gray-200"
                              onError={() => {
                                setImageErrors(prev => ({ ...prev, [student.id]: true }));
                              }}
                            />
                          ) : (
                            <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center mr-3`}>
                              <span className="text-white text-sm font-bold">{firstLetter}</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">{student.name || 'নাম নেই'}</div>
                            <div className="text-sm text-gray-600">
                              {student.className || (student.uid || student.studentId ? 'ক্লাস লোড হচ্ছে...' : 'ক্লাস নেই')}
                            </div>
                            {student.achievement && (
                              <div className="text-xs text-gray-500 mt-1">{student.achievement}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>


          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold mb-4">{generalSettings?.schoolName || 'আমার স্কুল'}</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">{generalSettings?.schoolDescription || 'আদর্শ শিক্ষা, আদর্শ মানুষ গড়ার কারিগর'}</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">যোগাযোগ</h3>
              <div className="text-gray-300 space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <span>{generalSettings?.schoolPhone || '০১৭ ৮৮৮-৮৮৮৮'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <span>{generalSettings?.schoolEmail || 'info@iqraacademy.edu'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <span>{generalSettings?.schoolAddress || '১৫৯ মেইন রোড, ঢাকা-১২০৭'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; ২০২৪ {generalSettings?.schoolName || 'আমার স্কুল'}। সর্বস্বত্ব সংরক্ষিত।</p>
          </div>
        </div>
      </footer>
    </div>
  );
}