const admin = require('firebase-admin');
const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = '28fedcc0f821f889ebd00650';
if (!admin.apps.length) admin.initializeApp({credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),databaseURL: DB_URL});
module.exports = async (req, res) => {
  if ((req.query.key || '') !== SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    await admin.database().ref('popup').update({ imageData: '/popup-notice-v2.png', updatedAt: Date.now() });
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(500).json({ error: 'server_error', message: String(e&&e.message||e) }); }
};
