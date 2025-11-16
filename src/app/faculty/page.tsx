'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { GraduationCap } from 'lucide-react';
import { settingsQueries, SystemSettings, teacherQueries } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const FacultyPage = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [teachers, setTeachers] = useState<Array<{
    id: string;
    name: string;
    designation: string;
    photoUrl?: string;
    isActive: boolean;
    order: number;
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
          
          // Load teachers (শিক্ষক)
          if (settings) {
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
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-6">{teachersTitle}</h1>
            <p className="text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
              আমাদের অভিজ্ঞ ও দক্ষ শিক্ষকমণ্ডলী
            </p>
          </div>
        </div>
      </div>

      {/* Teachers Section */}
      {teachersEnabled && teachers.length > 0 ? (
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      ) : (
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-gray-600 text-lg">শিক্ষকদের তথ্য শীঘ্রই যোগ করা হবে</p>
            </div>
          </div>
        </div>
      )}

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

export default function FacultyPageWrapper() {
  return <FacultyPage />;
}

