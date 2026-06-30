const admin = require('firebase-admin');

const ADMIN_EMAIL = 'tarry9653@daum.net';
const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const MAX_TOKENS = 500;
const MAX_TARGETS = 100;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function invalidToken(code) {
  return [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
  ].includes(code);
}

function toAbsoluteUrl(req, url) {
  if (!url) return '/';
  if (/^https?:\/\//i.test(url)) return url;
  const host = req.headers.host || '';
  if (!host) return url;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${proto}://${host}${path}`;
}

function roomIdFromUrl(url) {
  try {
    const u = new URL(url || '/', 'https://example.invalid');
    return u.searchParams.get('room') || '';
  } catch (e) {
    return '';
  }
}

async function isAdminUser(db, decoded) {
  if (decoded.email === ADMIN_EMAIL) return true;
  const snap = await db.ref(`users/${decoded.uid}/isAdmin`).get();
  return snap.val() === true;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const bodyData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { idToken, targetUids, title, body, url } = bodyData;

    if (!idToken || !Array.isArray(targetUids) || !targetUids.length) {
      return res.status(400).json({ error: 'missing_params' });
    }

    const db = admin.database();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const isAdmin = await isAdminUser(db, decoded);
    const uniqueTargetUids = [...new Set(targetUids)].filter(uid => uid && typeof uid === 'string');

    if (!uniqueTargetUids.length || uniqueTargetUids.length > MAX_TARGETS) {
      return res.status(400).json({ error: 'bad_targets' });
    }

    if (!isAdmin) {
      const roomId = roomIdFromUrl(url);
      if (!roomId) return res.status(403).json({ error: 'forbidden' });
      const roomSnap = await db.ref(`rooms/${roomId}/members`).get();
      const members = roomSnap.val() || {};
      if (members[decoded.uid] !== true) return res.status(403).json({ error: 'forbidden' });
      const allowed = uniqueTargetUids.every(uid => uid !== decoded.uid && members[uid] === true);
      if (!allowed) return res.status(403).json({ error: 'forbidden' });
    }

    const tokenOwners = new Map();
    const staleTokensBySentToken = new Map();

    await Promise.all(uniqueTargetUids.map(async uid => {
      const snap = await db.ref(`users/${uid}/fcmTokens`).get();
      const storedTokens = snap.val() || {};
      const selectedByDevice = new Map();

      Object.entries(storedTokens).forEach(([token, deviceId]) => {
        const normalizedDeviceId = typeof deviceId === 'string' ? deviceId.trim() : '';
        const deviceKey = normalizedDeviceId ? `device:${normalizedDeviceId}` : `token:${token}`;
        const selectedToken = selectedByDevice.get(deviceKey);

        if (!selectedToken) {
          selectedByDevice.set(deviceKey, token);
          return;
        }

        if (!staleTokensBySentToken.has(selectedToken)) staleTokensBySentToken.set(selectedToken, []);
        staleTokensBySentToken.get(selectedToken).push({ uid, token });
      });

      selectedByDevice.forEach(token => {
        if (!tokenOwners.has(token)) tokenOwners.set(token, new Set());
        tokenOwners.get(token).add(uid);
      });
    }));

    const tokens = [...tokenOwners.keys()];
    if (!tokens.length) return res.status(200).json({ ok: true, sent: 0, failed: 0 });

    let sent = 0;
    let failed = 0;
    const removals = [];
    const link = toAbsoluteUrl(req, url || '/');
    const icon = toAbsoluteUrl(req, '/icon-192.png');
    const badge = toAbsoluteUrl(req, '/badge-on2-96.png');
    const roomTag = roomIdFromUrl(url) || 'tarrytalk';
    const safeTitle = String(title || '온메신저').slice(0, 80);
    const safeBody = String(body || '새 알림이 있습니다').slice(0, 180);

    for (const batch of chunk(tokens, MAX_TOKENS)) {
      // data-only 메시지: notification 페이로드를 보내지 않아 FCM 자동표시를 끈다.
      // 알림 표시는 firebase-messaging-sw.js의 onBackgroundMessage가 직접 showNotification으로 1회만 한다.
      // → 아이콘/배지(상태바 흰네모 문제)를 우리가 완전히 제어하고, 자동표시가 없으므로 중복도 발생하지 않는다.
      const result = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        data: {
          title: safeTitle,
          body: safeBody,
          url: link,
          icon,
          badge,
          tag: `${roomTag}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        // webpush.fcmOptions.link 제거: data-only인데 link가 있으면 FCM이 알림을 추가 생성할 수 있음.
        // 클릭 시 이동은 SW의 notificationclick이 data.url로 처리한다.
      });

      sent += result.successCount;
      failed += result.failureCount;
      result.responses.forEach((r, i) => {
        const token = batch[i];
        if (r.success) {
          const staleTokens = staleTokensBySentToken.get(token) || [];
          staleTokens.forEach(item => removals.push(db.ref(`users/${item.uid}/fcmTokens/${item.token}`).remove()));
          return;
        }
        if (!invalidToken(r.error?.code)) return;
        const owners = tokenOwners.get(token) || new Set();
        owners.forEach(uid => removals.push(db.ref(`users/${uid}/fcmTokens/${token}`).remove()));
      });
    }

    if (removals.length) await Promise.allSettled(removals);
    return res.status(200).json({ ok: true, sent, failed, cleaned: removals.length });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
