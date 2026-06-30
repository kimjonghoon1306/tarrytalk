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

// 새 서비스워커를 즉시 활성화한다. 이게 없으면 옛 SW가 계속 푸시를 처리해 onBackgroundMessage가
// 반영되지 않고, 크롬이 "이 사이트가 백그라운드에서 업데이트되었습니다"라는 기본 알림(종 아이콘)을 띄운다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// 서버(send-push.js)는 notification 없이 data-only 메시지를 보낸다 → FCM 자동표시가 일어나지 않는다.
// 따라서 아래 onBackgroundMessage에서 우리가 직접 1회만 표시한다(아이콘/배지 완전 제어, 중복 없음).
const messaging = firebase.messaging();

messaging.onBackgroundMessage(async payload => {
  const d = (payload && payload.data) || {};
  const title = d.title || '온메신저';
  // 앱(창)이 살아 있으면(PC 최소화 등) 클라이언트에 알림음 재생을 요청한다 → 창을 내려도 톡톡이 울림.
  // (모바일은 백그라운드에서 JS가 멈추므로 이 신호 대신 아래 시스템 알림 소리가 울린다.)
  try{
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    cs.forEach(c => c.postMessage({ type: 'PLAY_SOUND' }));
  }catch(e){}
  // ⚠️ 반드시 Promise를 return 해야 한다. 안 하면 FCM SDK가 push 이벤트를 끝내버려
  //    크롬이 "이 사이트가 백그라운드에서 업데이트되었습니다" 기본 알림을 추가로 띄운다.
  return self.registration.showNotification(title, {
    body: d.body || '새 알림이 있습니다',
    icon: d.icon || '/icon-192.png',   // 알림 본문 큰 아이콘(풀컬러)
    badge: d.badge || '/badge-on3-96.png', // 상태바 작은 아이콘(흰색 ON 이니셜)
    tag: d.tag || ('tarrytalk-' + Date.now()),
    renotify: true,
    silent: false, // 무음 방지(소리/진동 OS 알림설정을 따르되 명시적으로 켬)
    vibrate: [200, 100, 200], // 백그라운드 알림 진동(소리는 OS 알림설정을 따름)
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
