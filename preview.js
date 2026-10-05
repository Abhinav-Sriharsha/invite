(() => {
  const THEME_COLORS = { ivory: '#FAF5EB', marigold: '#FFF8EC', jaali: '#0F1B33' };
  const body = document.body;
  const meta = document.querySelector('meta[name="theme-color"]');
  const buttons = document.querySelectorAll('.picker__opt');

  function apply(bg) {
    if (!(bg in THEME_COLORS)) bg = 'ivory';
    body.dataset.bg = bg;
    meta.content = THEME_COLORS[bg];
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bg === bg)));
  }

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      apply(b.dataset.bg);
      history.replaceState(null, '', '#' + b.dataset.bg);
    })
  );
  window.addEventListener('hashchange', () => apply(location.hash.slice(1)));
  apply(location.hash.slice(1));

  // Hook for future scroll-triggered motion: marks sections as they enter view.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle('is-inview', e.isIntersecting)),
      { threshold: 0.2 }
    );
    document.querySelectorAll('.screen').forEach((s) => io.observe(s));
  }
})();
