// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format

// eslint.config.mjs
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintPluginImport from 'eslint-plugin-import';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  // 1. Next.js Base Configurations
  ...nextVitals,
  ...nextTs,

  // 2. Platinum Standard Rules & Plugins
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      // Type Safety - STRICT
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Code Quality
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-var': 'error',
      'prefer-const': 'error',

      // Import Organization
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',

      'no-restricted-imports': [
        'error',
        {
          paths: [],
          patterns: [
            { group: ['rng-repository/**'], message: 'RNG-REPOSITORY Already exports stuff.' },
          ],
        },
      ],

      // Next.js specific
      '@next/next/no-img-element': 'error',
      '@next/next/no-html-link-for-pages': 'error',

      // Avoid anti-patterns
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-null-check-behavior': 'off',
    },
  },

  // Exclude non-src files
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'next-env.d.ts',
    '*.config.js',
    '*.config.ts',
    '*.config.mjs',
    'node_modules/**',
    '.storybook/**',
  ]),
]);

export default eslintConfig;
