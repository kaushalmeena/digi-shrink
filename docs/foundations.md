# Foundations

DigiShrink implements **Quiet Utility** — the interface is a tool, and the
images are the content. It should feel closer to a well-made desktop utility
than a landing page.

## Principles

- **One task on one page.** Settings, drop, download. No hero, no marketing
  sections; the privacy claim is one line in the header.
- **Decide before the drop.** The common settings (preset, format, quality) are
  always on screen, and adding files starts compression immediately. If settings
  change afterwards, the summary offers to re-compress the stale results.
- **One primary action at a time.** `UiButton variant="primary"` is reserved for
  the next step — Compress while files wait, Download once they're done.
- **Hairlines, not shadows.** Grouping is a 1px `border` in `line`; surfaces are
  flat. Depth is reserved for overlays (drawers, toasts).
- **Colour carries meaning or nothing.** Neutral greys everywhere; the accent
  marks focus, selection and the primary action; green/amber/red appear only
  for saved / kept / grew-or-failed — and the text always says it too.

## Colour tokens

Defined in `app/assets/css/main.css` under `@theme`, re-assigned under `.dark`.
Components only ever use these names — a hex value in a component breaks dark
mode.

| Token         | Light     | Dark      | Use                                    |
| ------------- | --------- | --------- | -------------------------------------- |
| `canvas`      | `#fafafa` | `#0c0c0d` | Page background                        |
| `surface`     | `#ffffff` | `#151517` | Cards, drawers                         |
| `surface-2`   | `#f4f4f5` | `#1d1d20` | Segmented tracks, hovered rows         |
| `surface-3`   | `#e9e9ec` | `#27272b` | Slider / progress tracks, checkerboard |
| `ink`         | `#18181b` | `#f4f4f5` | Primary text                           |
| `ink-soft`    | `#63636b` | `#a1a1aa` | Secondary text (≥ 4.5:1 on `surface`)  |
| `ink-faint`   | `#8e8e96` | `#71717a` | Decorative or disabled text only       |
| `line`        | `#e4e4e7` | `#26262a` | Default border (set on `*`)            |
| `line-strong` | `#d4d4d8` | `#34343a` | Input and secondary-button borders     |
| `accent`      | `#2563eb` | `#60a5fa` | Focus, selection, primary action       |
| `accent-wash` | `#eef3fe` | `#16223a` | Drag-over, stale-results banner        |
| `success`     | `#15803d` | `#4ade80` | Bytes saved                            |
| `warning`     | `#a16207` | `#facc15` | Can't-show-original notice             |
| `danger`      | `#dc2626` | `#f87171` | File grew, failures                    |

Each status colour has a matching `-wash` for a pale background.

## Type

[Inter](https://fonts.google.com/specimen/Inter) at 400/500/600, self-hosted by
`@nuxt/fonts` so the offline PWA keeps it. The scale is deliberately tight
with 16px body text; `text-sm` (14px) and `text-xs` (13px) are reserved for dense UI roles such as file rows and metadata. Numbers that
change in place get `data-numeric` for tabular figures.

`field-label` is the sentence-case inline label used in the settings bar. No uppercase tracked labels or eyebrows above headings.

## Radii and motion

Radii: `sm` 4px, `md` 6px (buttons, inputs), `lg` 8px, `xl` 12px (cards).

Motion is short (≤ 260ms), eased with `ease-out-soft`, and never overshoots.
See [motion.md](motion.md).
