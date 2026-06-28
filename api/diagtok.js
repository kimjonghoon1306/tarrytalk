// 임시 운영 함수 — 토큰진단 / 규칙배포 / 중복토큰 정리. 작업 후 즉시 제거.
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
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
  const db = admin.database();
  const action = req.query.do || '';
  try {
    if (action === 'rules') {
      const rules = fs.readFileSync(path.join(process.cwd(), 'database.rules.json'), 'utf8');
      const tok = await admin.app().options.credential.getAccessToken();
      const at = tok.access_token || tok.accessToken;
      const r = await fetch(`${DB_URL}/.settings/rules.json?access_token=${at}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: rules,
      });
      const txt = await r.text();
      return res.status(200).json({ action: 'rules', status: r.status, body: txt });
    }
    if (action === 'cleartokens') {
      const snap = await db.ref('users').get();
      const users = snap.val() || {};
      const cleared = [];
      for (const uid of Object.keys(users)) {
        if (users[uid] && users[uid].fcmTokens) {
          await db.ref(`users/${uid}/fcmTokens`).remove();
          cleared.push(uid.slice(0, 8));
        }
      }
      return res.status(200).json({ action: 'cleartokens', cleared });
    }
    // 기본: 진단
    const snap = await db.ref('users').get();
    const users = snap.val() || {};
    const out = Object.entries(users).map(([uid, u]) => ({
      uid: uid.slice(0, 8),
      name: (u && u.displayName) || '',
      tokenCount: Object.keys((u && u.fcmTokens) || {}).length,
      sampleVal: (() => { const t = (u && u.fcmTokens) || {}; const k = Object.keys(t); return k.length ? t[k[0]] : null; })(),
    }));
    out.sort((a, b) => b.tokenCount - a.tokenCount);
    return res.status(200).json({ totalUsers: out.length, users: out });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
