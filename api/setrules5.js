// [임시] 라이브 RTDB 규칙의 rooms.read + members 자가입장 규칙을 갱신. 사용 후 삭제.
const admin = require('firebase-admin');
const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}
const NEW_ROOMS_READ = "auth != null && ((query.orderByChild === 'members/' + auth.uid && query.equalTo === true) || root.child('users').child(auth.uid).child('isAdmin').val() === true || auth.token.email === 'tarry9653@daum.net')";
const NEW_MEMBERS_WRITE = "auth != null && ((!newData.exists() && data.exists() && auth.uid === $uid) || (auth.uid === $uid && !data.exists() && newData.val() === true && root.child('rooms').child($roomId).child('type').val() === 'group') || root.child('rooms').child($roomId).child('createdBy').val() === auth.uid || root.child('rooms').child($roomId).child('members').child(auth.uid).exists() || root.child('users').child(auth.uid).child('isAdmin').val() === true || auth.token.email === 'tarry9653@daum.net')";
module.exports = async (req, res) => {
  try {
    if ((req.query.key || '') !== 'invite-2026-x7k9') return res.status(403).json({ error: 'forbidden' });
    const { access_token } = await admin.app().options.credential.getAccessToken();
    const auth = { Authorization: 'Bearer ' + access_token };
    const cur = await fetch(DB_URL + '/.settings/rules.json', { headers: auth });
    const txt = await cur.text();
    if (!cur.ok) return res.status(500).json({ step: 'get', body: txt.slice(0, 1500) });
    const rules = JSON.parse(txt);
    const rooms = rules.rules && rules.rules.rooms;
    if (!rooms || !rooms['$roomId'] || !rooms['$roomId'].members || !rooms['$roomId'].members['$uid']) {
      return res.status(500).json({ error: 'rooms_path_not_found' });
    }
    const before = { read: rooms['.read'], mw: rooms['$roomId'].members['$uid']['.write'] };
    rooms['.read'] = NEW_ROOMS_READ;
    rooms['$roomId'].members['$uid']['.write'] = NEW_MEMBERS_WRITE;
    const put = await fetch(DB_URL + '/.settings/rules.json', {
      method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(rules),
    });
    const pbody = await put.text();
    return res.status(put.ok ? 200 : 500).json({ ok: put.ok, status: put.status, changed: before.read !== NEW_ROOMS_READ || before.mw !== NEW_MEMBERS_WRITE, body: pbody.slice(0, 500) });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
