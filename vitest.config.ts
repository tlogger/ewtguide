import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/services/poiRepository.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
