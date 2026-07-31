# Transitions and iconography

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
