'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const LAST_ACTIVITY_KEY = 'lastActivityTime';
const SESSION_START_KEY = 'sessionStartTime';

export function useSessionTimeout() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const updateLastActivity = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    // Store in localStorage for persistence across browser sessions
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      } catch (e) {
        console.warn('Failed to save last activity to localStorage:', e);
      }
    }
  };

  const checkSessionExpiry = async () => {
    if (!user) return;

    try {
      const storedLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (storedLastActivity) {
        const lastActivity = parseInt(storedLastActivity, 10);
        const timeSinceLastActivity = Date.now() - lastActivity;

        if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
          console.log('Session expired: More than 5 minutes of inactivity detected. Logging out...');
          // Clear stored data
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          localStorage.removeItem(SESSION_START_KEY);
          await signOut();
          router.push('/auth/login');
          return true; // Session expired
        }
      }
    } catch (e) {
      console.warn('Failed to check session expiry:', e);
    }
    return false; // Session still valid
  };

  const resetTimeout = () => {
    updateLastActivity();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      if (user) {
        console.log('Session timeout: 5 minutes of inactivity detected. Logging out...');
        // Clear stored data
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(LAST_ACTIVITY_KEY);
            localStorage.removeItem(SESSION_START_KEY);
          } catch (e) {
            console.warn('Failed to clear localStorage:', e);
          }
        }
        await signOut();
        router.push('/auth/login');
      }
    }, SESSION_TIMEOUT_MS);
  };

  useEffect(() => {
    if (!user) {
      // Clear timeout and stored data if user is not logged in
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          localStorage.removeItem(SESSION_START_KEY);
        } catch (e) {
          // Ignore errors
        }
      }
      return;
    }

    // Track user activity events
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus',
    ];

    const handleActivity = () => {
      resetTimeout();
    };

    // Also track visibility changes (when user switches tabs/windows)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User came back to the tab, check if session expired
        checkSessionExpiry().then((expired) => {
          if (!expired) {
            resetTimeout();
          }
        });
      } else {
        // User left the tab, update last activity
        updateLastActivity();
      }
    };

    // Track page unload to save last activity
    const handleBeforeUnload = () => {
      updateLastActivity();
    };

    // Initialize timeout and event listeners
    const initializeSession = async () => {
      // Check if session expired while browser was closed
      const expired = await checkSessionExpiry();
      if (expired) {
        return; // Already logged out
      }

      // Initialize timeout on mount
      updateLastActivity();
      resetTimeout();

      // Store session start time
      if (typeof window !== 'undefined') {
        try {
          if (!localStorage.getItem(SESSION_START_KEY)) {
            localStorage.setItem(SESSION_START_KEY, Date.now().toString());
          }
        } catch (e) {
          console.warn('Failed to save session start time:', e);
        }
      }

      // Add event listeners
      activityEvents.forEach((event) => {
        window.addEventListener(event, handleActivity, { passive: true });
      });

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
    };

    initializeSession();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, signOut, router]);

  return null;
}

