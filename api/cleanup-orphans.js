// 고아 Auth 계정(프로필 없거나 displayName 없는) 일괄 정리 — 관리자 전용 (Vercel)
const admin = require('firebase-admin');

const ADMIN_EMAIL = 'tarry9653@daum.net';
const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { idToken } = body;
    if (!idToken) return res.status(400).json({ error: 'missing_params' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    let isAdmin = decoded.email === ADMIN_EMAIL;
    if (!isAdmin) {
      const s = await admin.database().ref(`users/${decoded.uid}/isAdmin`).get();
      isAdmin = s.val() === true;
    }
    if (!isAdmin) return res.status(403).json({ error: 'forbidden' });

    const usersSnap = await admin.database().ref('users').get();
    const usersDb = usersSnap.val() || {};
    const authUsers = [];
    let pageToken;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      authUsers.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken);

    const deleted = [];
    const kept = [];
    for (const u of authUsers) {
      if (u.email === ADMIN_EMAIL) { kept.push(u.email); continue; } // 최고관리자 보존
      const prof = usersDb[u.uid];
      const hasName = prof && prof.displayName;
      if (!hasName) {
        try { await admin.auth().deleteUser(u.uid); } catch (e) {}
        try { await admin.database().ref(`users/${u.uid}`).remove(); } catch (e) {}
        deleted.push(u.email || u.uid);
      } else {
        kept.push(u.email);
      }
    }
    return res.status(200).json({ ok: true, deletedCount: deleted.length, deleted, kept });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
