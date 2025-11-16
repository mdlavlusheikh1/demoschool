'use client';

import { useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SystemSettings } from '@/lib/database-queries';

export default function FaviconUpdater() {
  const faviconLinksRef = useRef<HTMLLinkElement[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Listen to settings changes
      const settingsRef = doc(db, 'system', 'settings');
      unsubscribeRef.current = onSnapshot(
        settingsRef,
        (docSnap) => {
          try {
            if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() } as SystemSettings;
              const favicon = (data as any)?.favicon;
              
              if (favicon && typeof favicon === 'string' && favicon.trim()) {
                // Update or create favicon link
                let faviconLink = faviconLinksRef.current.find(link => link.rel === 'icon');
                if (!faviconLink) {
                  faviconLink = document.createElement('link');
                  faviconLink.rel = 'icon';
                  faviconLink.type = 'image/x-icon';
                  if (document.head) {
                    document.head.appendChild(faviconLink);
                    faviconLinksRef.current.push(faviconLink);
                  }
                }
                faviconLink.href = favicon;
                
                // Update or create apple-touch-icon
                let appleLink = faviconLinksRef.current.find(link => link.rel === 'apple-touch-icon');
                if (!appleLink) {
                  appleLink = document.createElement('link');
                  appleLink.rel = 'apple-touch-icon';
                  if (document.head) {
                    document.head.appendChild(appleLink);
                    faviconLinksRef.current.push(appleLink);
                  }
                }
                appleLink.href = favicon;
              }
            }
          } catch (error) {
            console.error('Error processing favicon settings:', error);
          }
        },
        (error) => {
          console.error('Error listening to settings for favicon:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up favicon updater:', error);
    }

    // Cleanup: Only unsubscribe, don't remove DOM elements
    // Let React handle DOM cleanup to avoid conflicts
    return () => {
      try {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, []);

  return null;
}
