'use client';

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, FileText, User, School } from 'lucide-react';

interface ImageKitUploaderProps {
  type: 'student' | 'teacher' | 'school' | 'document';
  userId?: string;
  schoolId: string;
  onUploadSuccess?: (file: any) => void;
  className?: string;
}

export default function ImageKitUploader({ 
  type, 
  userId, 
  schoolId, 
  onUploadSuccess,
  className = '' 
}: ImageKitUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadConfig = () => {
    switch (type) {
      case 'student':
        return {
          title: 'ছাত্র/ছাত্রীর ছবি আপলোড',
          icon: <User className="h-5 w-5" />,
          accept: 'image/*',
          maxSize: 5 * 1024 * 1024, // 5MB
        };
      case 'teacher':
        return {
          title: 'শিক্ষকের ছবি আপলোড',
          icon: <User className="h-5 w-5" />,
          accept: 'image/*',
          maxSize: 5 * 1024 * 1024, // 5MB
        };
      case 'school':
        return {
          title: 'স্কুল লোগো আপলোড',
          icon: <School className="h-5 w-5" />,
          accept: 'image/*',
          maxSize: 2 * 1024 * 1024, // 2MB
        };
      case 'document':
        return {
          title: 'ডকুমেন্ট আপলোড',
          icon: <FileText className="h-5 w-5" />,
          accept: 'image/*,application/pdf,.doc,.docx',
          maxSize: 10 * 1024 * 1024, // 10MB
        };
      default:
        return {
          title: 'ফাইল আপলোড',
          icon: <Upload className="h-5 w-5" />,
          accept: '*/*',
          maxSize: 10 * 1024 * 1024, // 10MB
        };
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setError(message);
      setSuccess('');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const config = getUploadConfig();
    
    // Validate file size
    if (file.size > config.maxSize) {
      showToast(`ফাইল সাইজ ${config.maxSize / (1024 * 1024)}MB এর কম হতে হবে`, 'error');
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!userId && type !== 'school') {
      showToast('ইউজার আইডি প্রয়োজন', 'error');
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    if (!publicKey) {
      showToast('ImageKit public key অনুপস্থিত', 'error');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      // Get authentication parameters from the API
      console.log('🔐 Requesting ImageKit authentication...');
      const authResponse = await fetch('/api/imagekit');
      console.log('🔐 Auth response status:', authResponse.status);

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('❌ Auth failed:', authResponse.status, errorText);
        throw new Error(`Failed to get authentication parameters (${authResponse.status}): ${errorText}`);
      }

      const authParams = await authResponse.json();
      console.log('🔐 Auth params received:', {
        hasToken: !!authParams.token,
        hasSignature: !!authParams.signature,
        hasExpire: !!authParams.expire
      });

      // Validate auth params
      if (!authParams.token || !authParams.signature || !authParams.expire) {
        throw new Error('Invalid authentication parameters received from server');
      }

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', `${type}-${userId || schoolId}-${Date.now()}`);
      formData.append('folder', getFolderPath(type, schoolId, userId));
      formData.append('token', authParams.token);
      formData.append('expire', authParams.expire.toString());
      formData.append('signature', authParams.signature);
      formData.append('publicKey', publicKey);

      console.log('📤 Uploading to ImageKit...', {
        fileName: `${type}-${userId || schoolId}-${Date.now()}`,
        folder: getFolderPath(type, schoolId, userId),
        fileSize: file.size
      });

      // Upload using ImageKit REST API
      const uploadResponse = await fetch(`https://upload.imagekit.io/api/v1/files/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log('📤 Upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.text();
        console.error('❌ Upload failed:', uploadResponse.status, errorData);
        throw new Error(`Upload failed (${uploadResponse.status}): ${errorData}`);
      }

      const result = await uploadResponse.json();
      console.log('✅ Upload successful:', {
        fileId: result.fileId,
        name: result.name,
        url: result.url
      });

      // Transform the result to match our expected format
      const uploadedFile = {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl || result.url,
        height: result.height || 0,
        width: result.width || 0,
        size: result.size,
        type: result.fileType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUploadedFile(uploadedFile);
      onUploadSuccess?.(uploadedFile);
      showToast('ফাইল সফলভাবে আপলোড হয়েছে', 'success');

    } catch (error) {
      console.error('🚨 Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'অজানা ত্রুটি ঘটেছে';
      showToast(`ImageKit upload failed: ${errorMessage}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const getFolderPath = (type: string, schoolId: string, userId?: string) => {
    switch (type) {
      case 'student':
        return `/school-management/students/${schoolId}`;
      case 'teacher':
        return `/school-management/teachers/${schoolId}`;
      case 'school':
        return '/school-management/school-logos';
      case 'document':
        return `/school-management/documents/${schoolId}`;
      default:
        return '/school-management/documents';
    }
  };

  const config = getUploadConfig();

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {config.icon}
          {config.title}
        </h3>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* File Input */}
        <div>
          <label htmlFor={`file-${type}`} className="block text-sm font-medium text-gray-700 mb-1">
            ফাইল নির্বাচন করুন
          </label>
          <input
            id={`file-${type}`}
            type="file"
            ref={fileInputRef}
            accept={config.accept}
            onChange={handleFileSelect}
            disabled={isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-sm text-gray-500 mt-1">
            সর্বোচ্চ সাইজ: {config.maxSize / (1024 * 1024)}MB
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Loading */}
        {isUploading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">আপলোড হচ্ছে...</span>
          </div>
        )}

        {/* Upload Result */}
        {uploadedFile && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-green-600">
              আপলোড সম্পন্ন!
            </p>
            
            {uploadedFile.type.startsWith('image/') && (
              <div className="mt-2">
                <img
                  src={uploadedFile.url}
                  alt="Uploaded preview"
                  className="rounded-lg border max-w-[200px] shadow-sm"
                />
              </div>
            )}

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p><strong>ফাইল নাম:</strong> {uploadedFile.name}</p>
              <p><strong>সাইজ:</strong> {(uploadedFile.size / 1024).toFixed(1)} KB</p>
              <p><strong>URL:</strong> <a href={uploadedFile.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">দেখুন</a></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}