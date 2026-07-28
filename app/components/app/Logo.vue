<script setup lang="ts">
/**
 * The wordmark: a tilted amber square with a violet circle being squeezed
 * inside it — a literal little picture of what the app does.
 */
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <span
      class="grid shrink-0 -rotate-6 place-items-center rounded-lg bg-sun pop-1 transition-transform duration-300 ease-bounce edge group-hover:rotate-6"
      :class="size === 'sm' ? 'size-7' : 'size-9'"
    >
      <svg viewBox="0 0 24 24" class="size-[62%]" aria-hidden="true">
        <circle cx="12" cy="12" r="7" class="fill-accent" />
        <path
          d="M4 6h16M4 18h16"
          stroke="#1e293b"
          stroke-width="2.5"
          stroke-linecap="round"
          fill="none"
        />
      </svg>
    </span>

    <span
      class="font-display font-extrabold tracking-tight"
      :class="size === 'sm' ? 'text-base' : 'text-lg'"
    >
      Digi<span class="text-accent">Compress</span>
    </span>
  </span>
</template>
