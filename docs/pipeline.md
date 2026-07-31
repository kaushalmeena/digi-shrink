# The compression pipeline

## The compression pipeline

Everything happens inside `app/workers/compress.worker.ts`:

```
decode → (resize) → encode candidates → pick winner → transfer back
```

### Decoding uses the browser, not WASM

`createImageBitmap` is hardware accelerated, handles EXIF orientation for free,
and supports formats we ship no decoder for (HEIC on Safari, GIF, BMP, SVG). The
bitmap is drawn to a reusable `OffscreenCanvas` and read back as `ImageData`.

WASM decoders (`@jsquash/*/decode`) are only a fallback for blobs the browser
refuses. Inputs above 100 megapixels are rejected rather than allowed to take the
tab down with a failed allocation.

Two details that are easy to get wrong:

- `premultiplyAlpha: 'none'` — encoders expect straight alpha, and premultiplied
  edges show up as dark fringing on transparent PNGs.
- `ImageBitmap.close()` — bitmaps hold GPU memory until explicitly closed.

### Resizing

`@jsquash/resize` in `linearRGB` mode. Resampling in linear light avoids the dark
halos that plague naive downscaling of high-contrast images. `fitMethod` is
always `stretch`, because `computeTargetDimensions` has already resolved the
aspect ratio — letting the resizer fit again would apply it twice.

The resize pass is skipped entirely when it would be a 1:1 resample, and
upscaling is refused unless explicitly enabled, since enlarging can only add
bytes without adding detail.

### Encoding

| Format | Encoder               | Notes                                                                                                                             |
| ------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| JPEG   | MozJPEG               | Progressive + trellis quantisation by default. Alpha is flattened onto white first, since JPEG has no alpha channel.              |
| PNG    | Rust encoder → OxiPNG | Two passes: encode valid PNG bytes, then rewrite them losslessly with better filtering. The second pass is where the savings are. |
| WebP   | libwebp               | Lossless and near-lossless modes; separate alpha quality.                                                                         |
| AVIF   | libavif               | Smallest output, by far the slowest.                                                                                              |

Codecs are imported lazily. The AVIF encoder alone is several megabytes of WASM,
so loading it only when someone picks AVIF keeps first paint fast — the service
worker still precaches everything for offline use.

### Format selection

- **A named format** encodes just that one.
- **`original`** maps the input MIME type back to a writable format, falling back
  to WebP for inputs with no encoder here (GIF, BMP, SVG, HEIC). WebP is the right
  fallback because it is both lossless-capable and alpha-capable, so nothing is
  silently lost.
- **`auto`** encodes every ticked candidate and keeps whichever came out
  smallest.
- **Lossless mode** filters candidates to formats that actually support it, and
  never returns an empty list.

### Target-size mode

Binary-searches quality until the output fits a byte budget, capped at 8 passes.
It keeps the best _passing_ result rather than the last one, so a search that
runs out of attempts still returns something under budget. If nothing fits even at
the quality floor, the smallest attempt wins — undershooting the user's intent
beats handing back a file that is too big.

A result within 4% of the budget ends the search early; more passes would not be
worth the time.

### The "already optimal" guard

Re-encoding a well-optimised image often makes it **bigger**. When every
candidate comes out larger than the input, the original bytes are returned
untouched and the UI says so explicitly. Quietly shipping a worse file would be
the easy behaviour and the wrong one.

### Metadata

Because every image goes through raw `ImageData`, EXIF, GPS coordinates and
colour profiles cannot survive the round trip. This is a property of the
pipeline, not a setting, which is why there is no toggle for it.

## The worker pool

`lib/workerPool.ts` dispatches requests across N workers, one task per worker.

Sizing is `clamp(cores / 2, 1, 4)`, not `cores`. The codecs are CPU-bound, and
OxiPNG and the AVIF encoder already spawn their own internal threads when the
page is cross-origin isolated. Saturating every core with _outer_ workers on top
of that makes a batch slower, not faster, and starves the main thread so the UI
stops feeling responsive.

Cancellation terminates workers rather than signalling them, because that is the
only reliable way to interrupt a WASM encode mid-pass. Terminated workers are
rebuilt on the next task. A worker that crashes is replaced rather than reused.
