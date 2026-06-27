const admin = require('firebase-admin');

const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = '28fedcc0f821f889ebd00650';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

const ANN_TEXT = `🎉 온메신저 새 기능 안내

안녕하세요, 회원 여러분! 온메신저가 더 편리해졌어요 😊
새로 추가된 기능을 소개합니다.

📁 보관함
채팅방에서 주고받은 사진·영상·파일·링크가 한곳에 자동으로 모여요. (왼쪽 '보관함')

📌 자료실
교재·안내문 같은 공식 자료를 보관함 안 '자료실'에서 언제든 보고 받을 수 있어요.

📅 일정 · 출석체크
모임 일정을 한눈에 모아보고 '참석/불참'으로 출석을 표시할 수 있어요. 다가오는 일정은 알림으로 알려드려요.

✏️ 줄바꿈 · 내 프로필
긴 글도 편하게 쓰고(PC는 Shift+Enter), 내 프로필에서 친구 수·참여 채팅방·가입일을 볼 수 있어요.

🔔 알림도 한 번만 깔끔하게 오도록 정리했어요.

앞으로도 더 편리하게 만들어갈게요. 감사합니다 💜`;

const POPUP_BODY = `온메신저를 찾아주셔서 감사합니다 💜

회원 여러분을 위한 편리한 기능(보관함·자료실·일정 등)이 새로 추가됐어요!

• 📢 공지사항 — 새 기능을 자세히 확인하세요
• 🤖 온봇 — 사용법이 궁금하면 편하게 물어보세요 (채팅 목록 맨 위)`;

module.exports = async (req, res) => {
  if ((req.query.key || '') !== SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    const db = admin.database();
    const now = Date.now();
    const result = {};

    if (req.query.ann !== '0') {
      const ref = db.ref('announcements').push();
      await ref.set({ text: ANN_TEXT, imageData: '/feature-notice.png', at: now, by: '운영진' });
      result.announcement = ref.key;
    }
    if (req.query.popup !== '0') {
      await db.ref('popup').set({
        title: '📢 새로운 기능이 추가됐어요!',
        body: POPUP_BODY,
        imageData: '/popup-notice.png',
        active: true,
        updatedAt: now,
      });
      result.popup = true;
    }
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: String(e && e.message || e) });
  }
};
