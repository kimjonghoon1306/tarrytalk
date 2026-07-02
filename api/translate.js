// 메시지 번역 (Google 비공식 translate endpoint, API 키 불필요). 자동 감지 → ko, 원문이 ko면 → en.
async function tr(text, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=` + encodeURIComponent(text);
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('translate_http_' + r.status);
  const j = await r.json();
  const translated = (j[0] || []).map(x => x && x[0]).filter(Boolean).join('');
  const src = j[2] || (j[8] && j[8][0] && j[8][0][0]) || '';
  return { translated, src };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const text = (body.text || '').toString().slice(0, 2000);
    if (!text.trim()) return res.status(400).json({ error: 'no_text' });
    let out = await tr(text, 'ko');
    let tl = 'ko';
    if ((out.src || '').startsWith('ko')) { out = await tr(text, 'en'); tl = 'en'; }
    return res.status(200).json({ translated: out.translated, src: out.src, tl });
  } catch (e) {
    return res.status(500).json({ error: 'translate_failed' });
  }
};
