'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Eye, EyeOff, ArrowLeft, User, School, Phone, MapPin } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SCHOOL_ID, SCHOOL_NAME } from '@/lib/constants';

interface SignUpData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  role: 'teacher' | 'parent' | 'student' | 'super_admin' | 'admin';
  schoolId: string;
  schoolName: string;
  address: string;
  guardianName?: string;
  guardianPhone?: string;
  studentId?: string;
  class?: string;
  section?: string;
}

function SignUpPage() {
  const [formData, setFormData] = useState<SignUpData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'student',
    schoolId: 'school-abc-123', // Default school ID
    schoolName: '',
    address: '',
    guardianName: '',
    guardianPhone: '',
    studentId: '',
    class: '',
    section: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // Load school name from settings
  useEffect(() => {
    const loadSchoolSettings = async () => {
      try {
        const { settingsQueries } = await import('@/lib/database-queries');
        const settings = await settingsQueries.getSettings();
        if (settings?.schoolName) {
          setFormData(prev => ({
            ...prev,
            schoolName: settings.schoolName,
            schoolId: settings.schoolCode || SCHOOL_ID
          }));
        } else {
          // Use constants as fallback
          setFormData(prev => ({
            ...prev,
            schoolName: SCHOOL_NAME,
            schoolId: SCHOOL_ID
          }));
        }
      } catch (error) {
        console.error('Error loading school settings:', error);
        // Use constants as fallback
        setFormData(prev => ({
          ...prev,
          schoolName: SCHOOL_NAME,
          schoolId: SCHOOL_ID
        }));
      }
    };
    loadSchoolSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('পাসওয়ার্ড মিল নেই');
      return false;
    }

    if (formData.password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return false;
    }

    if (!formData.name.trim()) {
      setError('নাম লিখতে হবে');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('ফোন নম্বর লিখতে হবে');
      return false;
    }

    if (formData.role === 'student' && (!formData.guardianName || !formData.guardianPhone)) {
      setError('ছাত্র/ছাত্রীদের অভিভাবকের তথ্য প্রয়োজন');
      return false;
    }

    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Debug: Log form data
      console.log('Creating user with form data:', {
        ...formData,
        password: '***',
        confirmPassword: '***'
      });

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      const user = userCredential.user;
      console.log('User created in Firebase Auth:', user.uid);

      // Create user document in Firestore
      // Admin and teacher roles need approval (isActive: false)
      // Student and parent can login immediately (isActive: true)
      // Super admin should NOT be created through signup - they are created manually
      // But if someone tries, they also need approval
      const needsApproval = formData.role === 'admin' || formData.role === 'teacher' || formData.role === 'super_admin';
      
      const userData = {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        schoolId: formData.schoolId,
        schoolName: formData.schoolName,
        address: formData.address,
        isActive: !needsApproval, // Admin and teacher need approval, student/parent are auto-activated
        profileImage: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(formData.role === 'student' && {
          guardianName: formData.guardianName,
          guardianPhone: formData.guardianPhone,
          studentId: formData.studentId || `STD-${Date.now()}`,
          class: formData.class,
          section: formData.section
        })
      };

      console.log('Saving user data to Firestore:', userData);
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('User data saved successfully!');

      // Sign out the user immediately after account creation
      // Firebase automatically logs in the user, but we want them to wait for approval if needed
      await signOut(auth);
      console.log('User signed out after account creation');

      if (needsApproval) {
        setSuccess(`অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! অনুগ্রহ করে অনুমোদনের জন্য অপেক্ষা করুন। সুপার অ্যাডমিন অনুমোদনের পর আপনি লগইন করতে পারবেন।`);
        
        // Redirect to home page after showing message
        setTimeout(() => {
          router.push('/');
        }, 4000); // 4 seconds to read the message
      } else {
        setSuccess(`অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! এখনই লগইন করতে পারেন।`);
        
        // Redirect to home page, they can login from there
        setTimeout(() => {
          router.push('/');
        }, 3000); // 3 seconds to read the message
      }

    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(`${getErrorMessage(error.code)} (Error: ${error.message})`);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'এই ইমেইল ঠিকানা ইতিমধ্যে ব্যবহৃত হচ্ছে';
      case 'auth/invalid-email':
        return 'অবৈধ ইমেইল ঠিকানা';
      case 'auth/weak-password':
        return 'পাসওয়ার্ড খুব দুর্বল';
      default:
        return 'সাইন আপে সমস্যা হয়েছে, আবার চেষ্টা করুন';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-teal-500 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <button
          onClick={() => router.push('/auth/login')}
          className="mb-6 flex items-center text-white hover:text-blue-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>লগইন পেইজে ফিরুন</span>
        </button>

        {/* Sign Up Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">নতুন অ্যাকাউন্ট তৈরি করুন</h1>
            <p className="text-gray-600">আমার স্কুলতে যোগ দিন</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSignUp} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                আপনি কে?
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="student">ছাত্র/ছাত্রী</option>
                <option value="parent">অভিভাবক</option>
                <option value="teacher">শিক্ষক</option>
                <option value="admin">অ্যাডমিন</option>
                <option value="super_admin">সুপার অ্যাডমিন</option>
              </select>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  পূর্ণ নাম *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="আপনার পূর্ণ নাম লিখুন"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ফোন নম্বর *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+880 1700000000"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ইমেইল ঠিকানা *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="আপনার ইমেইল লিখুন"
              />
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  পাসওয়ার্ড *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  পাসওয়ার্ড নিশ্চিত করুন *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    placeholder="পাসওয়ার্ড আবার লিখুন"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ঠিকানা
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="আপনার ঠিকানা লিখুন"
              />
            </div>

            {/* Student-specific fields */}
            {formData.role === 'student' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">ছাত্র/ছাত্রীর অতিরিক্ত তথ্য</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Class */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      শ্রেণী
                    </label>
                    <input
                      type="text"
                      name="class"
                      value={formData.class}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="যেমন: দশম শ্রেণী"
                    />
                  </div>

                  {/* Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      শাখা
                    </label>
                    <input
                      type="text"
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="যেমন: ক"
                    />
                  </div>

                  {/* Guardian Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      অভিভাবকের নাম *
                    </label>
                    <input
                      type="text"
                      name="guardianName"
                      value={formData.guardianName}
                      onChange={handleInputChange}
                      required={formData.role === 'student'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="অভিভাবকের পূর্ণ নাম"
                    />
                  </div>

                  {/* Guardian Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      অভিভাবকের ফোন *
                    </label>
                    <input
                      type="tel"
                      name="guardianPhone"
                      value={formData.guardianPhone}
                      onChange={handleInputChange}
                      required={formData.role === 'student'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+880 1700000000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* School Information */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <School className="w-5 h-5 mr-2" />
                প্রতিষ্ঠানের তথ্য
              </h3>
              <p className="text-sm text-gray-600">
                <strong>স্কুল:</strong> {formData.schoolName}
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <label className="ml-2 text-sm text-gray-600">
                আমি <span className="text-blue-600">নিয়ম ও শর্তাবলী</span> এবং{' '}
                <span className="text-blue-600">গোপনীয়তা নীতি</span> পড়েছি এবং সম্মত আছি
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  অ্যাকাউন্ট তৈরি হচ্ছে...
                </div>
              ) : (
                'সাইন আপ করুন'
              )}
            </button>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  লগইন করুন
                </button>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white text-sm">
            © 2024 আমার স্কুল। সর্বস্বত্ব সংরক্ষিত।
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPageWrapper() {
  return (
    <ProtectedRoute requireAuth={false}>
      <SignUpPage />
    </ProtectedRoute>
  );
}