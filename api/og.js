// 링크 미리보기용 OG 메타 크롤링 (카톡식 링크 카드)
const dns = require('node:dns').promises;
const net = require('node:net');

const MAX_BYTES = 200000;
const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 3;

function isPrivateIp(ip) {
  if (!ip) return true;
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 10 ||
      p[0] === 127 ||
      p[0] >= 224 ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 0 && p[2] === 0) ||
      (p[0] === 192 && p[1] === 168) ||
      (p[0] === 198 && (p[1] === 18 || p[1] === 19)) ||
      p[0] === 0;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:') || v.startsWith('ff');
  }
  return true;
}

async function assertPublicHttpUrl(raw) {
  const u = new URL(raw);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('bad_url');
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) throw new Error('blocked_host');
  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(r => isPrivateIp(r.address))) throw new Error('blocked_host');
  return u.href;
}

async function readLimitedText(response) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const buf = Buffer.from(await response.arrayBuffer());
    return buf.subarray(0, MAX_BYTES).toString('utf-8');
  }
  const chunks = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    const remain = MAX_BYTES - size;
    chunks.push(chunk.subarray(0, remain));
    size += Math.min(chunk.length, remain);
    if (chunk.length > remain) break;
  }
  try { await reader.cancel(); } catch (e) {}
  return Buffer.concat(chunks).toString('utf-8');
}

async function fetchSafeHtml(rawUrl) {
  let current = await assertPublicHttpUrl(rawUrl);
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(current, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OnMessengerBot/1.0; +https://talk.xn--zk5biyyw.com)' },
        redirect: 'manual',
      });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        current = await assertPublicHttpUrl(new URL(r.headers.get('location'), current).href);
        continue;
      }
      const len = Number(r.headers.get('content-length') || 0);
      if (len > MAX_BYTES) return { html: '', url: current };
      const type = (r.headers.get('content-type') || '').toLowerCase();
      if (type && !type.includes('text/html') && !type.includes('application/xhtml')) return { html: '', url: current };
      return { html: await readLimitedText(r), url: current };
    } finally {
      clearTimeout(tid);
    }
  }
  throw new Error('too_many_redirects');
}

module.exports = async (req, res) => {
  try {
    const url = (req.query && req.query.url) || '';
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'bad_url' });
    const fetched = await fetchSafeHtml(url);
    const html = fetched.html;

    const pick = (props) => {
      for (const p of props) {
        const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + p + '["\'][^>]+content=["\']([^"\']+)["\']', 'i');
        const re2 = new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']' + p + '["\']', 'i');
        const m = html.match(re) || html.match(re2);
        if (m && m[1]) return m[1];
      }
      return '';
    };
    const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/g, '/');
    let title = pick(['og:title', 'twitter:title']);
    if (!title) { const t = html.match(/<title[^>]*>([^<]+)<\/title>/i); title = t ? t[1] : ''; }
    let desc = pick(['og:description', 'twitter:description', 'description']);
    let image = pick(['og:image', 'twitter:image', 'og:image:url']);
    let siteName = pick(['og:site_name']);

    // 상대경로 이미지 → 절대경로
    if (image && !/^https?:\/\//i.test(image)) {
      try { image = new URL(image, url).href; } catch (e) {}
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).json({
      ok: true,
      title: decode(title || '').trim().slice(0, 120),
      description: decode(desc || '').trim().slice(0, 200),
      image: image || '',
      siteName: decode(siteName || '').trim().slice(0, 60),
      url: fetched.url,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'fail' });
  }
};
