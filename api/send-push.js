const admin = require('firebase-admin');

const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const MAX_TOKENS = 500;

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const bodyData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { idToken, targetUids, title, body, url } = bodyData;

    if (!idToken || !Array.isArray(targetUids) || !targetUids.length) {
      return res.status(400).json({ error: 'missing_params' });
    }

    await admin.auth().verifyIdToken(idToken);

    const db = admin.database();
    const tokenOwners = new Map();

    await Promise.all([...new Set(targetUids)].map(async uid => {
      if (!uid || typeof uid !== 'string') return;
      const snap = await db.ref(`users/${uid}/fcmTokens`).get();
      const tokens = snap.val() || {};
      Object.keys(tokens).forEach(token => {
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

    for (const batch of chunk(tokens, MAX_TOKENS)) {
      const result = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        notification: {
          title: title || '온메신저',
          body: body || '새 알림이 있습니다',
        },
        data: {
          url: link,
        },
        webpush: {
          notification: {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          },
          fcmOptions: { link },
        },
      });

      sent += result.successCount;
      failed += result.failureCount;
      result.responses.forEach((r, i) => {
        if (r.success || !invalidToken(r.error?.code)) return;
        const token = batch[i];
        const owners = tokenOwners.get(token) || new Set();
        owners.forEach(uid => removals.push(db.ref(`users/${uid}/fcmTokens/${token}`).remove()));
      });
    }

    if (removals.length) await Promise.allSettled(removals);
    return res.status(200).json({ ok: true, sent, failed, cleaned: removals.length });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'server_error' });
  }
};
