'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { 
  Heart, 
  Award, 
  Users, 
  BookOpen, 
  Target, 
  Eye, 
  CheckCircle, 
  Star, 
  GraduationCap, 
  Shield, 
  Globe, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { settingsQueries, SystemSettings, teacherQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const PublicAboutPage = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [committee, setCommittee] = useState<Array<{
    id: string;
    name: string;
    designation: string;
    photoUrl?: string;
    isActive: boolean;
    order: number;
  }>>([]);
  const [committeeEnabled, setCommitteeEnabled] = useState(true);
  const [committeeTitle, setCommitteeTitle] = useState('ম্যানেজিং কমিটি');
  const [teachers, setTeachers] = useState<Array<{
    id: string;
    name: string;
    designation: string;
    photoUrl?: string;
    isActive: boolean;
    order: number;
    uid?: string;
    teacherId?: string;
  }>>([]);
  const [teachersEnabled, setTeachersEnabled] = useState(true);
  const [teachersTitle, setTeachersTitle] = useState('শিক্ষক');

  // Real-time listener for settings
  useEffect(() => {
    setLoading(true);
    const settingsDocRef = doc(db, 'system', 'settings');
    
    const unsubscribe = onSnapshot(
      settingsDocRef,
      async (docSnap) => {
        try {
          let settings: SystemSettings | null = null;
          
          if (docSnap.exists()) {
            settings = { id: docSnap.id, ...docSnap.data() } as SystemSettings;
          } else {
            settings = await settingsQueries.getSettings();
          }
          
          setSettings(settings);
          
          // Load committee (ম্যানেজিং কমিটি)
          if (settings) {
            if ((settings as any).homeCommitteeEnabled !== undefined) {
              setCommitteeEnabled((settings as any).homeCommitteeEnabled);
            }
            if ((settings as any).homeCommitteeTitle) {
              setCommitteeTitle((settings as any).homeCommitteeTitle);
            }
            if ((settings as any).homeCommittee && Array.isArray((settings as any).homeCommittee)) {
              const activeCommittee = (settings as any).homeCommittee
                .filter((c: any) => c.isActive !== false)
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              setCommittee(activeCommittee);
            }

            // Load teachers (শিক্ষক)
            if ((settings as any).homeTeachersEnabled !== undefined) {
              setTeachersEnabled((settings as any).homeTeachersEnabled);
            }
            if ((settings as any).homeTeachersTitle) {
              setTeachersTitle((settings as any).homeTeachersTitle);
            }
            if ((settings as any).homeTeachers && Array.isArray((settings as any).homeTeachers)) {
              const activeTeachers = (settings as any).homeTeachers
                .filter((t: any) => t.isActive !== false)
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              
              // First set the teachers from settings (will show manual data if no uid)
              setTeachers(activeTeachers);
              
              // Then fetch real teacher data if uid exists (async, will update later)
              const loadRealTeacherData = async (teachers: Array<{
                id: string;
                name: string;
                designation: string;
                photoUrl?: string;
                isActive: boolean;
                order: number;
                uid?: string;
                teacherId?: string;
              }>) => {
                try {
                  const teachersWithRealData = await Promise.all(
                    teachers.map(async (teacher) => {
                      // If teacher has uid, fetch real data
                      if (teacher.uid) {
                        try {
                          const realTeacher = await teacherQueries.getTeacherById(teacher.uid);
                          if (realTeacher) {
                            return {
                              ...teacher,
                              name: realTeacher.name || realTeacher.displayName || teacher.name,
                              designation: realTeacher.designation || realTeacher.subject || teacher.designation || '',
                              photoUrl: realTeacher.profileImage || teacher.photoUrl || ''
                            };
                          }
                        } catch (error) {
                          console.error(`Error loading teacher data for ${teacher.uid}:`, error);
                        }
                      }
                      // Return original teacher data if no uid or fetch failed
                      return teacher;
                    })
                  );
                  setTeachers(teachersWithRealData);
                } catch (error) {
                  console.error('Error loading real teacher data:', error);
                  // Fallback to original teachers data
                  setTeachers(teachers);
                }
              };

              if (activeTeachers.some((t: any) => t.uid)) {
                loadRealTeacherData(activeTeachers);
              }
            }
          }
        } catch (error) {
          console.error('Error loading settings:', error);
          setSettings(null);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error in settings listener:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Icon mapping for stats
  const getIconForLabel = (label: string) => {
    if (label.includes('শিক্ষার্থী') || label.includes('ছাত্র')) return Users;
    if (label.includes('শিক্ষক')) return GraduationCap;
    if (label.includes('বছর')) return BookOpen;
    if (label.includes('সাফল্য') || label.includes('পাস')) return Award;
    return Users;
  };

  // Color mapping for stats
  const getColorForIndex = (index: number) => {
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-yellow-600'];
    return colors[index % colors.length];
  };

  // Icon mapping for values
  const getIconForValue = (title: string) => {
    if (title.includes('ভালোবাসা')) return Heart;
    if (title.includes('নিরাপত্তা')) return Shield;
    if (title.includes('শিক্ষা') || title.includes('গুণ')) return Target;
    if (title.includes('বিশ্ব')) return Globe;
    return Heart;
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
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 text-white pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-white font-bold text-2xl">ই</span>
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-6">{settings?.aboutPageTitle || 'আমাদের সম্পর্কে'}</h1>
            <p className="text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
              {settings?.aboutPageSubtitle || 'ভালোবাসা দিয়ে শিক্ষা, ইসলামিক মূল্যবোধে জীবন গড়া'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {settings?.aboutStats && Array.isArray(settings.aboutStats) && settings.aboutStats.length > 0 && (
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {settings.aboutStats.map((stat, index) => {
                if (!stat || !stat.label || !stat.value) return null;
                const Icon = getIconForLabel(stat.label);
                const color = getColorForIndex(index);
                return (
                  <div key={index} className="text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-white flex items-center justify-center shadow-lg`}>
                      <Icon className={`w-8 h-8 ${color}`} />
                    </div>
                    <div className={`text-3xl font-bold ${color} mb-2`}>{stat.value}</div>
                    <div className="text-gray-600 font-medium">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      {settings?.aboutIntro && (
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">আমাদের সম্পর্কে</h2>
                <div className="space-y-6 text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                  {settings.aboutIntro && typeof settings.aboutIntro === 'string' ? (
                    settings.aboutIntro.split('\n').map((para, idx) => (
                      para.trim() && <p key={idx}>{para.trim()}</p>
                    ))
                  ) : (
                    <p>{settings.aboutIntro}</p>
                  )}
                </div>
              </div>
              <div className="relative flex justify-center lg:justify-end">
                {settings?.aboutImageUrl ? (
                  <img
                    src={settings.aboutImageUrl}
                    alt="School Building"
                    className="rounded-2xl shadow-2xl max-w-xs w-full h-auto object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop';
                    }}
                  />
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop"
                    alt="School Building"
                    className="rounded-2xl shadow-2xl max-w-xs w-full h-auto object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mission & Vision */}
      {(settings?.aboutMission || settings?.aboutVision) && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {settings.aboutMission && (
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Eye className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">আমাদের লক্ষ্য</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{settings.aboutMission}</p>
                </div>
              )}
              
              {settings.aboutVision && (
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">আমাদের উদ্দেশ্য</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{settings.aboutVision}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Values Section */}
      {settings?.aboutValues && Array.isArray(settings.aboutValues) && settings.aboutValues.length > 0 && (
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">আমাদের মূল্যবোধ</h2>
              <p className="text-xl text-gray-600">যে মূল্যবোধগুলো আমাদের পরিচালিত করে</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {settings.aboutValues.map((value, index) => {
                if (!value || !value.title) return null;
                const Icon = getIconForValue(value.title);
                return (
                  <div key={index} className="text-center group">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{value.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{value.description || ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Achievements Section */}
      {settings?.aboutAchievements && Array.isArray(settings.aboutAchievements) && settings.aboutAchievements.length > 0 && (
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">আমাদের সাফল্য</h2>
              <p className="text-xl text-gray-600">যে অর্জনগুলো আমাদের গর্বিত করে</p>
            </div>
            
            <div className="space-y-8">
              {settings.aboutAchievements.map((achievement, index) => {
                if (!achievement || !achievement.title) return null;
                return (
                  <div key={index} className="bg-white rounded-2xl shadow-lg p-8 flex items-center space-x-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        {achievement.year && <span className="text-2xl font-bold text-gray-900">{achievement.year}</span>}
                        <h3 className="text-xl font-semibold text-gray-900">{achievement.title}</h3>
                      </div>
                      {achievement.description && <p className="text-gray-600">{achievement.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Managing Committee Section (ম্যানেজিং কমিটি) */}
      {committeeEnabled && committee.length > 0 && (
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">{committeeTitle}</h2>
              <p className="text-xl text-gray-600">আমাদের ম্যানেজিং কমিটির সদস্যবৃন্দ</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {committee.map((member) => {
                const firstLetter = member.name ? member.name.charAt(0) : '?';
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
                const colorIndex = member.name ? member.name.charCodeAt(0) % colors.length : 0;
                const avatarColor = colors[colorIndex];

                return (
                  <div key={member.id} className="text-center">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-4 border-gray-200 shadow-lg"
                      />
                    ) : (
                      <div className={`w-24 h-24 ${avatarColor} rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                        <span className="text-white text-2xl font-bold">{firstLetter}</span>
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
                    <p className="text-sm text-gray-600">{member.designation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Teachers Section (শিক্ষক) */}
      {teachersEnabled && teachers.length > 0 && (
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">{teachersTitle}</h2>
              <p className="text-xl text-gray-600">আমাদের অভিজ্ঞ ও দক্ষ শিক্ষকমণ্ডলী</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {teachers.map((teacher) => {
                const firstLetter = teacher.name ? teacher.name.charAt(0) : '?';
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
                const colorIndex = teacher.name ? teacher.name.charCodeAt(0) % colors.length : 0;
                const avatarColor = colors[colorIndex];

                return (
                  <div key={teacher.id} className="text-center">
                    {teacher.photoUrl ? (
                      <img
                        src={teacher.photoUrl}
                        alt={teacher.name}
                        className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-4 border-gray-200 shadow-lg"
                      />
                    ) : (
                      <div className={`w-24 h-24 ${avatarColor} rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                        <span className="text-white text-2xl font-bold">{firstLetter}</span>
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{teacher.name}</h3>
                    <p className="text-sm text-gray-600">{teacher.designation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">যোগাযোগ করুন</h2>
            <p className="text-xl text-blue-100">আমাদের সাথে যোগাযোগ করে আরও জানুন</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ফোন</h3>
              <p className="text-blue-100">+৮৮০ ১৭১১ ২৩৪৫৬৭</p>
              <p className="text-blue-100">+৮৮০ ১৯১১ ২৩৪৫৬৭</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ইমেইল</h3>
              <p className="text-blue-100">info@iqraschool.edu</p>
              <p className="text-blue-100">admission@iqraschool.edu</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ঠিকানা</h3>
              <p className="text-blue-100">রামপুরা, ঢাকা-১২১৯</p>
              <p className="text-blue-100">বাংলাদেশ</p>
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

export default function PublicAboutPageWrapper() {
  return <PublicAboutPage />;
}
