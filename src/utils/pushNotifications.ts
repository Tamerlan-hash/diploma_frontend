// Push Notification Utilities

// Check if the browser supports service workers and push notifications
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Request permission for push notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Register the service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    console.log('Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> => {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      ),
    });

    console.log('User is subscribed to push notifications');
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
};

// Send the subscription to the backend
export const sendSubscriptionToServer = async (
  subscription: PushSubscription,
  token: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications/subscribe/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ subscription }),
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }

    return true;
  } catch (error) {
    console.error('Error sending subscription to server:', error);
    return false;
  }
};

// Initialize push notifications
export const initializePushNotifications = async (token: string): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    console.log('Push notifications are not supported in this browser');
    return false;
  }

  try {
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      console.log('Notification permission was not granted');
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      console.log('Service worker registration failed');
      return false;
    }

    // Check if we already have a subscription
    let subscription = await registration.pushManager.getSubscription();
    
    // If no subscription exists, create one
    if (!subscription) {
      subscription = await subscribeToPushNotifications(registration);
      if (!subscription) {
        console.log('Failed to subscribe to push notifications');
        return false;
      }
    }

    // Send the subscription to the server
    const success = await sendSubscriptionToServer(subscription, token);
    return success;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
};

// Helper function to convert base64 to Uint8Array
// (required for applicationServerKey)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}