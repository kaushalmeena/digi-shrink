# Design

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

## Visual primitives

Defined as Tailwind utilities in `app/assets/css/patterns.css`, so components stay
declarative and nothing hand-rolls a shadow.

### Pop shadows

Composable in two axes — depth and colour:

```html
<div class="pop-3 pop-berry">…</div>
```

| Depth   | Offset |     | Colour       | Token                |
| ------- | ------ | --- | ------------ | -------------------- |
| `pop-0` | none   |     | `pop-ink`    | `--color-shade`      |
| `pop-1` | 2px    |     | `pop-soft`   | `--color-shade-soft` |
| `pop-2` | 4px    |     | `pop-accent` | `--color-accent`     |
| `pop-3` | 6px    |     | `pop-berry`  | `--color-berry`      |
| `pop-4` | 8px    |     | `pop-sun`    | `--color-sun`        |
|         |        |     | `pop-mint`   | `--color-mint`       |

Colour utilities only set a custom property, so declaration order between the two
never matters.

### Interaction

- **`sticker`** — the tactile pairing that makes controls feel physical: on hover
  the element lifts toward the cursor and the shadow grows; on press it sinks and
  the shadow shrinks.
- **`sticker-tilt`** — a gentler rotate-and-scale for large surfaces where a full
  lift would be too much.

### Borders and texture

`edge` (2px), `edge-thick` (3px), `edge-soft` (line colour), plus
`pattern-dots`, `pattern-dots-dense`, `pattern-grid` and `pattern-stripes`. All
patterns are pure CSS, so they cost no requests and theme themselves.

### Shapes and text

- `blob-bubble`, `blob-leaf`, `blob-arch`, `blob-squish` — the varied-radii shapes.
- `eyebrow` — the system's label voice: bold, uppercase, wide-tracked, small.
- `marker-underline` — a thick marker sweep behind a word, colour set via
  `--mark-c`.
- `shell` — the page container: `max-width: 76rem` with responsive gutters.
- `skeleton-sweep` — a loading placeholder in palette colours rather than grey.

## Transitions

`app/assets/css/transitions.css` defines the whole motion vocabulary as named
Vue transitions. Use these rather than writing one-off animations, so motion reads
as one language:

| Name                                 | Use                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `pop`                                | Default for anything appearing in place                                                                       |
| `fade`                               | Content swaps where movement would be noise                                                                   |
| `collapse`                           | Disclosure, via `grid-template-rows: 0fr → 1fr` — animates to content height with no JS measurement           |
| `drawer-right` / `-left` / `-bottom` | Offcanvas panels                                                                                              |
| `backdrop`                           | The offcanvas scrim                                                                                           |
| `queue`                              | The image list. `queue-move` is what makes a removal feel considered — the rows below glide up via Vue's FLIP |
| `roll`                               | Figures and icons that change in place                                                                        |
| `stagger`                            | Children cascade in, driven by a `--stagger-index` custom property                                            |

## Iconography

[Lucide](https://lucide.dev), with a 2.5px stroke and round caps and joins. That
is set **once** as a base rule on `svg.lucide` rather than repeated per icon —
it is a system-wide decision, and Tailwind's `stroke-<number>` utility only
accepts integers, so a fractional value silently does nothing.

A rule of this system: **icons are never left floating alone.** A checkmark is a
checkmark inside a mint circle. `UiIconBadge` is the single place that is
enforced, offering circle, squircle and leaf shapes.

## Accessibility

Not an afterthought here:

- **Real form controls behind custom looks.** The sliders are `<input
type="range">`, the switches are `<input type="checkbox">`. Keyboard support,
  arrow-key stepping, screen-reader announcements and touch behaviour all come
  for free — none of which a div-based control gives without significant work.
  The compare slider keeps a range input as its keyboard path even though the
  divider is also draggable.
- **Segmented controls are ARIA radio groups**, with arrow keys moving between
  enabled options and wrapping around.
- **Offcanvas panels** move focus in on open, trap `Tab` inside, close on
  `Escape`, restore focus to the trigger on close, and scroll-lock the page.
- **Status is never colour alone.** Every state pairs a colour with text and
  usually an icon, so it survives colour blindness and monochrome.
- **Focus is a signature, not an afterthought** — a thick 3px high-contrast
  outline with an offset, rather than a soft glow.
- **Decoration is hidden from assistive tech** (`aria-hidden`) and from narrow
  screens, where it would otherwise sit under the text.
- **`prefers-reduced-motion` is honoured globally**, collapsing every animation
  and transition to ~0ms. The bounce and wiggle are personality, never
  information, so removing them loses nothing.
