import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/dom.setup.mjs'], // note the new filename below
    // Optional but helpful: make sure deps resolve cleanly
    deps: { inline: ['jsdom'] },
  },
});
