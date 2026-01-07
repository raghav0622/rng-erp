import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const alias = { '@': path.join(dirname) };

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  root: dirname,
  resolve: {
    alias,
  },
  test: {
    projects: [
      {
        resolve: {
          alias,
        },
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
      {
        resolve: {
          alias,
        },
        test: {
          name: 'unit',
          include: ['rng-firebase/**/*.spec.ts', 'rng-firebase/**/*.spec.tsx'],
          environment: 'jsdom',
          env: {
            NEXT_PUBLIC_APP_URL: 'http://localhost',
            NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
            NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-bucket',
            NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'sender-id',
            NEXT_PUBLIC_FIREBASE_APP_ID: 'app-id',
          },
        },
      },
    ],
  },
});
