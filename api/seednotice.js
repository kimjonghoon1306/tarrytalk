// [임시] 새 기능 공식공지 1건 등록(Admin SDK=규칙 우회). 사용 후 삭제.
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
    if ((req.query.key || '') !== 'notice-2026-x7k9') return res.status(403).json({ error: 'forbidden' });
    const db = admin.database();
    const text = [
      '🎉 새 기능이 이만큼 업데이트됐어요!',
      '',
      '🔕 방별 알림 끄기 — 시끄러운 방만 조용히 (채팅방 ⚙️설정 → 알림 끄기)',
      '📊 투표·설문 — 단톡에서 투표 만들기 (도구줄 📊)',
      '📢 @멘션 — 단톡에서 특정 사람 콕 부르기 (입력창에 @이름)',
      '🎤 음성 메시지 — 녹음해서 보내기 (도구줄 🎤, 최대 1분)',
      '🎨 채팅방 배경 — 방마다 나만의 배경 8종 (⚙️설정 → 채팅방 배경)',
      '💬 상태 한마디 — 프로필에 상태 남기기 (👤 프로필)',
      '🌐 번역 — 외국어 메시지를 길게 눌러 번역 (자동 감지)',
      '⏰ 예약 전송 — 정한 시간에 자동 발송 (도구줄 ⏰)',
      '',
      '그리고 앱을 껐다 켜도 로그인이 풀리지 않도록 개선했어요!',
      '각 기능의 자세한 사용법은 온봇(오른쪽 아래 🤖)에게 물어보세요 😊',
    ].join('\n');
    const ref = db.ref('announcements').push();
    await ref.set({ text, active: true, at: Date.now(), by: '운영진' });
    return res.json({ ok: true, id: ref.key });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
