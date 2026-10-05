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
  // Distance from the stage top, ignoring transforms.
  const offsetIn = (el, stage) => {
    let y = 0;
    for (let n = el; n && n !== stage; n = n.offsetParent) y += n.offsetTop;
    return y;
  };

  /* Doors → 1 → 2: royal doors open onto the invocation, then an arch
     opens from the gopuram doorway */
  function chapterA() {
    const ch = $('.chapter--a');
    const portal = $('.portal', ch);
    const inner = $('.portal__inner', ch);
    const arch = $('.portal__arch', ch);
    const S0 = 0.03;
    const state = { p: 0 };

    // The window grows exponentially (a steady approach); the scene beyond it
    // grows only slightly, so the arch feels nearer than the terrace.
    const drawPortal = () => {
      const p = state.p;
      const s = S0 * Math.pow(1 / S0, p);
      const scene = Math.min(1, 0.88 + 0.15 * p);
      portal.style.transform = `scale(${s})`;
      inner.style.transform = `scale(${scene / s})`;
      portal.style.opacity = Math.min(1, p * 8);
      arch.style.opacity = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
    };

    const gate = $('.gate', ch);
    const plate1 = $('.scene--1 .plate', ch);
    const doorsEnd = 160; // the gate sequence uses the first 160 units of the track

    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: ch, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
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
      .fromTo($$('.s1-copy > *', ch), { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 22, stagger: 6, ease: 'power1.out' }, 105)
      // Through the gopuram doorway to the save-the-date terrace
      .to($$('.s1-copy, .scroll-cue', ch), { opacity: 0, y: -28, duration: 30 }, doorsEnd + 8)
      .to(plate1, { scale: 1.12, duration: 120 }, doorsEnd + 20)
      .to(state, { p: 1, duration: 120, onUpdate: drawPortal }, doorsEnd + 20)
      .fromTo($$('.s2-copy > *', ch), { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 24, stagger: 6, ease: 'power1.out' }, doorsEnd + 138)
      .set({}, {}, trackLength(ch));

    drawPortal();
    return () => {
      portal.style.cssText = '';
      inner.style.cssText = '';
      arch.style.cssText = '';
    };
  }

  /* 2 → 3: petals fall and the camera tilts down to the floor; the
     "for the wedding celebrations of" line stays put and meets the names */
  function bridge() {
    const chA = $('.chapter--a');
    const chC = $('.chapter--c');
    const stageA = $('.stage', chA);
    const stageC = $('.stage', chC);
    const overlay = $('.overlay');
    const petals = $$('.petals svg');
    const rand = (i, n) => {
      const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: chC,
        start: 'top bottom',
        end: 'top top',
        scrub: 0.5,
        invalidateOnRefresh: true,
        onToggle: (self) => root.classList.toggle('carrying', self.isActive),
      },
    })
      .to($('.scene--2 .plate', chA), { yPercent: 30, duration: 1 }, 0)
      .to($('.s2-copy', chA), { opacity: 0, y: -30, duration: 0.35 }, 0)
      .fromTo($('.carry'),
        { y: () => offsetIn($('.s2-line'), stageA) },
        { y: () => offsetIn($('.s3-lead'), stageC), duration: 1 }, 0);

    petals.forEach((el, i) => {
      const w = () => overlay.clientWidth;
      const h = () => overlay.clientHeight;
      tl.fromTo(el,
        { x: () => w() * (0.42 + rand(i, 1) * 0.26), y: () => h() * (0.16 + rand(i, 2) * 0.24), rotation: rand(i, 5) * 120 },
        { x: () => w() * (0.1 + rand(i, 3) * 0.8), y: () => h() * (0.64 + rand(i, 4) * 0.3), rotation: 160 + rand(i, 6) * 240, duration: 1 },
        0)
        .fromTo(el, { opacity: 0 }, { opacity: 0.9, duration: 0.12 }, 0.02 + rand(i, 7) * 0.1)
        .to(el, { opacity: 0, duration: 0.18 }, 0.8);
    });
  }

  /* 3 → 4 → 5 on one stage, then the frame opens onto the courtyard */
  function chapterC() {
    const ch = $('.chapter--c');
    const s3 = $('.scene--3', ch);
    const s4 = $('.scene--4', ch);
    const s5 = $('.scene--5', ch);
    const s4plate = $('.plate', s4);
    const panel = $('.panel', s4);

    // Names arrive once as the scene rises into view.
    gsap.timeline({ scrollTrigger: { trigger: ch, start: 'top 45%', toggleActions: 'play none none reverse' } })
      .fromTo('.names__one', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 1.1, ease: 'power2.out' })
      .fromTo('.names__two', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 1.1, ease: 'power2.out' }, 0.2)
      .fromTo('.names__and', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, 0.35);

    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: ch, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
    })
      // Tilt up from the feet to the couple
      .to($('.s3-copy', ch), { opacity: 0, y: 24, duration: 25 }, 60)
      .to($('.plate', s3), { yPercent: 10, duration: 100 }, 60)
      .fromTo(s4plate, { yPercent: -8 }, { yPercent: 0, duration: 100 }, 60)
      .fromTo(s4, { opacity: 0 }, { opacity: 1, duration: 80 }, 70)
      // The invitation rises over the floor; the picture lifts to keep faces clear
      .fromTo(panel, { y: 0, yPercent: 100 }, { yPercent: 0, duration: 100 }, 160)
      .to(s4plate, { yPercent: -14, duration: 100 }, 160)
      .fromTo($$('.panel > *', s4), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 30, stagger: 12 }, 190)
      // Same hall, next moment
      .to(panel, { opacity: 0, duration: 25 }, 300)
      .to(s4plate, { yPercent: 0, duration: 80 }, 300)
      .fromTo($$('.door .plate', s5), { yPercent: -14 }, { yPercent: 0, duration: 80 }, 300)
      .fromTo(s5, { opacity: 0 }, { opacity: 1, duration: 60 }, 310)
      .fromTo($$('.s5-copy > *', s5), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 8 }, 375)
      // The frame parts like doors onto the courtyard
      .set([s3, s4], { opacity: 0 }, 470)
      .to($('.s5-copy', s5), { opacity: 0, y: -20, duration: 20 }, 470)
      .to($('.door--l', s5), { xPercent: -51, duration: 90 }, 480)
      .to($('.door--r', s5), { xPercent: 51, duration: 90 }, 480)
      .set({}, {}, trackLength(ch));
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
    const undoA = chapterA();
    bridge();
    chapterC();
    reveals();
    return () => {
      undoA();
      root.classList.remove('motion', 'carrying');
    };
  });
  gsap.matchMedia().add('(prefers-reduced-motion: reduce)', () => root.classList.remove('motion'));

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
