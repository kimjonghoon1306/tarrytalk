/* ═══════════════════════════════════════════════
   TARRYTALK Service Worker v1.2
   - 오프라인 캐싱
   - 백그라운드 푸시 알림
   - 네트워크 전략: Cache First (정적) + Network First (API)
═══════════════════════════════════════════════ */

const CACHE_NAME = 'tarrytalk-v1.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/chat.html',
  '/profile.html',
  '/admin.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap'
];

/* ── 설치: 정적 자원 캐싱 ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 실패해도 설치 계속 (외부 폰트 등)
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── 활성화: 구 캐시 삭제 ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── 요청 가로채기 ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase API → Network only (캐시 안함)
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
    return; // 기본 동작 유지
  }

  // HTML 파일 → Network First (항상 최신 버전)
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // 나머지 → Cache First
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      });
    })
  );
});

/* ── 푸시 알림 수신 ── */
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); }
  catch { data = { title: 'TARRYTALK', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'TARRYTALK', {
      body: data.body || '새 메시지가 있습니다',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.roomId || 'tarrytalk',
      data: { url: data.url || '/chat.html' },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: '열기' },
        { action: 'dismiss', title: '닫기' }
      ]
    })
  );
});

/* ── 알림 클릭 ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/chat.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('tarrytalk') && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

/* ── 백그라운드 동기화 ── */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    // 향후 오프라인 메시지 큐 전송
    event.waitUntil(Promise.resolve());
  }
});
