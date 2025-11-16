'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send, 
  MessageCircle, 
  User, 
  CheckCircle, 
  AlertCircle,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Globe
} from 'lucide-react';
import { settingsQueries, SystemSettings } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { SCHOOL_ID } from '@/lib/constants';

const PublicContactPage = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        // Use one-time fetch instead of real-time listener for better performance
        const data = await settingsQueries.getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings(null);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const contactInfo = [
    {
      icon: Phone,
      title: 'ফোন',
      details: settings?.contactPhones || ['+৮৮০ ১৭১১ ২৩৪৫৬৭', '+৮৮০ ১৯১১ ২৩৪৫৬৭'],
      color: 'text-green-600'
    },
    {
      icon: Mail,
      title: 'ইমেইল',
      details: settings?.contactEmails || ['info@iqraschool.edu', 'admission@iqraschool.edu'],
      color: 'text-blue-600'
    },
    {
      icon: MapPin,
      title: 'ঠিকানা',
      details: settings?.contactAddress || ['রামপুরা, ঢাকা-১২১৯', 'বাংলাদেশ'],
      color: 'text-red-600'
    },
    {
      icon: Clock,
      title: 'সময়',
      details: settings?.contactHours || ['রবি-বৃহ: সকাল ৮টা - বিকাল ৫টা', 'শুক্র: সকাল ৮টা - দুপুর ১২টা'],
      color: 'text-purple-600'
    }
  ];

  const departments = settings?.contactDepartments || [
    {
      name: 'ভর্তি বিভাগ',
      phone: '+৮৮০ ১৭১১ ২৩৪৫৬৭',
      email: 'admission@iqraschool.edu',
      description: 'নতুন শিক্ষার্থী ভর্তি সংক্রান্ত সকল তথ্য'
    },
    {
      name: 'শিক্ষা বিভাগ',
      phone: '+৮৮০ ১৭১১ ২৩৪৫৬৮',
      email: 'academic@iqraschool.edu',
      description: 'শিক্ষা কার্যক্রম ও পাঠ্যক্রম সংক্রান্ত'
    },
    {
      name: 'প্রশাসন',
      phone: '+৮৮০ ১৭১১ ২৩৪৫৬৯',
      email: 'admin@iqraschool.edu',
      description: 'সাধারণ প্রশাসনিক কাজ'
    },
    {
      name: 'হিসাব বিভাগ',
      phone: '+৮৮০ ১৭১১ ২৩৪৫৭০',
      email: 'accounts@iqraschool.edu',
      description: 'ফি ও আর্থিক বিষয়াদি'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      // Save contact message to Firestore
      const messageData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || '',
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        schoolId: SCHOOL_ID,
        status: 'new' as const,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'contactMessages'), messageData);
      
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">পেজ লোড হচ্ছে...</p>
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
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">{settings?.contactPageTitle || 'যোগাযোগ করুন'}</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              {settings?.contactPageSubtitle || 'আমাদের সাথে যোগাযোগ করে আপনার প্রশ্নের উত্তর পান এবং আমাদের সম্পর্কে আরও জানুন'}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Info Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {contactInfo.map((info, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center`}>
                <info.icon className={`w-8 h-8 ${info.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{info.title}</h3>
              <div className="space-y-2">
                {info.details.map((detail, idx) => (
                  <p key={idx} className="text-gray-600">{detail}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">আমাদের কাছে বার্তা পাঠান</h2>
            
            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800">আপনার বার্তা সফলভাবে পাঠানো হয়েছে!</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">বার্তা পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    আপনার নাম *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="আপনার পুরো নাম"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    ইমেইল ঠিকানা *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    ফোন নম্বর
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="০১৭১২৩৪৫৬৭৮"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    বিষয় *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">বিষয় নির্বাচন করুন</option>
                    {(settings?.contactFormSubjects || ['ভর্তি সংক্রান্ত', 'শিক্ষা সংক্রান্ত', 'ফি সংক্রান্ত', 'সাধারণ তথ্য', 'অভিযোগ', 'পরামর্শ']).map((subject, idx) => (
                      <option key={idx} value={subject.toLowerCase().replace(/\s+/g, '_')}>{subject}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  আপনার বার্তা *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="আপনার প্রশ্ন বা বার্তা এখানে লিখুন..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>পাঠানো হচ্ছে...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Send className="w-5 h-5" />
                    <span>বার্তা পাঠান</span>
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Departments & Map */}
          <div className="space-y-8">
            {/* Departments */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">বিভাগীয় যোগাযোগ</h2>
              <div className="space-y-6">
                {departments.map((dept, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{dept.name}</h3>
                    <p className="text-gray-600 mb-3">{dept.description}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{dept.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{dept.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">আমাদের অবস্থান</h2>
              {settings?.contactMapEmbedCode ? (
                <div 
                  className="rounded-lg overflow-hidden h-64"
                  dangerouslySetInnerHTML={{ __html: settings.contactMapEmbedCode }}
                />
              ) : (
                <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-4" />
                    <p>মানচিত্র এখানে দেখানো হবে</p>
                    <p className="text-sm">{settings?.contactMapAddress || 'রামপুরা, ঢাকা-১২১৯'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">সামাজিক যোগাযোগ</h2>
              <div className="grid grid-cols-2 gap-4">
                {settings?.contactSocialMedia?.facebook && (
                  <a href={settings.contactSocialMedia.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <Facebook className="w-6 h-6 text-blue-600" />
                    <span className="text-gray-700">Facebook</span>
                  </a>
                )}
                {settings?.contactSocialMedia?.twitter && (
                  <a href={settings.contactSocialMedia.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <Twitter className="w-6 h-6 text-blue-400" />
                    <span className="text-gray-700">Twitter</span>
                  </a>
                )}
                {settings?.contactSocialMedia?.instagram && (
                  <a href={settings.contactSocialMedia.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 p-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
                    <Instagram className="w-6 h-6 text-pink-600" />
                    <span className="text-gray-700">Instagram</span>
                  </a>
                )}
                {settings?.contactSocialMedia?.youtube && (
                  <a href={settings.contactSocialMedia.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Youtube className="w-6 h-6 text-red-600" />
                    <span className="text-gray-700">YouTube</span>
                  </a>
                )}
                {(!settings?.contactSocialMedia?.facebook && !settings?.contactSocialMedia?.twitter && !settings?.contactSocialMedia?.instagram && !settings?.contactSocialMedia?.youtube) && (
                  <div className="col-span-2 text-center text-gray-500 py-4">
                    সামাজিক যোগাযোগের লিঙ্ক এখনো যোগ করা হয়নি
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">ই</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">{settings?.schoolName || 'আমার স্কুল'}</h3>
            <p className="text-gray-400 mb-4">{settings?.schoolDescription || 'ভালোবাসা দিয়ে শিক্ষা, ইসলামিক মূল্যবোধে জীবন গড়া'}</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>📞 {settings?.schoolPhone || '+৮৮০ ১৭১১ ২৩৪৫৬৭'}</span>
              <span>✉️ {settings?.schoolEmail || 'info@iqraschool.edu'}</span>
              <span>📍 {settings?.schoolAddress || 'ঢাকা, বাংলাদেশ'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PublicContactPageWrapper() {
  return <PublicContactPage />;
}
