const admin = require('firebase-admin');

const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = 'tk9f3a7c2e1d8b4602push'; // 임시 진단키 — 작업 후 파일 즉시 제거

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    if (q.key !== SECRET) return res.status(403).json({ error: 'forbidden' });
    const db = admin.database();
    const do_ = q.do || 'dump';

    if (do_ === 'pushlog') {
      const ls = await db.ref('_pushlog').get();
      const log = ls.val() || {};
      const entries = Object.values(log).sort((a, b) => (a.at || 0) - (b.at || 0));
      return res.status(200).json({ ok: true, action: 'pushlog', count: entries.length, entries });
    }
    if (do_ === 'clearlog') {
      await db.ref('_pushlog').remove();
      return res.status(200).json({ ok: true, action: 'clearlog' });
    }

    const snap = await db.ref('users').get();
    const users = snap.val() || {};
    const report = {};
    let total = 0;
    Object.entries(users).forEach(([uid, u]) => {
      const tokens = (u && u.fcmTokens) || {};
      const keys = Object.keys(tokens);
      if (!keys.length) return;
      total += keys.length;
      report[uid] = {
        name: (u && u.displayName) || '(이름없음)',
        count: keys.length,
        values: keys.map(t => ({ token: t.slice(0, 12) + '…', value: tokens[t] })),
      };
    });

    if (do_ === 'clear') {
      const removals = [];
      Object.keys(users).forEach(uid => {
        if (users[uid] && users[uid].fcmTokens) {
          removals.push(db.ref(`users/${uid}/fcmTokens`).remove());
        }
      });
      await Promise.allSettled(removals);
      return res.status(200).json({ ok: true, action: 'clear', clearedUsers: removals.length, beforeTotal: total, report });
    }

    return res.status(200).json({ ok: true, action: 'dump', totalTokens: total, userCount: Object.keys(report).length, report });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: String(e && e.message || e) });
  }
};
