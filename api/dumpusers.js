// [임시] users 노드의 email/displayName 확인용. 사용 후 삭제.
const admin = require('firebase-admin');
const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}
module.exports = async (req, res) => {
  try {
    if ((req.query.key || '') !== 'dump-2026-x7k9') return res.status(403).json({ error: 'forbidden' });
    const snap = await admin.database().ref('users').get();
    const users = snap.val() || {};
    const out = Object.entries(users).map(([uid, u]) => ({
      uid: uid.slice(0, 6),
      email: u && u.email ? u.email : '(email 없음)',
      name: u && u.displayName ? u.displayName : '(이름 없음)',
      disabled: !!(u && u.disabled),
    }));
    return res.json({ count: out.length, users: out });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
