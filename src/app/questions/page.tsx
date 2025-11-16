'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Search, FileText, Award, GraduationCap, Eye, Download, Image as ImageIcon, Calendar, BookOpen } from 'lucide-react';
import { SystemSettings } from '@/lib/database-queries';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { getProxyUrl } from '@/lib/imagekit-utils';

interface ExamQuestion {
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
  isActive: boolean;
}

const PublicQuestionsPage = () => {
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [filteredExamQuestions, setFilteredExamQuestions] = useState<ExamQuestion[]>([]);
  const [examQuestionsLoading, setExamQuestionsLoading] = useState(true);
  const [examSearchTerm, setExamSearchTerm] = useState('');
  const [examFilterExamType, setExamFilterExamType] = useState('');
  const [examFilterClass, setExamFilterClass] = useState('');
  const [examFilterSubject, setExamFilterSubject] = useState('');
  const [examFilterYear, setExamFilterYear] = useState('');
  const [generalSettings, setGeneralSettings] = useState<SystemSettings | null>(null);

  // Real-time listener for settings
  useEffect(() => {
    const settingsRef = doc(db, 'system', 'settings');
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as SystemSettings;
          setGeneralSettings(data);
        }
      },
      (error) => {
        console.error('Error listening to settings:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load exam questions from Firebase with real-time listener
  useEffect(() => {
    console.log('Questions page: Setting up real-time exam questions listener...');
    let unsubscribeQuestions: (() => void) | null = null;

    const setupQuestionsListener = async () => {
      try {
        setExamQuestionsLoading(true);
        const questionsRef = collection(db, 'examQuestions');
        
        // Helper function to process snapshot
        const processSnapshot = (snapshot: any) => {
          console.log('Questions page: Real-time update - Exam questions snapshot:', snapshot.size, 'documents');
          const questionsData: ExamQuestion[] = [];
          
          snapshot.forEach((docSnap: any) => {
            try {
              const data = docSnap.data();
              
              // Filter client-side for active questions
              if (data.isActive !== false) {
                questionsData.push({
                  id: docSnap.id,
                  title: data.title || '',
                  examType: data.examType || '',
                  year: data.year || '',
                  className: data.className || '',
                  subject: data.subject || '',
                  fileUrl: data.fileUrl || '',
                  fileName: data.fileName || '',
                  fileType: data.fileType || (data.fileUrl?.includes('.pdf') ? 'pdf' : 'image'),
                  uploadedAt: data.uploadedAt,
                  isActive: data.isActive !== false
                } as ExamQuestion);
              }
            } catch (error) {
              console.error('Questions page: Error processing document:', error, docSnap.id);
            }
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
          
          console.log('Questions page: Real-time update - Final exam questions:', questionsData.length);
          setExamQuestions(questionsData);
          setFilteredExamQuestions(questionsData);
          setExamQuestionsLoading(false);
        };

        // Try with orderBy first
        try {
          const q = query(questionsRef, orderBy('uploadedAt', 'desc'));
          unsubscribeQuestions = onSnapshot(
            q,
            (snapshot) => {
              processSnapshot(snapshot);
            },
            (error) => {
              console.error('Questions page: Error with orderBy query, trying without orderBy:', error);
              // Fallback: try without orderBy
              const fallbackUnsubscribe = onSnapshot(
                questionsRef,
                (snapshot) => {
                  processSnapshot(snapshot);
                },
                (fallbackError) => {
                  console.error('Questions page: Error in fallback listener:', fallbackError);
                  setExamQuestions([]);
                  setFilteredExamQuestions([]);
                  setExamQuestionsLoading(false);
                }
              );
              unsubscribeQuestions = fallbackUnsubscribe;
            }
          );
        } catch (queryError) {
          console.error('Questions page: Error setting up query, using simple listener:', queryError);
          // Fallback without orderBy
          unsubscribeQuestions = onSnapshot(
            questionsRef,
            (snapshot) => {
              processSnapshot(snapshot);
            },
            (error) => {
              console.error('Questions page: Error in simple listener:', error);
              setExamQuestions([]);
              setFilteredExamQuestions([]);
              setExamQuestionsLoading(false);
            }
          );
        }
      } catch (error) {
        console.error('Questions page: Error setting up real-time listener:', error);
        setExamQuestions([]);
        setFilteredExamQuestions([]);
        setExamQuestionsLoading(false);
      }
    };

    setupQuestionsListener();

    // Cleanup function
    return () => {
      if (unsubscribeQuestions) {
        console.log('Questions page: Unsubscribing from real-time exam questions listener');
        unsubscribeQuestions();
      }
    };
  }, []);

  // Filter exam questions
  useEffect(() => {
    let filtered = examQuestions || [];

    // Search filter
    if (examSearchTerm) {
      filtered = filtered.filter(q => 
        q.title?.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
        q.examType?.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
        q.subject?.toLowerCase().includes(examSearchTerm.toLowerCase())
      );
    }

    // Exam type filter
    if (examFilterExamType) {
      filtered = filtered.filter(q => q.examType === examFilterExamType);
    }

    // Class filter
    if (examFilterClass) {
      filtered = filtered.filter(q => q.className === examFilterClass);
    }

    // Subject filter
    if (examFilterSubject) {
      filtered = filtered.filter(q => q.subject === examFilterSubject);
    }

    // Year filter
    if (examFilterYear) {
      filtered = filtered.filter(q => q.year === examFilterYear);
    }

    setFilteredExamQuestions(filtered);
  }, [examQuestions, examSearchTerm, examFilterExamType, examFilterClass, examFilterSubject, examFilterYear]);

  // Sample data

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <FileText className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">পরীক্ষার প্রশ্নপত্র</h1>
            <p className="text-xl text-purple-100 max-w-3xl mx-auto">
              পূর্ববর্তী পরীক্ষার প্রশ্নপত্র ডাউনলোড করুন এবং প্রস্তুতি নিন
            </p>
          </div>
        </div>
      </div>

      {/* Exam Questions Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="প্রশ্নপত্র খুঁজুন..."
                    value={examSearchTerm}
                    onChange={(e) => setExamSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Exam Type Filter */}
              <div>
                <select
                  value={examFilterExamType}
                  onChange={(e) => setExamFilterExamType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">সকল পরীক্ষা</option>
                  <option value="প্রথম সাময়িক">প্রথম সাময়িক</option>
                  <option value="দ্বিতীয় সাময়িক">দ্বিতীয় সাময়িক</option>
                  <option value="তৃতীয় সাময়িক">তৃতীয় সাময়িক</option>
                  <option value="বার্ষিক">বার্ষিক</option>
                  <option value="মধ্যবর্তী">মধ্যবর্তী</option>
                  <option value="শ্রেণি পরীক্ষা">শ্রেণি পরীক্ষা</option>
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <select
                  value={examFilterClass}
                  onChange={(e) => setExamFilterClass(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">সকল ক্লাস</option>
                  <option value="৬ষ্ঠ">৬ষ্ঠ</option>
                  <option value="৭ম">৭ম</option>
                  <option value="৮ম">৮ম</option>
                  <option value="৯ম">৯ম</option>
                  <option value="১০ম">১০ম</option>
                  <option value="১১ম">১১ম</option>
                  <option value="১২ম">১২ম</option>
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <select
                  value={examFilterSubject}
                  onChange={(e) => setExamFilterSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">সকল বিষয়</option>
                  <option value="গণিত">গণিত</option>
                  <option value="ইংরেজি">ইংরেজি</option>
                  <option value="বাংলা">বাংলা</option>
                  <option value="বিজ্ঞান">বিজ্ঞান</option>
                  <option value="ইতিহাস">ইতিহাস</option>
                  <option value="ভূগোল">ভূগোল</option>
                  <option value="ধর্ম">ধর্ম</option>
                </select>
              </div>
            </div>

            {/* Year Filter */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">বছর</label>
              <input
                type="text"
                placeholder="যেমন: ২০২৪"
                value={examFilterYear}
                onChange={(e) => setExamFilterYear(e.target.value)}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Questions Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              {filteredExamQuestions.length}টি প্রশ্নপত্র পাওয়া গেছে
            </p>
          </div>

          {/* Exam Questions List */}
          {examQuestionsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">প্রশ্নপত্র লোড হচ্ছে...</p>
            </div>
          ) : filteredExamQuestions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">কোন প্রশ্নপত্র পাওয়া যায়নি</h3>
              <p className="text-gray-600">আপনার অনুসন্ধানের সাথে মিলে যায় এমন কোন প্রশ্নপত্র নেই</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExamQuestions.map((question) => (
                <div key={question.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 flex-1">{question.title}</h3>
                      <div className="ml-2">
                        {question.fileType === 'pdf' ? (
                          <FileText className="w-6 h-6 text-red-600" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
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

                    <div className="flex space-x-2 pt-4 border-t border-gray-200">
                      <a
                        href={getProxyUrl(question.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>দেখুন</span>
                      </a>
                      <a
                        href={getProxyUrl(question.fileUrl)}
                        download
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>ডাউনলোড</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
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

export default function PublicQuestionsPageWrapper() {
  return <PublicQuestionsPage />;
}
