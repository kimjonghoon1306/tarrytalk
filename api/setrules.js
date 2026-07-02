// [임시] 라이브 RTDB 규칙을 읽어 messages type 검증에 'sticker'만 추가 게시. 사용 후 삭제.
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
    if ((req.query.key || '') !== 'sprout-2026-x7k9') return res.status(403).json({ error: 'forbidden' });
    const { access_token } = await admin.app().options.credential.getAccessToken();
    const auth = { Authorization: 'Bearer ' + access_token };
    const cur = await fetch(DB_URL + '/.settings/rules.json', { headers: auth });
    let txt = await cur.text();
    if (!cur.ok) return res.status(500).json({ step: 'get', status: cur.status, body: txt.slice(0, 2000) });
    if (txt.includes('|sticker)')) return res.json({ ok: true, already: true });
    const before = txt;
    txt = txt.replace(/document\|schedule\|system\)/g, 'document|schedule|system|sticker)');
    if (txt === before) return res.status(500).json({ error: 'pattern_not_found', sample: before.slice(0, 4000) });
    const put = await fetch(DB_URL + '/.settings/rules.json', {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: txt,
    });
    const pbody = await put.text();
    return res.status(put.ok ? 200 : 500).json({ ok: put.ok, status: put.status, body: pbody.slice(0, 1000) });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
