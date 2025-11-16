'use client';

import React, { useState } from 'react';
import { uploadMediaToImageKitAndFirebase, MediaRecord } from '@/lib/firebase-imagekit';
import { transformImageUrl } from '@/lib/imagekit-utils';
import { Upload, Image as ImageIcon, FileText, User, School, Video } from 'lucide-react';

interface MediaUploaderProps {
  category: 'student' | 'teacher' | 'school' | 'document' | 'gallery';
  schoolId: string;
  uploadedBy: string; // User email
  userId?: string; // For student/teacher uploads
  onUploadSuccess?: (media: MediaRecord) => void;
  className?: string;
  acceptedTypes?: string;
}

export default function MediaUploader({ 
  category,
  schoolId,
  uploadedBy,
  userId,
  onUploadSuccess,
  className = '',
  acceptedTypes = 'image/*,video/*'
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaRecord | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const getUploadConfig = () => {
    switch (category) {
      case 'student':
        return {
          title: 'ছাত্র/ছাত্রীর মিডিয়া আপলোড',
          icon: <User className="h-5 w-5" />,
          accept: acceptedTypes,
          maxSize: 50 * 1024 * 1024, // 50MB for videos
        };
      case 'teacher':
        return {
          title: 'শিক্ষকের মিডিয়া আপলোড',
          icon: <User className="h-5 w-5" />,
          accept: acceptedTypes,
          maxSize: 50 * 1024 * 1024, // 50MB
        };
      case 'school':
        return {
          title: 'স্কুল লোগো/মিডিয়া আপলোড',
          icon: <School className="h-5 w-5" />,
          accept: acceptedTypes,
          maxSize: 10 * 1024 * 1024, // 10MB
        };
      case 'gallery':
        return {
          title: 'গ্যালারি মিডিয়া আপলোড',
          icon: <ImageIcon className="h-5 w-5" />,
          accept: acceptedTypes,
          maxSize: 100 * 1024 * 1024, // 100MB for gallery videos
        };
      case 'document':
        return {
          title: 'ডকুমেন্ট আপলোড',
          icon: <FileText className="h-5 w-5" />,
          accept: 'image/*,application/pdf,.doc,.docx',
          maxSize: 20 * 1024 * 1024, // 20MB
        };
      default:
        return {
          title: 'মিডিয়া আপলোড',
          icon: <Upload className="h-5 w-5" />,
          accept: acceptedTypes,
          maxSize: 50 * 1024 * 1024,
        };
    }
  };

  const showMessage = (message: string, type: 'success' | 'error') => {
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
      showMessage(`ফাইল সাইজ ${config.maxSize / (1024 * 1024)}MB এর কম হতে হবে`, 'error');
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!userId && ['student', 'teacher', 'document'].includes(category)) {
      showMessage('ইউজার আইডি প্রয়োজন', 'error');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');
    setUploadedMedia(null);

    try {
      // Upload to ImageKit and save to Firebase
      const mediaRecord = await uploadMediaToImageKitAndFirebase(
        file,
        category,
        schoolId,
        uploadedBy,
        userId,
        [category, schoolId]
      );

      setUploadedMedia(mediaRecord);
      onUploadSuccess?.(mediaRecord);
      showMessage('মিডিয়া সফলভাবে আপলোড এবং সংরক্ষিত হয়েছে', 'success');

    } catch (error) {
      console.error('Upload error:', error);
      showMessage(error instanceof Error ? error.message : 'অজানা ত্রুটি ঘটেছে', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const getMediaPreview = (media: MediaRecord) => {
    if (media.type === 'image') {
      return (
        <img
          src={transformImageUrl(media.url, {
            width: 300,
            height: 200,
            crop: 'maintain_ratio',
            format: 'webp',
            quality: 80
          })}
          alt={media.name}
          className="rounded-lg border max-w-full shadow-sm"
        />
      );
    } else if (media.type === 'video') {
      return (
        <video
          src={media.url}
          controls
          className="rounded-lg border max-w-full shadow-sm"
          style={{ maxHeight: '200px' }}
        >
          Your browser does not support the video tag.
        </video>
      );
    } else {
      return (
        <div className="flex items-center justify-center bg-gray-100 p-4 rounded-lg border">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{media.name}</p>
          </div>
        </div>
      );
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ফাইল নির্বাচন করুন
          </label>
          <input
            type="file"
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
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-gray-600">আপলোড হচ্ছে...</p>
            </div>
          </div>
        )}

        {/* Upload Result */}
        {uploadedMedia && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-green-600">
              ✅ আপলোড সম্পন্ন! Firebase এ সংরক্ষিত হয়েছে
            </p>
            
            {/* Media Preview */}
            <div className="mt-3">
              {getMediaPreview(uploadedMedia)}
            </div>

            {/* Media Details */}
            <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded space-y-1">
              <p><strong>ফাইল নাম:</strong> {uploadedMedia.name}</p>
              <p><strong>ধরন:</strong> {uploadedMedia.type}</p>
              <p><strong>সাইজ:</strong> {(uploadedMedia.size / 1024).toFixed(1)} KB</p>
              {uploadedMedia.width && uploadedMedia.height && (
                <p><strong>মাত্রা:</strong> {uploadedMedia.width}×{uploadedMedia.height}</p>
              )}
              <p><strong>ImageKit URL:</strong> <a href={uploadedMedia.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">দেখুন</a></p>
              <p><strong>Firebase ID:</strong> {uploadedMedia.id}</p>
              <p><strong>আপলোডকারী:</strong> {uploadedMedia.uploadedBy}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}