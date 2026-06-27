const admin = require('firebase-admin');
const https = require('https');

const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = 'rules-read-7c4d1a';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

module.exports = async (req, res) => {
  try {
    if ((req.query && req.query.k) !== SECRET) { res.status(403).json({ error: 'forbidden' }); return; }
    const token = (await admin.app().options.credential.getAccessToken()).access_token;
    const result = await new Promise((resolve, reject) => {
      https.get(`${DB_URL}/.settings/rules.json?access_token=${encodeURIComponent(token)}`, (resp) => {
        let body = ''; resp.on('data', (d) => (body += d)); resp.on('end', () => resolve(body));
      }).on('error', reject);
    });
    res.status(200).send(result);
  } catch (e) { res.status(500).json({ error: String(e && e.message || e) }); }
};
