# Abhiram & Trilokya: wedding invitation

A mobile-first, scroll-driven wedding invitation. It's a static site with no
build step: open `index.html` through any static server (for example
`npx serve .`).

## Scroll journey

| # | Scene | Art | Transition out |
|---|-------|-----|----------------|
| 0 | Royal doors: teak leaves with brass rosettes and studs, set in a sandstone doorway hung with jasmine | CSS/SVG | The doors swing inward in 3D, light floods in, and you step through the doorway (scrubbed, about 1.6 screens). In static mode the doors are skipped. |
| 1 | Invocation: Ganesha mark, "Anumanchi's Wedding Invitation" | `r1` temple | An arch window opens from the gopuram doorway and grows until you pass through it (scrubbed, about 1.2 screens) |
| 2 | Save the date | `r2` lotus offering | A lotus-shaped window with a gold rim blooms from where the two offered lotuses meet and opens onto the Haldi, while petals fall (scrubbed, about 1.1 screens) |
| 2¼ | Haldi: "A morning of turmeric & blessings", date and venue | `haldi` painting | Holds for about 0.9 screens, then a marigold-shaped window with a saffron rim blooms from the bowl of marigolds on the low table and opens onto the Sangeet, like the lotus window before it (scrubbed, about 1.1 screens) |
| 2½ | Sangeet: "An evening of music & dance", date and venue | `sangeet-couple` cutout on `sangeet-bg`, placed exactly as in the composite | As the marigold window opens, the garden's lights come up from dusk and the couple sinks into their dip (rotating about the groom's planted foot). Then it holds for about 0.9 screens, so one swipe doesn't skip it, and scrolls up like a normal page with the couple scene stitched directly beneath it (1 screen) |
| 3 | The couple, waist up, with the invitation line, full names and parents | `couple` cutout in front of `couple-bg`, one fixed background for the whole screen | It arrives complete, with the couple and names already in place, and holds before moving on. The cutout's top stays pinned to the top of the screen, so its cropped edge never shows. Then the standing couple fades as the seated couple settles onto the floor (about 1 screen) |
| 4 | Sumuhurtham, 22 Nov 2026, 8:48 p.m. | `seated`: the couple seated for the jeelakarra-bellam, on the same `couple-bg` | The painting fades into ivory paper and the celebrations appear (scrubbed, 1 screen) |
| 6–8 | Celebrations, venue, RSVP | Ivory courtyard system (CSS/SVG) | One-time reveals as each block enters view |

## Structure

- `index.html`: all content, in reading order. Scenes are plain sections.
- `css/site.css`: static layout by default. `html.motion` turns the story into
  one tall scroll track with a fixed (`position: sticky`) stage, where all the
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
  no longer used. `seated-*` is the transparent cutout of the couple seated
  for the jeelakarra-bellam, cropped to the figures (941 × 775).
  `sangeet-bg-*` is the night garden and `sangeet-couple-*` the dancing couple,
  cropped to the figure (911 × 992) and drawn at 0.672 scale on the same
  941 × 1672 canvas, which is where the composite painting places them.
  `haldi-*` is the Haldi painting.
- `assets/ganesha.svg`: the Ganesha mark and Telugu invocation, traced to vector.
- `assets/fonts/`: self-hosted Cormorant Garamond 500 and 600, plus Pinyon
  Script subset to "the" and "and".
- `references/`: the original reference images (`r1`–`r5`, with text) and the
  source layers for the couple, the close-up and the Sangeet.
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
- the Haldi and Sangeet dates, times and venues
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
