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
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'object-shorthand': 'error',
    },
  },
  {
    // Build output and generated binary assets are never linted.
    ignores: ['dist', '.output', '.nuxt', 'node_modules', 'public/icons'],
  },
)
