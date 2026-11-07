# Overview

How DigiShrink is put together, and why it is put together that way.

## Constraints

Two rules shape every decision below:

1. **No image bytes leave the device.** There is no server runtime, no API
   routes, and no analytics. The codecs are WebAssembly binaries shipped with the
   bundle.
2. **It must work offline.** Every asset — fonts, codecs, icons — is self-hosted
   and precached by a service worker.

## Directory layout

```
app/
├── assets/css/
│   ├── main.css           Design tokens and base styles
│   ├── utilities.css      Shared Tailwind utilities (shell, field-label, checker)
│   └── transitions.css    Shared <Transition> vocabulary
├── components/
│   ├── ui/                Design-system primitives (Button, Card, Segmented, …)
│   ├── app/               Shell: Header, Footer, Logo, ThemeToggle
│   └── compress/          Feature components: SettingsBar, DropZone, Summary, Queue, drawers
├── composables/           Queue, settings, theme, file intake, lifetime stats
├── lib/                   Framework-free logic
├── plugins/               localStorage hydration and persistence
├── pages/                 The single page
└── workers/               The compression worker
```

The load-bearing boundary is `lib/` and `workers/`: **neither imports Vue.**
`lib/` holds types, formatting, the ZIP writer and the worker pool; `workers/` is
the only place pixels are touched. Both are plain TypeScript, so they can be
reasoned about — and tested — without a component tree.
