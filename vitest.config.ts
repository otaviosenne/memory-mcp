import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
      exclude: [
        'src/web/public/**',
        'src/web/server.ts',
        'src/index.ts',
        'src/tools/delete.ts',
        'src/tools/graph.ts',
        'src/tools/list.ts',
        'src/tools/open-graph.ts',
        'src/tools/read.ts',
        'src/tools/save.ts',
        'src/tools/search.ts',
        'src/tools/stats.ts',
        'src/types/index.ts',
        'vitest.config.ts',
        'tests/**',
        'dist/**',
      ],
    },
  },
});
