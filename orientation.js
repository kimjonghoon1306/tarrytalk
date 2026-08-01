// 화면 방향 기본값: 휴대폰은 세로 고정, 태블릿은 자유 회전.
// Screen Orientation API는 홈 화면에 설치한 PWA에서 가장 안정적으로 동작한다.
(() => {
  const ua = navigator.userAgent || '';
  const shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  const isTablet = isIPad || isAndroidTablet || (navigator.maxTouchPoints > 0 && shortSide >= 600);
  const isPhone = !isTablet && (
    /iPhone|iPod/i.test(ua)
    || (/Android/i.test(ua) && /Mobile/i.test(ua))
    || (navigator.maxTouchPoints > 0 && shortSide < 600)
  );

  function savedMode() {
    try {
      return localStorage.getItem('tt_orientation') === 'landscape' ? 'landscape' : 'portrait';
    } catch (_) {
      return 'portrait';
    }
  }

  async function applyDefaultOrientation() {
    const orientation = screen.orientation;
    if (!orientation) return;
    try {
      if (isPhone) {
        const mode = savedMode();
        try {
          await orientation.lock(mode);
        } catch (_) {
          await orientation.lock(`${mode}-primary`);
        }
      }
      else if (isTablet && typeof orientation.unlock === 'function') orientation.unlock();
    } catch (_) {
      // 일반 브라우저에서 잠금 권한이 없으면 기기 설정과 동적 manifest가 대신 처리한다.
    }
  }

  window.setAppOrientation = async mode => {
    if (!isPhone || !['portrait', 'landscape'].includes(mode)) return;
    try { localStorage.setItem('tt_orientation', mode); } catch (_) {}
    await applyDefaultOrientation();
    window.dispatchEvent(new CustomEvent('apporientationchange', { detail: { mode } }));
  };
  window.getAppOrientation = () => isTablet ? 'auto' : savedMode();

  window.addEventListener('load', applyDefaultOrientation);
  window.addEventListener('pageshow', applyDefaultOrientation);
  // 일부 모바일 브라우저는 사용자 동작 뒤에만 방향 잠금을 허용한다.
  document.addEventListener('pointerdown', applyDefaultOrientation, { once: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') applyDefaultOrientation();
  });
})();
