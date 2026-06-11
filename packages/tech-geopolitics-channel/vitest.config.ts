import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['scripts/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['scripts/lib/**/*.ts'],
      exclude: ['scripts/**/*.test.ts'],
    },
  },
});
