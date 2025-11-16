'use client';

import { useState, useEffect } from 'react';
import { User as AuthUser } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';

interface ProfilePictureProps {
  user: AuthUser | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  gradient?: string;
}

export default function ProfilePicture({ 
  user, 
  size = 'md', 
  className = '',
  gradient = 'from-green-600 to-blue-600'
}: ProfilePictureProps) {
  const { userData } = useAuth();
  const [imageError, setImageError] = useState(false);

  // Reset image error when userData or user changes
  useEffect(() => {
    setImageError(false);
  }, [userData, user]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-lg'
  };

  const photoURL = (userData as any)?.photoURL || user?.photoURL;
  const email = user?.email || userData?.email;
  const initial = email?.charAt(0) || 'U';

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center overflow-hidden ${className}`}>
      {photoURL && !imageError ? (
        <img
          src={photoURL}
          alt="Profile"
          className="w-full h-full object-cover"
          onError={() => {
            setImageError(true);
          }}
        />
      ) : (
        <span className="text-white font-medium">
          {initial.toUpperCase()}
        </span>
      )}
    </div>
  );
}

