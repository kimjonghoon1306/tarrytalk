// 관리자가 회원을 Auth+DB까지 완전 삭제하는 서버리스 함수 (Vercel)
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
    const { idToken, targetUid, targetEmail } = body;
    if (!idToken || (!targetUid && !targetEmail)) return res.status(400).json({ error: 'missing_params' });

    // 1) 요청자 검증 (실제 로그인 토큰) + 관리자 권한 확인
    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerIsSuper = decoded.email === ADMIN_EMAIL;
    let callerIsAdmin = callerIsSuper;
    if (!callerIsAdmin) {
      const snap = await admin.database().ref(`users/${decoded.uid}/isAdmin`).get();
      callerIsAdmin = snap.val() === true;
    }
    if (!callerIsAdmin) return res.status(403).json({ error: 'forbidden' });

    // 2) 대상 uid 결정 (uid 우선, 없으면 email로 조회)
    let uid = targetUid;
    let emailForCheck = targetEmail;
    if (!uid && targetEmail) {
      try { const u = await admin.auth().getUserByEmail(targetEmail); uid = u.uid; emailForCheck = u.email; }
      catch (e) { /* Auth에 없으면 uid는 못 구함 (DB만 정리) */ }
    }

    // 3) 보호: 최고관리자/본인 삭제 금지
    if (uid && uid === decoded.uid) return res.status(400).json({ error: 'cannot_delete_self' });
    if (emailForCheck === ADMIN_EMAIL) return res.status(400).json({ error: 'cannot_delete_super_admin' });
    if (uid) {
      const tSnap = await admin.database().ref(`users/${uid}`).get();
      const tEmail = tSnap.val() && tSnap.val().email;
      if (tEmail === ADMIN_EMAIL) return res.status(400).json({ error: 'cannot_delete_super_admin' });
    }

    // 4) Auth 계정 삭제
    let authDeleted = false;
    if (uid) { try { await admin.auth().deleteUser(uid); authDeleted = true; } catch (e) {} }
    else if (targetEmail) { try { const u = await admin.auth().getUserByEmail(targetEmail); await admin.auth().deleteUser(u.uid); uid = u.uid; authDeleted = true; } catch (e) {} }

    // 5) DB 프로필 삭제
    if (uid) await admin.database().ref(`users/${uid}`).remove();

    return res.status(200).json({ ok: true, authDeleted, uid: uid || null });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'server_error' });
  }
};
