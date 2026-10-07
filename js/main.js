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

  function story() {
    const ch = $('.chapter--story');
    const stage = $('.stage', ch);
    const gate = $('.gate', ch);
    const [s1, s2, s3, s4] = [1, 2, 3, 4].map((n) => $(`.scene--${n}`, ch));
    const plate1 = $('.plate', s1);
    const plate3 = $('.plate', s3);
    const pan = $('.pan', s3);
    const couple = $('.pan__couple', s3);
    const [lineA, lineB] = $$('.cn', s3);
    const sg = $('.scene--sangeet', ch);
    const sgCouple = $('.sg-couple', sg);
    const sky = $('.sky', stage);
    const closeup = $('.closeup', s4);
    const paper = $('.paper', stage);

    // Arch window from the gopuram doorway (scene 1 → 2)
    const arch = $('.portal__arch', s2);
    const portal = windowDrawer($('.portal', s2), $('.portal__inner', s2), 0.03, 0.88, (p) => {
      arch.style.opacity = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
    });

    // Lotus window from where the offered lotuses meet (save the date → Sangeet)
    const iris = windowDrawer($('.iris', sg), $('.iris__inner', sg), 0.034, 0.92);
    const shapeIris = () => {
      const clip = lotusClip(58, 30, stage.clientHeight / stage.clientWidth);
      $('.iris__clip', sg).style.clipPath = clip;
      $('.iris__rim', sg).style.clipPath = clip;
    };
    shapeIris();
    ScrollTrigger.addEventListener('refreshInit', shapeIris);

    const D = 160; // the royal doors use the first 160 units
    const T2 = 370; // save the date has been read
    const TS = 610; // the Sangeet has been read
    const T4 = 940; // the invitation has been read
    const T5 = 1150; // muhurtham has been read

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
      .to($$('.gate__frame, .gate__doors', gate), { scale: 1.7, duration: 45, ease: 'power1.in' }, 80)
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
      // onto the Sangeet at night. Petals fall, the garden's lights come up
      // and the couple sinks into their dip.
      .to($('.s2-copy', s2), { opacity: 0, y: -24, duration: 25 }, T2)
      .set(sg, { visibility: 'visible' }, T2 + 9)
      .to($('.plate', s2), { scale: 1.08, duration: 110 }, T2 + 10)
      .to(iris.state, { p: 1, duration: 100, onUpdate: iris.draw }, T2 + 10)
      .fromTo($('.sg-dusk', sg), { opacity: 0.55 }, { opacity: 0, duration: 90, ease: 'sine.inOut' }, T2 + 25)
      .fromTo(sgCouple, { rotation: 9 }, { rotation: 0, duration: 100, ease: 'sine.inOut' }, T2 + 40)
      .fromTo($('.sg-top', sg), { opacity: 0 }, { opacity: 1, duration: 30 }, T2 + 105)
      .fromTo($$('.sg-top > *', sg), { y: 14 }, { y: 0, duration: 30, stagger: 8, ease: 'power1.out' }, T2 + 105)
      .fromTo($('.sg-bottom', sg), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 30, ease: 'power1.out' }, T2 + 125)

      // Overnight: the camera tilts up off the dance floor into the starry
      // sky, the night turns to morning, and the camera tilts back down into
      // the courtyard, where the couple waits with their full names.
      .to($$('.sg-top, .sg-bottom', sg), { opacity: 0, duration: 25 }, TS)
      .set(sky, { visibility: 'visible' }, TS + 4)
      .fromTo(sg, { yPercent: 0 }, { yPercent: 100, duration: 70, ease: 'sine.inOut' }, TS + 5)
      .fromTo(sky, { yPercent: -100 }, { yPercent: 0, duration: 70, ease: 'sine.inOut' }, TS + 5)
      .set(sg, { visibility: 'hidden' }, TS + 76)
      .fromTo($('.sky__dawn', sky), { opacity: 0 }, { opacity: 1, duration: 32, ease: 'sine.inOut' }, TS + 66)
      .fromTo($('.sky__sun', sky), { opacity: 0, yPercent: 35 }, { opacity: 1, yPercent: 0, duration: 50, ease: 'sine.out' }, TS + 72)
      .fromTo($('.sky__day', sky), { opacity: 0 }, { opacity: 1, duration: 34, ease: 'sine.inOut' }, TS + 92)
      .set(s3, { visibility: 'visible' }, TS + 124)
      .fromTo(s3, { yPercent: 100 }, { yPercent: 0, duration: 70, ease: 'sine.inOut' }, TS + 125)
      .to(sky, { yPercent: -100, duration: 70, ease: 'sine.inOut' }, TS + 125)
      .set(sky, { visibility: 'hidden' }, TS + 196)
      // the couple appears once the courtyard is in place, so the cutout's cropped top never shows against the sky
      .fromTo(couple, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 45, ease: 'sine.out' }, TS + 168)
      .fromTo($('.s3-copy', s3), { opacity: 0 }, { opacity: 1, duration: 30 }, TS + 180)
      .fromTo($('.s3-lede', s3), { opacity: 0 }, { opacity: 1, duration: 22 }, TS + 186)
      .fromTo(lineA, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 30, ease: 'power2.out' }, TS + 198)
      .fromTo($('.cn__and', s3), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 24, ease: 'power2.out' }, TS + 208)
      .fromTo(lineB, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 30, ease: 'power2.out' }, TS + 216)
      .fromTo($$('.couple-names .parents', s3), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 30, stagger: 10 }, TS + 230)

      // The camera moves in: the couple grows and fades while the
      // close-up of the jeelakarra-bellam moment comes down from above.
      // The background stays put; only the foreground changes.
      .to($('.s3-copy', s3), { opacity: 0, y: 24, duration: 25 }, T4)
      .set(s4, { visibility: 'visible' }, T4 + 4)
      .to(couple, { scale: 1.1, duration: 90, ease: 'sine.in' }, T4 + 5)
      .to(couple, { opacity: 0, duration: 50 }, T4 + 40)
      .fromTo(closeup, { opacity: 0, yPercent: -45, scale: 1.08 },
        { opacity: 1, yPercent: 0, scale: 1, duration: 90, ease: 'sine.out' }, T4 + 35)
      .fromTo($$('.s4-copy > *', s4), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 8 }, T4 + 100)

      // The painting fades into the courtyard's ivory paper
      .to($('.s4-copy', s4), { opacity: 0, y: -20, duration: 20 }, T5)
      .set(paper, { visibility: 'visible' }, T5 + 4)
      .fromTo(paper, { y: 0, yPercent: 67 }, { yPercent: -26, duration: 70 }, T5 + 5)
      .to(closeup, { scale: 1.06, duration: 80 }, T5)
      .to(stage, { autoAlpha: 0, duration: 30 }, T5 + 70)
      .set({}, {}, trackLength(ch));

    // Petals drift down from the lotuses into the garden
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
    iris.draw();
    return () => {
      portal.reset();
      arch.style.cssText = '';
      iris.reset();
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
