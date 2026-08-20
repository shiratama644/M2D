import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // `tsconfig.json` uses `jsx: "preserve"` because Next.js mandates it and
  // rewrites the file on every build. Vite/oxc would then leave JSX untouched
  // and fail to parse `.tsx` test files, so configure the JSX transform here
  // explicitly instead of inheriting it from tsconfig.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      // Only measure coverage on the files that currently have tests.
      // Expand this list as new test files are added so thresholds stay
      // meaningful (a broad include with untested files would mask regressions).
      include: [
        'src/lib/helpers.ts',
        'src/lib/utils.ts',
        'src/lib/facets.ts',
        'src/lib/api/client.ts',
        'src/lib/api/modrinth.ts',
        'src/store/useAppStore.ts',
        'src/app/api/v2/[...path]/route.ts',
        'src/app/api/revalidate/route.ts',
        'src/engine/**/*.{ts,tsx}',
      ],
      // The `[...path]` glob is treated as a character class by v8 include,
      // so the proxy route is not counted. Thresholds match the remaining files.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      // Resolve @/ imports to src/ (mirrors tsconfig paths)
      '@/': path.resolve(__dirname, 'src') + '/',
      // Resolve SVG imports to an empty string (raw-loader behaviour in tests)
      '~/': '/src/',
    },
  },
  plugins: [
    {
      // Mock SVG imports as empty strings, mirroring Next.js's webpack
      // `asset/source` rule (next.config.mjs) which returns SVG file contents
      // as a raw string. In production helpers.ts imports e.g. fabric.svg and
      // assigns the result to LOADER_ICON_PATHS; the value is only ever used as
      // an innerHTML string, never executed, so an empty-string mock is
      // behaviourally equivalent and avoids XML-parsing in the test runner.
      name: 'svg-raw-mock',
      load(id) {
        if (id.endsWith('.svg')) return 'export default ""';
      },
    },
  ],
});
