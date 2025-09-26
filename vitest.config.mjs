import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/dom.setup.mjs'], // make sure this path is correct
    clearMocks: true,
  },
});
