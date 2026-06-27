const admin = require('firebase-admin');

const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = '28fedcc0f821f889ebd00650';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

// 1회용 유틸: 공식 공지(announcements)에서 같은 text 중복을 제거(최신 1건만 유지)
module.exports = async (req, res) => {
  if ((req.query.key || '') !== SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    const db = admin.database();
    const snap = await db.ref('announcements').get();
    const data = snap.val() || {};
    const byText = {};
    Object.entries(data).forEach(([id, v]) => {
      const t = String((v && v.text) || '').trim();
      (byText[t] = byText[t] || []).push({ id, at: (v && v.at) || 0 });
    });
    const removed = [];
    for (const t of Object.keys(byText)) {
      const arr = byText[t];
      if (arr.length > 1) {
        arr.sort((a, b) => b.at - a.at); // 최신 먼저
        for (let i = 1; i < arr.length; i++) {
          await db.ref('announcements/' + arr[i].id).remove();
          removed.push(arr[i].id);
        }
      }
    }
    return res.status(200).json({ ok: true, total: Object.keys(data).length, removed });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: String((e && e.message) || e) });
  }
};
