import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      // Resolve SVG imports to an empty string (raw-loader behaviour in tests)
      '~/': '/src/',
    },
  },
  plugins: [
    {
      // Mock SVG imports as empty strings, mirroring the webpack asset/source loader
      name: 'svg-raw-mock',
      load(id) {
        if (id.endsWith('.svg')) return 'export default ""';
      },
    },
  ],
});
