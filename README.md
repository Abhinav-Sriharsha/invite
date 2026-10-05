# Abhiram & Trilokya: wedding invitation

A mobile-first, scroll-driven wedding invitation. It's a static site with no
build step: open `index.html` through any static server (for example
`npx serve .`).

## Scroll journey

| # | Scene | Art | Transition out |
|---|-------|-----|----------------|
| 1 | Invocation: Ganesha mark, "Anumanchi's Wedding Invitation" | `r1` temple | An arch window opens from the gopuram doorway and grows until you pass through it (scrubbed, about 1.2 screens) |
| 2 | Save the date | `r2` lotus offering | Petals fall while the camera tilts down. "For the wedding celebrations of" stays in place and lands above the names (scrubbed, 1 screen) |
| 3 | Abhiram *and* Trilokya | `r3` kolam | Tilt up from the feet to the couple (scrubbed, 1 screen, fixed stage) |
| 4 | Invitation, full names, parents | `r4` garland exchange | The invitation panel rises over the floor, then dissolves to the next scene (scrubbed) |
| 5 | Sumuhurtham, 22 Nov 2026, 8:48 p.m. | `r5` jeelakarra-bellam | The picture parts like doors onto the courtyard (scrubbed, 1 screen) |
| 6–8 | Celebrations, venue, RSVP | Ivory courtyard system (CSS/SVG) | One-time reveals as each block enters view |

## Structure

- `index.html`: all content, in reading order. Scenes are plain sections.
- `css/site.css`: static layout by default. `html.motion` turns each chapter
  into a tall scroll track with a fixed (`position: sticky`) stage.
- `js/main.js`: GSAP and ScrollTrigger timelines. It only runs when the visitor
  allows motion. If GSAP fails to load, it removes `html.motion` and the page
  stays static.
- `vendor/`: GSAP 3.15 (`gsap.min.js`, `ScrollTrigger.min.js`), used under the
  GSAP Standard License. That's about 46 KB compressed.
- `assets/scenes/`: the reference paintings with their baked-in text removed,
  as AVIF and WebP at 640 and 941 px wide.
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

- the parents' names (scene 4)
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
