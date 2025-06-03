'use client';

import { useEffect, useState } from 'react';
import { initializePWA, addOfflineStatusListeners, checkOfflineStatus } from '@/utils/registerSW';

/**
 * Component that initializes PWA functionality and provides offline status indication
 */
export function PWAInitializer() {
  const [isOffline, setIsOffline] = useState<boolean>(false);

  useEffect(() => {
    // Initialize PWA functionality
    initializePWA().catch(error => {
      console.error('Failed to initialize PWA:', error);
    });

    // Set initial offline status
    setIsOffline(checkOfflineStatus());

    // Add event listeners for online/offline status
    const cleanup = addOfflineStatusListeners(
      // Offline handler
      () => {
        setIsOffline(true);
        console.log('App is now offline');
      },
      // Online handler
      () => {
        setIsOffline(false);
        console.log('App is now online');
      }
    );

    // Clean up event listeners on unmount
    return cleanup;
  }, []);

  return (
    <>
      {isOffline && (
        <div 
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            backgroundColor: '#ff4d4f',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          You are offline. Some features may not be available.
        </div>
      )}
    </>
  );
}