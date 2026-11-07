# Accessibility

Not an afterthought here:

- **Real form controls behind custom looks.** The sliders are
  `<input type="range">`, the switches are `<input type="checkbox">`. Keyboard
  support, arrow-key stepping, screen-reader announcements and touch behaviour all come
  for free — none of which a div-based control gives without significant work.
  The compare slider keeps a range input as its keyboard path even though the
  divider is also draggable.
- **Segmented controls are ARIA radio groups**, with arrow keys moving between
  enabled options and wrapping around.
- **Offcanvas panels** move focus in on open, trap `Tab` inside, close on
  `Escape`, restore focus to the trigger on close, and scroll-lock the page.
- **Status is never colour alone.** Every state pairs a colour with text and
  usually an icon, so it survives colour blindness and monochrome.
- **Focus is always visible** — a 2px accent outline with an offset on every
  focusable element, never removed.
- **Row actions stay reachable.** They fade in on hover, but also on
  `focus-within`, and are always shown on touch devices.
- **`prefers-reduced-motion` removes movement, not feedback.** Slides, row
  moves and height animations are dropped; opacity fades remain so state
  changes are still perceptible.
