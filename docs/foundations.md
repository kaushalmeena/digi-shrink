# Foundations

DigiShrink implements **Playful Geometric** — a style that treats the interface
as a sticker book rather than a dashboard.

## Philosophy

The core idea is **stable grid, wild decoration**. Content lives in calm,
readable blocks; the space _around_ it is alive with primitive shapes, dot grids
and hard offset shadows. It references the Memphis Group of the 1980s but drops
the chaos and keeps the energy.

The vibe is friendly, tactile and energetic. Things look like they want to be
clicked.

### Visual signatures

- **Hard shadows** — offset, zero blur, solid colour. Elements read as stickers
  or paper cut-outs, not as material floating under a light source.
- **Chunky borders** — 2px by default, always a deliberate outline.
- **Primitive shapes** — circles, rings, triangles, squares, squiggles and
  plus-signs scattered behind content.
- **Pattern fills** — dot grids, line grids and diagonal stripes.
- **Varied radii** — mixing fully-rounded and sharp corners to make speech
  bubbles, leaves and arches instead of plain rectangles.

## Tokens

All tokens live in `app/assets/css/main.css`. **No component hardcodes a hex
value** — that is exactly what lets a single `.dark` class re-skin the whole app.

### Colour — light

| Token                   | Value     | Role                                                       |
| ----------------------- | --------- | ---------------------------------------------------------- |
| `--color-canvas`        | `#fffdf5` | Page background. Warm cream, so the surface reads as paper |
| `--color-surface`       | `#ffffff` | Cards and panels                                           |
| `--color-surface-2`     | `#f5f4ee` | Recessed areas, tracks, table headers                      |
| `--color-ink`           | `#1e293b` | Body text. Slate 800 — softer and warmer than black        |
| `--color-ink-soft`      | `#5c6b83` | Secondary text                                             |
| `--color-line`          | `#e2e8f0` | Hairlines and soft borders                                 |
| `--color-outline`       | `#1e293b` | The chunky 2px sticker border                              |
| `--color-shade`         | `#1e293b` | The hard drop shadow                                       |
| `--color-shade-soft`    | `#dfe4ec` | Subtle shadow for large surfaces                           |
| `--color-accent`        | `#7c3aed` | Brand violet. Interactive, safe for white text             |
| `--color-accent-bright` | `#8b5cf6` | Decorative violet                                          |
| `--color-accent-wash`   | `#f1eaff` | Selected-state background                                  |
| `--color-on-accent`     | `#ffffff` | Text on accent fills                                       |
| `--color-berry`         | `#f472b6` | Decorative pink                                            |
| `--color-sun`           | `#fbbf24` | Decorative amber                                           |
| `--color-mint`          | `#34d399` | Decorative / success green                                 |
| `--color-berry-strong`  | `#be185d` | Berry as **text** on `berry-wash`                          |
| `--color-mint-strong`   | `#047857` | Mint as **text** on `mint-wash`                            |
| `--color-danger`        | `#e11d48` | Error fills                                                |
| `--color-danger-strong` | `#be123c` | Error **text**                                             |

`outline` and `shade` are separate tokens even though they share a value in
light mode, because dark mode moves them independently.

### Colour — dark

Dark mode is **not an inversion**. Three deliberate moves:

1. The paper becomes deep ink-violet rather than grey, keeping the warmth.
2. Surfaces sit _above_ the canvas in lightness, so depth comes from the
   lightness delta and the sticker shadow can go near-black and still read.
3. Accents brighten and text on them flips to dark, so contrast stays
   comfortable instead of glaring.

| Token                | Value     |
| -------------------- | --------- |
| `--color-canvas`     | `#14121c` |
| `--color-surface`    | `#1e1a2b` |
| `--color-surface-2`  | `#272138` |
| `--color-ink`        | `#f4f1ff` |
| `--color-ink-soft`   | `#a79fc2` |
| `--color-line`       | `#362e4d` |
| `--color-outline`    | `#0b0812` |
| `--color-shade`      | `#0b0812` |
| `--color-shade-soft` | `#302847` |
| `--color-accent`     | `#a78bfa` |
| `--color-on-accent`  | `#14121c` |
| `--color-berry`      | `#f9a8d4` |
| `--color-sun`        | `#fcd34d` |
| `--color-mint`       | `#6ee7b7` |

**Usage rule:** `accent` is for primary actions. `berry`, `sun` and `mint` are
rotated through decoratively — for shapes, icon badges and card shadows — to get
a confetti effect. They are never load-bearing on their own.

**Paint versus ink.** The plain decorative values are tuned to be bright, which
is right for fills, shadows and SVG shapes and wrong for small text: on their own
pale washes, light-mode mint measured 1.7:1 and berry 2.3:1, against the 4.5:1
small bold text needs. Anything that renders decorative colour as _text_ uses the
`-strong` variant instead, which clears 4.9:1 at the same hue. In dark mode the
bright values already clear 8:1, so `-strong` collapses back onto them.

The same split exists for violet, where it is spelled `accent` (ink, safe for
white text) and `accent-bright` (paint).

### Typography

| Role     | Family                                                                   | Weights               |
| -------- | ------------------------------------------------------------------------ | --------------------- |
| Headings | [Outfit](https://fonts.google.com/specimen/Outfit)                       | 600 / 700 / 800       |
| Body     | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | 400 / 500 / 600 / 700 |
| Numbers  | inherited, with `font-variant-numeric: tabular-nums`                     | —                     |

Outfit is geometric with rounded letterforms, which reads friendly rather than
corporate. Plus Jakarta Sans is geometric but humanist, so it stays legible at
13px.

The scale is a 1.25 ratio (major third) — melodic rather than mathematical —
running from `--text-2xs` (0.6875rem) to `--text-6xl` (4.25rem).

Anything whose value changes in place carries `data-numeric`, which switches on
tabular figures so the stats do not jitter as they count up.

Both families are downloaded at build time by `@nuxt/fonts` and served from our
own origin, so typography survives going offline.

### Radii

`8px` / `12px` / `16px` / `20px` / `24px` / `32px`, mapped to `rounded-sm`
through `rounded-3xl`.

A pill radius (`rounded-full`) is only ever used on single-row containers — on a
multi-row grid the radius is half the container height, and bottom-row children
escape the corner curve.

### Motion

| Token             | Curve                               | Use                                                |
| ----------------- | ----------------------------------- | -------------------------------------------------- |
| `--ease-bounce`   | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Entrances, control presses. Overshoots and settles |
| `--ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)`    | Drawers, progress, long distances                  |

The rule: **entrances overshoot, exits are quick and linear.** Entrances get the
personality; exits get out of the way.
