/* Scroll choreography. Without GSAP or with reduced motion, the page stays a
   static stack of scenes (html.motion is removed and nothing below runs). */
(() => {
  const root = document.documentElement;
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) {
    root.classList.remove('motion');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  // Timeline units are 1/100 of the stage height, so durations read as scroll distance.
  const trackLength = (chapter) => parseFloat(getComputedStyle(chapter).getPropertyValue('--len')) - 100;
  const rand = (i, n) => {
    const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };

  // A shaped window that grows from a point: the outer element scales up
  // exponentially (a steady approach) while the picture inside is
  // counter-scaled, so only the window moves and the scene beyond barely does.
  function windowDrawer(win, inner, s0, sceneFrom, extra) {
    const state = { p: 0 };
    const draw = () => {
      const p = state.p;
      const s = s0 * Math.pow(1 / s0, p);
      const scene = Math.min(1, sceneFrom + (1 - sceneFrom) * 1.25 * p);
      win.style.transform = `scale(${s})`;
      inner.style.transform = `scale(${scene / s})`;
      win.style.opacity = Math.min(1, p * 8);
      if (extra) extra(p);
    };
    return { state, draw, reset: () => { win.style.cssText = ''; inner.style.cssText = ''; } };
  }

  // Eight broad lotus petals with pointed tips, as a clip path that stays round
  // on the actual stage shape. Radii are in % of stage width; the valleys still
  // cover the far corners at full size.
  function lotusClip(cx, cy, aspect) {
    const pts = [];
    const n = 8 * 28;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + Math.PI / 2;
      const u = ((i % 28) / 28) * 2 - 1; // -1..1 across one petal, 0 at its tip
      const r = 175 + 95 * Math.sqrt(1 - Math.abs(u));
      pts.push(`${(cx + r * Math.cos(t + Math.PI / 8)).toFixed(2)}% ${(cy - (r * Math.sin(t + Math.PI / 8)) / aspect).toFixed(2)}%`);
    }
    return `polygon(${pts.join(',')})`;
  }

  // Marigold outline: a ruffled circle of 22 rounded petal tips, round on the
  // actual stage shape. Its smallest radius still covers the far corners at
  // full size when it opens from low on the screen.
  function marigoldClip(cx, cy, aspect) {
    const pts = [];
    const n = 22 * 12;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const r = 215 + 26 * Math.sqrt(Math.abs(Math.cos(11 * t)));
      pts.push(`${(cx + r * Math.cos(t)).toFixed(2)}% ${(cy - (r * Math.sin(t)) / aspect).toFixed(2)}%`);
    }
    return `polygon(${pts.join(',')})`;
  }

  // Plain circle as a clip path (the ring window), round on the actual stage shape.
  function circleClip(cx, cy, aspect, r) {
    const pts = [];
    for (let i = 0; i < 120; i++) {
      const t = (i / 120) * Math.PI * 2;
      pts.push(`${(cx + r * Math.cos(t)).toFixed(2)}% ${(cy - (r * Math.sin(t)) / aspect).toFixed(2)}%`);
    }
    return `polygon(${pts.join(',')})`;
  }

  function story() {
    const ch = $('.chapter--story');
    const stage = $('.stage', ch);
    const gate = $('.gate', ch);
    const [s1, s2, s3, s4] = [1, 2, 3, 4].map((n) => $(`.scene--${n}`, ch));
    const plate1 = $('.plate', s1);
    const plate3 = $('.plate', s3);
    const pan = $('.pan', s3);
    const couple = $('.pan__couple', s3);
    const hd = $('.scene--haldi', ch);
    const sg = $('.scene--sangeet', ch);
    const seated = $('.seated', s4);
    const vn = $('.scene--venue', ch);
    const rc = $('.scene--reception', ch);
    const bw = $('.scene--wishes', ch);

    // Ring window from where the couple's hands meet over their heads (muhurtham → venue).
    // The meeting point is at (51%, 11.6%) of the seated cutout; measured from layout.
    const ring = windowDrawer($('.rwin', vn), $('.rwin__inner', vn), 0.03, 0.9);
    const shapeRing = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      const x = ((seated.offsetLeft + seated.offsetWidth * 0.51) / w) * 100;
      const y = ((seated.offsetTop + seated.offsetHeight * 0.116) / h) * 100;
      stage.style.setProperty('--ring-x', `${x.toFixed(2)}%`);
      stage.style.setProperty('--ring-y', `${y.toFixed(2)}%`);
      const clip = circleClip(x, y, h / w, 200);
      $('.rwin__clip', vn).style.clipPath = clip;
      $('.rwin__rim', vn).style.clipPath = clip;
    };
    shapeRing();
    ScrollTrigger.addEventListener('refreshInit', shapeRing);


    // Arch window from the gopuram doorway (scene 1 → 2)
    const arch = $('.portal__arch', s2);
    const portal = windowDrawer($('.portal', s2), $('.portal__inner', s2), 0.03, 0.88, (p) => {
      arch.style.opacity = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
    });

    // Lotus window from where the offered lotuses meet (save the date → Haldi)
    const iris = windowDrawer($('.iris', hd), $('.iris__inner', hd), 0.034, 0.92);
    const shapeIris = () => {
      const clip = lotusClip(58, 30, stage.clientHeight / stage.clientWidth);
      $('.iris__clip', hd).style.clipPath = clip;
      $('.iris__rim', hd).style.clipPath = clip;
    };
    shapeIris();
    ScrollTrigger.addEventListener('refreshInit', shapeIris);

    // Each scene holds still for a while after its text settles, so one swipe
    // doesn't skip it. Holds (in 1/100 screen): invocation 16, save the date 25,
    // Haldi 61, Sangeet 62, couple 63, muhurtham 43, venue 58, best wishes 75.
    const D = 153; // the royal doors use the first 153 units (invocation text settles at 145)
    const T2 = 352; // save the date has been read (its text settles at D + 174)
    const TH = 568; // the Haldi has been read (its text settles at T2 + 155)
    const TS = 800; // the Sangeet has been read (its text settles at TH + 170)
    const T4 = 963; // the invitation has been read (couple arrives at TS + 100)
    const T5 = 1154; // muhurtham has been read (its text settles at T4 + 148)
    const TV = 1369; // the venue has been read (its text settles at T5 + 157)
    const TR = 1529; // the reception has been read (its card settles at TV + 104)
    // The best wishes settle at TR + 113 and hold 0.75 screen; the track ends
    // there, so the stage then scrolls away like a page onto the celebrations.

    // Marigold window from the bowl of marigolds in the Haldi (Haldi → Sangeet)
    const mwin = windowDrawer($('.mwin', sg), $('.mwin__inner', sg), 0.03, 0.92);
    // The bowl sits at (48.9%, 76.9%) of the painting, which is fitted to the
    // stage width and centred vertically, so its screen position depends on the stage shape.
    const shapeMwin = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      const artH = w * 1672 / 941;
      const bx = 48.9, by = 50 + (76.9 - 50) * artH / h;
      stage.style.setProperty('--bowl-x', `${bx}%`);
      stage.style.setProperty('--bowl-y', `${by.toFixed(2)}%`);
      const clip = marigoldClip(bx, by, h / w);
      $('.mwin__clip', sg).style.clipPath = clip;
      $('.mwin__rim', sg).style.clipPath = clip;
    };
    shapeMwin();
    ScrollTrigger.addEventListener('refreshInit', shapeMwin);

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: ch, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true },
    })
      // Royal doors swing open, light floods in, and we step through the doorway
      .to($('.gate__cue', gate), { opacity: 0, y: 12, duration: 10 }, 0)
      .to($('.gate__leaf--l', gate), { rotationY: 104, duration: 90, ease: 'sine.inOut' }, 10)
      .to($('.gate__leaf--r', gate), { rotationY: -104, duration: 90, ease: 'sine.inOut' }, 10)
      .to($$('.gate__shade', gate), { opacity: 0.55, duration: 90 }, 10)
      .to($('.gate__seam', gate), { opacity: 0, duration: 20 }, 10)
      .fromTo($('.gate__glow', gate), { opacity: 0 }, { opacity: 1, duration: 30 }, 10)
      .to($('.gate__glow', gate), { opacity: 0, duration: 45 }, 60)
      .fromTo(plate1, { scale: 1.12 }, { scale: 1, duration: 120 }, 10)
      .to($('.gate__doors', gate), { scale: 1.7, duration: 45, ease: 'power1.in' }, 80)
      .to(gate, { autoAlpha: 0, duration: 35 }, 90)
      .fromTo($$('.s1-copy > *', s1), { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 22, stagger: 6, ease: 'power1.out' }, 105)

      // Through the gopuram doorway to the save-the-date terrace
      .to($$('.s1-copy, .scroll-cue', s1), { opacity: 0, y: -28, duration: 30 }, D + 8)
      .to(plate1, { scale: 1.12, duration: 120 }, D + 20)
      .to(portal.state, { p: 1, duration: 120, onUpdate: portal.draw }, D + 20)
      .fromTo($$('.s2-copy > *', s2), { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 24, stagger: 6, ease: 'power1.out' }, D + 138)

      // A lotus window blooms from where the offered lotuses meet and opens
      // onto the Haldi, while petals fall.
      .to($('.s2-copy', s2), { opacity: 0, y: -24, duration: 25 }, T2)
      .set(hd, { visibility: 'visible' }, T2 + 9)
      .to($('.plate', s2), { scale: 1.08, duration: 110 }, T2 + 10)
      .to(iris.state, { p: 1, duration: 100, onUpdate: iris.draw }, T2 + 10)
      .fromTo($('.hd-copy', hd), { opacity: 0 }, { opacity: 1, duration: 30 }, T2 + 100)
      .fromTo($$('.hd-copy > *', hd), { y: 14 }, { y: 0, duration: 30, stagger: 5, ease: 'power1.out' }, T2 + 100)

      // A marigold-shaped window with a saffron rim blooms from the bowl of
      // marigolds and opens onto the Sangeet at night; its lights come up.
      .to($('.hd-copy', hd), { opacity: 0, duration: 20 }, TH)
      .set(sg, { visibility: 'visible' }, TH + 9)
      .to($('.plate', hd), { scale: 1.08, duration: 110 }, TH + 10)
      .to(mwin.state, { p: 1, duration: 110, onUpdate: mwin.draw }, TH + 10)
      .set(hd, { visibility: 'hidden' }, TH + 121)
      .fromTo($('.sg-dusk', sg), { opacity: 0.55 }, { opacity: 0, duration: 90, ease: 'sine.inOut' }, TH + 50)
      .fromTo($('.sg-copy', sg), { opacity: 0 }, { opacity: 1, duration: 30 }, TH + 120)
      .fromTo($$('.sg-copy > *', sg), { y: 14 }, { y: 0, duration: 30, stagger: 5, ease: 'power1.out' }, TH + 120)

      // The Sangeet and the couple scene are stitched like two sections of an
      // ordinary page: after the hold, the Sangeet scrolls up and the couple
      // scene follows directly beneath it, already complete. Linear, one
      // screen of scroll per screen of movement, so it feels like normal scrolling.
      .set(s3, { visibility: 'visible' }, TS - 1)
      .fromTo(sg, { yPercent: 0 }, { yPercent: -100, duration: 100 }, TS)
      .fromTo(s3, { yPercent: 100 }, { yPercent: 0, duration: 100 }, TS)
      .set(sg, { visibility: 'hidden' }, TS + 101)

      // Same courtyard, next moment: the standing couple fades as the couple,
      // now seated for the jeelakarra-bellam, settles onto the floor.
      // The background stays put; only the foreground changes.
      .to($('.s3-copy', s3), { opacity: 0, y: 24, duration: 25 }, T4)
      .set(s4, { visibility: 'visible' }, T4 + 4)
      .to(couple, { scale: 1.1, duration: 90, ease: 'sine.in' }, T4 + 5)
      .to(couple, { opacity: 0, duration: 50 }, T4 + 40)
      .fromTo(seated, { opacity: 0, yPercent: -6, scale: 1.04 },
        { opacity: 1, yPercent: 0, scale: 1, duration: 80, ease: 'sine.out' }, T4 + 35)
      .fromTo($$('.s4-copy > *', s4), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 6 }, T4 + 100)

      // A gold ring opens from where the couple's hands meet and grows into
      // a window onto the toe-ring ceremony and the venue.
      .to($('.s4-copy', s4), { opacity: 0, y: -20, duration: 20 }, T5)
      .set(vn, { visibility: 'visible' }, T5 + 9)
      .to(seated, { scale: 1.1, duration: 110 }, T5 + 10)
      .to(ring.state, { p: 1, duration: 110, onUpdate: ring.draw }, T5 + 10)
      .set([s3, s4], { visibility: 'hidden' }, T5 + 121)
      .fromTo($$('.vn-copy > *', vn), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 7, ease: 'power1.out' }, T5 + 105)

      // The venue dissolves into the reception hall, and its card appears
      .to($('.vn-copy', vn), { opacity: 0, y: -20, duration: 20 }, TV)
      .set(rc, { visibility: 'visible' }, TV + 19)
      .fromTo(rc, { opacity: 0 }, { opacity: 1, duration: 50 }, TV + 20)
      .fromTo($('.plate', rc), { scale: 1.06 }, { scale: 1, duration: 80, ease: 'sine.out' }, TV + 20)
      .set(vn, { visibility: 'hidden' }, TV + 71)
      .fromTo($('.rc-copy', rc), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 30, ease: 'power1.out' }, TV + 74)

      // The reception hall dissolves into the courtyard with their joined
      // hands, and the families' best wishes.
      .to($('.rc-copy', rc), { opacity: 0, y: -20, duration: 20 }, TR)
      .set(bw, { visibility: 'visible' }, TR + 29)
      .fromTo(bw, { opacity: 0 }, { opacity: 1, duration: 45 }, TR + 30)
      .fromTo($('.hands', bw), { yPercent: -4 }, { yPercent: 0, duration: 60, ease: 'sine.out' }, TR + 30)
      .set(rc, { visibility: 'hidden' }, TR + 76)
      .fromTo($$('.bw-copy > *', bw), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 7, ease: 'power1.out' }, TR + 75)
      .set({}, {}, trackLength(ch));

    // Petals drift down from the lotuses into the Haldi
    const w = () => stage.clientWidth;
    const h = () => stage.clientHeight;
    $$('.petals svg', stage).forEach((el, i) => {
      tl.fromTo(el,
        { x: () => w() * (0.44 + rand(i, 1) * 0.24), y: () => h() * (0.16 + rand(i, 2) * 0.22), rotation: rand(i, 5) * 120 },
        { x: () => w() * (0.08 + rand(i, 3) * 0.84), y: () => h() * (0.62 + rand(i, 4) * 0.32), rotation: 160 + rand(i, 6) * 240, duration: 95 },
        T2 + 8)
        .fromTo(el, { opacity: 0 }, { opacity: 0.95, duration: 10 }, T2 + 8 + rand(i, 7) * 12)
        .to(el, { opacity: 0, duration: 18 }, T2 + 88);
    });

    portal.draw();
    ring.draw();
    iris.draw();
    mwin.draw();
    return () => {
      portal.reset();
      arch.style.cssText = '';
      iris.reset();
      mwin.reset();
      ScrollTrigger.removeEventListener('refreshInit', shapeMwin);
      ring.reset();
      ScrollTrigger.removeEventListener('refreshInit', shapeRing);
      ScrollTrigger.removeEventListener('refreshInit', shapeIris);
    };
  }

  /* Information sections: one-time reveals */
  function reveals() {
    const drawn = { draw: '#kolam .kolam-line path', venue: '#gopuram path' };
    $$('.info [data-reveal]').forEach((el) => {
      const kind = el.dataset.reveal;
      const from = kind === 'drop' ? { y: -24 } : kind === 'rise' ? { y: 30 } : { y: 18 };
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 96%', once: true } })
        .fromTo(el, { opacity: 0, ...from }, { opacity: 1, y: 0, duration: kind === 'drop' ? 1.2 : 0.9, ease: 'power2.out' });
      const lines = kind === 'draw' ? drawn.draw : el.querySelector('use[href="#gopuram"]') ? drawn.venue : null;
      if (lines) tl.fromTo(lines, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: 'power1.inOut' }, 0.2);
    });
  }

  /* Auto-scroll: a tap on the opening screen plays the story, gliding to each
     scene and holding it long enough to read, then drifting through the
     information at reading pace (the same tap starts the music, js/music.js).
     It works on the animated story and on the static page alike (phones with
     reduced motion or battery saver get the static page). Scrolling by hand
     pauses it; the button resumes (or replays from the top). */
  function autoScroll(motion) {
    const ch = $('.chapter--story');
    const btn = $('.autoplay');
    if (!btn) return () => {};
    const PACE = 1; // overall speed of the glides and the reading scroll
    // [timeline unit where the scene has settled, seconds to hold it, speed of the glide into it]
    const STORY = [[150, 3], [330, 4], [520, 4.5], [745, 4.5], [905, 5.5, 1.2], [1110, 5], [1310, 5], [1475, 4.5], [1655, 6.5]];
    const GLIDE = 1.37 / PACE; // seconds per screen between scenes
    const READING = 76 * PACE; // px per second through the information
    const WISHES_OUT = 1.15; // speed from the best wishes until the celebrations fill the screen
    const STATIC_HOLD = 4.5; // seconds on each scene of the static page
    const info = $('.info');
    const pageY = (el) => el.getBoundingClientRect().top + scrollY;
    const yOf = (u) => ch.offsetTop + (u * (ch.offsetHeight - innerHeight)) / trackLength(ch);
    const end = () => root.scrollHeight - innerHeight;
    const stops = () => (motion
      ? STORY.map(([u, hold, speed = 1]) => ({ y: yOf(u), hold, speed }))
      : $$('.scene', ch).map((el) => ({ y: Math.min(pageY(el), end()), hold: STATIC_HOLD, speed: 1 })));
    const atStart = () => scrollY < (motion ? yOf(10) : 40);

    let tween = null;
    let timer = 0;
    let playing = false;
    let lastSet = -1;
    const show = (on) => {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Pause auto-scroll' : 'Play auto-scroll');
    };

    function stop() {
      if (tween) tween.kill();
      clearTimeout(timer);
      tween = null;
      playing = false;
      lastSet = -1;
      show(false);
    }

    function glide(to, secs, ease, then) {
      const pos = { y: scrollY };
      lastSet = scrollY;
      tween = gsap.to(pos, {
        y: to,
        duration: secs,
        ease,
        onUpdate: () => {
          // dragged by hand (e.g. the scrollbar); small differences are rounding or toolbars
          if (Math.abs(scrollY - lastSet) > 40) return stop();
          scrollTo(0, pos.y);
          lastSet = pos.y;
        },
        onComplete: then,
      });
    }

    function step() {
      if (!playing) return;
      const next = stops().find((s) => s.y > scrollY + 2);
      const toInfo = Math.min(pageY(info), end());
      if (next) {
        const screens = (next.y - scrollY) / innerHeight;
        glide(next.y, Math.max(1.9 / PACE, screens * GLIDE) / next.speed, 'sine.inOut', () => { timer = setTimeout(step, next.hold * 1000); });
      } else if (scrollY < toInfo - 2) {
        glide(toInfo, (toInfo - scrollY) / (READING * WISHES_OUT), 'none', step);
      } else if (scrollY < end() - 2) {
        glide(end(), (end() - scrollY) / READING, 'none', stop);
      } else {
        stop();
      }
    }

    // Wait for any coasting from a flick to finish, so the glide doesn't fight it
    function whenStill(then, last = scrollY, tries = 0) {
      timer = setTimeout(() => {
        if (Math.abs(scrollY - last) < 1 || tries > 15) then();
        else whenStill(then, scrollY, tries + 1);
      }, 100);
    }

    function play() {
      stop();
      playing = true;
      show(true);
      if (scrollY >= end() - 2) {
        scrollTo(0, 0);
        timer = setTimeout(step, 600);
      } else {
        whenStill(step);
      }
    }

    btn.hidden = false;
    show(false);
    // The button answers the finger lifting as well as the click: a tap that
    // stops a page still coasting from a flick never becomes a click.
    let pressedAt = 0;
    const toggle = () => (playing ? stop() : play());
    const onBtnDown = () => { pressedAt = Date.now(); };
    const onBtnUp = (e) => {
      if (!pressedAt || Date.now() - pressedAt > 800 || !btn.contains(document.elementFromPoint(e.clientX, e.clientY))) return;
      pressedAt = -1; // handled; skip the click that may follow
      toggle();
    };
    const onButton = () => {
      if (pressedAt === -1) { pressedAt = 0; return; }
      pressedAt = 0;
      toggle();
    };
    btn.addEventListener('pointerdown', onBtnDown);
    btn.addEventListener('pointerup', onBtnUp);
    btn.addEventListener('click', onButton);

    // "Tap to start": a tap on the opening screen (the closed doors, or the
    // first scene of the static page). Pointer events work on every phone,
    // including iPhones, where plain clicks on a picture may never arrive.
    let down = null;
    let lastTap = 0;
    const isControl = (t) => t.closest && t.closest('a, button, input, select, textarea');
    const tap = (e) => {
      if (playing || isControl(e.target) || !atStart() || Date.now() - lastTap < 500) return;
      lastTap = Date.now();
      play();
    };
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: Date.now() }; };
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = Date.now() - down.t < 800;
      down = null;
      if (moved < 12 && quick) tap(e);
    };
    addEventListener('pointerdown', onDown, { passive: true });
    addEventListener('pointerup', onUp, { passive: true });
    addEventListener('click', tap); // older browsers without pointer events

    const cue = !motion && $('.scroll-cue span');
    const cueText = cue && cue.textContent;
    if (cue) cue.textContent = 'Tap to start';

    // Scrolling by hand pauses it: the wheel, a real drag (a tap that wobbles
    // a few pixels does not count) or the scrolling keys
    let touch = null;
    const onTouchStart = (e) => { touch = e.touches[0] && { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onTouchMove = (e) => {
      if (!playing || !touch || !e.touches[0]) return;
      if (Math.hypot(e.touches[0].clientX - touch.x, e.touches[0].clientY - touch.y) > 10) stop();
    };
    const onWheel = () => { if (playing) stop(); };
    const KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    const onKey = (e) => { if (playing && KEYS.includes(e.key) && !isControl(e.target)) stop(); };
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: true });
    addEventListener('wheel', onWheel, { passive: true });
    addEventListener('keydown', onKey);

    return () => {
      stop();
      btn.removeEventListener('pointerdown', onBtnDown);
      btn.removeEventListener('pointerup', onBtnUp);
      btn.removeEventListener('click', onButton);
      removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp);
      removeEventListener('click', tap);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('wheel', onWheel);
      removeEventListener('keydown', onKey);
      if (cue) cue.textContent = cueText;
      btn.hidden = true;
    };
  }

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    root.classList.add('motion');
    const undo = story();
    reveals();
    const undoAuto = autoScroll(true);
    return () => {
      undoAuto();
      undo();
      root.classList.remove('motion');
    };
  });
  gsap.matchMedia().add('(prefers-reduced-motion: reduce)', () => {
    root.classList.remove('motion');
    return autoScroll(false);
  });

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
