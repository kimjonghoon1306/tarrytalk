importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDC9qSmH-1z778oiI7QbDY_JrKis95z_C4',
  authDomain: 'tarrytalk.firebaseapp.com',
  databaseURL: 'https://tarrytalk-default-rtdb.firebaseio.com',
  projectId: 'tarrytalk',
  storageBucket: 'tarrytalk.firebasestorage.app',
  messagingSenderId: '322779846377',
  appId: '1:322779846377:web:12253ee2f2330dd1a04278'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || payload.data?.title || '온메신저';
  const body = payload.notification?.body || payload.data?.body || '새 알림이 있습니다';
  const url = payload.fcmOptions?.link || payload.data?.url || '/chat.html';

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/chat.html';
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ((client.url === targetUrl || client.url.startsWith(self.location.origin)) && 'focus' in client) {
          client.postMessage?.({ type: 'NOTIFICATION_CLICK', url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
