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

    const D = 160; // the royal doors use the first 160 units
    const T2 = 370; // save the date has been read
    const TH = 612; // the Haldi has been read (its text settles at 525; hold ~0.9 screen)
    const TS = 870; // the Sangeet has been read (its text settles at TH + 170; hold ~0.9 screen)
    const T4 = 1060; // the invitation has been read (couple arrives at TS + 100; hold ~0.9 screen)
    const T5 = 1270; // muhurtham has been read
    const TV = 1510; // the venue has been read (its text settles at T5 + 150; hold ~0.9 screen)
    // The best wishes settle at TV + 125 and hold ~0.9 screen; the track ends
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
      .fromTo($('.hd-top', hd), { opacity: 0 }, { opacity: 1, duration: 30 }, T2 + 105)
      .fromTo($$('.hd-top > *', hd), { y: 14 }, { y: 0, duration: 30, stagger: 8, ease: 'power1.out' }, T2 + 105)
      .fromTo($('.hd-bottom', hd), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 30, ease: 'power1.out' }, T2 + 125)

      // A marigold-shaped window with a saffron rim blooms from the bowl of
      // marigolds and opens onto the Sangeet at night; its lights come up.
      .to($$('.hd-top, .hd-bottom', hd), { opacity: 0, duration: 20 }, TH)
      .set(sg, { visibility: 'visible' }, TH + 9)
      .to($('.plate', hd), { scale: 1.08, duration: 110 }, TH + 10)
      .to(mwin.state, { p: 1, duration: 110, onUpdate: mwin.draw }, TH + 10)
      .set(hd, { visibility: 'hidden' }, TH + 121)
      .fromTo($('.sg-dusk', sg), { opacity: 0.55 }, { opacity: 0, duration: 90, ease: 'sine.inOut' }, TH + 50)
      .fromTo($('.sg-top', sg), { opacity: 0 }, { opacity: 1, duration: 30 }, TH + 125)
      .fromTo($$('.sg-top > *', sg), { y: 14 }, { y: 0, duration: 30, stagger: 8, ease: 'power1.out' }, TH + 125)
      .fromTo($('.sg-bottom', sg), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 30, ease: 'power1.out' }, TH + 140)

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
      .fromTo($$('.s4-copy > *', s4), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 8 }, T4 + 100)

      // A gold ring opens from where the couple's hands meet and grows into
      // a window onto the toe-ring ceremony and the venue.
      .to($('.s4-copy', s4), { opacity: 0, y: -20, duration: 20 }, T5)
      .set(vn, { visibility: 'visible' }, T5 + 9)
      .to(seated, { scale: 1.1, duration: 110 }, T5 + 10)
      .to(ring.state, { p: 1, duration: 110, onUpdate: ring.draw }, T5 + 10)
      .set([s3, s4], { visibility: 'hidden' }, T5 + 121)
      .fromTo($$('.vn-copy > *', vn), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 7, ease: 'power1.out' }, T5 + 105)

      // The venue painting dissolves into the courtyard with their joined
      // hands, and the text changes with it.
      .to($('.vn-copy', vn), { opacity: 0, y: -20, duration: 20 }, TV)
      .set(bw, { visibility: 'visible' }, TV + 29)
      .fromTo(bw, { opacity: 0 }, { opacity: 1, duration: 45 }, TV + 30)
      .fromTo($('.hands', bw), { yPercent: -4 }, { yPercent: 0, duration: 60, ease: 'sine.out' }, TV + 30)
      .set(vn, { visibility: 'hidden' }, TV + 76)
      .fromTo($$('.bw-copy > *', bw), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 7, ease: 'power1.out' }, TV + 75)
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
      const lines = kind === 'draw' ? drawn.draw : el.classList.contains('arch-card') ? drawn.venue : null;
      if (lines) tl.fromTo(lines, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: 'power1.inOut' }, 0.2);
    });
  }

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    root.classList.add('motion');
    const undo = story();
    reveals();
    return () => {
      undo();
      root.classList.remove('motion');
    };
  });
  gsap.matchMedia().add('(prefers-reduced-motion: reduce)', () => root.classList.remove('motion'));

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
