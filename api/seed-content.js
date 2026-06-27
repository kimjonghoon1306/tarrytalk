const admin = require('firebase-admin');

const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = '28fedcc0f821f889ebd00650';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

// 1회용: 로그인 팝업 문구 수정(중복 스피커 제거, '채팅 목록 맨 위' → '오른쪽 아래 온봇 버튼')
const POPUP_BODY = `온메신저를 찾아주셔서 감사합니다 💜

회원 여러분을 위한 편리한 기능(보관함·자료실·일정 등)이 새로 추가됐어요!

• 📢 공지사항 — 새 기능을 자세히 확인하세요
• 🤖 온봇 — 사용법이 궁금하면 화면 오른쪽 아래 온봇 버튼을 눌러보세요`;

module.exports = async (req, res) => {
  if ((req.query.key || '') !== SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    const db = admin.database();
    await db.ref('popup').update({
      title: '새로운 기능이 추가됐어요!',
      body: POPUP_BODY,
      imageData: '/popup-notice.png',
      active: true,
      updatedAt: Date.now(),
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: String((e && e.message) || e) });
  }
};
