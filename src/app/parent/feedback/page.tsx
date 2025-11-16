'use client';

import { useState, useEffect } from 'react';
import ParentLayout from '@/components/ParentLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ID } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import {
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Star,
  Lightbulb,
  BookOpen,
  Building,
  Eye,
  Clock,
  XCircle
} from 'lucide-react';

interface FeedbackItem {
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
  read: boolean;
  responded: boolean;
  createdAt: Timestamp | any;
  updatedAt?: Timestamp | any;
  approvedAt?: Timestamp | any;
  rejectedAt?: Timestamp | any;
}

function FeedbackPage() {
  const { userData, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'submit' | 'view'>('submit');
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: '',
    rating: 0,
    suggestion: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  const categories = [
    { value: 'general', label: 'সাধারণ মতামত', icon: MessageSquare },
    { value: 'academic', label: 'একাডেমিক', icon: BookOpen },
    { value: 'facility', label: 'সুবিধা', icon: Building },
    { value: 'communication', label: 'যোগাযোগ', icon: MessageSquare },
    { value: 'suggestion', label: 'পরামর্শ', icon: Lightbulb },
    { value: 'complaint', label: 'অভিযোগ', icon: AlertCircle },
  ];

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'অনুমোদিত', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'rejected':
        return { label: 'প্রত্যাখ্যান', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'new':
      default:
        return { label: 'অপেক্ষমান', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    }
  };

  // Load all feedbacks for the current parent
  useEffect(() => {
    if (!user?.uid) return;

    setLoadingFeedbacks(true);
    const feedbackRef = collection(db, 'parentFeedback');
    
    // Try with orderBy first, fallback to without orderBy if index is missing
    let q;
    try {
      q = query(
        feedbackRef,
        where('parentId', '==', user.uid),
        where('schoolId', '==', SCHOOL_ID),
        orderBy('createdAt', 'desc')
      );
    } catch (error) {
      console.warn('OrderBy failed, using query without orderBy:', error);
      q = query(
        feedbackRef,
        where('parentId', '==', user.uid),
        where('schoolId', '==', SCHOOL_ID)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbacksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedbackItem[];

      // Sort by createdAt if available (client-side fallback)
      feedbacksData.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                     (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                     (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bTime - aTime; // Descending order
      });

      setFeedbacks(feedbacksData);
      setLoadingFeedbacks(false);
    }, (error) => {
      console.error('Error loading feedbacks:', error);
      setLoadingFeedbacks(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.message.trim()) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      const feedbackData = {
        parentId: user?.uid || '',
        parentName: (userData as any)?.name || user?.displayName || user?.email?.split('@')[0] || 'Unknown',
        parentEmail: user?.email || (userData as any)?.email || '',
        parentPhone: (userData as any)?.phone || '',
        category: formData.category,
        subject: formData.subject.trim() || '',
        message: formData.message.trim(),
        rating: formData.rating || 0,
        suggestion: formData.suggestion.trim() || '',
        schoolId: SCHOOL_ID,
        status: 'new' as const,
        read: false,
        responded: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'parentFeedback'), feedbackData);
      
      setSubmitStatus('success');
      setFormData({
        category: '',
        subject: '',
        message: '',
        rating: 0,
        suggestion: ''
      });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ParentLayout title="মতামত" subtitle="আপনার মূল্যবান মতামত আমাদের কাছে গুরুত্বপূর্ণ">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'submit'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>মতামত দিন</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'view'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>মতামত দেখুন</span>
                {feedbacks.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {feedbacks.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Submit Tab Content */}
        {activeTab === 'submit' && (
          <div className="space-y-6">
        {/* Success/Error Messages */}
        {submitStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">আপনার মতামত সফলভাবে জমা দেওয়া হয়েছে। ধন্যবাদ!</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">মতামত জমা দেওয়ার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।</p>
          </div>
        )}

        {/* Feedback Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">আপনার মতামত দিন</h2>
              <p className="text-sm text-gray-600">আমরা আপনার মতামতকে গুরুত্ব দিয়ে বিবেচনা করি</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                বিষয় <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isSelected = formData.category === category.value;
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <p className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {category.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                বিষয়
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="মতামতের বিষয় লিখুন (ঐচ্ছিক)"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                সামগ্রিক রেটিং
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleRatingClick(rating)}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                      formData.rating >= rating
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <Star
                      className={`w-6 h-6 ${formData.rating >= rating ? 'fill-current' : ''}`}
                    />
                  </button>
                ))}
                {formData.rating > 0 && (
                  <span className="ml-3 text-sm text-gray-600">
                    {formData.rating} / 5
                  </span>
                )}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                আপনার মতামত <span className="text-red-500">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={6}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="আপনার মূল্যবান মতামত লিখুন..."
              />
            </div>

            {/* Suggestion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                পরামর্শ (ঐচ্ছিক)
              </label>
              <textarea
                name="suggestion"
                value={formData.suggestion}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="আপনার কোনো পরামর্শ থাকলে লিখুন..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    category: '',
                    subject: '',
                    message: '',
                    rating: 0,
                    suggestion: ''
                  });
                  setSubmitStatus('idle');
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                রিসেট
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.category || !formData.message.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>জমা দেওয়া হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>মতামত জমা দিন</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <Lightbulb className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">মতামত দেওয়ার নির্দেশনা</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• আপনার মতামত আমাদের উন্নতির জন্য গুরুত্বপূর্ণ</li>
                    <li>• আমরা প্রতিটি মতামতকে গুরুত্ব দিয়ে বিবেচনা করি</li>
                    <li>• আপনার মতামত সম্পূর্ণ গোপনীয় রাখা হবে</li>
                    <li>• প্রয়োজনে আমরা আপনার সাথে যোগাযোগ করব</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Tab Content */}
        {activeTab === 'view' && (
          <div className="space-y-6">
            {loadingFeedbacks ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">মতামত লোড হচ্ছে...</p>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">কোন মতামত পাওয়া যায়নি</h3>
                <p className="text-gray-600 mb-6">আপনি এখনও কোনো মতামত জমা দেননি</p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  মতামত দিন
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => {
                  const statusBadge = getStatusBadge(feedback.status);
                  const createdDate = feedback.createdAt?.toDate 
                    ? new Date(feedback.createdAt.toDate())
                    : (feedback.createdAt ? new Date(feedback.createdAt) : new Date());
                  
                  return (
                    <div
                      key={feedback.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
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
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {feedback.subject}
                            </h3>
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
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ParentLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <FeedbackPage />
    </ProtectedRoute>
  );
}

