const admin = require('firebase-admin');
const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = '28fedcc0f821f889ebd00650';
if (!admin.apps.length) admin.initializeApp({credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),databaseURL: DB_URL});
const BODY = `온메신저를 찾아주셔서 감사합니다 💜

새로운 소식과 안내는 여기서 확인하세요!

• 📢 공지사항 — 운영진의 공지·소식을 확인하세요
• 🤖 온봇 — 사용법이나 궁금한 점을 편하게 물어보세요
• 📁 보관함 · 📅 일정 등 편리한 기능도 둘러보세요`;
module.exports = async (req, res) => {
  if ((req.query.key || '') !== SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    await admin.database().ref('popup').update({ title: '온메신저에 오신 걸 환영해요!', body: BODY, imageData: '/popup-notice-v5.png', active: true, updatedAt: Date.now() });
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(500).json({ error: 'server_error', message: String(e&&e.message||e) }); }
};
