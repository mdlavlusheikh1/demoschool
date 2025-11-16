'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { User, onAuthStateChanged } from 'firebase/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SystemSettings, settingsQueries } from '@/lib/database-queries';
import {
  Settings,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Image as ImageIcon,
  Info,
  Save,
  ArrowLeft,
  Users,
  Target,
  Award,
  Heart,
  Shield,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  FileText,
  Eye,
  Building,
  Calendar,
  User as UserIcon,
  Loader2,
  Video,
  Edit3,
  Tag,
  Upload,
  Home,
  ChevronUp,
  ChevronDown,
  GraduationCap,
  BookOpen,
  AlertCircle,
  ExternalLink,
  Clock as ClockIcon,
  Star,
  MessageSquare
} from 'lucide-react';
import ImageKitUploader from '@/components/ui/imagekit-uploader';
import MediaUploader from '@/components/ui/media-uploader';
import { SCHOOL_ID } from '@/lib/constants';
import { transformImageUrl } from '@/lib/imagekit-utils';
import AdminLayout from '@/components/AdminLayout';
import { studentQueries, teacherQueries } from '@/lib/database-queries';
import type { User } from '@/lib/database-queries';

function PublicPagesControlPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Page selection (Home, Contact, Gallery, About, Question, Logo)
  const [selectedPage, setSelectedPage] = useState<'home' | 'contact' | 'gallery' | 'about' | 'question' | 'logo'>('home');
  
  // Tab selection for each page
  const [homeTab, setHomeTab] = useState<'slider' | 'admission' | 'achievements' | 'links' | 'message' | 'testimonials' | 'committee' | 'teachers'>('slider');
  const [contactTab, setContactTab] = useState<'header' | 'contactInfo' | 'departments' | 'map' | 'social' | 'form'>('header');
  const [galleryTab, setGalleryTab] = useState<'header' | 'images' | 'categories' | 'events'>('header');
  const [aboutTab, setAboutTab] = useState<'header' | 'intro' | 'stats' | 'values' | 'achievements' | 'team'>('header');
  
  // Gallery item edit state
  const [editingGalleryItem, setEditingGalleryItem] = useState<number | null>(null);
  const [editGalleryForm, setEditGalleryForm] = useState<{
    title: string;
    description: string;
    category: string;
    event: string;
    date: string;
    photographer: string;
    location: string;
    tags: string;
    uploadedBy: string;
  } | null>(null);

  // Students list for dropdown
  const [studentsList, setStudentsList] = useState<User[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Teachers list for dropdown
  const [teachersList, setTeachersList] = useState<User[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Pending testimonials for approval
  const [pendingTestimonials, setPendingTestimonials] = useState<Array<{
    id: string;
    name: string;
    designation: string;
    message: string;
    photoUrl?: string;
    submittedBy: string;
    submittedByRole: string;
    submittedAt: any;
    status: 'pending' | 'approved' | 'rejected';
  }>>([]);
  const [loadingPendingTestimonials, setLoadingPendingTestimonials] = useState(false);

  // Pending parent feedback for approval
  const [pendingParentFeedback, setPendingParentFeedback] = useState<Array<{
    id: string;
    parentId: string;
    parentName: string;
    parentEmail: string;
    parentPhone?: string;
    category: string;
    subject: string;
    message: string;
    rating: number;
    suggestion: string;
    status: 'new' | 'approved' | 'rejected';
    createdAt: any;
  }>>([]);
  const [loadingParentFeedback, setLoadingParentFeedback] = useState(false);

  // All parent feedback for viewing
  const [allParentFeedback, setAllParentFeedback] = useState<Array<{
    id: string;
    parentId: string;
    parentName: string;
    parentEmail: string;
    parentPhone?: string;
    category: string;
    subject: string;
    message: string;
    rating: number;
    suggestion: string;
    status: 'new' | 'approved' | 'rejected';
    createdAt: any;
    approvedAt?: any;
    rejectedAt?: any;
    approvedBy?: string;
    rejectedBy?: string;
  }>>([]);
  const [loadingAllFeedback, setLoadingAllFeedback] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'new' | 'approved' | 'rejected'>('all');

  const [formData, setFormData] = useState({
    // Contact Page
    contactPageTitle: 'যোগাযোগ করুন',
    contactPageSubtitle: 'আমাদের সাথে যোগাযোগ করে আপনার প্রশ্নের উত্তর পান এবং আমাদের সম্পর্কে আরও জানুন',
    contactPhones: ['+৮৮০ ১৭১১ ২৩৪৫৬৭', '+৮৮০ ১৯১১ ২৩৪৫৬৭'],
    contactEmails: ['info@iqraschool.edu', 'admission@iqraschool.edu'],
    contactAddress: ['রামপুরা, ঢাকা-১২১৯', 'বাংলাদেশ'],
    contactHours: ['রবি-বৃহ: সকাল ৮টা - বিকাল ৫টা', 'শুক্র: সকাল ৮টা - দুপুর ১২টা'],
    contactDepartments: [
      { name: 'ভর্তি বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৭', email: 'admission@iqraschool.edu', description: 'নতুন শিক্ষার্থী ভর্তি সংক্রান্ত সকল তথ্য' },
      { name: 'শিক্ষা বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৮', email: 'academic@iqraschool.edu', description: 'শিক্ষা কার্যক্রম ও পাঠ্যক্রম সংক্রান্ত' },
      { name: 'প্রশাসন', phone: '+৮৮০ ১৭১১ ২৩৪৫৬৯', email: 'admin@iqraschool.edu', description: 'সাধারণ প্রশাসনিক কাজ' },
      { name: 'হিসাব বিভাগ', phone: '+৮৮০ ১৭১১ ২৩৪৫৭০', email: 'accounts@iqraschool.edu', description: 'ফি ও আর্থিক বিষয়াদি' }
    ],
    contactMapEmbedCode: '',
    contactMapAddress: 'রামপুরা, ঢাকা-১২১৯',
    contactSocialMediaFacebook: '',
    contactSocialMediaTwitter: '',
    contactSocialMediaInstagram: '',
    contactSocialMediaYoutube: '',
    contactFormSubjects: ['ভর্তি সংক্রান্ত', 'শিক্ষা সংক্রান্ত', 'ফি সংক্রান্ত', 'সাধারণ তথ্য', 'অভিযোগ', 'পরামর্শ'],

    // Gallery Page
    galleryPageTitle: 'গ্যালারী',
    galleryPageSubtitle: 'স্কুলের বিভিন্ন অনুষ্ঠান, ইভেন্ট এবং স্মরণীয় মুহূর্তগুলো',
    galleryCategories: ['সকল বিভাগ', 'events', 'academic', 'cultural', 'environment', 'sports'],
    galleryEvents: ['সকল অনুষ্ঠান', 'বার্ষিক ক্রীড়া প্রতিযোগিতা', 'বিজ্ঞান মেলা', 'ইসলামিক সাংস্কৃতিক অনুষ্ঠান', 'শিক্ষক দিবস', 'বইমেলা', 'বৃক্ষরোপণ কর্মসূচি'],
    galleryItems: [] as Array<{
      id: string;
      title: string;
      description: string;
      imageUrl: string;
      category: string;
      event: string;
      date: string;
      photographer: string;
      location: string;
      tags: string[];
      type?: 'image' | 'video';
    }>,

    // About Page
    aboutPageTitle: 'আমাদের সম্পর্কে',
    aboutPageSubtitle: 'একটি আধুনিক ইসলামিক শিক্ষা প্রতিষ্ঠান যা ধর্মীয় এবং আধুনিক শিক্ষার সমন্বয়ে শিক্ষার্থীদের বিকাশে কাজ করে',
    aboutIntro: 'আমার স্কুল ২০১৮ সালে প্রতিষ্ঠিত হয়। প্রতিষ্ঠার শুরু থেকেই আমাদের দান শিক্ষার মানোন্নয়ন ও নৈতিক শিক্ষার সমান গুরুত্ব সাথে প্রদান করে আসছে।',
    aboutImageUrl: '',
    aboutMission: 'শিক্ষার্থীদের নৈতিকতা, চরিত্র গঠন এবং আধুনিক জ্ঞানে দক্ষ করে গড়ে তোলা।',
    aboutVision: 'আমরা বিশ্বাস করি প্রতিটি শিক্ষার্থী অসীম সম্ভাবনার অধিকারী।',
    aboutStats: [
      { label: 'শিক্ষার্থী', value: '৫০০+' },
      { label: 'শিক্ষক', value: '৩৫+' },
      { label: 'বছর', value: '১৫+' },
      { label: 'সাফল্য', value: '৯৫%' }
    ],
    aboutValues: [
      { title: 'ভালোবাসা', description: 'শিক্ষার্থীদের প্রতি অকৃত্রিম ভালোবাসা এবং যত্ন নিয়ে শিক্ষাদান' },
      { title: 'নিরাপত্তা', description: 'সব শিক্ষার্থীর জন্য নিরাপদ এবং সুন্দর পরিবেশ নিশ্চিত করা' },
      { title: 'মানসম্পন্ন শিক্ষা', description: 'আধুনিক শিক্ষা পদ্ধতি এবং ইসলামিক মূল্যবোধের সমন্বয়' },
      { title: 'বিশ্বায়ন', description: 'আন্তর্জাতিক মানের শিক্ষা দিয়ে বিশ্ব নাগরিক তৈরি করা' }
    ],
    aboutAchievements: [
      { year: '২০২৪', title: 'সেরা শিক্ষা প্রতিষ্ঠান পুরস্কার', description: 'জেলা শিক্ষা অফিস থেকে সেরা শিক্ষা প্রতিষ্ঠান হিসেবে স্বীকৃতি' },
      { year: '২০২৩', title: '১০০% পাসের হার', description: 'এসএসসি পরীক্ষায় ১০০% পাসের হার অর্জন' },
      { year: '২০২২', title: 'সাংস্কৃতিক প্রতিযোগিতায় চ্যাম্পিয়ন', description: 'জেলা পর্যায়ে সাংস্কৃতিক প্রতিযোগিতায় প্রথম স্থান' },
      { year: '২০২১', title: 'ক্রীড়া প্রতিযোগিতায় সাফল্য', description: 'বিভাগীয় ক্রীড়া প্রতিযোগিতায় একাধিক স্বর্ণপদক' }
    ],
    aboutTeam: [],

    // Home Page Slider
    homeSliderSlides: [
      {
        id: '1',
        title: 'আমার স্কুল',
        subtitle: 'আধুনিক শিক্ষা ও প্রযুক্তির সমন্বয়',
        bgGradient: 'from-blue-900 via-purple-900 to-teal-800',
        aiText: 'AI',
        aiSubtext: 'Smart Education',
        imageUrl: '',
        order: 1,
        isActive: true
      },
      {
        id: '2',
        title: 'ডিজিটাল শিক্ষা ব্যবস্থা',
        subtitle: 'QR কোড এবং স্মার্ট উপস্থিতি ট্র্যাকিং',
        bgGradient: 'from-green-900 via-emerald-900 to-cyan-800',
        aiText: 'QR',
        aiSubtext: 'Attendance System',
        imageUrl: '',
        order: 2,
        isActive: true
      },
      {
        id: '3',
        title: 'রিয়েল-টাইম ড্যাশবোর্ড',
        subtitle: 'লাইভ মনিটরিং এবং পারফরমেন্স ট্র্যাকিং',
        bgGradient: 'from-purple-900 via-pink-900 to-indigo-800',
        aiText: 'DB',
        aiSubtext: 'Real-time Reports',
        imageUrl: '',
        order: 3,
        isActive: true
      }
    ],

    // Home Page Admission
    homeAdmissionEnabled: true,
    homeAdmissionTitle: 'ভর্তি চলছে সেশন ২০২৪',
    homeAdmissionApplyNow: '🎓 আবেদন করুন এখনই',
    homeAdmissionClasses: '৭ম-১০ম',
    homeAdmissionClassesLabel: 'শ্রেণী সমূহ',
    homeAdmissionOpen: 'খোলা',
    homeAdmissionOpenLabel: 'আবেদন প্রক্রিয়া',
    homeAdmissionDeadline: 'আবেদনের শেষ তারিখ: ৩০ ডিসেম্বর ২০২৪',
    homeAdmissionAdmitNow: 'এখনই ভর্তি হন',
    homeAdmissionOfficeHours: '০৮:০০ - ১৫:০০',
    homeAdmissionContactPhone: '০১৭৮৮-৮৮৮৮',
    homeAdmissionExperience: '১৫ বছর',

    // Home Page Top Students (কৃতি)
    homeTopStudentsEnabled: true,
    homeTopStudentsTitle: 'কৃতি',
    homeTopStudents: [
      {
        id: '1',
        name: 'তাসনিয়া আকতার',
        className: 'ক্লাস টেন',
        achievement: '',
        photoUrl: '',
        isActive: true,
        order: 1,
        studentId: '', // Student ID from database
        uid: '' // Student UID from database
      },
      {
        id: '2',
        name: 'মাহজাবুল ইসলাম',
        className: 'ক্লাস নাইন',
        achievement: '',
        photoUrl: '',
        isActive: true,
        order: 2,
        studentId: '', // Student ID from database
        uid: '' // Student UID from database
      }
    ] as Array<{
      id: string;
      name: string;
      className: string;
      achievement?: string;
      photoUrl?: string;
      isActive: boolean;
      order: number;
      studentId?: string; // Student ID from database
      uid?: string; // Student UID from database
    }>,

    // Home Page Links (লিঙ্ক)
    homeLinksEnabled: true,
    homeLinksTitle: 'লিঙ্ক',
    homeLinks: [
      {
        id: '1',
        title: 'শিক্ষা মন্ত্রণালয়',
        url: 'https://www.moedu.gov.bd',
        isActive: true,
        order: 1
      },
      {
        id: '2',
        title: 'মাধ্যমিক বোর্ড',
        url: 'https://www.educationboard.gov.bd',
        isActive: true,
        order: 2
      }
    ] as Array<{
      id: string;
      title: string;
      url: string;
      isActive: boolean;
      order: number;
    }>,

    // Home Page Message (বানী)
    homeMessageEnabled: true,
    homeMessageTitle: 'বানী',
    homeMessage: {
      author: 'প্রধান শিক্ষক',
      authorTitle: 'প্রধান শিক্ষক',
      message: 'শিক্ষা হলো মানব জীবনের সবচেয়ে গুরুত্বপূর্ণ সম্পদ।',
      photoUrl: ''
    },

    // Home Page Testimonials (মতামত)
    homeTestimonialsEnabled: true,
    homeTestimonialsTitle: 'মতামত',
    homeTestimonials: [
      {
        id: '1',
        name: 'মোঃ আবুল কালাম',
        designation: 'অভিভাবক',
        message: 'এই স্কুলের শিক্ষার মান খুবই ভালো।',
        photoUrl: '',
        isActive: true,
        isApproved: true,
        order: 1
      }
    ] as Array<{
      id: string;
      name: string;
      designation: string;
      message: string;
      photoUrl?: string;
      isActive: boolean;
      isApproved?: boolean;
      order: number;
    }>,

    // Home Page Managing Committee (ম্যানেজিং কমিটি)
    homeCommitteeEnabled: true,
    homeCommitteeTitle: 'ম্যানেজিং কমিটি',
    homeCommittee: [
      {
        id: '1',
        name: 'মোঃ রহমান',
        designation: 'সভাপতি',
        photoUrl: '',
        isActive: true,
        order: 1
      }
    ] as Array<{
      id: string;
      name: string;
      designation: string;
      photoUrl?: string;
      isActive: boolean;
      order: number;
    }>,

    // Home Page Teachers (শিক্ষক)
    homeTeachersEnabled: true,
    homeTeachersTitle: 'শিক্ষক',
    homeTeachers: [
      {
        id: '1',
        name: 'মোঃ করিম',
        designation: 'গণিত শিক্ষক',
        photoUrl: '',
        isActive: true,
        order: 1,
        uid: '', // Teacher UID from database
        teacherId: '' // Teacher ID from database
      }
    ] as Array<{
      id: string;
      name: string;
      designation: string;
      photoUrl?: string;
      isActive: boolean;
      order: number;
      uid?: string; // Teacher UID from database
      teacherId?: string; // Teacher ID from database
    }>,

    // Logo & Favicon
    websiteLogo: '', // Website logo URL
    favicon: '' // Favicon URL
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch user data from Firestore
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            if (data.role !== 'admin' && data.role !== 'super_admin') {
              router.push('/admin');
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user && userData) {
      loadSettings();
      loadStudents();
      loadTeachers();
      loadPendingTestimonials();
      loadPendingParentFeedback();
      loadAllParentFeedback();
    }
  }, [user, userData]);

  const loadStudents = async () => {
    if (!user) return;
    
    setLoadingStudents(true);
    try {
      const studentsData = await studentQueries.getStudentsBySchool(SCHOOL_ID);
      setStudentsList(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadTeachers = async () => {
    if (!user) return;
    
    setLoadingTeachers(true);
    try {
      const teachersData = await teacherQueries.getTeachersBySchool(SCHOOL_ID);
      setTeachersList(teachersData);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Load pending testimonials from Firestore
  const loadPendingTestimonials = async () => {
    if (!user || !db) return;
    
    setLoadingPendingTestimonials(true);
    try {
      const testimonialsRef = collection(db, 'testimonials_submissions');
      const q = query(
        testimonialsRef,
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pending = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Array<{
          id: string;
          name: string;
          designation: string;
          message: string;
          photoUrl?: string;
          submittedBy: string;
          submittedByRole: string;
          submittedAt: any;
          status: 'pending' | 'approved' | 'rejected';
        }>;
        setPendingTestimonials(pending);
        setLoadingPendingTestimonials(false);
      }, (error) => {
        console.error('Error loading pending testimonials:', error);
        setLoadingPendingTestimonials(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up pending testimonials listener:', error);
      setLoadingPendingTestimonials(false);
    }
  };

  // Approve testimonial
  const handleApproveTestimonial = async (testimonial: any) => {
    if (!user || !db) return;
    
    try {
      // Update status in Firestore
      const testimonialRef = doc(db, 'testimonials_submissions', testimonial.id);
      await updateDoc(testimonialRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: user.email || userData?.email || 'admin'
      });

      // Add to homeTestimonials
      const newTestimonial = {
        id: Date.now().toString(),
        name: testimonial.name || 'ব্যবহারকারী',
        designation: testimonial.designation || 'ব্যবহারকারী',
        message: testimonial.message || 'মতামত দেওয়ার জন্য ধন্যবাদ।',
        photoUrl: testimonial.photoUrl || '',
        isActive: true,
        isApproved: true, // Mark as approved
        order: (formData.homeTestimonials?.length || 0) + 1
      };
      
      // Update formData with new testimonial
      const updatedTestimonials = [...(formData.homeTestimonials || []), newTestimonial];
      const updatedFormData = {
        ...formData,
        homeTestimonials: updatedTestimonials
      };
      
      setFormData(updatedFormData);

      // Save settings to persist the approved testimonial - save directly with updated testimonials
      console.log('Saving testimonials (from testimonial submission):', updatedTestimonials.length, updatedTestimonials);
      
      try {
        // Save settings directly with updated testimonials
        // Ensure testimonials section is enabled (default to true if not explicitly false)
        const settingsToSave = {
          homeTestimonialsEnabled: updatedFormData.homeTestimonialsEnabled === false ? false : true,
          homeTestimonialsTitle: updatedFormData.homeTestimonialsTitle || 'মতামত',
          homeTestimonials: updatedTestimonials,
          updatedBy: user.email || userData?.email || 'admin'
        };
        
        await settingsQueries.saveSettings(settingsToSave, user.email || userData?.email || 'admin');
        console.log('Settings saved successfully (testimonial):', settingsToSave);
      } catch (saveError) {
        console.error('Error saving testimonials:', saveError);
        // Fallback to regular save
        await handleSaveSettings();
      }
      
      setSaveMessage('মতামত অনুমোদন করা হয়েছে এবং পাবলিক পেজে যোগ করা হয়েছে!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error approving testimonial:', error);
      setSaveMessage('মতামত অনুমোদন করতে সমস্যা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Reject testimonial
  const handleRejectTestimonial = async (testimonialId: string) => {
    if (!user || !db) return;
    
    if (!confirm('আপনি কি এই মতামতটি প্রত্যাখ্যান করতে চান?')) {
      return;
    }
    
    try {
      const testimonialRef = doc(db, 'testimonials_submissions', testimonialId);
      await updateDoc(testimonialRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: user.email || userData?.email || 'admin'
      });
      
      setSaveMessage('মতামত প্রত্যাখ্যান করা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error rejecting testimonial:', error);
      setSaveMessage('মতামত প্রত্যাখ্যান করতে সমস্যা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Load pending parent feedback from Firestore
  const loadPendingParentFeedback = async () => {
    if (!user || !db) return;
    
    setLoadingParentFeedback(true);
    try {
      const feedbackRef = collection(db, 'parentFeedback');
      
      // Try with orderBy first, fallback to without orderBy if index is missing
      let q;
      try {
        q = query(
          feedbackRef,
          where('status', '==', 'new'),
          where('schoolId', '==', SCHOOL_ID),
          orderBy('createdAt', 'desc')
        );
      } catch (error) {
        // If orderBy fails (missing index), use query without orderBy
        console.warn('OrderBy failed, using query without orderBy:', error);
        q = query(
          feedbackRef,
          where('status', '==', 'new'),
          where('schoolId', '==', SCHOOL_ID)
        );
      }
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pending = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Array<{
          id: string;
          parentId: string;
          parentName: string;
          parentEmail: string;
          parentPhone?: string;
          category: string;
          subject: string;
          message: string;
          rating: number;
          suggestion: string;
          status: 'new' | 'approved' | 'rejected';
          createdAt: any;
        }>;
        
        // Sort by createdAt if available (client-side fallback)
        pending.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime; // Descending order
        });
        
        setPendingParentFeedback(pending);
        setLoadingParentFeedback(false);
      }, (error) => {
        console.error('Error loading pending parent feedback:', error);
        setLoadingParentFeedback(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up pending parent feedback listener:', error);
      setLoadingParentFeedback(false);
    }
  };

  // Approve parent feedback
  const handleApproveParentFeedback = async (feedback: any) => {
    if (!user || !db) return;
    
    try {
      // Update status in Firestore
      const feedbackRef = doc(db, 'parentFeedback', feedback.id);
      await updateDoc(feedbackRef, {
        status: 'approved',
        responded: true,
        approvedAt: serverTimestamp(),
        approvedBy: user.email || userData?.email || 'admin',
        updatedAt: serverTimestamp()
      });

      // Add to homeTestimonials as a testimonial
      // Ensure message is not empty - use message or suggestion, or a default message
      const testimonialMessage = (feedback.message && feedback.message.trim()) 
        || (feedback.suggestion && feedback.suggestion.trim()) 
        || 'মতামত দেওয়ার জন্য ধন্যবাদ।';
      
      const newTestimonial = {
        id: Date.now().toString(),
        name: feedback.parentName || 'অভিভাবক',
        designation: 'অভিভাবক', // Always show "অভিভাবক" for parent feedback
        message: testimonialMessage,
        photoUrl: '', // Can be added later if needed
        isActive: true,
        isApproved: true,
        order: (formData.homeTestimonials?.length || 0) + 1,
        submittedByRole: 'parent',
        rating: feedback.rating || 0
      };
      
      // Update formData with new testimonial
      const updatedTestimonials = [...(formData.homeTestimonials || []), newTestimonial];
      const updatedFormData = {
        ...formData,
        homeTestimonials: updatedTestimonials
      };
      
      setFormData(updatedFormData);

      // Save settings to persist the approved feedback - save directly with updated testimonials
      console.log('Saving testimonials:', updatedTestimonials.length, updatedTestimonials);
      
      try {
        // Save settings directly with updated testimonials
        // Ensure testimonials section is enabled (default to true if not explicitly false)
        const settingsToSave = {
          homeTestimonialsEnabled: updatedFormData.homeTestimonialsEnabled === false ? false : true,
          homeTestimonialsTitle: updatedFormData.homeTestimonialsTitle || 'মতামত',
          homeTestimonials: updatedTestimonials,
          updatedBy: user.email || userData?.email || 'admin'
        };
        
        await settingsQueries.saveSettings(settingsToSave, user.email || userData?.email || 'admin');
        console.log('Settings saved successfully (parent feedback):', settingsToSave);
      } catch (saveError) {
        console.error('Error saving testimonials:', saveError);
        // Fallback to regular save
        await handleSaveSettings();
      }
      
      setSaveMessage('অভিভাবকের মতামত অনুমোদন করা হয়েছে এবং পাবলিক পেজে যোগ করা হয়েছে!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error approving parent feedback:', error);
      setSaveMessage('অভিভাবকের মতামত অনুমোদন করতে সমস্যা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Reject parent feedback
  const handleRejectParentFeedback = async (feedbackId: string) => {
    if (!user || !db) return;
    
    if (!confirm('আপনি কি এই মতামতটি প্রত্যাখ্যান করতে চান?')) {
      return;
    }
    
    try {
      const feedbackRef = doc(db, 'parentFeedback', feedbackId);
      await updateDoc(feedbackRef, {
        status: 'rejected',
        responded: true,
        rejectedAt: serverTimestamp(),
        rejectedBy: user.email || userData?.email || 'admin',
        updatedAt: serverTimestamp()
      });
      
      setSaveMessage('অভিভাবকের মতামত প্রত্যাখ্যান করা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error rejecting parent feedback:', error);
      setSaveMessage('অভিভাবকের মতামত প্রত্যাখ্যান করতে সমস্যা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Helper function to get category label
  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'general': 'সাধারণ মতামত',
      'academic': 'একাডেমিক',
      'facility': 'সুবিধা',
      'communication': 'যোগাযোগ',
      'suggestion': 'পরামর্শ',
      'complaint': 'অভিযোগ'
    };
    return categoryMap[category] || category;
  };

  // Load all parent feedback for viewing
  const loadAllParentFeedback = async () => {
    if (!user || !db) return;
    
    setLoadingAllFeedback(true);
    try {
      const feedbackRef = collection(db, 'parentFeedback');
      
      // Try with orderBy first, fallback to without orderBy if index is missing
      let q;
      try {
        q = query(
          feedbackRef,
          where('schoolId', '==', SCHOOL_ID),
          orderBy('createdAt', 'desc')
        );
      } catch (error) {
        console.warn('OrderBy failed, using query without orderBy:', error);
        q = query(
          feedbackRef,
          where('schoolId', '==', SCHOOL_ID)
        );
      }
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allFeedback = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Array<{
          id: string;
          parentId: string;
          parentName: string;
          parentEmail: string;
          parentPhone?: string;
          category: string;
          subject: string;
          message: string;
          rating: number;
          suggestion: string;
          status: 'new' | 'approved' | 'rejected';
          createdAt: any;
          approvedAt?: any;
          rejectedAt?: any;
          approvedBy?: string;
          rejectedBy?: string;
        }>;
        
        // Sort by createdAt if available (client-side fallback)
        allFeedback.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                       (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                       (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return bTime - aTime; // Descending order
        });
        
        setAllParentFeedback(allFeedback);
        setLoadingAllFeedback(false);
      }, (error) => {
        console.error('Error loading all parent feedback:', error);
        setLoadingAllFeedback(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up all parent feedback listener:', error);
      setLoadingAllFeedback(false);
    }
  };

  // Delete parent feedback
  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!user || !db) return;
    
    if (!confirm('আপনি কি এই মতামতটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।')) {
      return;
    }
    
    try {
      const feedbackRef = doc(db, 'parentFeedback', feedbackId);
      await deleteDoc(feedbackRef);
      
      setSaveMessage('মতামত সফলভাবে মুছে ফেলা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      setSaveMessage('মতামত মুছে ফেলতে সমস্যা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await settingsQueries.getSettings();
      if (settings) {
        setFormData({
          contactPageTitle: settings.contactPageTitle || formData.contactPageTitle,
          contactPageSubtitle: settings.contactPageSubtitle || formData.contactPageSubtitle,
          contactPhones: settings.contactPhones || formData.contactPhones,
          contactEmails: settings.contactEmails || formData.contactEmails,
          contactAddress: settings.contactAddress || formData.contactAddress,
          contactHours: settings.contactHours || formData.contactHours,
          contactDepartments: settings.contactDepartments || formData.contactDepartments,
          contactMapEmbedCode: settings.contactMapEmbedCode || '',
          contactMapAddress: settings.contactMapAddress || formData.contactMapAddress,
          contactSocialMediaFacebook: settings.contactSocialMedia?.facebook || '',
          contactSocialMediaTwitter: settings.contactSocialMedia?.twitter || '',
          contactSocialMediaInstagram: settings.contactSocialMedia?.instagram || '',
          contactSocialMediaYoutube: settings.contactSocialMedia?.youtube || '',
          contactFormSubjects: settings.contactFormSubjects || formData.contactFormSubjects,
          galleryPageTitle: settings.galleryPageTitle || formData.galleryPageTitle,
          galleryPageSubtitle: settings.galleryPageSubtitle || formData.galleryPageSubtitle,
          galleryCategories: settings.galleryCategories || formData.galleryCategories,
          galleryEvents: settings.galleryEvents || formData.galleryEvents,
          galleryItems: settings.galleryItems || [],
          aboutPageTitle: settings.aboutPageTitle || formData.aboutPageTitle,
          aboutPageSubtitle: settings.aboutPageSubtitle || formData.aboutPageSubtitle,
          aboutIntro: settings.aboutIntro || formData.aboutIntro,
          aboutImageUrl: settings.aboutImageUrl || formData.aboutImageUrl || '',
          aboutMission: settings.aboutMission || formData.aboutMission,
          aboutVision: settings.aboutVision || formData.aboutVision,
          aboutStats: settings.aboutStats || formData.aboutStats,
          aboutValues: settings.aboutValues || formData.aboutValues,
          aboutAchievements: settings.aboutAchievements || formData.aboutAchievements,
          aboutTeam: settings.aboutTeam || [],
          homeSliderSlides: (settings.homeSliderSlides || formData.homeSliderSlides).map((slide: any) => ({
            ...slide,
            imageUrl: slide.imageUrl || ''
          })),
          homeAdmissionEnabled: settings.homeAdmissionEnabled !== undefined ? settings.homeAdmissionEnabled : formData.homeAdmissionEnabled,
          homeAdmissionTitle: settings.homeAdmissionTitle || formData.homeAdmissionTitle,
          homeAdmissionApplyNow: settings.homeAdmissionApplyNow || formData.homeAdmissionApplyNow,
          homeAdmissionClasses: settings.homeAdmissionClasses || formData.homeAdmissionClasses,
          homeAdmissionClassesLabel: settings.homeAdmissionClassesLabel || formData.homeAdmissionClassesLabel,
          homeAdmissionOpen: settings.homeAdmissionOpen || formData.homeAdmissionOpen,
          homeAdmissionOpenLabel: settings.homeAdmissionOpenLabel || formData.homeAdmissionOpenLabel,
          homeAdmissionDeadline: settings.homeAdmissionDeadline || formData.homeAdmissionDeadline,
          homeAdmissionAdmitNow: settings.homeAdmissionAdmitNow || formData.homeAdmissionAdmitNow,
          homeAdmissionOfficeHours: settings.homeAdmissionOfficeHours || formData.homeAdmissionOfficeHours,
          homeAdmissionContactPhone: settings.homeAdmissionContactPhone || formData.homeAdmissionContactPhone,
          homeAdmissionExperience: settings.homeAdmissionExperience || formData.homeAdmissionExperience,
          homeTopStudentsEnabled: (settings as any).homeTopStudentsEnabled !== undefined ? (settings as any).homeTopStudentsEnabled : formData.homeTopStudentsEnabled,
          homeTopStudentsTitle: (settings as any).homeTopStudentsTitle || formData.homeTopStudentsTitle,
          homeTopStudents: (settings as any).homeTopStudents || formData.homeTopStudents,
          homeLinksEnabled: (settings as any).homeLinksEnabled !== undefined ? (settings as any).homeLinksEnabled : formData.homeLinksEnabled,
          homeLinksTitle: (settings as any).homeLinksTitle || formData.homeLinksTitle,
          homeLinks: (settings as any).homeLinks || formData.homeLinks,
          homeMessageEnabled: (settings as any).homeMessageEnabled !== undefined ? (settings as any).homeMessageEnabled : formData.homeMessageEnabled,
          homeMessageTitle: (settings as any).homeMessageTitle || formData.homeMessageTitle,
          homeMessage: (settings as any).homeMessage || formData.homeMessage,
          homeTestimonialsEnabled: (settings as any).homeTestimonialsEnabled !== undefined ? (settings as any).homeTestimonialsEnabled : formData.homeTestimonialsEnabled,
          homeTestimonialsTitle: (settings as any).homeTestimonialsTitle || formData.homeTestimonialsTitle,
          homeTestimonials: (settings as any).homeTestimonials || formData.homeTestimonials,
          homeCommitteeEnabled: (settings as any).homeCommitteeEnabled !== undefined ? (settings as any).homeCommitteeEnabled : formData.homeCommitteeEnabled,
          homeCommitteeTitle: (settings as any).homeCommitteeTitle || formData.homeCommitteeTitle,
          homeCommittee: (settings as any).homeCommittee || formData.homeCommittee,
          homeTeachersEnabled: (settings as any).homeTeachersEnabled !== undefined ? (settings as any).homeTeachersEnabled : formData.homeTeachersEnabled,
          homeTeachersTitle: (settings as any).homeTeachersTitle || formData.homeTeachersTitle,
          homeTeachers: (settings as any).homeTeachers || formData.homeTeachers,
          websiteLogo: (settings as any).websiteLogo || '',
          favicon: (settings as any).favicon || ''
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setSaving(true);
    setSaveMessage('');

    try {
      const contactSocialMedia = {
        facebook: formData.contactSocialMediaFacebook || '',
        twitter: formData.contactSocialMediaTwitter || '',
        instagram: formData.contactSocialMediaInstagram || '',
        youtube: formData.contactSocialMediaYoutube || ''
      };

      const settingsToSave: Partial<SystemSettings> = {
        // Contact page content
        contactPageTitle: formData.contactPageTitle,
        contactPageSubtitle: formData.contactPageSubtitle,
        contactPhones: formData.contactPhones,
        contactEmails: formData.contactEmails,
        contactAddress: formData.contactAddress,
        contactHours: formData.contactHours,
        contactDepartments: formData.contactDepartments,
        contactMapEmbedCode: formData.contactMapEmbedCode,
        contactMapAddress: formData.contactMapAddress,
        contactSocialMedia,
        contactFormSubjects: formData.contactFormSubjects,

        // Gallery page content
        galleryPageTitle: formData.galleryPageTitle,
        galleryPageSubtitle: formData.galleryPageSubtitle,
        galleryCategories: formData.galleryCategories,
        galleryEvents: formData.galleryEvents,
        galleryItems: formData.galleryItems,

        // About page content
        aboutPageTitle: formData.aboutPageTitle,
        aboutPageSubtitle: formData.aboutPageSubtitle,
        aboutIntro: formData.aboutIntro,
        aboutImageUrl: formData.aboutImageUrl || '',
        aboutMission: formData.aboutMission,
        aboutVision: formData.aboutVision,
        aboutStats: formData.aboutStats,
        aboutValues: formData.aboutValues,
        aboutAchievements: formData.aboutAchievements,
        aboutTeam: formData.aboutTeam,

        // Home Page Content
        homeSliderSlides: formData.homeSliderSlides,
        homeAdmissionEnabled: formData.homeAdmissionEnabled,
        homeAdmissionTitle: formData.homeAdmissionTitle,
        homeAdmissionApplyNow: formData.homeAdmissionApplyNow,
        homeAdmissionClasses: formData.homeAdmissionClasses,
        homeAdmissionClassesLabel: formData.homeAdmissionClassesLabel,
        homeAdmissionOpen: formData.homeAdmissionOpen,
        homeAdmissionOpenLabel: formData.homeAdmissionOpenLabel,
        homeAdmissionDeadline: formData.homeAdmissionDeadline,
        homeAdmissionAdmitNow: formData.homeAdmissionAdmitNow,
        homeAdmissionOfficeHours: formData.homeAdmissionOfficeHours,
        homeAdmissionContactPhone: formData.homeAdmissionContactPhone,
        homeAdmissionExperience: formData.homeAdmissionExperience,

        // Home Page Top Students (কৃতি)
        homeTopStudentsEnabled: formData.homeTopStudentsEnabled,
        homeTopStudentsTitle: formData.homeTopStudentsTitle,
        homeTopStudents: formData.homeTopStudents,

        // Home Page Links (লিঙ্ক)
        homeLinksEnabled: formData.homeLinksEnabled,
        homeLinksTitle: formData.homeLinksTitle,
        homeLinks: formData.homeLinks,

        // Home Page Message (বানী)
        homeMessageEnabled: formData.homeMessageEnabled,
        homeMessageTitle: formData.homeMessageTitle,
        homeMessage: formData.homeMessage,

        // Home Page Testimonials (মতামত)
        homeTestimonialsEnabled: formData.homeTestimonialsEnabled,
        homeTestimonialsTitle: formData.homeTestimonialsTitle,
        homeTestimonials: formData.homeTestimonials,

        // Home Page Managing Committee (ম্যানেজিং কমিটি)
        homeCommitteeEnabled: formData.homeCommitteeEnabled,
        homeCommitteeTitle: formData.homeCommitteeTitle,
        homeCommittee: formData.homeCommittee,

        // Home Page Teachers (শিক্ষক)
        homeTeachersEnabled: formData.homeTeachersEnabled,
        homeTeachersTitle: formData.homeTeachersTitle,
        homeTeachers: formData.homeTeachers,

        // Logo & Favicon
        updatedBy: user.email || 'admin',
        ...(formData.websiteLogo && { websiteLogo: formData.websiteLogo }),
        ...(formData.favicon && { favicon: formData.favicon })
      } as any;

      await settingsQueries.saveSettings(settingsToSave, user.email || 'admin');

      setSaveMessage('সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
      <AdminLayout title="পাবলিক পেজ নিয়ন্ত্রণ" subtitle="যোগাযোগ, গ্যালারী এবং পরিচিতি পেজ নিয়ন্ত্রণ করুন">
        <div className="space-y-6">
          {/* Save Message */}
          {saveMessage && (
            <div className={`p-4 rounded-lg flex items-center space-x-2 ${
              saveMessage.includes('সফল') || saveMessage.includes('successfully')
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {saveMessage.includes('সফল') || saveMessage.includes('successfully') ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{saveMessage}</span>
            </div>
          )}

          {/* Page Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">পেজ নির্বাচন করুন</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedPage('home')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  selectedPage === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>হোম</span>
              </button>
              <button
                onClick={() => setSelectedPage('contact')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  selectedPage === 'contact'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Phone className="w-5 h-5" />
                <span>যোগাযোগ</span>
              </button>
              <button
                onClick={() => setSelectedPage('gallery')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  selectedPage === 'gallery'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span>গ্যালারী</span>
              </button>
              <button
                onClick={() => setSelectedPage('about')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  selectedPage === 'about'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Info className="w-5 h-5" />
                <span>পরিচিতি</span>
              </button>
              <button
                onClick={() => setSelectedPage('question')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  selectedPage === 'question'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>প্রশ্নপত্র</span>
              </button>
              <button
                onClick={() => setSelectedPage('logo')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  selectedPage === 'logo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span>লোগো ও ফ্যাভিকন</span>
              </button>
              <div className="ml-auto">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Home Page Tabs */}
          {selectedPage === 'home' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex space-x-2 overflow-x-auto">
                  {[
                    { id: 'slider', label: 'স্লাইডার', icon: ImageIcon },
                    { id: 'admission', label: 'ভর্তি চলছে', icon: GraduationCap },
                    { id: 'achievements', label: 'কৃতি', icon: Award },
                    { id: 'links', label: 'লিঙ্ক', icon: Globe },
                    { id: 'message', label: 'বানী', icon: FileText },
                    { id: 'testimonials', label: 'মতামত', icon: Heart },
                    { id: 'committee', label: 'ম্যানেজিং কমিটি', icon: Shield },
                    { id: 'teachers', label: 'শিক্ষক', icon: UserIcon }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setHomeTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center space-x-2 ${
                        homeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {homeTab === 'slider' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">স্লাইডার স্লাইডসমূহ</h3>
                      <button
                        type="button"
                        onClick={() => {
                          const newSlide = {
                            id: Date.now().toString(),
                            title: '',
                            subtitle: '',
                            bgGradient: 'from-blue-900 via-purple-900 to-teal-800',
                            aiText: '',
                            aiSubtext: '',
                            imageUrl: '',
                            order: (formData.homeSliderSlides?.length || 0) + 1,
                            isActive: true
                          };
                          setFormData({
                            ...formData,
                            homeSliderSlides: [...(formData.homeSliderSlides || []), newSlide]
                          });
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>স্লাইড যোগ করুন</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(formData.homeSliderSlides || []).map((slide, index) => (
                        <div key={slide.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">স্লাইড #{index + 1}</span>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={slide.isActive !== false}
                                  onChange={(e) => {
                                    const updated = [...(formData.homeSliderSlides || [])];
                                    updated[index] = { ...slide, isActive: e.target.checked };
                                    setFormData({ ...formData, homeSliderSlides: updated });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-600">সক্রিয়</span>
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeSliderSlides || [])];
                                    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                    updated.forEach((s, i) => {
                                      s.order = i + 1;
                                    });
                                    setFormData({ ...formData, homeSliderSlides: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                              )}
                              {index < (formData.homeSliderSlides?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeSliderSlides || [])];
                                    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                                    updated.forEach((s, i) => {
                                      s.order = i + 1;
                                    });
                                    setFormData({ ...formData, homeSliderSlides: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formData.homeSliderSlides || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, homeSliderSlides: updated });
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                              <input
                                type="text"
                                value={slide.title}
                                onChange={(e) => {
                                  const updated = [...(formData.homeSliderSlides || [])];
                                  updated[index] = { ...slide, title: e.target.value };
                                  setFormData({ ...formData, homeSliderSlides: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="আমার স্কুল"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">সাবটাইটেল</label>
                              <input
                                type="text"
                                value={slide.subtitle}
                                onChange={(e) => {
                                  const updated = [...(formData.homeSliderSlides || [])];
                                  updated[index] = { ...slide, subtitle: e.target.value };
                                  setFormData({ ...formData, homeSliderSlides: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="আধুনিক শিক্ষা ও প্রযুক্তির সমন্বয়"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">AI Text</label>
                              <input
                                type="text"
                                value={slide.aiText}
                                onChange={(e) => {
                                  const updated = [...(formData.homeSliderSlides || [])];
                                  updated[index] = { ...slide, aiText: e.target.value };
                                  setFormData({ ...formData, homeSliderSlides: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="AI"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">AI Subtext</label>
                              <input
                                type="text"
                                value={slide.aiSubtext}
                                onChange={(e) => {
                                  const updated = [...(formData.homeSliderSlides || [])];
                                  updated[index] = { ...slide, aiSubtext: e.target.value };
                                  setFormData({ ...formData, homeSliderSlides: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Smart Education"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">ব্যাকগ্রাউন্ড গ্রেডিয়েন্ট (Tailwind classes)</label>
                              <input
                                type="text"
                                value={slide.bgGradient}
                                onChange={(e) => {
                                  const updated = [...(formData.homeSliderSlides || [])];
                                  updated[index] = { ...slide, bgGradient: e.target.value };
                                  setFormData({ ...formData, homeSliderSlides: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="from-blue-900 via-purple-900 to-teal-800"
                              />
                              <p className="text-xs text-gray-500 mt-1">উদাহরণ: from-blue-900 via-purple-900 to-teal-800</p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">স্লাইডার ছবি</label>
                              <MediaUploader
                                category="school"
                                schoolId={SCHOOL_ID}
                                uploadedBy={user?.email || userData?.email || 'admin'}
                                onUploadSuccess={(media) => {
                                  const updated = [...(formData.homeSliderSlides || [])];
                                  updated[index] = { ...slide, imageUrl: media.url };
                                  setFormData({ ...formData, homeSliderSlides: updated });
                                }}
                                className="w-full"
                                acceptedTypes="image/*"
                              />
                              {slide.imageUrl && (
                                <div className="mt-4">
                                  <img
                                    src={slide.imageUrl}
                                    alt={`Slider ${index + 1}`}
                                    className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.homeSliderSlides || [])];
                                      updated[index] = { ...slide, imageUrl: '' };
                                      setFormData({ ...formData, homeSliderSlides: updated });
                                    }}
                                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                                  >
                                    ছবি সরান
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {homeTab === 'admission' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">ভর্তি চলছে সেকশন</h3>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.homeAdmissionEnabled}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">সেকশন সক্রিয় করুন</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionTitle}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionTitle: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ভর্তি চলছে সেশন ২০২৪"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">এখনই আবেদন করুন (Button Text)</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionApplyNow}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionApplyNow: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="🎓 আবেদন করুন এখনই"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">শ্রেণী</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionClasses}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionClasses: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="৭ম-১০ম"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">শ্রেণী লেবেল</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionClassesLabel}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionClassesLabel: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="শ্রেণী সমূহ"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionOpen}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionOpen: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="খোলা"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">স্ট্যাটাস লেবেল</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionOpenLabel}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionOpenLabel: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="আবেদন প্রক্রিয়া"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">শেষ তারিখ</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionDeadline}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionDeadline: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="আবেদনের শেষ তারিখ: ৩০ ডিসেম্বর ২০২৪"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ভর্তি হন Button Text</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionAdmitNow}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionAdmitNow: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="এখনই ভর্তি হন"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">অফিস সময়</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionOfficeHours}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionOfficeHours: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="০৮:০০ - ১৫:০০"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">যোগাযোগ নম্বর</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionContactPhone}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionContactPhone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="০১৭৮৮-৮৮৮৮"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">শিক্ষার অভিজ্ঞতা</label>
                        <input
                          type="text"
                          value={formData.homeAdmissionExperience}
                          onChange={(e) => setFormData({ ...formData, homeAdmissionExperience: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="১৫ বছর"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {homeTab === 'achievements' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">কৃতি সেকশন</h3>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.homeTopStudentsEnabled}
                          onChange={(e) => setFormData({ ...formData, homeTopStudentsEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">সেকশন সক্রিয় করুন</span>
                      </label>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.homeTopStudentsTitle}
                        onChange={(e) => setFormData({ ...formData, homeTopStudentsTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="কৃতি"
                      />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-900">কৃতি শিক্ষার্থী</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newStudent = {
                            id: Date.now().toString(),
                            name: '',
                            className: '',
                            achievement: '',
                            photoUrl: '',
                            isActive: true,
                            order: (formData.homeTopStudents?.length || 0) + 1
                          };
                          setFormData({
                            ...formData,
                            homeTopStudents: [...(formData.homeTopStudents || []), newStudent]
                          });
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>শিক্ষার্থী যোগ করুন</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(formData.homeTopStudents || []).map((student, index) => (
                        <div key={student.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={student.isActive !== false}
                                  onChange={(e) => {
                                    const updated = [...(formData.homeTopStudents || [])];
                                    updated[index] = { ...student, isActive: e.target.checked };
                                    setFormData({ ...formData, homeTopStudents: updated });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-600">সক্রিয়</span>
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeTopStudents || [])];
                                    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                    updated.forEach((s, i) => {
                                      s.order = i + 1;
                                    });
                                    setFormData({ ...formData, homeTopStudents: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                              )}
                              {index < (formData.homeTopStudents?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeTopStudents || [])];
                                    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                                    updated.forEach((s, i) => {
                                      s.order = i + 1;
                                    });
                                    setFormData({ ...formData, homeTopStudents: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formData.homeTopStudents || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, homeTopStudents: updated });
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">শিক্ষার্থী নির্বাচন করুন</label>
                              <select
                                value={student.uid || student.studentId || ''}
                                onChange={(e) => {
                                  const selectedStudent = studentsList.find(s => s.uid === e.target.value || s.studentId === e.target.value);
                                  if (selectedStudent) {
                                    // Build class name with section and group
                                    let className = selectedStudent.class || '';
                                    if (selectedStudent.section) {
                                      className += ` (${selectedStudent.section})`;
                                    }
                                    if (selectedStudent.group) {
                                      className += ` - ${selectedStudent.group}`;
                                    }
                                    
                                    const updated = [...(formData.homeTopStudents || [])];
                                    updated[index] = {
                                      ...student,
                                      uid: selectedStudent.uid,
                                      studentId: selectedStudent.studentId || '',
                                      name: selectedStudent.name || selectedStudent.displayName || '',
                                      className: className || '',
                                      photoUrl: selectedStudent.profileImage || student.photoUrl || ''
                                    };
                                    setFormData({ ...formData, homeTopStudents: updated });
                                  } else if (e.target.value === '') {
                                    // Clear student selection
                                    const updated = [...(formData.homeTopStudents || [])];
                                    updated[index] = {
                                      ...student,
                                      uid: '',
                                      studentId: '',
                                      name: '',
                                      className: '',
                                      photoUrl: ''
                                    };
                                    setFormData({ ...formData, homeTopStudents: updated });
                                  }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loadingStudents}
                              >
                                <option value="">শিক্ষার্থী নির্বাচন করুন</option>
                                {studentsList.map((s) => (
                                  <option key={s.uid} value={s.uid}>
                                    {s.name || s.displayName || 'Unknown'} - {s.class || 'No Class'} {s.section ? `(${s.section})` : ''} {s.group ? `- ${s.group}` : ''} {s.rollNumber ? `- Roll: ${s.rollNumber}` : ''}
                                  </option>
                                ))}
                              </select>
                              {loadingStudents && (
                                <p className="text-xs text-gray-500 mt-1">শিক্ষার্থী লোড হচ্ছে...</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">নাম (ঐচ্ছিক - manually edit করতে পারেন)</label>
                              <input
                                type="text"
                                value={student.name}
                                onChange={(e) => {
                                  const updated = [...(formData.homeTopStudents || [])];
                                  updated[index] = { ...student, name: e.target.value };
                                  setFormData({ ...formData, homeTopStudents: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="তাসনিয়া আকতার"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                ক্লাস {student.uid || student.studentId ? '(আসল ক্লাস - ডাটাবেস থেকে)' : '(Manual)'}
                              </label>
                              <input
                                type="text"
                                value={student.className}
                                onChange={(e) => {
                                  const updated = [...(formData.homeTopStudents || [])];
                                  updated[index] = { ...student, className: e.target.value };
                                  setFormData({ ...formData, homeTopStudents: updated });
                                }}
                                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  student.uid || student.studentId ? 'bg-blue-50 font-medium' : 'bg-white'
                                }`}
                                placeholder="ক্লাস টেন"
                                readOnly={!!(student.uid || student.studentId)}
                              />
                              {(student.uid || student.studentId) && (
                                <p className="text-xs text-blue-600 mt-1">
                                  ✓ আসল ক্লাস ডাটাবেস থেকে দেখানো হচ্ছে (Section & Group সহ)
                                </p>
                              )}
                              {!(student.uid || student.studentId) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Manual class name input. Student select করলে automatic আসবে
                                </p>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">অর্জন (ঐচ্ছিক)</label>
                              <input
                                type="text"
                                value={student.achievement || ''}
                                onChange={(e) => {
                                  const updated = [...(formData.homeTopStudents || [])];
                                  updated[index] = { ...student, achievement: e.target.value };
                                  setFormData({ ...formData, homeTopStudents: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="এসএসসি পরীক্ষায় A+"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">ছবি (ঐচ্ছিক)</label>
                              <MediaUploader
                                category="students"
                                schoolId={SCHOOL_ID}
                                uploadedBy={user?.email || userData?.email || 'admin'}
                                onUploadSuccess={(media) => {
                                  const updated = [...(formData.homeTopStudents || [])];
                                  updated[index] = { ...student, photoUrl: media.url };
                                  setFormData({ ...formData, homeTopStudents: updated });
                                }}
                                className="w-full"
                                acceptedTypes="image/*"
                              />
                              {student.photoUrl && (
                                <div className="mt-4">
                                  <img
                                    src={student.photoUrl}
                                    alt={student.name}
                                    className="w-24 h-24 object-cover rounded-full border border-gray-300"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.homeTopStudents || [])];
                                      updated[index] = { ...student, photoUrl: '' };
                                      setFormData({ ...formData, homeTopStudents: updated });
                                    }}
                                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                                  >
                                    ছবি সরান
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {homeTab === 'links' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">লিঙ্ক সেকশন</h3>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.homeLinksEnabled}
                          onChange={(e) => setFormData({ ...formData, homeLinksEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">সেকশন সক্রিয় করুন</span>
                      </label>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.homeLinksTitle}
                        onChange={(e) => setFormData({ ...formData, homeLinksTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="লিঙ্ক"
                      />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-900">লিঙ্কসমূহ</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newLink = {
                            id: Date.now().toString(),
                            title: '',
                            url: '',
                            isActive: true,
                            order: (formData.homeLinks?.length || 0) + 1
                          };
                          setFormData({
                            ...formData,
                            homeLinks: [...(formData.homeLinks || []), newLink]
                          });
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>লিঙ্ক যোগ করুন</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(formData.homeLinks || []).map((link, index) => (
                        <div key={link.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={link.isActive !== false}
                                  onChange={(e) => {
                                    const updated = [...(formData.homeLinks || [])];
                                    updated[index] = { ...link, isActive: e.target.checked };
                                    setFormData({ ...formData, homeLinks: updated });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-600">সক্রিয়</span>
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeLinks || [])];
                                    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                    updated.forEach((l, i) => {
                                      l.order = i + 1;
                                    });
                                    setFormData({ ...formData, homeLinks: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                              )}
                              {index < (formData.homeLinks?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeLinks || [])];
                                    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                                    updated.forEach((l, i) => {
                                      l.order = i + 1;
                                    });
                                    setFormData({ ...formData, homeLinks: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formData.homeLinks || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, homeLinks: updated });
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                              <input
                                type="text"
                                value={link.title}
                                onChange={(e) => {
                                  const updated = [...(formData.homeLinks || [])];
                                  updated[index] = { ...link, title: e.target.value };
                                  setFormData({ ...formData, homeLinks: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="শিক্ষা মন্ত্রণালয়"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                              <input
                                type="url"
                                value={link.url}
                                onChange={(e) => {
                                  const updated = [...(formData.homeLinks || [])];
                                  updated[index] = { ...link, url: e.target.value };
                                  setFormData({ ...formData, homeLinks: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://www.moedu.gov.bd"
                              />
                            </div>
                            {link.url && (
                              <div className="md:col-span-2">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-2"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>লিঙ্ক টেস্ট করুন</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {homeTab === 'message' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">বানী সেকশন</h3>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.homeMessageEnabled}
                          onChange={(e) => setFormData({ ...formData, homeMessageEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">সেকশন সক্রিয় করুন</span>
                      </label>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.homeMessageTitle}
                        onChange={(e) => setFormData({ ...formData, homeMessageTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="বানী"
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">লেখকের নাম</label>
                        <input
                          type="text"
                          value={formData.homeMessage.author}
                          onChange={(e) => setFormData({
                            ...formData,
                            homeMessage: { ...formData.homeMessage, author: e.target.value }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="প্রধান শিক্ষক"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">পদবী</label>
                        <input
                          type="text"
                          value={formData.homeMessage.authorTitle}
                          onChange={(e) => setFormData({
                            ...formData,
                            homeMessage: { ...formData.homeMessage, authorTitle: e.target.value }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="প্রধান শিক্ষক"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">বানী</label>
                        <textarea
                          value={formData.homeMessage.message}
                          onChange={(e) => setFormData({
                            ...formData,
                            homeMessage: { ...formData.homeMessage, message: e.target.value }
                          })}
                          rows={6}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="শিক্ষা হলো মানব জীবনের সবচেয়ে গুরুত্বপূর্ণ সম্পদ।"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ছবি (ঐচ্ছিক)</label>
                        <MediaUploader
                          category="messages"
                          schoolId={SCHOOL_ID}
                          uploadedBy={user?.email || userData?.email || 'admin'}
                          onUploadSuccess={(media) => {
                            setFormData({
                              ...formData,
                              homeMessage: { ...formData.homeMessage, photoUrl: media.url }
                            });
                          }}
                          className="w-full"
                          acceptedTypes="image/*"
                        />
                        {formData.homeMessage.photoUrl && (
                          <div className="mt-4">
                            <img
                              src={formData.homeMessage.photoUrl}
                              alt={formData.homeMessage.author}
                              className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  homeMessage: { ...formData.homeMessage, photoUrl: '' }
                                });
                              }}
                              className="mt-2 text-sm text-red-600 hover:text-red-700"
                            >
                              ছবি সরান
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {homeTab === 'testimonials' && (
                  <div className="space-y-4">
                    {/* Pending Parent Feedback Section */}
                    {pendingParentFeedback.length > 0 && (
                      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                            <Heart className="w-5 h-5 mr-2" />
                            অনুমোদনের জন্য অপেক্ষমান অভিভাবকের মতামত ({pendingParentFeedback.length})
                          </h3>
                        </div>
                        <div className="space-y-4">
                          {pendingParentFeedback.map((feedback) => (
                            <div key={feedback.id} className="bg-white border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="font-semibold text-gray-900">{feedback.parentName}</span>
                                    <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                                      অভিভাবক
                                    </span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {getCategoryLabel(feedback.category)}
                                    </span>
                                    {feedback.rating > 0 && (
                                      <div className="flex items-center space-x-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`w-4 h-4 ${
                                              star <= feedback.rating
                                                ? 'text-yellow-500 fill-current'
                                                : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {feedback.subject && (
                                    <p className="text-sm font-medium text-gray-800 mb-2">
                                      বিষয়: {feedback.subject}
                                    </p>
                                  )}
                                  <p className="text-gray-700 mb-2">"{feedback.message}"</p>
                                  {feedback.suggestion && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded">
                                      <p className="text-xs text-gray-600 font-medium mb-1">পরামর্শ:</p>
                                      <p className="text-sm text-gray-700">{feedback.suggestion}</p>
                                    </div>
                                  )}
                                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                    <span>ইমেইল: {feedback.parentEmail}</span>
                                    {feedback.parentPhone && <span>ফোন: {feedback.parentPhone}</span>}
                                    <span>
                                      তারিখ: {feedback.createdAt?.toDate ? 
                                        new Date(feedback.createdAt.toDate()).toLocaleDateString('bn-BD') : 
                                        'N/A'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <button
                                    onClick={() => handleApproveParentFeedback(feedback)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>অনুমোদন</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectParentFeedback(feedback.id)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    <span>প্রত্যাখ্যান</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingParentFeedback.length === 0 && !loadingParentFeedback && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 text-center">
                          অনুমোদনের জন্য অপেক্ষমান কোন অভিভাবকের মতামত নেই
                        </p>
                      </div>
                    )}

                    {/* Pending Testimonials Section */}
                    {pendingTestimonials.length > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-yellow-900 flex items-center">
                            <ClockIcon className="w-5 h-5 mr-2" />
                            অনুমোদনের জন্য অপেক্ষমান মতামত ({pendingTestimonials.length})
                          </h3>
                        </div>
                        <div className="space-y-4">
                          {pendingTestimonials.map((testimonial) => (
                            <div key={testimonial.id} className="bg-white border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="font-semibold text-gray-900">{testimonial.name}</span>
                                    <span className="text-sm text-gray-600">({testimonial.designation})</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {testimonial.submittedByRole === 'parent' ? 'অভিভাবক' : 'শিক্ষক'}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 mb-2 italic">"{testimonial.message}"</p>
                                  {testimonial.photoUrl && (
                                    <img
                                      src={testimonial.photoUrl}
                                      alt={testimonial.name}
                                      className="w-16 h-16 object-cover rounded-full border-2 border-gray-200"
                                    />
                                  )}
                                  <p className="text-xs text-gray-500 mt-2">
                                    জমা দেওয়ার তারিখ: {testimonial.submittedAt?.toDate ? 
                                      new Date(testimonial.submittedAt.toDate()).toLocaleDateString('bn-BD') : 
                                      'N/A'}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <button
                                    onClick={() => handleApproveTestimonial(testimonial)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>অনুমোদন</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectTestimonial(testimonial.id)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    <span>প্রত্যাখ্যান</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingTestimonials.length === 0 && !loadingPendingTestimonials && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 text-center">
                          অনুমোদনের জন্য অপেক্ষমান কোন মতামত নেই
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">মতামত সেকশন</h3>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.homeTestimonialsEnabled}
                          onChange={(e) => setFormData({ ...formData, homeTestimonialsEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">সেকশন সক্রিয় করুন</span>
                      </label>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.homeTestimonialsTitle}
                        onChange={(e) => setFormData({ ...formData, homeTestimonialsTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="মতামত"
                      />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-900">মতামতসমূহ</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newTestimonial = {
                            id: Date.now().toString(),
                            name: '',
                            designation: '',
                            message: '',
                            photoUrl: '',
                            isActive: true,
                            isApproved: true, // Admin-created testimonials are auto-approved
                            order: (formData.homeTestimonials?.length || 0) + 1
                          };
                          setFormData({
                            ...formData,
                            homeTestimonials: [...(formData.homeTestimonials || []), newTestimonial]
                          });
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>মতামত যোগ করুন</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(formData.homeTestimonials || []).map((testimonial, index) => (
                        <div key={testimonial.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={testimonial.isActive !== false}
                                  onChange={(e) => {
                                    const updated = [...(formData.homeTestimonials || [])];
                                    updated[index] = { ...testimonial, isActive: e.target.checked };
                                    setFormData({ ...formData, homeTestimonials: updated });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-600">সক্রিয়</span>
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeTestimonials || [])];
                                    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                    updated.forEach((t, i) => { t.order = i + 1; });
                                    setFormData({ ...formData, homeTestimonials: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                              )}
                              {index < (formData.homeTestimonials?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeTestimonials || [])];
                                    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                                    updated.forEach((t, i) => { t.order = i + 1; });
                                    setFormData({ ...formData, homeTestimonials: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formData.homeTestimonials || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, homeTestimonials: updated });
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">নাম</label>
                              <input
                                type="text"
                                value={testimonial.name}
                                onChange={(e) => {
                                  const updated = [...(formData.homeTestimonials || [])];
                                  updated[index] = { ...testimonial, name: e.target.value };
                                  setFormData({ ...formData, homeTestimonials: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="মোঃ আবুল কালাম"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">পদবী</label>
                              <input
                                type="text"
                                value={testimonial.designation}
                                onChange={(e) => {
                                  const updated = [...(formData.homeTestimonials || [])];
                                  updated[index] = { ...testimonial, designation: e.target.value };
                                  setFormData({ ...formData, homeTestimonials: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="অভিভাবক"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">মতামত</label>
                              <textarea
                                value={testimonial.message}
                                onChange={(e) => {
                                  const updated = [...(formData.homeTestimonials || [])];
                                  updated[index] = { ...testimonial, message: e.target.value };
                                  setFormData({ ...formData, homeTestimonials: updated });
                                }}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="এই স্কুলের শিক্ষার মান খুবই ভালো।"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">ছবি (ঐচ্ছিক)</label>
                              <MediaUploader
                                category="testimonials"
                                schoolId={SCHOOL_ID}
                                uploadedBy={user?.email || userData?.email || 'admin'}
                                onUploadSuccess={(media) => {
                                  const updated = [...(formData.homeTestimonials || [])];
                                  updated[index] = { ...testimonial, photoUrl: media.url };
                                  setFormData({ ...formData, homeTestimonials: updated });
                                }}
                                className="w-full"
                                acceptedTypes="image/*"
                              />
                              {testimonial.photoUrl && (
                                <div className="mt-4">
                                  <img
                                    src={testimonial.photoUrl}
                                    alt={testimonial.name}
                                    className="w-24 h-24 object-cover rounded-full border border-gray-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.homeTestimonials || [])];
                                      updated[index] = { ...testimonial, photoUrl: '' };
                                      setFormData({ ...formData, homeTestimonials: updated });
                                    }}
                                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                                  >
                                    ছবি সরান
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* All Parent Feedback View Section */}
                    <div className="mt-8 pt-8 border-t-2 border-gray-300">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <Eye className="w-5 h-5 mr-2" />
                          সকল অভিভাবকের মতামত
                        </h3>
                        <div className="flex items-center space-x-2">
                          <select
                            value={feedbackFilter}
                            onChange={(e) => setFeedbackFilter(e.target.value as any)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">সব</option>
                            <option value="new">অপেক্ষমান</option>
                            <option value="approved">অনুমোদিত</option>
                            <option value="rejected">প্রত্যাখ্যান</option>
                          </select>
                        </div>
                      </div>

                      {loadingAllFeedback ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                          <p className="text-gray-600">মতামত লোড হচ্ছে...</p>
                        </div>
                      ) : (() => {
                        const filteredFeedback = feedbackFilter === 'all' 
                          ? allParentFeedback 
                          : allParentFeedback.filter(f => f.status === feedbackFilter);
                        
                        return filteredFeedback.length === 0 ? (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">কোন মতামত পাওয়া যায়নি</h3>
                            <p className="text-gray-600">
                              {feedbackFilter === 'all' 
                                ? 'কোন অভিভাবকের মতামত এখনও জমা দেওয়া হয়নি'
                                : `কোন ${feedbackFilter === 'new' ? 'অপেক্ষমান' : feedbackFilter === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যান'} মতামত নেই`}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredFeedback.map((feedback) => {
                              const statusBadge = feedback.status === 'approved' 
                                ? { label: 'অনুমোদিত', color: 'bg-green-100 text-green-800 border-green-200' }
                                : feedback.status === 'rejected'
                                ? { label: 'প্রত্যাখ্যান', color: 'bg-red-100 text-red-800 border-red-200' }
                                : { label: 'অপেক্ষমান', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
                              
                              const createdDate = feedback.createdAt?.toDate 
                                ? new Date(feedback.createdAt.toDate())
                                : (feedback.createdAt ? new Date(feedback.createdAt) : new Date());
                              
                              return (
                                <div
                                  key={feedback.id}
                                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3 mb-3">
                                        <span className="font-semibold text-gray-900">{feedback.parentName}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                                          {statusBadge.label}
                                        </span>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                          {getCategoryLabel(feedback.category)}
                                        </span>
                                        {feedback.rating > 0 && (
                                          <div className="flex items-center space-x-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                className={`w-4 h-4 ${
                                                  star <= feedback.rating
                                                    ? 'text-yellow-500 fill-current'
                                                    : 'text-gray-300'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      {feedback.subject && (
                                        <h4 className="text-md font-semibold text-gray-800 mb-2">
                                          বিষয়: {feedback.subject}
                                        </h4>
                                      )}
                                      <p className="text-gray-700 mb-3 leading-relaxed">
                                        {feedback.message}
                                      </p>
                                      {feedback.suggestion && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                          <p className="text-xs font-medium text-gray-600 mb-1">পরামর্শ:</p>
                                          <p className="text-sm text-gray-700">{feedback.suggestion}</p>
                                        </div>
                                      )}
                                      <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500">
                                        <div className="flex items-center space-x-1">
                                          <Mail className="w-4 h-4" />
                                          <span>{feedback.parentEmail}</span>
                                        </div>
                                        {feedback.parentPhone && (
                                          <div className="flex items-center space-x-1">
                                            <Phone className="w-4 h-4" />
                                            <span>{feedback.parentPhone}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center space-x-1">
                                          <ClockIcon className="w-4 h-4" />
                                          <span>
                                            {createdDate.toLocaleDateString('bn-BD', {
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric'
                                            })}
                                          </span>
                                        </div>
                                        {feedback.approvedAt && (
                                          <div className="flex items-center space-x-1 text-green-600">
                                            <CheckCircle className="w-4 h-4" />
                                            <span>
                                              অনুমোদিত: {new Date(feedback.approvedAt.toDate()).toLocaleDateString('bn-BD')}
                                            </span>
                                          </div>
                                        )}
                                        {feedback.rejectedAt && (
                                          <div className="flex items-center space-x-1 text-red-600">
                                            <XCircle className="w-4 h-4" />
                                            <span>
                                              প্রত্যাখ্যান: {new Date(feedback.rejectedAt.toDate()).toLocaleDateString('bn-BD')}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <button
                                        onClick={() => handleDeleteFeedback(feedback.id)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors"
                                        title="মুছে ফেলুন"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span>মুছে ফেলুন</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {homeTab === 'committee' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">ম্যানেজিং কমিটি সেকশন</h3>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.homeCommitteeEnabled}
                          onChange={(e) => setFormData({ ...formData, homeCommitteeEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">সেকশন সক্রিয় করুন</span>
                      </label>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.homeCommitteeTitle}
                        onChange={(e) => setFormData({ ...formData, homeCommitteeTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ম্যানেজিং কমিটি"
                      />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-900">কমিটি সদস্য</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newMember = {
                            id: Date.now().toString(),
                            name: '',
                            designation: '',
                            photoUrl: '',
                            isActive: true,
                            order: (formData.homeCommittee?.length || 0) + 1
                          };
                          setFormData({
                            ...formData,
                            homeCommittee: [...(formData.homeCommittee || []), newMember]
                          });
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>সদস্য যোগ করুন</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(formData.homeCommittee || []).map((member, index) => (
                        <div key={member.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={member.isActive !== false}
                                  onChange={(e) => {
                                    const updated = [...(formData.homeCommittee || [])];
                                    updated[index] = { ...member, isActive: e.target.checked };
                                    setFormData({ ...formData, homeCommittee: updated });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-600">সক্রিয়</span>
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeCommittee || [])];
                                    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                    updated.forEach((m, i) => { m.order = i + 1; });
                                    setFormData({ ...formData, homeCommittee: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                              )}
                              {index < (formData.homeCommittee?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeCommittee || [])];
                                    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                                    updated.forEach((m, i) => { m.order = i + 1; });
                                    setFormData({ ...formData, homeCommittee: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formData.homeCommittee || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, homeCommittee: updated });
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">নাম</label>
                              <input
                                type="text"
                                value={member.name}
                                onChange={(e) => {
                                  const updated = [...(formData.homeCommittee || [])];
                                  updated[index] = { ...member, name: e.target.value };
                                  setFormData({ ...formData, homeCommittee: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="মোঃ রহমান"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">পদবী</label>
                              <input
                                type="text"
                                value={member.designation}
                                onChange={(e) => {
                                  const updated = [...(formData.homeCommittee || [])];
                                  updated[index] = { ...member, designation: e.target.value };
                                  setFormData({ ...formData, homeCommittee: updated });
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="সভাপতি"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">ছবি (ঐচ্ছিক)</label>
                              <MediaUploader
                                category="committee"
                                schoolId={SCHOOL_ID}
                                uploadedBy={user?.email || userData?.email || 'admin'}
                                onUploadSuccess={(media) => {
                                  const updated = [...(formData.homeCommittee || [])];
                                  updated[index] = { ...member, photoUrl: media.url };
                                  setFormData({ ...formData, homeCommittee: updated });
                                }}
                                className="w-full"
                                acceptedTypes="image/*"
                              />
                              {member.photoUrl && (
                                <div className="mt-4">
                                  <img
                                    src={member.photoUrl}
                                    alt={member.name}
                                    className="w-24 h-24 object-cover rounded-full border border-gray-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.homeCommittee || [])];
                                      updated[index] = { ...member, photoUrl: '' };
                                      setFormData({ ...formData, homeCommittee: updated });
                                    }}
                                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                                  >
                                    ছবি সরান
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {homeTab === 'teachers' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">শিক্ষক সেকশন</h3>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.homeTeachersEnabled}
                          onChange={(e) => setFormData({ ...formData, homeTeachersEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">সেকশন সক্রিয় করুন</span>
                      </label>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.homeTeachersTitle}
                        onChange={(e) => setFormData({ ...formData, homeTeachersTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="শিক্ষক"
                      />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-900">শিক্ষক</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newTeacher = {
                            id: Date.now().toString(),
                            name: '',
                            designation: '',
                            photoUrl: '',
                            isActive: true,
                            order: (formData.homeTeachers?.length || 0) + 1
                          };
                          setFormData({
                            ...formData,
                            homeTeachers: [...(formData.homeTeachers || []), newTeacher]
                          });
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>শিক্ষক যোগ করুন</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(formData.homeTeachers || []).map((teacher, index) => (
                        <div key={teacher.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={teacher.isActive !== false}
                                  onChange={(e) => {
                                    const updated = [...(formData.homeTeachers || [])];
                                    updated[index] = { ...teacher, isActive: e.target.checked };
                                    setFormData({ ...formData, homeTeachers: updated });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-600">সক্রিয়</span>
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeTeachers || [])];
                                    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                    updated.forEach((t, i) => { t.order = i + 1; });
                                    setFormData({ ...formData, homeTeachers: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                              )}
                              {index < (formData.homeTeachers?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(formData.homeTeachers || [])];
                                    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                                    updated.forEach((t, i) => { t.order = i + 1; });
                                    setFormData({ ...formData, homeTeachers: updated });
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-900"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (formData.homeTeachers || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, homeTeachers: updated });
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                শিক্ষক নির্বাচন করুন {loadingTeachers && <span className="text-xs text-gray-500">(লোড হচ্ছে...)</span>}
                              </label>
                              <select
                                value={teacher.uid || teacher.teacherId || ''}
                                onChange={(e) => {
                                  const selectedTeacher = teachersList.find(t => t.uid === e.target.value || t.employeeId === e.target.value);
                                  if (selectedTeacher) {
                                    const updated = [...(formData.homeTeachers || [])];
                                    updated[index] = {
                                      ...teacher,
                                      uid: selectedTeacher.uid,
                                      teacherId: selectedTeacher.employeeId || '',
                                      name: selectedTeacher.name || selectedTeacher.displayName || '',
                                      designation: selectedTeacher.designation || selectedTeacher.subject || '',
                                      photoUrl: selectedTeacher.profileImage || teacher.photoUrl || ''
                                    };
                                    setFormData({ ...formData, homeTeachers: updated });
                                  } else if (e.target.value === '') {
                                    // Clear teacher selection
                                    const updated = [...(formData.homeTeachers || [])];
                                    updated[index] = {
                                      ...teacher,
                                      uid: '',
                                      teacherId: '',
                                      name: '',
                                      designation: '',
                                      photoUrl: ''
                                    };
                                    setFormData({ ...formData, homeTeachers: updated });
                                  }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">শিক্ষক নির্বাচন করুন</option>
                                {teachersList.map((t) => (
                                  <option key={t.uid} value={t.uid}>
                                    {t.name || t.displayName || 'Unknown'} - {t.designation || t.subject || 'No Designation'} {t.employeeId ? `(ID: ${t.employeeId})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">নাম {teacher.uid || teacher.teacherId ? '(আসল নাম - ডাটাবেস থেকে)' : '(Manual)'}</label>
                              <input
                                type="text"
                                value={teacher.name}
                                onChange={(e) => {
                                  const updated = [...(formData.homeTeachers || [])];
                                  updated[index] = { ...teacher, name: e.target.value };
                                  setFormData({ ...formData, homeTeachers: updated });
                                }}
                                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  teacher.uid || teacher.teacherId ? 'bg-blue-50 font-medium' : 'bg-white'
                                }`}
                                placeholder="মোঃ করিম"
                                readOnly={!!(teacher.uid || teacher.teacherId)}
                              />
                              {(teacher.uid || teacher.teacherId) && (
                                <p className="text-xs text-blue-600 mt-1">
                                  ✓ আসল নাম ডাটাবেস থেকে দেখানো হচ্ছে
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">পদবী/বিষয় {teacher.uid || teacher.teacherId ? '(আসল পদবী - ডাটাবেস থেকে)' : '(Manual)'}</label>
                              <input
                                type="text"
                                value={teacher.designation}
                                onChange={(e) => {
                                  const updated = [...(formData.homeTeachers || [])];
                                  updated[index] = { ...teacher, designation: e.target.value };
                                  setFormData({ ...formData, homeTeachers: updated });
                                }}
                                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  teacher.uid || teacher.teacherId ? 'bg-blue-50 font-medium' : 'bg-white'
                                }`}
                                placeholder="গণিত শিক্ষক"
                                readOnly={!!(teacher.uid || teacher.teacherId)}
                              />
                              {(teacher.uid || teacher.teacherId) && (
                                <p className="text-xs text-blue-600 mt-1">
                                  ✓ আসল পদবী/বিষয় ডাটাবেস থেকে দেখানো হচ্ছে
                                </p>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">ছবি (ঐচ্ছিক)</label>
                              <MediaUploader
                                category="teachers"
                                schoolId={SCHOOL_ID}
                                uploadedBy={user?.email || userData?.email || 'admin'}
                                onUploadSuccess={(media) => {
                                  const updated = [...(formData.homeTeachers || [])];
                                  updated[index] = { ...teacher, photoUrl: media.url };
                                  setFormData({ ...formData, homeTeachers: updated });
                                }}
                                className="w-full"
                                acceptedTypes="image/*"
                              />
                              {teacher.photoUrl && (
                                <div className="mt-4">
                                  <img
                                    src={teacher.photoUrl}
                                    alt={teacher.name}
                                    className="w-24 h-24 object-cover rounded-full border border-gray-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(formData.homeTeachers || [])];
                                      updated[index] = { ...teacher, photoUrl: '' };
                                      setFormData({ ...formData, homeTeachers: updated });
                                    }}
                                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                                  >
                                    ছবি সরান
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Page Tabs */}
          {selectedPage === 'contact' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex space-x-2 overflow-x-auto">
                  {[
                    { id: 'header', label: 'হেডার সেকশন', icon: FileText },
                    { id: 'contactInfo', label: 'যোগাযোগের তথ্য', icon: Phone },
                    { id: 'departments', label: 'বিভাগীয় যোগাযোগ', icon: Users },
                    { id: 'map', label: 'মানচিত্র', icon: MapPin },
                    { id: 'social', label: 'সামাজিক যোগাযোগ', icon: Globe },
                    { id: 'form', label: 'ফরম বিষয়সমূহ', icon: FileText }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setContactTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center space-x-2 ${
                        contactTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {contactTab === 'header' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পেজ শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.contactPageTitle}
                        onChange={(e) => setFormData({...formData, contactPageTitle: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="যোগাযোগ করুন"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">সাবটাইটেল</label>
                      <textarea
                        value={formData.contactPageSubtitle}
                        onChange={(e) => setFormData({...formData, contactPageSubtitle: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="আমাদের সাথে যোগাযোগ করে..."
                      />
                    </div>
                  </div>
                )}

                {contactTab === 'contactInfo' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ফোন নম্বর (প্রতিটি নতুন লাইনে)</label>
                      <textarea
                        value={Array.isArray(formData.contactPhones) ? formData.contactPhones.join('\n') : ''}
                        onChange={(e) => setFormData({...formData, contactPhones: e.target.value.split('\n').filter(p => p.trim())})}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+৮৮০ ১৭১১ ২৩৪৫৬৭"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ইমেইল (প্রতিটি নতুন লাইনে)</label>
                      <textarea
                        value={Array.isArray(formData.contactEmails) ? formData.contactEmails.join('\n') : ''}
                        onChange={(e) => setFormData({...formData, contactEmails: e.target.value.split('\n').filter(e => e.trim())})}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="info@iqraschool.edu"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ঠিকানা (প্রতিটি নতুন লাইনে)</label>
                      <textarea
                        value={Array.isArray(formData.contactAddress) ? formData.contactAddress.join('\n') : ''}
                        onChange={(e) => setFormData({...formData, contactAddress: e.target.value.split('\n').filter(a => a.trim())})}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="রামপুরা, ঢাকা-১২১৯"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">সময়সূচী (প্রতিটি নতুন লাইনে)</label>
                      <textarea
                        value={Array.isArray(formData.contactHours) ? formData.contactHours.join('\n') : ''}
                        onChange={(e) => setFormData({...formData, contactHours: e.target.value.split('\n').filter(h => h.trim())})}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="রবি-বৃহ: সকাল ৮টা - বিকাল ৫টা"
                      />
                    </div>
                  </div>
                )}

                {contactTab === 'departments' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">বিভাগসমূহ</h3>
                      <button
                        type="button"
                        onClick={() => {
                          const newDepts = [...(formData.contactDepartments || []), { name: '', phone: '', email: '', description: '' }];
                          setFormData({...formData, contactDepartments: newDepts});
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>বিভাগ যোগ করুন</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(formData.contactDepartments || []).map((dept, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">বিভাগ #{index + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newDepts = formData.contactDepartments?.filter((_, i) => i !== index) || [];
                                  setFormData({...formData, contactDepartments: newDepts});
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">নাম</label>
                                <input
                                  type="text"
                                  value={dept.name}
                                  onChange={(e) => {
                                    const newDepts = [...(formData.contactDepartments || [])];
                                    newDepts[index].name = e.target.value;
                                    setFormData({...formData, contactDepartments: newDepts});
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">ফোন</label>
                                <input
                                  type="text"
                                  value={dept.phone}
                                  onChange={(e) => {
                                    const newDepts = [...(formData.contactDepartments || [])];
                                    newDepts[index].phone = e.target.value;
                                    setFormData({...formData, contactDepartments: newDepts});
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">ইমেইল</label>
                                <input
                                  type="email"
                                  value={dept.email}
                                  onChange={(e) => {
                                    const newDepts = [...(formData.contactDepartments || [])];
                                    newDepts[index].email = e.target.value;
                                    setFormData({...formData, contactDepartments: newDepts});
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">বিবরণ</label>
                                <input
                                  type="text"
                                  value={dept.description}
                                  onChange={(e) => {
                                    const newDepts = [...(formData.contactDepartments || [])];
                                    newDepts[index].description = e.target.value;
                                    setFormData({...formData, contactDepartments: newDepts});
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {contactTab === 'map' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">মানচিত্র এমবেড কোড (HTML iframe)</label>
                      <textarea
                        value={formData.contactMapEmbedCode}
                        onChange={(e) => setFormData({...formData, contactMapEmbedCode: e.target.value})}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        placeholder="<iframe src=&quot;...&quot;></iframe>"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ঠিকানা</label>
                      <input
                        type="text"
                        value={formData.contactMapAddress}
                        onChange={(e) => setFormData({...formData, contactMapAddress: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="রামপুরা, ঢাকা-১২১৯"
                      />
                    </div>
                  </div>
                )}

                {contactTab === 'social' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
                      <input
                        type="url"
                        value={formData.contactSocialMediaFacebook}
                        onChange={(e) => setFormData({...formData, contactSocialMediaFacebook: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Twitter URL</label>
                      <input
                        type="url"
                        value={formData.contactSocialMediaTwitter}
                        onChange={(e) => setFormData({...formData, contactSocialMediaTwitter: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://twitter.com/yourhandle"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Instagram URL</label>
                      <input
                        type="url"
                        value={formData.contactSocialMediaInstagram}
                        onChange={(e) => setFormData({...formData, contactSocialMediaInstagram: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
                      <input
                        type="url"
                        value={formData.contactSocialMediaYoutube}
                        onChange={(e) => setFormData({...formData, contactSocialMediaYoutube: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://youtube.com/channel/yourchannel"
                      />
                    </div>
                  </div>
                )}

                {contactTab === 'form' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ফরম বিষয়সমূহ (প্রতিটি নতুন লাইনে)</label>
                    <textarea
                      value={Array.isArray(formData.contactFormSubjects) ? formData.contactFormSubjects.join('\n') : ''}
                      onChange={(e) => setFormData({...formData, contactFormSubjects: e.target.value.split('\n').filter(s => s.trim())})}
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ভর্তি সংক্রান্ত"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gallery Page Tabs */}
          {selectedPage === 'gallery' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex space-x-2 overflow-x-auto">
                  {[
                    { id: 'header', label: 'হেডার সেকশন', icon: FileText },
                    { id: 'images', label: 'ছবি', icon: ImageIcon },
                    { id: 'categories', label: 'ক্যাটেগরি', icon: FileText },
                    { id: 'events', label: 'অনুষ্ঠান', icon: Calendar }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setGalleryTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center space-x-2 ${
                        galleryTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {galleryTab === 'header' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পেজ শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.galleryPageTitle}
                        onChange={(e) => setFormData({...formData, galleryPageTitle: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">সাবটাইটেল</label>
                      <textarea
                        value={formData.galleryPageSubtitle}
                        onChange={(e) => setFormData({...formData, galleryPageSubtitle: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {galleryTab === 'images' && (
                  <div className="space-y-6">
                    {/* Upload Section */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <Upload className="w-5 h-5 text-blue-600" />
                        <span>ছবি/ভিডিও আপলোড</span>
                      </h3>
                        <MediaUploader
                          category="gallery"
                          schoolId={SCHOOL_ID}
                          uploadedBy={user?.email || 'admin'}
                          onUploadSuccess={(media) => {
                            // Determine type correctly from media.type or URL
                            let itemType: 'image' | 'video' = 'image';
                            if (media.type === 'video' || media.url.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi)$/)) {
                              itemType = 'video';
                            } else if (media.type === 'image' || media.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
                              itemType = 'image';
                            }

                            // Create gallery item from uploaded media
                            const newItem = {
                              id: media.id || `gallery-${Date.now()}`,
                              title: media.name?.replace(/\.[^/.]+$/, '') || 'Untitled', // Remove file extension from title
                              description: '',
                              imageUrl: media.url,
                              category: formData.galleryCategories?.[1] || 'events',
                              event: formData.galleryEvents?.[1] || '',
                              date: new Date().toISOString().split('T')[0],
                              photographer: userData?.name || user?.displayName || user?.email?.split('@')[0] || 'Unknown',
                              location: '',
                              tags: [],
                              type: itemType,
                              uploadedBy: userData?.name || user?.displayName || user?.email || 'Unknown'
                            };
                            const updatedItems = [...(formData.galleryItems || []), newItem];
                            setFormData({...formData, galleryItems: updatedItems});
                          }}
                        />
                      </div>

                    {/* Gallery Items List */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                        <span>গ্যালারি আইটেমসমূহ ({formData.galleryItems?.length || 0})</span>
                      </h3>
                        
                        {(!formData.galleryItems || formData.galleryItems.length === 0) ? (
                          <div className="text-center py-12 text-gray-500">
                            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>কোনো ছবি বা ভিডিও আপলোড করা হয়নি</p>
                          </div>
                        ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {formData.galleryItems.map((item, index) => (
                          <div key={item.id || index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
                                {/* Media Preview */}
                                <div className="relative aspect-video bg-gray-100">
                                  {item.type === 'video' ? (
                                    <video
                                      src={item.imageUrl}
                                      className="w-full h-full object-cover"
                                      controls={false}
                                    />
                                  ) : (
                                    <img
                                      src={transformImageUrl(item.imageUrl, {
                                        width: 400,
                                        height: 300,
                                        crop: 'maintain_ratio',
                                        format: 'webp',
                                        quality: 80
                                      })}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="absolute top-2 right-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      item.type === 'video' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {item.type === 'video' ? 'ভিডিও' : 'ছবি'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Item Details */}
                                <div className="p-4 space-y-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">{item.title}</h4>
                                    {item.description && (
                                      <p className="text-xs text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                                    )}
                                    {item.uploadedBy && (
                                      <p className="text-xs text-gray-500 mt-1">আপলোডকারী: {item.uploadedBy}</p>
                                    )}
                                  </div>
                                  
                                  {item.tags && item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.tags.map((tag, tagIdx) => (
                                        <span key={tagIdx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{item.category}</span>
                                    <span>{item.date}</span>
                                  </div>

                                  <div className="flex items-center space-x-2 pt-2 border-t">
                                    <button
                                      onClick={() => {
                                        setEditingGalleryItem(index);
                                        setEditGalleryForm({
                                          title: item.title,
                                          description: item.description || '',
                                          category: item.category,
                                          event: item.event,
                                          date: item.date,
                                          photographer: item.photographer,
                                          location: item.location,
                                          tags: item.tags?.join(', ') || '',
                                          uploadedBy: (item as any).uploadedBy || userData?.name || user?.email || 'Unknown'
                                        });
                                      }}
                                      className="flex-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 flex items-center justify-center space-x-1"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>সম্পাদনা</span>
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm('এই আইটেমটি মুছে ফেলতে চান?')) {
                                          const newItems = formData.galleryItems?.filter((_, i) => i !== index) || [];
                                          setFormData({...formData, galleryItems: newItems});
                                          
                                          // Immediately save to Firebase
                                          try {
                                            await settingsQueries.saveSettings({
                                              galleryItems: newItems
                                            }, user?.email || userData?.email || 'admin');
                                            alert('আইটেম সফলভাবে মুছে ফেলা হয়েছে!');
                                          } catch (error) {
                                            console.error('Error deleting gallery item:', error);
                                            alert('আইটেম মুছতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
                                          }
                                        }
                                      }}
                                      className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 flex items-center justify-center space-x-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>মুছুন</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Edit Modal */}
                      {editingGalleryItem !== null && editGalleryForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex items-center justify-between">
                              <h3 className="text-xl font-bold text-gray-900">গ্যালারি আইটেম সম্পাদনা</h3>
                              <button
                                onClick={() => {
                                  setEditingGalleryItem(null);
                                  setEditGalleryForm(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <XCircle className="w-6 h-6" />
                              </button>
                            </div>
                            <div className="p-6 space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম *</label>
                                <input
                                  type="text"
                                  value={editGalleryForm.title}
                                  onChange={(e) => setEditGalleryForm({...editGalleryForm, title: e.target.value})}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="বার্ষিক ক্রীড়া প্রতিযোগিতা ২০২৪"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">বিবরণ</label>
                                <textarea
                                  value={editGalleryForm.description}
                                  onChange={(e) => setEditGalleryForm({...editGalleryForm, description: e.target.value})}
                                  rows={3}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="স্কুলের বার্ষিক ক্রীড়া প্রতিযোগিতার স্মরণীয় মুহূর্তগুলো"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">ক্যাটেগরি</label>
                                  <select
                                    value={editGalleryForm.category}
                                    onChange={(e) => setEditGalleryForm({...editGalleryForm, category: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {(formData.galleryCategories || []).filter(c => c !== 'সকল বিভাগ').map((cat) => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">অনুষ্ঠান</label>
                                  <select
                                    value={editGalleryForm.event}
                                    onChange={(e) => setEditGalleryForm({...editGalleryForm, event: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {(formData.galleryEvents || []).filter(e => e !== 'সকল অনুষ্ঠান').map((evt) => (
                                      <option key={evt} value={evt}>{evt}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">তারিখ</label>
                                  <input
                                    type="date"
                                    value={editGalleryForm.date}
                                    onChange={(e) => setEditGalleryForm({...editGalleryForm, date: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">ফটোগ্রাফার</label>
                                  <input
                                    type="text"
                                    value={editGalleryForm.photographer}
                                    onChange={(e) => setEditGalleryForm({...editGalleryForm, photographer: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="মোহাম্মদ আলী"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">অবস্থান</label>
                                <input
                                  type="text"
                                  value={editGalleryForm.location}
                                  onChange={(e) => setEditGalleryForm({...editGalleryForm, location: e.target.value})}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="স্কুল মাঠ"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ট্যাগ (কমা দ্বারা আলাদা করুন)</label>
                                <input
                                  type="text"
                                  value={editGalleryForm.tags}
                                  onChange={(e) => setEditGalleryForm({...editGalleryForm, tags: e.target.value})}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="ক্রীড়া, প্রতিযোগিতা, ছাত্রছাত্রী"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">আপলোডকারীর নাম</label>
                                <input
                                  type="text"
                                  value={editGalleryForm.uploadedBy}
                                  onChange={(e) => setEditGalleryForm({...editGalleryForm, uploadedBy: e.target.value})}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="মোহাম্মদ আলী"
                                />
                              </div>
                              <div className="flex items-center space-x-3 pt-4 border-t">
                                <button
                                  onClick={() => {
                                    if (editingGalleryItem !== null && editGalleryForm) {
                                      const newItems = [...(formData.galleryItems || [])];
                                      newItems[editingGalleryItem] = {
                                        ...newItems[editingGalleryItem],
                                        title: editGalleryForm.title,
                                        description: editGalleryForm.description,
                                        category: editGalleryForm.category,
                                        event: editGalleryForm.event,
                                        date: editGalleryForm.date,
                                        photographer: editGalleryForm.photographer,
                                        location: editGalleryForm.location,
                                        tags: editGalleryForm.tags.split(',').map(t => t.trim()).filter(t => t),
                                        uploadedBy: editGalleryForm.uploadedBy
                                      };
                                      setFormData({...formData, galleryItems: newItems});
                                      setEditingGalleryItem(null);
                                      setEditGalleryForm(null);
                                    }
                                  }}
                                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                  সংরক্ষণ করুন
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingGalleryItem(null);
                                    setEditGalleryForm(null);
                                  }}
                                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                  বাতিল
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {galleryTab === 'categories' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ক্যাটেগরি (প্রতিটি নতুন লাইনে)</label>
                    <textarea
                      value={Array.isArray(formData.galleryCategories) ? formData.galleryCategories.join('\n') : ''}
                      onChange={(e) => setFormData({...formData, galleryCategories: e.target.value.split('\n').filter(c => c.trim())})}
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {galleryTab === 'events' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">অনুষ্ঠান (প্রতিটি নতুন লাইনে)</label>
                    <textarea
                      value={Array.isArray(formData.galleryEvents) ? formData.galleryEvents.join('\n') : ''}
                      onChange={(e) => setFormData({...formData, galleryEvents: e.target.value.split('\n').filter(e => e.trim())})}
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* About Page Tabs */}
          {selectedPage === 'about' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex space-x-2 overflow-x-auto">
                  {[
                    { id: 'header', label: 'হেডার সেকশন', icon: FileText },
                    { id: 'intro', label: 'পরিচিতি', icon: Info },
                    { id: 'stats', label: 'পরিসংখ্যান', icon: Users },
                    { id: 'values', label: 'মূল্যবোধ', icon: Heart },
                    { id: 'achievements', label: 'সাফল্য', icon: Award },
                    { id: 'team', label: 'দল', icon: UserIcon }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAboutTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center space-x-2 ${
                        aboutTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {aboutTab === 'header' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পেজ শিরোনাম</label>
                      <input
                        type="text"
                        value={formData.aboutPageTitle}
                        onChange={(e) => setFormData({...formData, aboutPageTitle: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">সাবটাইটেল</label>
                      <textarea
                        value={formData.aboutPageSubtitle}
                        onChange={(e) => setFormData({...formData, aboutPageSubtitle: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {aboutTab === 'intro' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">পরিচিতি</label>
                      <textarea
                        value={formData.aboutIntro}
                        onChange={(e) => setFormData({...formData, aboutIntro: e.target.value})}
                        rows={6}
                        placeholder="স্কুল সম্পর্কে বিস্তারিত তথ্য..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">একাধিক অনুচ্ছেদের জন্য নতুন লাইন ব্যবহার করুন</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">স্কুলের ছবি</label>
                      <MediaUploader
                        category="school"
                        schoolId={SCHOOL_ID}
                        uploadedBy={user?.email || userData?.email || 'admin'}
                        onUploadSuccess={(media) => {
                          setFormData({...formData, aboutImageUrl: media.url});
                        }}
                        className="w-full"
                        acceptedTypes="image/*"
                      />
                      {formData.aboutImageUrl && (
                        <div className="mt-4">
                          <img
                            src={formData.aboutImageUrl}
                            alt="About page image"
                            className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, aboutImageUrl: ''})}
                            className="mt-2 text-sm text-red-600 hover:text-red-700"
                          >
                            ছবি সরান
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">মিশন (আমাদের লক্ষ্য)</label>
                      <textarea
                        value={formData.aboutMission}
                        onChange={(e) => setFormData({...formData, aboutMission: e.target.value})}
                        rows={4}
                        placeholder="স্কুলের লক্ষ্য..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ভিশন (আমাদের উদ্দেশ্য)</label>
                      <textarea
                        value={formData.aboutVision}
                        onChange={(e) => setFormData({...formData, aboutVision: e.target.value})}
                        rows={4}
                        placeholder="স্কুলের উদ্দেশ্য..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {aboutTab === 'stats' && (
                  <div className="space-y-4">
                    {(formData.aboutStats || []).map((stat, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">পরিসংখ্যান #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newStats = formData.aboutStats?.filter((_, i) => i !== index) || [];
                                setFormData({...formData, aboutStats: newStats});
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">লেবেল</label>
                              <input
                                type="text"
                                value={stat.label}
                                onChange={(e) => {
                                  const newStats = [...(formData.aboutStats || [])];
                                  newStats[index].label = e.target.value;
                                  setFormData({...formData, aboutStats: newStats});
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">মান</label>
                              <input
                                type="text"
                                value={stat.value}
                                onChange={(e) => {
                                  const newStats = [...(formData.aboutStats || [])];
                                  newStats[index].value = e.target.value;
                                  setFormData({...formData, aboutStats: newStats});
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newStats = [...(formData.aboutStats || []), { label: '', value: '' }];
                        setFormData({...formData, aboutStats: newStats});
                      }}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>পরিসংখ্যান যোগ করুন</span>
                    </button>
                  </div>
                )}

                {aboutTab === 'values' && (
                  <div className="space-y-4">
                    {(formData.aboutValues || []).map((value, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">মূল্যবোধ #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newValues = formData.aboutValues?.filter((_, i) => i !== index) || [];
                                setFormData({...formData, aboutValues: newValues});
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">শিরোনাম</label>
                              <input
                                type="text"
                                value={value.title}
                                onChange={(e) => {
                                  const newValues = [...(formData.aboutValues || [])];
                                  newValues[index].title = e.target.value;
                                  setFormData({...formData, aboutValues: newValues});
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">বিবরণ</label>
                              <textarea
                                value={value.description}
                                onChange={(e) => {
                                  const newValues = [...(formData.aboutValues || [])];
                                  newValues[index].description = e.target.value;
                                  setFormData({...formData, aboutValues: newValues});
                                }}
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newValues = [...(formData.aboutValues || []), { title: '', description: '' }];
                        setFormData({...formData, aboutValues: newValues});
                      }}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>মূল্যবোধ যোগ করুন</span>
                    </button>
                  </div>
                )}

                {aboutTab === 'achievements' && (
                  <div className="space-y-4">
                    {(formData.aboutAchievements || []).map((achievement, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">সাফল্য #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newAchievements = formData.aboutAchievements?.filter((_, i) => i !== index) || [];
                                setFormData({...formData, aboutAchievements: newAchievements});
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">বছর</label>
                                <input
                                  type="text"
                                  value={achievement.year}
                                  onChange={(e) => {
                                    const newAchievements = [...(formData.aboutAchievements || [])];
                                    newAchievements[index].year = e.target.value;
                                    setFormData({...formData, aboutAchievements: newAchievements});
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">শিরোনাম</label>
                                <input
                                  type="text"
                                  value={achievement.title}
                                  onChange={(e) => {
                                    const newAchievements = [...(formData.aboutAchievements || [])];
                                    newAchievements[index].title = e.target.value;
                                    setFormData({...formData, aboutAchievements: newAchievements});
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">বিবরণ</label>
                              <textarea
                                value={achievement.description}
                                onChange={(e) => {
                                  const newAchievements = [...(formData.aboutAchievements || [])];
                                  newAchievements[index].description = e.target.value;
                                  setFormData({...formData, aboutAchievements: newAchievements});
                                }}
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newAchievements = [...(formData.aboutAchievements || []), { year: '', title: '', description: '' }];
                        setFormData({...formData, aboutAchievements: newAchievements});
                      }}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>সাফল্য যোগ করুন</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Page - Exam Questions Management */}
          {selectedPage === 'question' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">পরীক্ষার প্রশ্নপত্র ব্যবস্থাপনা</h3>
                
                <QuestionManagement />
              </div>
            </div>
          )}

          {selectedPage === 'logo' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">ওয়েবসাইট লোগো ও ফ্যাভিকন</h3>
                  <p className="text-sm text-gray-600">
                    আপনার ওয়েবসাইটের লোগো এবং ফ্যাভিকন আপলোড করুন। লোগো নেভিগেশন বারে এবং ফ্যাভিকন ব্রাউজার ট্যাবে প্রদর্শিত হবে।
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Website Logo Section */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Building className="w-5 h-5 text-blue-600" />
                      <span>ওয়েবসাইট লোগো</span>
                    </h4>
                    
                    <div className="space-y-4">
                      {formData.websiteLogo && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">বর্তমান লোগো:</p>
                          <div className="relative inline-block">
                            <img 
                              src={formData.websiteLogo} 
                              alt="Website Logo" 
                              className="max-w-xs max-h-32 object-contain border border-gray-300 rounded-lg p-2 bg-white"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <button
                              onClick={() => setFormData({...formData, websiteLogo: ''})}
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 -mt-2 -mr-2"
                              title="লোগো সরান"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <ImageKitUploader
                        type="school"
                        schoolId={SCHOOL_ID}
                        onUploadSuccess={(file) => {
                          if (file && file.url) {
                            setFormData({...formData, websiteLogo: file.url});
                          }
                        }}
                        className="w-full"
                      />
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">সুপারিশ:</p>
                            <ul className="list-disc list-inside space-y-1 text-blue-700">
                              <li>লোগোর প্রস্তাবিত আকার: ২০০ x ৮০ পিক্সেল</li>
                              <li>ফরম্যাট: PNG, JPG, বা SVG (স্বচ্ছ লোগোর জন্য PNG বা SVG ব্যবহার করুন)</li>
                              <li>ফাইল সাইজ: সর্বোচ্চ ২ MB</li>
                              <li>লোগো নেভিগেশন বারে এবং হোমপেজে প্রদর্শিত হবে</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Favicon Section */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-green-600" />
                      <span>ফ্যাভিকন</span>
                    </h4>
                    
                    <div className="space-y-4">
                      {formData.favicon && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">বর্তমান ফ্যাভিকন:</p>
                          <div className="relative inline-block">
                            <img 
                              src={formData.favicon} 
                              alt="Favicon" 
                              className="w-16 h-16 object-contain border border-gray-300 rounded-lg p-2 bg-white"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <button
                              onClick={() => setFormData({...formData, favicon: ''})}
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 -mt-2 -mr-2"
                              title="ফ্যাভিকন সরান"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">ব্রাউজার ট্যাবে দেখতে এই আইকনটি ব্যবহার করা হবে</p>
                        </div>
                      )}
                      
                      <ImageKitUploader
                        type="school"
                        schoolId={SCHOOL_ID}
                        onUploadSuccess={(file) => {
                          if (file && file.url) {
                            setFormData({...formData, favicon: file.url});
                          }
                        }}
                        className="w-full"
                      />
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <Info className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-green-800">
                            <p className="font-medium mb-1">সুপারিশ:</p>
                            <ul className="list-disc list-inside space-y-1 text-green-700">
                              <li>ফ্যাভিকনের প্রস্তাবিত আকার: ৩২ x ৩২ পিক্সেল (16x16, 32x32, বা 48x48)</li>
                              <li>ফরম্যাট: PNG, ICO, বা SVG</li>
                              <li>ফাইল সাইজ: সর্বোচ্চ ১০০ KB</li>
                              <li>ফ্যাভিকন ব্রাউজার ট্যাব, বুকমার্ক, এবং ব্রাউজার ইতিহাসে প্রদর্শিত হবে</li>
                              <li>বর্গাকার (square) ছবি ব্যবহার করুন ভালো দেখানোর জন্য</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

// Question Management Component
function QuestionManagement() {
  const [questions, setQuestions] = useState<Array<{
    id: string;
    title: string;
    examType: string;
    year: string;
    className: string;
    subject: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    uploadedAt: any;
    uploadedBy: string;
    isActive: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    examType: '',
    year: new Date().getFullYear().toString(),
    className: '',
    subject: '',
    fileUrl: '',
    fileName: ''
  });
  const [user, setUser] = useState<any>(null);
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; className: string; section?: string }>>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [alertMessage, setAlertMessage] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Set up real-time listener for questions
    let unsubscribeQuestions: (() => void) | null = null;

    const setupQuestionsListener = async () => {
      try {
        setLoading(true);
        const { collection, onSnapshot, orderBy, query } = await import('firebase/firestore');
        const questionsRef = collection(db, 'examQuestions');
        
        try {
          // Try with orderBy first
          const q = query(questionsRef, orderBy('uploadedAt', 'desc'));
          unsubscribeQuestions = onSnapshot(
            q,
            (snapshot) => {
              const questionsData: any[] = [];
              snapshot.forEach((docSnap) => {
                questionsData.push({
                  id: docSnap.id,
                  ...docSnap.data()
                });
              });
              
              // Sort by date if orderBy fails
              questionsData.sort((a, b) => {
                try {
                  const dateA = a.uploadedAt?.toMillis?.() || a.uploadedAt?.seconds * 1000 || 0;
                  const dateB = b.uploadedAt?.toMillis?.() || b.uploadedAt?.seconds * 1000 || 0;
                  return dateB - dateA;
                } catch (e) {
                  return 0;
                }
              });
              
              setQuestions(questionsData);
              setLoading(false);
            },
            (error) => {
              console.error('Error in questions listener:', error);
              // Fallback: try without orderBy
              try {
                const unsubscribeFallback = onSnapshot(
                  questionsRef,
                  (snapshot) => {
                    const questionsData: any[] = [];
                    snapshot.forEach((docSnap) => {
                      questionsData.push({
                        id: docSnap.id,
                        ...docSnap.data()
                      });
                    });
                    
                    // Sort by date client-side
                    questionsData.sort((a, b) => {
                      try {
                        const dateA = a.uploadedAt?.toMillis?.() || a.uploadedAt?.seconds * 1000 || 0;
                        const dateB = b.uploadedAt?.toMillis?.() || b.uploadedAt?.seconds * 1000 || 0;
                        return dateB - dateA;
                      } catch (e) {
                        return 0;
                      }
                    });
                    
                    setQuestions(questionsData);
                    setLoading(false);
                  },
                  (fallbackError) => {
                    console.error('Error in fallback questions listener:', fallbackError);
                    setQuestions([]);
                    setLoading(false);
                  }
                );
                unsubscribeQuestions = unsubscribeFallback;
              } catch (fallbackSetupError) {
                console.error('Error setting up fallback listener:', fallbackSetupError);
                setQuestions([]);
                setLoading(false);
              }
            }
          );
        } catch (queryError) {
          console.error('Error setting up query:', queryError);
          // Fallback without orderBy
          const unsubscribeFallback = onSnapshot(
            questionsRef,
            (snapshot) => {
              const questionsData: any[] = [];
              snapshot.forEach((docSnap) => {
                questionsData.push({
                  id: docSnap.id,
                  ...docSnap.data()
                });
              });
              
              questionsData.sort((a, b) => {
                try {
                  const dateA = a.uploadedAt?.toMillis?.() || a.uploadedAt?.seconds * 1000 || 0;
                  const dateB = b.uploadedAt?.toMillis?.() || b.uploadedAt?.seconds * 1000 || 0;
                  return dateB - dateA;
                } catch (e) {
                  return 0;
                }
              });
              
              setQuestions(questionsData);
              setLoading(false);
            },
            (error) => {
              console.error('Error in questions listener:', error);
              setQuestions([]);
              setLoading(false);
            }
          );
          unsubscribeQuestions = unsubscribeFallback;
        }
      } catch (error) {
        console.error('Error setting up questions listener:', error);
        setQuestions([]);
        setLoading(false);
      }
    };

    setupQuestionsListener();

    // Load classes from Firebase
    const loadClasses = async () => {
      try {
        setLoadingClasses(true);
        const { classQueries } = await import('@/lib/queries/class-queries');
        const classesData = await classQueries.getAllClasses(true); // Get only active classes
        
        // Extract unique class names
        const uniqueClasses = classesData
          .map(cls => ({
            id: cls.classId || '',
            className: cls.className || cls.name || '',
            section: cls.section || ''
          }))
          .filter(cls => cls.className && cls.className.trim())
          // Remove duplicates by className
          .filter((cls, index, self) => 
            index === self.findIndex(c => c.className === cls.className)
          )
          .sort((a, b) => {
            // Sort Bengali numbers properly
            const order = ['৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম', '১১ম', '১২ম'];
            const indexA = order.indexOf(a.className);
            const indexB = order.indexOf(b.className);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.className.localeCompare(b.className, 'bn');
          });
        
        setAvailableClasses(uniqueClasses);
      } catch (error) {
        console.error('Error loading classes:', error);
        setAvailableClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    // Load subjects from Firebase
    const loadSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const { subjectQueries } = await import('@/lib/database-queries');
        const subjectsData = await subjectQueries.getActiveSubjects(SCHOOL_ID);
        
        // Extract subject names
        const uniqueSubjects = subjectsData
          .map(sub => ({
            id: sub.id || '',
            name: sub.name || ''
          }))
          .filter(sub => sub.name && sub.name.trim())
          .sort((a, b) => a.name.localeCompare(b.name, 'bn'));
        
        setAvailableSubjects(uniqueSubjects);
      } catch (error) {
        console.error('Error loading subjects:', error);
        setAvailableSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadClasses();
    loadSubjects();

    // Cleanup function
    return () => {
      unsubscribeAuth();
      if (unsubscribeQuestions) {
        unsubscribeQuestions();
      }
    };
  }, []);

  const handleFileUpload = async (media: any) => {
    setNewQuestion({
      ...newQuestion,
      fileUrl: media.url,
      fileName: media.name
    });
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.title || !newQuestion.fileUrl) {
      setAlertMessage({ message: 'শিরোনাম এবং ফাইল প্রয়োজন', type: 'warning' });
      return;
    }

    try {
      setUploading(true);
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      await addDoc(collection(db, 'examQuestions'), {
        title: newQuestion.title,
        examType: newQuestion.examType,
        year: newQuestion.year,
        className: newQuestion.className,
        subject: newQuestion.subject,
        fileUrl: newQuestion.fileUrl,
        fileName: newQuestion.fileName,
        fileType: newQuestion.fileUrl.includes('.pdf') ? 'pdf' : 'image',
        uploadedAt: serverTimestamp(),
        uploadedBy: user?.email || 'admin',
        isActive: true
      });

      setAlertMessage({ message: 'প্রশ্নপত্র সফলভাবে যোগ করা হয়েছে', type: 'success' });
      
      setNewQuestion({
        title: '',
        examType: '',
        year: new Date().getFullYear().toString(),
        className: '',
        subject: '',
        fileUrl: '',
        fileName: ''
      });
      setShowAddForm(false);
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setAlertMessage(null);
      }, 3000);
      // Real-time listener will automatically update the list
    } catch (error) {
      console.error('Error adding question:', error);
      setAlertMessage({ message: 'ত্রুটি: প্রশ্নপত্র যোগ করতে ব্যর্থ', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    setConfirmDialog({
      message: 'আপনি কি এই প্রশ্নপত্র মুছে ফেলতে চান?',
      onConfirm: async () => {
        try {
          const { doc, deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'examQuestions', id));
          setAlertMessage({ message: 'প্রশ্নপত্র সফলভাবে মুছে ফেলা হয়েছে', type: 'success' });
          setConfirmDialog(null);
          // Auto-dismiss success message after 3 seconds
          setTimeout(() => {
            setAlertMessage(null);
          }, 3000);
          // Real-time listener will automatically update the list
        } catch (error) {
          console.error('Error deleting question:', error);
          setAlertMessage({ message: 'ত্রুটি: প্রশ্নপত্র মুছতে ব্যর্থ', type: 'error' });
          setConfirmDialog(null);
        }
      }
    });
  };

  const examTypes = ['প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'তৃতীয় সাময়িক', 'বার্ষিক', 'মধ্যবর্তী', 'শ্রেণি পরীক্ষা', 'অন্যান্য'];

  return (
    <div className="space-y-6">
      {/* Custom Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                {alertMessage.type === 'success' && (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                )}
                {alertMessage.type === 'error' && (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-600" />
                  </div>
                )}
                {alertMessage.type === 'warning' && (
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-yellow-600" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                {alertMessage.type === 'success' && 'সফল হয়েছে'}
                {alertMessage.type === 'error' && 'ত্রুটি'}
                {alertMessage.type === 'warning' && 'সতর্কতা'}
              </h3>
              <p className="text-gray-700 text-center mb-6">{alertMessage.message}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setAlertMessage(null)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    alertMessage.type === 'success'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : alertMessage.type === 'error'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">নিশ্চিত করুন</h3>
              <p className="text-gray-700 text-center mb-6">{confirmDialog.message}</p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                >
                  বাতিল
                </button>
                <button
                  onClick={() => confirmDialog.onConfirm()}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  মুছুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">পূর্ববর্তী পরীক্ষার প্রশ্নপত্র আপলোড করুন যা জনসাধারণ দেখতে পারবে</p>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন প্রশ্নপত্র যোগ করুন</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {showAddForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddForm(false);
              setNewQuestion({
                title: '',
                examType: '',
                year: new Date().getFullYear().toString(),
                className: '',
                subject: '',
                fileUrl: '',
                fileName: ''
              });
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-semibold text-gray-900">নতুন প্রশ্নপত্র যোগ করুন</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuestion({
                    title: '',
                    examType: '',
                    year: new Date().getFullYear().toString(),
                    className: '',
                    subject: '',
                    fileUrl: '',
                    fileName: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম *</label>
                  <input
                    type="text"
                    value={newQuestion.title}
                    onChange={(e) => setNewQuestion({...newQuestion, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="যেমন: প্রথম সাময়িক পরীক্ষা ২০২৪ - গণিত"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পরীক্ষার ধরন</label>
                  <select
                    value={newQuestion.examType}
                    onChange={(e) => setNewQuestion({...newQuestion, examType: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {examTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">বছর</label>
                  <input
                    type="text"
                    value={newQuestion.year}
                    onChange={(e) => setNewQuestion({...newQuestion, year: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="২০২৪"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ক্লাস
                    {loadingClasses && <span className="text-xs text-gray-500 ml-2">(লোড হচ্ছে...)</span>}
                  </label>
                  <select
                    value={newQuestion.className}
                    onChange={(e) => setNewQuestion({...newQuestion, className: e.target.value})}
                    disabled={loadingClasses}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {availableClasses.length === 0 && !loadingClasses && (
                      <option disabled>কোন ক্লাস পাওয়া যায়নি</option>
                    )}
                    {availableClasses.map(cls => (
                      <option key={cls.id || cls.className} value={cls.className}>
                        {cls.className}{cls.section ? ` - ${cls.section}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    বিষয়
                    {loadingSubjects && <span className="text-xs text-gray-500 ml-2">(লোড হচ্ছে...)</span>}
                  </label>
                  <select
                    value={newQuestion.subject}
                    onChange={(e) => setNewQuestion({...newQuestion, subject: e.target.value})}
                    disabled={loadingSubjects}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">নির্বাচন করুন</option>
                    {availableSubjects.length === 0 && !loadingSubjects && (
                      <option disabled>কোন বিষয় পাওয়া যায়নি</option>
                    )}
                    {availableSubjects.map(sub => (
                      <option key={sub.id || sub.name} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">প্রশ্নপত্র ফাইল (PDF বা Image) *</label>
                  <ImageKitUploader
                    type="document"
                    schoolId={SCHOOL_ID}
                    userId={user?.uid || 'admin'}
                    onUploadSuccess={(file: any) => {
                      handleFileUpload({
                        url: file.url,
                        name: file.name,
                        fileId: file.fileId
                      });
                    }}
                    className="w-full"
                  />
                  {newQuestion.fileUrl && (
                    <div className="mt-2 text-sm text-green-600 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>ফাইল আপলোড সম্পন্ন: {newQuestion.fileName}</span>
                      {newQuestion.fileUrl && (
                        <a 
                          href={newQuestion.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 underline ml-2"
                        >
                          দেখুন
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3 rounded-b-xl">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuestion({
                    title: '',
                    examType: '',
                    year: new Date().getFullYear().toString(),
                    className: '',
                    subject: '',
                    fileUrl: '',
                    fileName: ''
                  });
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors"
              >
                বাতিল
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={uploading || !newQuestion.title || !newQuestion.fileUrl}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {uploading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">লোড হচ্ছে...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">কোন প্রশ্নপত্র নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((question) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-semibold text-gray-900 flex-1">{question.title}</h5>
                <button
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="text-red-600 hover:text-red-700 ml-2"
                  title="মুছুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-3">
                {question.examType && (
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4" />
                    <span>{question.examType}</span>
                  </div>
                )}
                {question.year && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{question.year}</span>
                  </div>
                )}
                {question.className && (
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-4 h-4" />
                    <span>{question.className}</span>
                  </div>
                )}
                {question.subject && (
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{question.subject}</span>
                  </div>
                )}
              </div>

              <a
                href={question.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <Eye className="w-4 h-4" />
                <span>প্রশ্নপত্র দেখুন</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PublicPagesControlPage;
