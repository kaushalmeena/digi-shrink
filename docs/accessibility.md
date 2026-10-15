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
- **Focus is a signature, not an afterthought** — a thick 3px high-contrast
  outline with an offset, rather than a soft glow.
- **Decoration is hidden from assistive tech** (`aria-hidden`) and from narrow
  screens, where it would otherwise sit under the text.
- **`prefers-reduced-motion` is honoured globally**, collapsing every animation
  and transition to ~0ms. The bounce and wiggle are personality, never
  information, so removing them loses nothing.
