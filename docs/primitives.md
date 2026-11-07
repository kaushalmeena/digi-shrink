# Primitives

## UI components (`app/components/ui/`)

| Component     | Notes                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| `Button`      | `primary` (one per screen), `secondary`, `ghost`, `danger`; `sm/md/lg`    |
| `Card`        | Bordered `surface` block; `flush` drops the padding                       |
| `Badge`       | Small status label in a tone's wash                                       |
| `Segmented`   | ARIA radio group; sliding pill in row mode, filled cell in `columns` mode |
| `Slider`      | Native range input with a filled track                                    |
| `Switch`      | Real checkbox behind a painted track                                      |
| `NumberInput` | Text field with − / + steppers and an optional suffix                     |
| `Field`       | Label + control + hint, optional live value                               |
| `ProgressBar` | Thin determinate rail                                                     |
| `Offcanvas`   | Drawer with focus trap, Escape, scroll lock, focus restore                |

## CSS utilities (`app/assets/css/utilities.css`)

- **`shell`** — page width (56rem) and side gutters.
- **`label-caps`** — small uppercase label.
- **`checker`** — checkerboard behind thumbnails and the compare view, so
  transparency reads as transparency.

Shared classes must be declared with `@utility`, not as plain CSS classes, so
Tailwind and the linter know about them.
