/* Background song for the whole invitation. Browsers only allow sound after
   the visitor interacts, so it starts on the first tap, click or key press.
   Muting is remembered on this device. */
(() => {
  const btn = document.querySelector('.music');
  if (!btn) return;
  const KEY = 'invite-music-muted';

  const song = new Audio('assets/audio/song.mp3');
  song.loop = true;
  song.preload = 'none';
  song.volume = 0.8;

  let wanted = true;
  try { wanted = localStorage.getItem(KEY) !== '1'; } catch (e) { /* storage blocked */ }
  let started = false;

  const show = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Mute music' : 'Play music');
  };

  function start() {
    return song.play().then(() => {
      started = true;
      show(true);
    }).catch(() => show(false));
  }

  btn.addEventListener('click', () => {
    wanted = !(started && !song.paused);
    try { localStorage.setItem(KEY, wanted ? '0' : '1'); } catch (e) { /* storage blocked */ }
    if (wanted) start();
    else { song.pause(); show(false); }
  });

  // Start on the first interaction anywhere else on the page
  const events = ['pointerdown', 'touchend', 'keydown'];
  const off = () => events.forEach((t) => window.removeEventListener(t, first, true));
  function first(e) {
    if (btn.contains(e.target) || !wanted || started) return;
    start().then(() => { if (started) off(); });
  }
  events.forEach((t) => window.addEventListener(t, first, { capture: true, passive: true }));

  // Pause while the tab is hidden; resume if the music was playing
  document.addEventListener('visibilitychange', () => {
    if (!started || !wanted) return;
    if (document.hidden) song.pause();
    else song.play().catch(() => {});
  });
})();
