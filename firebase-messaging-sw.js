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

// 서버(send-push.js)는 notification 없이 data-only 메시지를 보낸다 → FCM 자동표시가 일어나지 않는다.
// 따라서 아래 onBackgroundMessage에서 우리가 직접 1회만 표시한다(아이콘/배지 완전 제어, 중복 없음).
const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const d = (payload && payload.data) || {};
  const title = d.title || '온메신저';
  self.registration.showNotification(title, {
    body: d.body || '새 알림이 있습니다',
    icon: d.icon || '/icon-192.png',   // 알림 본문 큰 아이콘(풀컬러)
    badge: d.badge || '/badge-96.png', // 상태바 작은 아이콘(흰색 말풍선 실루엣)
    tag: d.tag || ('tarrytalk-' + Date.now()),
    renotify: true,
    data: { url: d.url || '/chat.html' },
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
