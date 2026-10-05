# Wedding invitation: background preview

A static, dependency-free preview of three background directions for a
mobile-first wedding invitation.

Open `index.html` in a browser (or run `npx serve .`) and use the pill at the
bottom to switch directions. The choice is kept in the URL hash
(`#ivory`, `#marigold`, `#jaali`), so you can share a link straight to one option.

## Structure

- `index.html`: markup plus one inline SVG sprite holding every motif
  (arch flowers, marigolds, leaves, jaali corners).
- `styles.css`: each direction is a block of colour tokens on
  `body[data-bg="…"]`. Its decorations are `.deco--<name>` elements that render
  only while that direction is active.
- `preview.js`: the direction switcher, plus an `IntersectionObserver` that
  adds `.is-inview` to each `.screen` section.

Layers:

1. `.backdrop` is fixed. It holds the base colour, a faint tiled pattern
   (a data-URI SVG) and, for jaali, the viewport frame. It stays behind every
   section while you scroll.
2. `.screen__deco` belongs to each section and scrolls with it. It holds the
   ivory arch and arcade and the marigold garlands and toran.

## Adding motion later

Decorations carry `data-anim="draw | sway | fade"` hints, and sections
receive `.is-inview` as they enter the viewport. Put entrance effects inside
`@media (prefers-reduced-motion: no-preference)`. A reduced-motion guard at
the end of `styles.css` already switches off any animation or transition
for people who opt out.
