# Transitions and iconography

## Transitions

`app/assets/css/transitions.css` defines every named Vue transition. Use these
rather than one-off animations:

| Name        | Use                                                                |
| ----------- | ------------------------------------------------------------------ |
| `fade`      | Default: content swaps, overlays, state changes                    |
| `rise`      | Fade plus 4px of travel, for small panels appearing                |
| `offcanvas` | Drawer scrim + panel, driven from the dialog root                  |
| `queue`     | The file list; `queue-move` slides rows into a removed row's gap   |
| `disclose`  | A **utility**, not a transition: height disclosure via `data-open` |

Everything is ≤ 260ms with `ease-out-soft` on the way in and a quicker ease-in
on the way out. Nothing bounces. All of it collapses under
`prefers-reduced-motion`.

## Iconography

[Lucide](https://lucide.dev) at a 1.75px stroke with round caps and joins, set
once as a base rule on `svg.lucide` to match the hairline borders. Icons sit
inline with text at `size-3.5`/`size-4`; they don't get their own containers.
