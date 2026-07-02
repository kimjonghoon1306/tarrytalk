// [임시] 라이브 RTDB 규칙에 poll 타입 + pollVotes 쓰기규칙 추가. 사용 후 삭제.
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
    if ((req.query.key || '') !== 'poll-2026-x7k9') return res.status(403).json({ error: 'forbidden' });
    const { access_token } = await admin.app().options.credential.getAccessToken();
    const auth = { Authorization: 'Bearer ' + access_token };
    const cur = await fetch(DB_URL + '/.settings/rules.json', { headers: auth });
    const txt = await cur.text();
    if (!cur.ok) return res.status(500).json({ step: 'get', body: txt.slice(0, 1500) });
    const rules = JSON.parse(txt);
    const msg = rules.rules && rules.rules.messages && rules.rules.messages['$roomId'] && rules.rules.messages['$roomId']['$msgId'];
    if (!msg) return res.status(500).json({ error: 'path_not_found', keys: Object.keys((rules.rules) || {}) });
    const changes = [];
    if (msg.type && msg.type['.validate'] && !msg.type['.validate'].includes('poll')) {
      msg.type['.validate'] = msg.type['.validate'].replace('sticker)', 'sticker|poll)');
      changes.push('type+poll');
    }
    if (!msg.pollVotes) {
      msg.pollVotes = { '$uid': { '.write': "auth != null && auth.uid === $uid && root.child('rooms').child($roomId).child('members').child(auth.uid).exists()" } };
      changes.push('pollVotes');
    }
    if (!changes.length) return res.json({ ok: true, already: true });
    const put = await fetch(DB_URL + '/.settings/rules.json', {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(rules),
    });
    const pbody = await put.text();
    return res.status(put.ok ? 200 : 500).json({ ok: put.ok, status: put.status, changes, body: pbody.slice(0, 600) });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
