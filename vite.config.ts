// vite.config.ts
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    snapshotFormat: {
      printBasicPrototype: false,
    },
    // Centralize all snapshot files under tests/__snapshots__/ regardless of test
    // file location (Plan 01-05 SCH-08 acceptance criterion).
    resolveSnapshotPath: (testPath, snapExt) =>
      path.join(
        path.resolve(__dirname, 'tests/__snapshots__'),
        `${path.basename(testPath)}${snapExt}`,
      ),
  },
});
