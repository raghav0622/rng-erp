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
      '@typescript-eslint/no-implicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'warn',

      // Code Quality
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-var': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // Documentation
      '@typescript-eslint/explicit-function-return-types': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],

      // Import Organization
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabeticalOptions: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',

      // Forbidden kernel imports (Phase-0.8)
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'rng-firebase/domain', message: 'Domain is kernel-internal' },
            { name: 'rng-firebase/repositories', message: 'Repositories are kernel-internal' },
            { name: 'rng-firebase/adapters', message: 'Adapters are kernel-internal' },
            {
              name: 'rng-firebase/feature-execution-engine/internal',
              message: 'Feature engine internals are kernel-internal',
            },
            {
              name: 'rng-firebase/domain/rbac/rbac.engine',
              message: 'RBAC engine is kernel-internal',
            },
            {
              name: 'rng-firebase/domain/auth/auth.state-machine',
              message: 'Auth state machine is kernel-internal',
            },
          ],
          patterns: [
            { group: ['rng-firebase/domain/**'], message: 'Domain is kernel-internal' },
            {
              group: ['rng-firebase/repositories/**'],
              message: 'Repositories are kernel-internal',
            },
            { group: ['rng-firebase/adapters/**'], message: 'Adapters are kernel-internal' },
            {
              group: ['rng-firebase/feature-execution-engine/internal/**'],
              message: 'Feature engine internals are kernel-internal',
            },
            { group: ['@kernel/internal/**'], message: 'Kernel internals are not public' },
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
