/* Background music that follows the story: the song plays throughout, and the
   pedda melam takes over at the Sumuhurtham before the song picks up where it
   left off. Browsers only allow sound after the visitor interacts, so it
   starts on the first tap, click or key press. Muting is remembered on this
   device. */
(() => {
  const btn = document.querySelector('.music');
  if (!btn) return;
  const root = document.documentElement;
  const SRC = {
    song: 'assets/audio/song.mp3',
    melam: 'assets/audio/melam.mp3',
  };
  const FADE = 1.2; // seconds
  const KEY = 'invite-music-muted';

  const tracks = {};
  for (const [name, src] of Object.entries(SRC)) {
    const el = new Audio(src);
    el.loop = true;
    el.preload = 'none';
    tracks[name] = { el, gain: null };
  }

  let wanted = true;
  try { wanted = localStorage.getItem(KEY) !== '1'; } catch (e) { /* storage blocked */ }
  let started = false;
  let scene = 'song';
  let ctx = null;

  const show = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Mute music' : 'Play music');
  };

  // Web Audio gives smooth crossfades everywhere (iOS ignores element volume)
  function setupAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      for (const t of Object.values(tracks)) {
        t.gain = ctx.createGain();
        t.gain.gain.value = 0;
        ctx.createMediaElementSource(t.el).connect(t.gain).connect(ctx.destination);
      }
    } catch (e) {
      ctx = null;
    }
  }

  function level(t, to, secs) {
    if (t.gain) {
      const g = t.gain.gain;
      const now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(to, now + secs);
    } else {
      t.el.volume = to; // no Web Audio: switch without a fade
    }
  }

  function playScene(name, secs = FADE) {
    for (const [n, t] of Object.entries(tracks)) {
      if (n === name) {
        if (n === 'melam' && t.el.paused) t.el.currentTime = 0; // the melam starts from its opening roll
        t.el.play().catch(() => {});
        level(t, n === 'melam' ? 0.75 : 0.6, secs);
      } else if (!t.el.paused) {
        level(t, 0, secs);
        setTimeout(() => { if (n !== scene || !wanted) t.el.pause(); }, secs * 1000 + 100);
      }
    }
  }

  function start() {
    if (!ctx) setupAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    // Unlock every track inside this gesture so later crossfades can start them
    for (const [n, t] of Object.entries(tracks)) {
      if (n !== scene) t.el.play().then(() => { if (n !== scene) t.el.pause(); }).catch(() => {});
    }
    const t = tracks[scene];
    return t.el.play().then(() => {
      started = true;
      show(true);
      level(t, 0, 0);
      playScene(scene);
    }).catch(() => show(false));
  }

  function stopAll() {
    for (const t of Object.values(tracks)) {
      level(t, 0, 0.3);
      setTimeout(() => t.el.pause(), 350);
    }
    show(false);
  }

  btn.addEventListener('click', () => {
    wanted = !(started && !tracks[scene].el.paused);
    try { localStorage.setItem(KEY, wanted ? '0' : '1'); } catch (e) { /* storage blocked */ }
    if (wanted) start(); else stopAll();
  });

  // Start on the first interaction anywhere else on the page
  const events = ['pointerdown', 'touchend', 'keydown'];
  const off = () => events.forEach((t) => window.removeEventListener(t, first, true));
  function first(e) {
    if (btn.contains(e.target) || !wanted || started) return;
    start().then(() => { if (started) off(); });
  }
  events.forEach((t) => window.addEventListener(t, first, { capture: true, passive: true }));

  function changeScene(name) {
    if (!SRC[name] || name === scene) return;
    scene = name;
    if (started && wanted) playScene(name);
  }

  // With motion, the story timeline announces the scene (main.js)
  document.addEventListener('invite:scene', (e) => changeScene(e.detail));

  // Without motion, the scenes are ordinary sections: use whichever fills the screen
  if ('IntersectionObserver' in window) {
    const themeOf = (el) =>
      el.matches('.scene--4') ? 'melam' : 'song';
    const io = new IntersectionObserver((entries) => {
      if (root.classList.contains('motion')) return;
      const best = entries.filter((x) => x.isIntersecting && x.intersectionRatio >= 0.5)[0];
      if (best) changeScene(themeOf(best.target));
    }, { threshold: [0.5] });
    document.querySelectorAll('.scene, .info .block').forEach((el) => io.observe(el));
  }

  // Pause while the tab is hidden; resume if the music was playing
  document.addEventListener('visibilitychange', () => {
    if (!started || !wanted) return;
    if (document.hidden) Object.values(tracks).forEach((t) => t.el.pause());
    else playScene(scene, 0.4);
  });
})();
