# Visual primitives

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
