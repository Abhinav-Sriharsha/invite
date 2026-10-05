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
    const [s1, s2, s3, s4, s5] = [1, 2, 3, 4, 5].map((n) => $(`.scene--${n}`, ch));
    const plate1 = $('.plate', s1);
    const plate3 = $('.plate', s3);
    const plate4 = $('.plate', s4);
    const plate5 = $('.plate', s5);
    const panel = $('.panel', s4);
    const carry = $('.carry', stage);
    const fringe = $('.fringe', stage);
    const tera = $('.tera', stage);
    const paper = $('.paper', stage);

    // Arch window from the gopuram doorway (scene 1 → 2)
    const arch = $('.portal__arch', s2);
    const portal = windowDrawer($('.portal', s2), $('.portal__inner', s2), 0.03, 0.88, (p) => {
      arch.style.opacity = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
    });

    // Lotus window from where the offered lotuses meet (scene 2 → 3)
    const iris = windowDrawer($('.iris', s3), $('.iris__inner', s3), 0.034, 0.9);
    const shapeIris = () => {
      const clip = lotusClip(58, 30, stage.clientHeight / stage.clientWidth);
      $('.iris__clip', s3).style.clipPath = clip;
      $('.iris__rim', s3).style.clipPath = clip;
    };
    shapeIris();
    ScrollTrigger.addEventListener('refreshInit', shapeIris);

    const D = 160; // the royal doors use the first 160 units
    const T2 = 370; // save the date has been read
    const T3 = 570; // names have been read
    const T4 = 830; // invitation has been read
    const T5 = 1060; // muhurtham has been read

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

      // A lotus window blooms from where the offered lotuses meet; petals fall
      // and "for the wedding celebrations of" stays put to meet the names
      .to($$('.save, .s2-copy .rule', s2), { opacity: 0, y: -24, duration: 25 }, T2)
      .set($('.s2-line', s2), { visibility: 'hidden' }, T2 + 5)
      .set(carry, { visibility: 'visible' }, T2 + 5)
      .set(s3, { visibility: 'visible' }, T2 + 9)
      .to($('.plate', s2), { scale: 1.08, duration: 110 }, T2 + 10)
      .to(iris.state, { p: 1, duration: 100, onUpdate: iris.draw }, T2 + 10)
      .fromTo(carry, { y: () => offsetIn($('.s2-line', s2), stage) },
        { y: () => offsetIn($('.s3-lead', s3), stage), duration: 80, ease: 'sine.inOut' }, T2 + 30)
      .set(carry, { visibility: 'hidden' }, T2 + 111)
      .set($('.s3-lead', s3), { visibility: 'visible' }, T2 + 111)
      .fromTo($('.names__one', s3), { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 30, ease: 'power2.out' }, T2 + 100)
      .fromTo($('.names__two', s3), { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 30, ease: 'power2.out' }, T2 + 108)
      .fromTo($('.names__and', s3), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 24, ease: 'power2.out' }, T2 + 116)

      // A curtain of jasmine descends, drawing the garland exchange down over the scene
      .to($('.s3-copy', s3), { opacity: 0, y: 24, duration: 30 }, T3)
      .set([s4, fringe], { visibility: 'visible' }, T3 + 4)
      .fromTo(s4, { y: 0, yPercent: -100 }, { yPercent: 0, duration: 100, ease: 'power1.inOut' }, T3 + 5)
      .fromTo(plate4, { y: 0, yPercent: 100 }, { yPercent: 0, duration: 100, ease: 'power1.inOut' }, T3 + 5)
      .fromTo(fringe, { y: () => -fringe.getBoundingClientRect().height * 0.04 },
        { y: () => stage.clientHeight - fringe.getBoundingClientRect().height * 0.04, duration: 100, ease: 'power1.inOut' }, T3 + 5)
      .to(plate3, { yPercent: 8, duration: 100 }, T3 + 5)
      .set([s3, fringe], { visibility: 'hidden' }, T3 + 106)

      // The invitation rises over the floor; the picture lifts to keep faces clear
      .fromTo(panel, { y: 0, yPercent: 100 }, { yPercent: 0, duration: 100 }, T3 + 115)
      .to(plate4, { yPercent: -14, duration: 100 }, T3 + 115)
      .fromTo($$('.panel > *', s4), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 30, stagger: 12 }, T3 + 135)

      // The silk cloth rises between us and is lowered at the muhurtham
      .to(panel, { opacity: 0, duration: 20 }, T4)
      .set(tera, { visibility: 'visible' }, T4 + 4)
      .fromTo(tera, { y: 0, yPercent: 102 }, { yPercent: 0, duration: 60, ease: 'power2.inOut' }, T4 + 5)
      .set(s4, { visibility: 'hidden' }, T4 + 66)
      .set(s5, { visibility: 'visible' }, T4 + 66)
      .to(tera, { yPercent: 102, duration: 60, ease: 'power2.inOut' }, T4 + 75)
      .fromTo(plate5, { scale: 1.06 }, { scale: 1, duration: 70 }, T4 + 75)
      .set(tera, { visibility: 'hidden' }, T4 + 136)
      .fromTo($$('.s5-copy > *', s5), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 24, stagger: 8 }, T4 + 130)

      // The painting fades into the courtyard's ivory paper
      .to($('.s5-copy', s5), { opacity: 0, y: -20, duration: 20 }, T5)
      .set(paper, { visibility: 'visible' }, T5 + 4)
      .fromTo(paper, { y: 0, yPercent: 67 }, { yPercent: -26, duration: 70 }, T5 + 5)
      .to(plate5, { scale: 1.06, duration: 80 }, T5)
      .to(stage, { autoAlpha: 0, duration: 30 }, T5 + 70)
      .set({}, {}, trackLength(ch));

    // Petals drift down from the lotuses onto the kolam floor
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
