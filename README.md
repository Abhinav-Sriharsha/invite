# Abhiram & Trilokya: wedding invitation

A mobile-first, scroll-driven wedding invitation. It's a static site with no
build step: open `index.html` through any static server (for example
`npx serve .`).

## Scroll journey

| # | Scene | Art | Transition out |
|---|-------|-----|----------------|
| 0 | Royal doors: teak leaves with brass rosettes and studs, set in a sandstone doorway hung with jasmine | CSS/SVG | The doors swing inward in 3D, light floods in, and you step through the doorway (scrubbed, about 1.6 screens). In static mode the doors are skipped. |
| 1 | Invocation: Ganesha mark, "Anumanchi's Wedding Invitation" | `r1` temple | An arch window opens from the gopuram doorway and grows until you pass through it (scrubbed, about 1.2 screens) |
| 2 | Save the date | `r2` lotus offering | A lotus-shaped window with a gold rim blooms from where the two offered lotuses meet. Petals fall onto the kolam floor, and "For the wedding celebrations of" stays in place and lands above the names (scrubbed, about 1.1 screens) |
| 3 | The couple: "Abhiram *and* Trilokya" becomes the full names, the invitation line and the parents | `couple` cutout in front of `couple-bg`, one fixed background for the whole screen | The two halves move separately. The top pans up the couple from their feet to waist-to-nose, while below, each first name slides aside as the rest of the name appears (scrubbed, about 1.3 screens). Then the camera keeps tilting up: the couple drifts down and fades as the close-up comes down from above (about 1 screen) |
| 4 | Sumuhurtham, 22 Nov 2026, 8:48 p.m. | `closeup`: the jeelakarra-bellam close-up over the same `couple-bg` | The painting fades into ivory paper and the celebrations appear (scrubbed, 1 screen) |
| 6–8 | Celebrations, venue, RSVP | Ivory courtyard system (CSS/SVG) | One-time reveals as each block enters view |

## Structure

- `index.html`: all content, in reading order. Scenes are plain sections.
- `css/site.css`: static layout by default. `html.motion` turns the story into
  one tall scroll track with a fixed (`position: sticky`) stage, where all four
  scenes and the transition layers sit.
- `js/main.js`: GSAP and ScrollTrigger timelines. It only runs when the visitor
  allows motion. If GSAP fails to load, it removes `html.motion` and the page
  stays static.
- `vendor/`: GSAP 3.15 (`gsap.min.js`, `ScrollTrigger.min.js`), used under the
  GSAP Standard License. That's about 46 KB compressed.
- `assets/scenes/`: the reference paintings with their baked-in text removed,
  as AVIF and WebP at 640 and 941 px wide. `couple-*` is the transparent
  full-length cutout of the couple (AVIF with alpha, WebP fallback).
  `couple-bg-*` is its fixed background: the `r3` courtyard with the painted
  figures replaced by the terrace and trees from `r2`. The
  garland-exchange painting `r4` and the seated muhurtham painting `r5` are
  no longer used. `closeup-*` is the jeelakarra-bellam close-up, with its cut
  lower and side edges softened so it melts into the background.
- `assets/ganesha.svg`: the Ganesha mark and Telugu invocation, traced to vector.
- `assets/fonts/`: self-hosted Cormorant Garamond 500 and 600, plus Pinyon
  Script subset to "the" and "and".
- `references/`: the original reference images (`r1`–`r5`), with text.
- `explorations/background-preview/`: the earlier background study (Ivory
  courtyard and the Midnight jaali backup).

## Accessibility and motion

- **Reduced motion and no JavaScript:** without motion, the page is a simple
  stack of scenes and every word is visible. That covers
  `prefers-reduced-motion: reduce`, JavaScript turned off, and GSAP failing to
  load.
- **Readable text:** all wording is real text, not part of an image. Painted
  scenes have alt text, and decorative layers are `aria-hidden`.
- **Cheap animation:** only `transform` and `opacity` animate. Clip paths are
  static, and the arch window grows by scaling, not by redrawing its shape.

## Placeholders to replace

Everything marked `data-placeholder` in `index.html` shows a dotted underline
on the page:

- the parents' names (scene 3)
- the dates, times and places for the Pellikuthuru, Pellikoduku, Sangeet &
  Mehendi and Reception events, and the Sumuhurtham venue
- the venue name, address and arrival time, and the Maps link
- the RSVP-by date, WhatsApp number and phone number
- the venue in `assets/muhurtham.ics`

When the details are final, delete the `[data-placeholder]` rule in
`css/site.css`.

## Updating artwork

The scenes are 941 × 1672 px. Text is laid out with container units, so it
lines up with the quiet areas of each painting. Replacement art should keep
the same framing, or the `top` values in the `.sN-copy` rules need adjusting.
Encode the new art with
`ffmpeg -i in.png -vf "scale=941:-2:out_color_matrix=bt709:out_range=full,format=yuv420p" -c:v libaom-av1 -still-picture 1 -crf 33 -color_primaries bt709 -color_trc iec61966-2-1 -colorspace bt709 -color_range pc out.avif`.
Without the colour flags, the AVIF renders about 5% darker.
