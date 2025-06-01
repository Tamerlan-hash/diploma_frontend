// Push Notification Service Worker

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  
  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'Smart Parking Notification',
      message: event.data ? event.data.text() : 'No payload',
      icon: '/logo.png',
      badge: '/badge.png'
    };
  }
  
  const title = notificationData.title || 'Smart Parking';
  const options = {
    body: notificationData.message,
    icon: notificationData.icon || '/logo.png',
    badge: notificationData.badge || '/badge.png',
    data: {
      url: notificationData.url || '/parking/my-reservations',
      reservationId: notificationData.reservation_id
    },
    actions: [
      {
        action: 'view',
        title: 'View Reservation'
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');

  event.notification.close();

  const urlToOpen = event.notification.data.url || '/parking/my-reservations';

  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});