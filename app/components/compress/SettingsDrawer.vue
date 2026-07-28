<script setup lang="ts">
/**
 * The advanced settings offcanvas.
 *
 * Structured so it reads top-to-bottom as a decision tree — format, then how
 * hard to compress, then size, then per-codec detail. Codec options are only
 * rendered for the format actually selected, which keeps a panel that exposes
 * ~20 knobs from feeling like an aircraft cockpit.
 *
 * Every control describes its trade-off in plain language. "Method 6 is slower
 * but smaller" is useful; "method: 0–6" is not.
 */
import { RotateCcw, Wand2 } from '@lucide/vue'
import { FORMAT_META } from '~/lib/constants'
import type { SegmentOption } from '~/components/ui/Segmented.vue'
import type {
  CompressionMode,
  OutputFormat,
  ResizeFilter,
  ResizeMode,
  TargetFormat,
} from '~/lib/types'

const open = defineModel<boolean>('open', { required: true })

const { settings, summary, focusedFormat, losslessAvailable, reset, toggleAutoFormat } =
  useSettings()
const { requeueAll, completed } = useCompressor()

const FORMATS: SegmentOption<TargetFormat>[] = [
  { value: 'auto', label: 'Auto', title: 'Encode several formats and keep the smallest' },
  { value: 'original', label: 'Same', title: 'Keep the input format' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
]

const MODES = computed<SegmentOption<CompressionMode>[]>(() => [
  { value: 'quality', label: 'Quality' },
  { value: 'target-size', label: 'Target size' },
  {
    value: 'lossless',
    label: 'Lossless',
    disabled: !losslessAvailable.value,
    title: losslessAvailable.value
      ? 'No pixel data is lost'
      : 'The selected format has no lossless mode',
  },
])

const RESIZE_MODES: SegmentOption<ResizeMode>[] = [
  { value: 'fit', label: 'Fit box', title: 'Scale down to fit inside a width × height box' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
  { value: 'percent', label: 'Percent' },
]

const RESIZE_FILTERS: SegmentOption<ResizeFilter>[] = [
  { value: 'lanczos3', label: 'Lanczos', title: 'Sharpest. The right default for photos.' },
  { value: 'mitchell', label: 'Mitchell', title: 'Smooth, slightly softer than Lanczos.' },
  { value: 'catrom', label: 'Catmull-Rom', title: 'Balanced sharpness.' },
  { value: 'triangle', label: 'Triangle', title: 'Fastest, softest. Fine for thumbnails.' },
]

const AVIF_TUNE: SegmentOption<'auto' | 'psnr' | 'ssim'>[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'ssim', label: 'Perceptual', title: 'Optimise for how the image looks' },
  { value: 'psnr', label: 'Numeric', title: 'Optimise for measured signal error' },
]

const AUTO_CANDIDATES: OutputFormat[] = ['webp', 'avif', 'jpeg', 'png']

/** Human-readable guidance for the current quality value. */
const qualityHint = computed(() => {
  const q = settings.value.quality
  if (q >= 90) return 'Visually lossless, but the file stays large.'
  if (q >= 75) return 'The sweet spot — no visible loss on photographs.'
  if (q >= 55) return 'Small files. Soft detail in flat gradients and skies.'
  return 'Aggressive. Expect visible blocking and banding.'
})

function applyToFinished(): void {
  requeueAll()
  open.value = false
}
</script>

<template>
  <UiOffcanvas v-model:open="open" title="Advanced settings" :subtitle="summary" width="max-w-lg">
    <div class="space-y-8">
      <!-- ---------------------------------------------------------- Format -->
      <section class="space-y-3">
        <h3 class="font-display text-base font-bold">Output format</h3>

        <UiSegmented
          v-model="settings.format"
          :options="FORMATS"
          aria-label="Output format"
          :columns="3"
        />

        <p
          v-if="settings.format !== 'auto' && settings.format !== 'original'"
          class="text-xs text-ink-soft"
        >
          {{ FORMAT_META[settings.format].blurb }}
        </p>

        <!-- Auto mode: pick which formats get raced against each other. -->
        <Transition name="collapse">
          <div v-if="settings.format === 'auto'" class="grid">
            <div class="rounded-xl edge-soft bg-surface-2 p-4">
              <p class="mb-3 text-xs leading-snug text-ink-soft">
                Each image is encoded to every ticked format and the smallest result wins. More
                formats means better results and a slower run.
              </p>

              <div class="space-y-2.5">
                <UiSwitch
                  v-for="format in AUTO_CANDIDATES"
                  :key="format"
                  :model-value="settings.autoFormats.includes(format)"
                  :label="FORMAT_META[format].label"
                  :hint="FORMAT_META[format].blurb"
                  @update:model-value="toggleAutoFormat(format)"
                />
              </div>
            </div>
          </div>
        </Transition>
      </section>

      <!-- ------------------------------------------------------------ Mode -->
      <section class="space-y-3">
        <h3 class="font-display text-base font-bold">How hard to compress</h3>

        <UiSegmented
          v-model="settings.mode"
          :options="MODES"
          aria-label="Compression mode"
          :columns="3"
        />

        <Transition name="fade" mode="out-in">
          <!-- Quality -->
          <div v-if="settings.mode === 'quality'" key="quality">
            <UiField
              label="Quality"
              :value="settings.quality"
              :hint="qualityHint"
              for="global-quality"
            >
              <template #default="{ hintId }">
                <UiSlider
                  id="global-quality"
                  v-model="settings.quality"
                  :min="1"
                  :max="100"
                  :described-by="hintId"
                />
              </template>
            </UiField>
          </div>

          <!-- Target size -->
          <div v-else-if="settings.mode === 'target-size'" key="target">
            <UiField
              label="Target file size"
              :value="`${settings.targetSizeKb} KB`"
              hint="Quality is searched automatically until the output fits, in up to 8 passes per image."
              for="target-size"
            >
              <template #default>
                <UiNumberInput
                  id="target-size"
                  v-model="settings.targetSizeKb"
                  :min="5"
                  :max="20_000"
                  :step="25"
                  suffix="KB"
                  aria-label="Target file size in kilobytes"
                />
              </template>
            </UiField>
          </div>

          <!-- Lossless -->
          <p
            v-else
            key="lossless"
            class="rounded-lg bg-mint-wash p-3 text-xs leading-snug text-ink"
          >
            Not a single pixel changes. Savings come from better compression alone, so they're
            modest on photos and large on screenshots, logos and flat colour.
          </p>
        </Transition>
      </section>

      <!-- ---------------------------------------------------------- Resize -->
      <section class="space-y-3">
        <h3 class="font-display text-base font-bold">Resize</h3>

        <UiSwitch
          v-model="settings.resize.enabled"
          label="Scale images down"
          hint="Nothing shrinks a file like sending fewer pixels."
        />

        <Transition name="collapse">
          <div v-if="settings.resize.enabled" class="grid">
            <div class="space-y-4 rounded-xl edge-soft bg-surface-2 p-4">
              <UiSegmented
                v-model="settings.resize.mode"
                :options="RESIZE_MODES"
                aria-label="Resize mode"
                :columns="2"
                size="sm"
              />

              <div v-if="settings.resize.mode === 'fit'" class="grid grid-cols-2 gap-3">
                <UiField label="Max width" for="resize-width">
                  <UiNumberInput
                    id="resize-width"
                    v-model="settings.resize.width"
                    :max="20_000"
                    :step="64"
                    suffix="px"
                    aria-label="Maximum width"
                  />
                </UiField>
                <UiField label="Max height" for="resize-height">
                  <UiNumberInput
                    id="resize-height"
                    v-model="settings.resize.height"
                    :max="20_000"
                    :step="64"
                    suffix="px"
                    aria-label="Maximum height"
                  />
                </UiField>
              </div>

              <UiField
                v-else-if="settings.resize.mode === 'width'"
                label="Exact width"
                hint="Height follows the original aspect ratio."
                for="resize-exact-width"
              >
                <UiNumberInput
                  id="resize-exact-width"
                  v-model="settings.resize.width"
                  :max="20_000"
                  :step="64"
                  suffix="px"
                  aria-label="Exact width"
                />
              </UiField>

              <UiField
                v-else-if="settings.resize.mode === 'height'"
                label="Exact height"
                hint="Width follows the original aspect ratio."
                for="resize-exact-height"
              >
                <UiNumberInput
                  id="resize-exact-height"
                  v-model="settings.resize.height"
                  :max="20_000"
                  :step="64"
                  suffix="px"
                  aria-label="Exact height"
                />
              </UiField>

              <UiField
                v-else
                label="Scale"
                :value="`${settings.resize.percent}%`"
                for="resize-percent"
              >
                <UiSlider
                  id="resize-percent"
                  v-model="settings.resize.percent"
                  :min="5"
                  :max="200"
                  :step="5"
                />
              </UiField>

              <UiField label="Resampling" hint="How pixels are blended when scaling.">
                <UiSegmented
                  v-model="settings.resize.filter"
                  :options="RESIZE_FILTERS"
                  aria-label="Resampling filter"
                  :columns="2"
                  size="sm"
                />
              </UiField>

              <UiSwitch
                v-model="settings.resize.allowUpscale"
                label="Allow upscaling"
                hint="Off by default — enlarging can only ever add bytes without adding detail."
              />
            </div>
          </div>
        </Transition>
      </section>

      <!-- --------------------------------------------------- Codec options -->
      <section class="space-y-3">
        <h3 class="font-display text-base font-bold">
          {{ FORMAT_META[focusedFormat].label }} options
        </h3>
        <p class="text-xs text-ink-soft">
          Encoder settings for {{ FORMAT_META[focusedFormat].encoder }}.
        </p>

        <div class="space-y-4 rounded-xl edge-soft bg-surface-2 p-4">
          <!-- JPEG -->
          <template v-if="focusedFormat === 'jpeg'">
            <UiField
              label="Chroma subsampling"
              hint="Colour detail is cheaper to discard than brightness detail."
            >
              <UiSegmented
                v-model="settings.jpeg.chromaSubsample"
                :options="[
                  {
                    value: 3,
                    label: '4:4:4',
                    title: 'No colour loss. Best for text and graphics.',
                  },
                  { value: 2, label: '4:2:2', title: 'Balanced.' },
                  { value: 1, label: '4:2:0', title: 'Smallest. Standard for photographs.' },
                ]"
                aria-label="Chroma subsampling"
                size="sm"
              />
            </UiField>

            <UiSwitch
              v-model="settings.jpeg.progressive"
              label="Progressive"
              hint="Renders low-detail first while loading, and is usually smaller too."
            />
            <UiSwitch
              v-model="settings.jpeg.trellis"
              label="Trellis quantisation"
              hint="Noticeably smaller files for noticeably more CPU time."
            />
            <UiSwitch
              v-model="settings.jpeg.optimizeCoding"
              label="Optimise Huffman tables"
              hint="A free few percent. No reason to turn this off."
            />
            <UiSwitch
              v-model="settings.jpeg.grayscale"
              label="Convert to greyscale"
              hint="Drops colour entirely. A big win for scans and documents."
            />

            <UiField
              label="Smoothing"
              :value="settings.jpeg.smoothing"
              hint="A little blur on noisy or grainy sources compresses much better."
              for="jpeg-smoothing"
            >
              <UiSlider id="jpeg-smoothing" v-model="settings.jpeg.smoothing" :min="0" :max="100" />
            </UiField>
          </template>

          <!-- WebP -->
          <template v-else-if="focusedFormat === 'webp'">
            <UiField
              label="Effort"
              :value="settings.webp.method"
              hint="0 is fastest, 6 is smallest. Each step up costs roughly 30% more time."
              for="webp-method"
            >
              <UiSlider id="webp-method" v-model="settings.webp.method" :min="0" :max="6" />
            </UiField>

            <UiField
              label="Alpha quality"
              :value="settings.webp.alphaQuality"
              hint="Transparency can usually stay at 100 — it costs very little."
              for="webp-alpha"
            >
              <UiSlider id="webp-alpha" v-model="settings.webp.alphaQuality" :min="0" :max="100" />
            </UiField>

            <UiField
              label="Near-lossless"
              :value="settings.webp.nearLossless === 0 ? 'off' : settings.webp.nearLossless"
              hint="Preserves hard edges at low quality. 0 turns it off."
              for="webp-near"
            >
              <UiSlider
                id="webp-near"
                v-model="settings.webp.nearLossless"
                :min="0"
                :max="100"
                :step="10"
              />
            </UiField>

            <UiSwitch
              v-model="settings.webp.sharpYuv"
              label="Sharp YUV"
              hint="Cleaner colour on hard edges — worth it for graphics with saturated reds."
            />
          </template>

          <!-- AVIF -->
          <template v-else-if="focusedFormat === 'avif'">
            <UiField
              label="Speed"
              :value="settings.avif.speed"
              hint="0 is slowest and smallest, 10 is fastest. Below 4 gets very slow on large images."
              for="avif-speed"
            >
              <UiSlider id="avif-speed" v-model="settings.avif.speed" :min="0" :max="10" />
            </UiField>

            <UiField label="Chroma subsampling">
              <UiSegmented
                v-model="settings.avif.subsample"
                :options="[
                  { value: 3, label: '4:4:4' },
                  { value: 2, label: '4:2:2' },
                  { value: 1, label: '4:2:0' },
                ]"
                aria-label="AVIF chroma subsampling"
                size="sm"
              />
            </UiField>

            <UiField label="Tuning" hint="What the encoder optimises for.">
              <UiSegmented
                v-model="settings.avif.tune"
                :options="AVIF_TUNE"
                aria-label="AVIF tuning"
                size="sm"
              />
            </UiField>

            <UiField label="Sharpness" :value="settings.avif.sharpness" for="avif-sharpness">
              <UiSlider id="avif-sharpness" v-model="settings.avif.sharpness" :min="0" :max="7" />
            </UiField>

            <UiSwitch
              v-model="settings.avif.chromaDeltaQ"
              label="Boost colour quality"
              hint="Spends extra bits on colour where the eye is most sensitive."
            />
          </template>

          <!-- PNG -->
          <template v-else>
            <UiField
              label="Optimisation level"
              :value="settings.png.level"
              hint="Higher levels try more filter combinations. Quality never changes — only time and size."
              for="png-level"
            >
              <UiSlider id="png-level" v-model="settings.png.level" :min="0" :max="6" />
            </UiField>

            <UiSwitch
              v-model="settings.png.optimiseAlpha"
              label="Optimise transparent pixels"
              hint="Rewrites fully-transparent pixels so they compress away. Safe for almost every image."
            />
            <UiSwitch
              v-model="settings.png.interlace"
              label="Interlace (Adam7)"
              hint="Progressive loading, but a larger file. Usually leave this off."
            />
          </template>
        </div>
      </section>

      <!-- ------------------------------------------------------- Behaviour -->
      <section class="space-y-3">
        <h3 class="font-display text-base font-bold">Behaviour</h3>

        <div class="space-y-3 rounded-xl edge-soft bg-surface-2 p-4">
          <UiSwitch
            v-model="settings.keepIfLarger"
            label="Keep the original if it's already smaller"
            hint="Re-encoding a well-optimised image can make it bigger. With this on, we hand back the original and tell you."
          />

          <p
            class="border-t-2 border-[var(--color-line)] pt-3 text-2xs leading-relaxed text-ink-soft"
          >
            <strong class="text-ink">Metadata is always removed.</strong>
            Re-encoding goes through raw pixels, so EXIF, GPS coordinates and camera details cannot
            survive the round trip. That's deliberate.
          </p>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex items-center gap-2">
        <UiButton variant="ghost" size="sm" @click="reset">
          <RotateCcw class="h-4 w-4 stroke-[2.5]" />
          Reset
        </UiButton>

        <div class="ml-auto flex gap-2">
          <UiButton
            v-if="completed.length > 0"
            variant="secondary"
            size="sm"
            @click="applyToFinished"
          >
            <Wand2 class="h-4 w-4 stroke-[2.5]" />
            Re-run all
          </UiButton>

          <UiButton size="sm" @click="open = false">Done</UiButton>
        </div>
      </div>
    </template>
  </UiOffcanvas>
</template>
