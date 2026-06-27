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

// 백그라운드 푸시는 notification 페이로드로 브라우저가 자동으로 1개 표시한다.
// 여기서 showNotification을 또 호출하면 알림이 2개씩 중복되므로 수동 표시는 하지 않는다.
const messaging = firebase.messaging();

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
