const baseManifest = {
  name: '온메신저',
  short_name: '온메신저',
  id: '/',
  description: '친구들과 언제 어디서나 실시간 채팅',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#7c3aed',
  theme_color: '#7c3aed',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  categories: ['social', 'communication'],
  shortcuts: [{
    name: '채팅',
    short_name: '채팅',
    url: '/chat.html',
    icons: [{ src: '/icon-192.png', sizes: '192x192' }],
  }],
};

module.exports = (req, res) => {
  const ua = String(req.headers['user-agent'] || '');
  const isTablet = /iPad/i.test(ua)
    || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
    || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const manifest = { ...baseManifest, orientation: isTablet ? 'any' : 'portrait-primary' };
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Vary', 'User-Agent');
  res.status(200).json(manifest);
};
