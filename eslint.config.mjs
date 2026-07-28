// @ts-check
import betterTailwind from 'eslint-plugin-better-tailwindcss'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Turn off every ESLint rule that would fight Prettier…
  prettierConfig,
  // …then run Prettier itself as the single formatting rule.
  {
    plugins: { prettier: prettierPlugin },
    rules: { 'prettier/prettier': 'error' },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      // Written for the Options API. With type-based `defineProps`, an optional
      // prop is already expressed by `?` and forcing `undefined` defaults adds
      // noise without adding safety.
      'vue/require-default-prop': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `consistent-type-imports` is deliberately omitted: it needs full type
      // information, which would make every lint run a type-check.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'object-shorthand': 'error',
    },
  },
  /**
   * Tailwind class linting.
   *
   * `entryPoint` is what makes this useful rather than noisy: it points the
   * plugin at our real stylesheet, so the custom `@utility` definitions in
   * `patterns.css` (`pop-2`, `sticker`, `edge`, `blob-leaf`, …) are recognised as
   * genuine classes instead of being reported as unknown.
   */
  {
    files: ['app/**/*.vue'],
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: {
      'better-tailwindcss': { entryPoint: 'app/assets/css/main.css' },
    },
    rules: {
      ...betterTailwind.configs['recommended-warn'].rules,

      // Correctness, so these are errors rather than warnings.
      // `no-conflicting-classes` is the important one: it catches two utilities
      // fighting over the same property, where the winner is decided by
      // stylesheet order. That bug bit this codebase twice.
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-unknown-classes': 'error',
      'better-tailwindcss/enforce-canonical-classes': 'error',

      // Not in `recommended`, but they encode conventions we already follow —
      // e.g. `border-(--color-line)` over `border-[var(--color-line)]`.
      'better-tailwindcss/enforce-consistent-variable-syntax': 'error',
      'better-tailwindcss/enforce-consistent-variant-order': 'warn',

      // Off because `enforce-canonical-classes` already collapses `h-4 w-4` to
      // `size-4`. Running both reports every occurrence twice, and the shorthand
      // rule mislabels some of its own messages.
      'better-tailwindcss/enforce-shorthand-classes': 'off',

      // Prettier owns formatting — see the config above. Letting this rule wrap
      // class lists too would give two tools authority over the same bytes.
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
    },
  },
  {
    // Build scripts are CLI tools; printing what they wrote is the point.
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    // Build output and generated binary assets are never linted.
    ignores: ['dist', '.output', '.nuxt', 'node_modules', 'public/icons'],
  },
)
