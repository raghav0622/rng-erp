import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    include: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    exclude: ['**/node_modules/**', '**/contract/*.ts'], // contract files are run via repository.test.ts
    globals: false,
    environment: 'node',
  },
});
