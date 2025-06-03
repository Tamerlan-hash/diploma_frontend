'use client';

// This file provides enhanced service worker registration for the PWA

/**
 * Register the service worker for PWA functionality
 */
export const registerServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service workers are not supported in this browser');
    return;
  }

  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );

  try {
    if (process.env.NODE_ENV === 'production' || !isLocalhost) {
      // In production or non-localhost environments, register without additional checks
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered successfully:', registration.scope);

      // Add update handling
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older content
              console.log('New content is available; please refresh the page');
              
              // You could show a notification to the user here
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('App Update Available', {
                  body: 'A new version of the app is available. Refresh to update.',
                  icon: '/icons/icon-192x192.png'
                });
              }
            } else {
              // At this point, everything has been precached
              console.log('Content is cached for offline use');
            }
          }
        };
      };
    } else {
      // In development on localhost, check for service worker existence before registering
      const response = await fetch('/sw.js');
      if (response.status === 200) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered in development mode:', registration.scope);
      } else {
        console.log('Service worker not found in development mode. This is expected if you are using next dev.');
      }
    }
  } catch (error) {
    console.error('Error during service worker registration:', error);
  }
};

/**
 * Check if the app is currently offline
 */
export const checkOfflineStatus = (): boolean => {
  return typeof navigator !== 'undefined' && !navigator.onLine;
};

/**
 * Add offline status event listeners
 * @param onOffline Function to call when the app goes offline
 * @param onOnline Function to call when the app goes online
 */
export const addOfflineStatusListeners = (
  onOffline: () => void,
  onOnline: () => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return a cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

/**
 * Initialize the PWA functionality
 */
export const initializePWA = async (): Promise<void> => {
  // Register the service worker
  await registerServiceWorker();

  // Check initial offline status
  if (checkOfflineStatus()) {
    console.log('Application is currently offline');
  }
};