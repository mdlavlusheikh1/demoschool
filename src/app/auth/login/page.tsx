'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { userQueries, settingsQueries, SystemSettings } from '@/lib/database-queries';
import { getRoleBasedRoute } from '@/utils/roleRedirect';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, Shield, GraduationCap, Users, UserCheck, Sparkles } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schoolName, setSchoolName] = useState('আমার স্কুল');
  const router = useRouter();
  const { userData } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!email || !email.trim()) {
      setError('অনুগ্রহ করে ইমেইল ঠিকানা দিন');
      setLoading(false);
      return;
    }

    if (!password || !password.trim()) {
      setError('অনুগ্রহ করে পাসওয়ার্ড দিন');
      setLoading(false);
      return;
    }

    // Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    let trimmedPassword = password.trim();
    
    // Clean phone number (remove non-digits) - for parent login
    const cleanPhonePassword = trimmedPassword.replace(/\D/g, '');
    const isPhoneNumberPassword = cleanPhonePassword.length >= 10 && /^\d+$/.test(cleanPhonePassword);

    try {
      // First authenticate with Firebase
      let userCredential;
      let authError: any = null;
      
      // For parent and teacher login, try cleaned phone password first if password looks like phone number
      if (isPhoneNumberPassword && cleanPhonePassword !== trimmedPassword) {
        try {
          userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, cleanPhonePassword);
        } catch (cleanPhoneError: any) {
          authError = cleanPhoneError;
        }
      }
      
      // Also try with phone number without country code (last 10 digits) for Bangladesh numbers
      if (!userCredential && isPhoneNumberPassword && cleanPhonePassword.length > 10) {
        const last10Digits = cleanPhonePassword.slice(-10);
        if (last10Digits !== cleanPhonePassword && last10Digits.length === 10) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, last10Digits);
          } catch (last10Error: any) {
            if (!authError) authError = last10Error;
          }
        }
      }
      
      // If not successful yet, try with original password
      if (!userCredential) {
        try {
          userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, trimmedPassword);
        } catch (normalizedError: any) {
          authError = normalizedError;
          
          // If password looks like phone and we haven't tried cleaned version yet, try it
          if (isPhoneNumberPassword && cleanPhonePassword !== trimmedPassword && normalizedError.code === 'auth/invalid-credential') {
            try {
              userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, cleanPhonePassword);
              authError = null;
            } catch (phoneError: any) {
              // Keep error
            }
          }
        }
      }
      
      // If still failed, try with original email (case-sensitive)
      if (!userCredential && authError && email.trim() !== normalizedEmail) {
        try {
          userCredential = await signInWithEmailAndPassword(auth, email.trim(), trimmedPassword);
          authError = null;
        } catch (originalError: any) {
          // If password looks like phone, try cleaned phone with original email
          if (isPhoneNumberPassword && cleanPhonePassword !== trimmedPassword && originalError.code === 'auth/invalid-credential') {
            try {
              userCredential = await signInWithEmailAndPassword(auth, email.trim(), cleanPhonePassword);
              authError = null;
            } catch (phoneError2: any) {
              authError = originalError;
            }
          } else {
            authError = originalError;
          }
        }
      }
      
      // If all attempts failed, throw the error
      if (!userCredential && authError) {
        throw authError;
      }
      
      if (!userCredential) {
        throw new Error('Authentication failed');
      }
      
      const firebaseUser = userCredential.user;

      // Get user data from Firestore to check approval status
      let userDataFromDB = null;
      
      if (firebaseUser.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            userDataFromDB = { uid: userDoc.id, ...userDoc.data() } as any;
          }
        } catch (uidError) {
          console.error('Error fetching user by UID:', uidError);
        }
      }

      // If not found by UID, try with normalized email
      if (!userDataFromDB) {
        userDataFromDB = await userQueries.getUserByEmail(normalizedEmail);
      }
      
      // If still not found, try with original email (case-sensitive)
      if (!userDataFromDB && email.trim() !== normalizedEmail) {
        userDataFromDB = await userQueries.getUserByEmail(email.trim());
      }

      // If still not found, check if this is a student email and find parent account
      if (!userDataFromDB) {
        try {
          const studentsQuery = query(
            collection(db, 'students'),
            where('email', '==', normalizedEmail),
            limit(1)
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          if (!studentsSnapshot.empty) {
            const studentData = studentsSnapshot.docs[0].data();
            const studentUid = studentsSnapshot.docs[0].id;
            
            // Find parent account that has this student email
            const parentQuery = query(
              collection(db, 'users'),
              where('email', '==', normalizedEmail),
              where('role', '==', 'parent'),
              limit(1)
            );
            const parentSnapshot = await getDocs(parentQuery);
            
            if (!parentSnapshot.empty) {
              userDataFromDB = { uid: parentSnapshot.docs[0].id, ...parentSnapshot.docs[0].data() } as any;
            } else {
              // Check if parent account exists with associatedStudents containing this student
              const allParentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'parent')
              );
              const allParentsSnapshot = await getDocs(allParentsQuery);
              
              for (const parentDoc of allParentsSnapshot.docs) {
                const parentData = parentDoc.data();
                const associatedStudents = parentData.associatedStudents || [];
                const hasStudent = associatedStudents.some((s: any) => 
                  s.uid === studentUid || 
                  s.email === normalizedEmail ||
                  (studentData.email && s.email === studentData.email)
                );
                
                const parentPhone = (parentData.phoneNumber || parentData.phone || '').replace(/\D/g, '');
                const passwordMatchesPhone = cleanPhonePassword.length >= 10 && 
                  (parentPhone === cleanPhonePassword || parentPhone === trimmedPassword.replace(/\D/g, ''));
                
                if (hasStudent || passwordMatchesPhone) {
                  userDataFromDB = { uid: parentDoc.id, ...parentData } as any;
                  break;
                }
              }
            }
          }
        } catch (studentError) {
          console.error('Error checking students collection:', studentError);
        }
      }

      // If still not found and password looks like phone number, check for teacher account by phone
      if (!userDataFromDB && isPhoneNumberPassword && cleanPhonePassword.length >= 10) {
        try {
          const allTeachersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'teacher')
          );
          const allTeachersSnapshot = await getDocs(allTeachersQuery);
          
          for (const teacherDoc of allTeachersSnapshot.docs) {
            const teacherData = teacherDoc.data();
            const teacherPhone = (teacherData.phoneNumber || teacherData.phone || '').replace(/\D/g, '');
            
            if (teacherPhone === cleanPhonePassword) {
              const teacherEmail = (teacherData.email || '').toLowerCase();
              if (teacherEmail === normalizedEmail || teacherEmail === email.trim().toLowerCase()) {
                userDataFromDB = { uid: teacherDoc.id, ...teacherData } as any;
                break;
              }
            }
          }
        } catch (teacherError) {
          console.error('Error checking teachers collection:', teacherError);
        }
      }

      if (!userDataFromDB) {
        await signOut(auth);
        setError('ব্যবহারকারীর তথ্য পাওয়া যায়নি। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।');
        setLoading(false);
        return;
      }

      // Check if user is active (approved)
      if (userDataFromDB.isActive === false) {
        await signOut(auth);
        setError('আপনার অ্যাকাউন্ট এখনও অনুমোদিত হয়নি। অনুগ্রহ করে সুপার অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করুন।');
        setLoading(false);
        return;
      }

      // User is active, proceed with login
      try {
        // Validate role exists
        if (!userDataFromDB.role) {
          setError('ব্যবহারকারীর রোল পাওয়া যায়নি।');
          setLoading(false);
          return;
        }

        const redirectRoute = getRoleBasedRoute(userDataFromDB.role);
        
        if (redirectRoute) {
          setLoading(false);
          setTimeout(() => {
            router.push(redirectRoute);
          }, 100);
        } else {
          setError('রোল-ভিত্তিক রিডাইরেক্ট পাওয়া যায়নি।');
          setLoading(false);
        }
      } catch (redirectError: any) {
        console.error('Error getting redirect route:', redirectError);
        setError(redirectError?.message || 'রিডাইরেক্ট করতে সমস্যা হয়েছে।');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Ensure error is properly handled
      let errorMessage = 'লগইনে সমস্যা হয়েছে, আবার চেষ্টা করুন';
      
      if (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('auth/')) {
          errorMessage = getErrorMessage(error.code);
        } else if (error.message && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Load school name from settings
  useEffect(() => {
    if (!db) return;
    
    const settingsDocRef = doc(db, 'system', 'settings');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const settings = docSnap.data() as SystemSettings;
          if (settings.schoolName) {
            setSchoolName(settings.schoolName);
          }
        } else {
          // Fallback to default
          settingsQueries.getSettings().then((settings) => {
            if (settings?.schoolName) {
              setSchoolName(settings.schoolName);
            }
          }).catch((error) => {
            console.error('Error loading settings:', error);
          });
        }
      },
      (error) => {
        console.error('Error loading school name:', error);
        // Try fallback
        settingsQueries.getSettings().then((settings) => {
          if (settings?.schoolName) {
            setSchoolName(settings.schoolName);
          }
        }).catch((err) => {
          console.error('Error in fallback settings load:', err);
        });
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userData && userData.isActive && !loading) {
      try {
        if (typeof window === 'undefined') return;
        
        const currentPath = window.location.pathname;
        if (currentPath === '/auth/login' && userData.role) {
          const redirectRoute = getRoleBasedRoute(userData.role);
          if (redirectRoute) {
            router.push(redirectRoute);
          }
        }
      } catch (error: any) {
        console.error('Error in redirect effect:', error);
        // Don't show error in useEffect, just log it
      }
    } else if (userData && userData.isActive === false) {
      setError('আপনার অ্যাকাউন্ট এখনও অনুমোদিত হয়নি।');
      setLoading(false);
    }
  }, [userData, router, loading]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'এই ইমেইল ঠিকানা দিয়ে কোন অ্যাকাউন্ট পাওয়া যায়নি';
      case 'auth/wrong-password':
        return 'ভুল পাসওয়ার্ড';
      case 'auth/invalid-email':
        return 'অবৈধ ইমেইল ঠিকানা';
      case 'auth/invalid-credential':
        return 'ভুল ইমেইল বা পাসওয়ার্ড';
      case 'auth/user-disabled':
        return 'এই অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে';
      case 'auth/too-many-requests':
        return 'অনেকবার চেষ্টা করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন';
      case 'auth/network-request-failed':
        return 'নেটওয়ার্ক সমস্যা। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন';
      default:
        return `লগইনে সমস্যা হয়েছে: ${errorCode || 'অজানা ত্রুটি'}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="max-w-6xl w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:block">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-12 border border-white/30 hover:shadow-2xl transition-shadow duration-300 overflow-hidden">
              <div className="text-center w-full">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl transform rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300">
                  <span className="text-white font-bold text-5xl">ই</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 break-words px-4 leading-tight min-h-[3.5rem] flex items-center justify-center text-center w-full overflow-wrap-anywhere">{schoolName}</h1>
                <p className="text-base lg:text-lg text-gray-600 mb-10">শিক্ষার জন্য একটি আধুনিক প্ল্যাটফর্ম</p>
                
                {/* Role Cards */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-default">
                    <Shield className="w-9 h-9 mx-auto mb-2" />
                    <p className="text-sm font-semibold">সুপার এডমিন</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-default">
                    <UserCheck className="w-9 h-9 mx-auto mb-2" />
                    <p className="text-sm font-semibold">এডমিন</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-default">
                    <GraduationCap className="w-9 h-9 mx-auto mb-2" />
                    <p className="text-sm font-semibold">শিক্ষক</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-default">
                    <Users className="w-9 h-9 mx-auto mb-2" />
                    <p className="text-sm font-semibold">অভিভাবক</p>
                  </div>
                </div>
                
                <div className="mt-10 flex items-center justify-center space-x-2 text-gray-600 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 border border-yellow-200">
                  <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                  <p className="text-sm font-medium">সবাই একই পেজ থেকে লগইন করতে পারবেন</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full">
            {/* Back Button */}
            <button
              onClick={() => router.push('/')}
              className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-all duration-200 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">হোম পেজে ফিরুন</span>
            </button>

            {/* Login Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-10 border border-white/30 hover:shadow-2xl transition-shadow duration-300">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl hover:scale-110 transition-transform duration-300">
                  <Lock className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">লগইন করুন</h1>
                <p className="text-gray-600 text-lg">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-lg shadow-sm">
                  <p className="text-red-700 text-sm flex items-center font-medium">
                    <span className="mr-2 text-lg">⚠️</span>
                    {error}
                  </p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                    ইমেইল ঠিকানা
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white hover:border-gray-300"
                      placeholder="example@email.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Lock className="w-4 h-4 mr-2 text-blue-600" />
                    পাসওয়ার্ড
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white hover:border-gray-300 pr-12"
                      placeholder="আপনার পাসওয়ার্ড"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100 z-10"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      disabled={loading}
                    />
                    <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900">আমাকে মনে রাখুন</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    disabled={loading}
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-2xl relative overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  {loading ? (
                    <div className="flex items-center justify-center relative z-10">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      লগইন হচ্ছে...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center relative z-10">
                      <Lock className="w-5 h-5 mr-2" />
                      লগইন করুন
                    </span>
                  )}
                </button>

                {/* Sign Up Link */}
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    অ্যাকাউন্ট নেই?{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/auth/signup')}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                      disabled={loading}
                    >
                      সাইন আপ করুন
                    </button>
                  </p>
                </div>
              </form>

            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-gray-600 text-sm">
                © 2024 {schoolName}। সর্বস্বত্ব সংরক্ষিত।
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <ProtectedRoute requireAuth={false}>
      <LoginPage />
    </ProtectedRoute>
  );
}
