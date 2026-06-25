// 링크 미리보기용 OG 메타 크롤링 (카톡식 링크 카드)
module.exports = async (req, res) => {
  try {
    const url = (req.query && req.query.url) || '';
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'bad_url' });
    // 과도한 응답 방지: 타임아웃 + 텍스트 일부만
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 6000);
    let html = '';
    try {
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OnMessengerBot/1.0; +https://talk.xn--zk5biyyw.com)' },
        redirect: 'follow',
      });
      const buf = await r.arrayBuffer();
      html = Buffer.from(buf).toString('utf-8').slice(0, 200000);
    } finally { clearTimeout(tid); }

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
      url,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || 'fail' });
  }
};
