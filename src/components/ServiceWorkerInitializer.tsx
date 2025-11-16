'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker';

export default function ServiceWorkerInitializer() {
  useEffect(() => {
    // Register service worker on mount
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  return null; // This component doesn't render anything
}

