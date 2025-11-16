'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { User as AuthUser, onAuthStateChanged, updatePassword, updateEmail, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { IKContext, IKUpload } from 'imagekitio-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Building,
  UserCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();

  // ImageKit configuration
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '';
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '';
  const authenticator = async () => {
    try {
      const response = await fetch('/api/imagekit');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      const { signature, expire, token } = data;
      return { signature, expire, token };
    } catch (error: any) {
      throw new Error(`Authentication request failed: ${error.message}`);
    }
  };

  // Profile data state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    photoURL: '',
    role: '',
    schoolId: '',
    schoolName: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await loadUserProfile(user.uid);
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadUserProfile = async (uid: string) => {
    try {
      // Try different collections based on role
      let userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, 'students', uid));
      }
      
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, 'teachers', uid));
      }

      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileData({
          name: data.name || data.displayName || '',
          email: data.email || user?.email || '',
          phone: data.phone || data.phoneNumber || '',
          address: data.address || '',
          dateOfBirth: data.dateOfBirth || data.dob || '',
          gender: data.gender || '',
          bloodGroup: data.bloodGroup || '',
          photoURL: data.photoURL || data.photo || '',
          role: data.role || '',
          schoolId: data.schoolId || '',
          schoolName: data.schoolName || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showNotification('প্রোফাইল লোড করতে সমস্যা হয়েছে', 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // This function is no longer needed, ImageKit handles it directly
  };

  const onUploadStart = () => {
    console.log('Upload started');
    setUploadingPhoto(true);
  };

  const onUploadError = (err: any) => {
    console.error('ImageKit upload error:', err);
    showNotification('ছবি আপলোড করতে সমস্যা হয়েছে', 'error');
    setUploadingPhoto(false);
  };

  const onUploadSuccess = async (res: any) => {
    try {
      console.log('ImageKit full response:', res);
      const photoURL = res.url || res.fileUrl;
      console.log('Extracted photo URL:', photoURL);

      if (!photoURL) {
        console.error('No URL found in response:', res);
        showNotification('ছবি URL পাওয়া যায়নি', 'error');
        setUploadingPhoto(false);
        return;
      }

      // Update profile data
      setProfileData(prev => ({ ...prev, photoURL }));
      console.log('Profile data updated with URL:', photoURL);

      // Update both Firestore and Firebase Auth
      if (user) {
        // Update Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { photoURL });
        console.log('Firestore updated with photo URL');

        // Update Firebase Auth photoURL
        try {
          await updateProfile(user, { photoURL });
          console.log('Firebase Auth updated with photo URL');
        } catch (error) {
          console.error('Error updating Firebase Auth photoURL:', error);
        }
      }

      showNotification('ছবি সফলভাবে আপলোড হয়েছে!', 'success');
    } catch (error) {
      console.error('Error saving photo URL:', error);
      showNotification('ছবি সংরক্ষণ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender,
        bloodGroup: profileData.bloodGroup,
        updatedAt: new Date().toISOString(),
      });

      // Update email if changed
      if (profileData.email !== user.email) {
        await updateEmail(user, profileData.email);
        await updateDoc(userRef, { email: profileData.email });
      }

      showNotification('প্রোফাইল সফলভাবে আপডেট হয়েছে', 'success');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        showNotification('দয়া করে আবার লগইন করুন', 'error');
      } else {
        showNotification('প্রোফাইল আপডেট করতে সমস্যা হয়েছে', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    // Validation
    if (passwordData.newPassword.length < 6) {
      showNotification('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('নতুন পাসওয়ার্ড মিলছে না', 'error');
      return;
    }

    try {
      setSaving(true);
      await updatePassword(user, passwordData.newPassword);
      
      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      showNotification('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে', 'success');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/requires-recent-login') {
        showNotification('দয়া করে আবার লগইন করুন', 'error');
      } else {
        showNotification('পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const getRoleBadge = (role: string) => {
    const roleMap: { [key: string]: { text: string; className: string } } = {
      'super_admin': { text: 'সুপার অ্যাডমিন', className: 'bg-purple-100 text-purple-800' },
      'admin': { text: 'অ্যাডমিন', className: 'bg-blue-100 text-blue-800' },
      'teacher': { text: 'শিক্ষক', className: 'bg-green-100 text-green-800' },
      'student': { text: 'শিক্ষার্থী', className: 'bg-yellow-100 text-yellow-800' },
      'parent': { text: 'অভিভাবক', className: 'bg-orange-100 text-orange-800' },
    };

    const roleInfo = roleMap[role] || { text: role, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${roleInfo.className}`}>
        {roleInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout title="প্রোফাইল" subtitle="আপনার প্রোফাইল দেখুন এবং আপডেট করুন">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="আমার প্রোফাইল" subtitle="আপনার ব্যক্তিগত তথ্য দেখুন এবং আপডেট করুন">
      <IKContext
        publicKey={publicKey}
        urlEndpoint={urlEndpoint}
        authenticator={authenticator}
      >
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white flex items-center space-x-3`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center space-x-6">
            {/* Profile Photo */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                {profileData.photoURL ? (
                  <img
                    key={profileData.photoURL}
                    src={profileData.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image load error:', profileData.photoURL);
                      console.error('Image element:', e.currentTarget);
                    }}
                    onLoad={() => {
                      console.log('✅ Image loaded successfully:', profileData.photoURL);
                    }}
                  />
                ) : (
                  <UserCircle className="w-20 h-20 text-white" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                {/* Hidden ImageKit Upload */}
                <IKUpload
                  fileName={`profile_${user?.uid}_${Date.now()}.jpg`}
                  folder="/profile-photos"
                  tags={['profile', user?.uid || 'unknown']}
                  onError={onUploadError}
                  onSuccess={onUploadSuccess}
                  onUploadStart={onUploadStart}
                  className="hidden"
                  useUniqueFileName={true}
                  isPrivateFile={false}
                />
              </label>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {profileData.name || 'ব্যবহারকারীর নাম'}
              </h2>
              <p className="text-gray-600 mb-3">{profileData.email}</p>
              <div className="flex items-center space-x-3">
                {getRoleBadge(profileData.role)}
                {profileData.schoolName && (
                  <span className="text-sm text-gray-600 flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    {profileData.schoolName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            ব্যক্তিগত তথ্য
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                নাম
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="আপনার নাম লিখুন"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ইমেইল
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ফোন নম্বর
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="০১৭xxxxxxxx"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                জন্ম তারিখ
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                লিঙ্গ
              </label>
              <select
                value={profileData.gender}
                onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">নির্বাচন করুন</option>
                <option value="male">পুরুষ</option>
                <option value="female">মহিলা</option>
                <option value="other">অন্যান্য</option>
              </select>
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                রক্তের গ্রুপ
              </label>
              <select
                value={profileData.bloodGroup}
                onChange={(e) => setProfileData({ ...profileData, bloodGroup: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">নির্বাচন করুন</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ঠিকানা
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <textarea
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="আপনার সম্পূর্ণ ঠিকানা লিখুন"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-blue-600" />
            পাসওয়ার্ড পরিবর্তন
          </h3>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                বর্তমান পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                নতুন পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="নতুন পাসওয়ার্ড আবার লিখুন"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleChangePassword}
              disabled={saving || !passwordData.newPassword || !passwordData.confirmPassword}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>পরিবর্তন হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </IKContext>
    </AdminLayout>
  );
}
