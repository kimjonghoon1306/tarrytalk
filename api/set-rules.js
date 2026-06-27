const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const https = require('https');

const DB_URL = 'https://tarrytalk-default-rtdb.firebaseio.com';
const SECRET = 'rules-push-9b3f7a2c1e';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: DB_URL,
  });
}

module.exports = async (req, res) => {
  try {
    if ((req.query && req.query.k) !== SECRET) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    const rulesPath = path.join(process.cwd(), 'database.rules.json');
    const rulesText = fs.readFileSync(rulesPath, 'utf8');
    // validate it parses
    JSON.parse(rulesText);

    const token = (await admin.app().options.credential.getAccessToken()).access_token;

    const result = await new Promise((resolve, reject) => {
      const r = https.request(
        `${DB_URL}/.settings/rules.json?access_token=${encodeURIComponent(token)}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
        (resp) => {
          let body = '';
          resp.on('data', (d) => (body += d));
          resp.on('end', () => resolve({ status: resp.statusCode, body }));
        }
      );
      r.on('error', reject);
      r.write(rulesText);
      r.end();
    });

    res.status(200).json({ pushed: true, firebaseStatus: result.status, firebaseBody: result.body });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
