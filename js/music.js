/* Background music with a mute button. Browsers only allow sound after the
   visitor interacts, so it starts on the first tap, click or key press. The
   choice to mute is remembered on this device. */
(() => {
  const audio = document.getElementById('bgm');
  const btn = document.querySelector('.music');
  if (!audio || !btn) return;

  const KEY = 'invite-music-muted';
  let wanted = true;
  try { wanted = localStorage.getItem(KEY) !== '1'; } catch (e) { /* storage blocked */ }
  let fadeTimer = 0;

  const show = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Mute music' : 'Play music');
  };
  const remember = () => {
    try { localStorage.setItem(KEY, wanted ? '0' : '1'); } catch (e) { /* storage blocked */ }
  };

  function play() {
    audio.volume = 0;
    return audio.play().then(() => {
      show(true);
      clearInterval(fadeTimer);
      fadeTimer = setInterval(() => {               // gentle fade-in (ignored on iOS, which fixes volume)
        audio.volume = Math.min(0.6, audio.volume + 0.03);
        if (audio.volume >= 0.6) clearInterval(fadeTimer);
      }, 80);
    }).catch(() => show(false));
  }
  function stop() {
    clearInterval(fadeTimer);
    audio.pause();
    show(false);
  }

  btn.addEventListener('click', () => {
    wanted = audio.paused;
    remember();
    if (wanted) play(); else stop();
  });

  // Start on the first interaction anywhere else on the page
  const first = (e) => {
    if (btn.contains(e.target)) return;
    if (wanted && audio.paused) play().then(() => { if (!audio.paused) off(); });
  };
  const events = ['pointerdown', 'touchend', 'keydown'];
  const off = () => events.forEach((t) => window.removeEventListener(t, first, true));
  events.forEach((t) => window.addEventListener(t, first, { capture: true, passive: true }));

  // Pause while the tab is hidden; resume if the music was playing
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (!audio.paused) { audio.pause(); audio.dataset.resume = '1'; } }
    else if (audio.dataset.resume) { delete audio.dataset.resume; if (wanted) play(); }
  });
})();
