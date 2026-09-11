import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts: that one validates --mode against the network list,
// and tests only cover pure logic that never touches Pixi or the ad container.
export default defineConfig({
  define: {
    __NETWORK__: JSON.stringify('web'),
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
