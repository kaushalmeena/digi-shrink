// @ts-check
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
