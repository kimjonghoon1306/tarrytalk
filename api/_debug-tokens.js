// 임시 진단 함수 — fcmTokens 개수 확인용. 확인 후 즉시 제거.
const admin = require('firebase-admin');
const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = '45bf38a72dd8d97531acf46ff2517b17';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

module.exports = async (req, res) => {
  if (req.query.key !== SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    const db = admin.database();
    const snap = await db.ref('users').get();
    const users = snap.val() || {};
    const out = [];
    for (const [uid, u] of Object.entries(users)) {
      const t = (u && u.fcmTokens) || {};
      const keys = Object.keys(t);
      out.push({
        uid: uid.slice(0, 8),
        name: (u && u.displayName) || '',
        email: (u && u.email) || '',
        tokenCount: keys.length,
        sampleVal: keys.length ? t[keys[0]] : null,
        tokenPrefixes: keys.map(k => k.slice(0, 14) + '…'),
      });
    }
    out.sort((a, b) => b.tokenCount - a.tokenCount);
    res.status(200).json({ totalUsers: out.length, users: out });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
