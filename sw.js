/* build:1783346100 */
/* ═══════════════════════════════════════════════
   온메신저 Service Worker v17.7
   - 오프라인 캐싱
   - 백그라운드 푸시 알림
   - 네트워크 전략: Cache First (정적) + Network First (API)
═══════════════════════════════════════════════ */

const CACHE_NAME = 'tarrytalk-v17.7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/chat.html',
  '/profile.html',
  '/admin.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap'
];

/* ── 대기 SW 즉시 활성화(앱 자동 최신화) ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ── 설치: 정적 자원 캐싱 ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 실패해도 설치 계속 (외부 폰트 등)
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
    // self.skipWaiting()을 자동 호출하지 않는다 → 새 버전은 대기 상태로 두고,
    // 사용자가 "지금 업데이트" 팝업을 누를 때만 SKIP_WAITING 메시지로 활성화한다.
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

/* ── 푸시 알림 수신 ──
   ⚠️ 알림 표시는 FCM 전용 SW(firebase-messaging-sw.js)가 notification 페이로드로 1개만 표시한다.
   여기서 push를 또 받아 showNotification 하면 알림이 2개씩 중복되므로 이 핸들러는 두지 않는다. */

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
