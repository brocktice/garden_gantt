// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // SCH-03: ban raw `new Date()` outside src/domain/dateWrappers.ts
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    ignores: ['src/domain/dateWrappers.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            'Direct `new Date(...)` is forbidden outside src/domain/dateWrappers.ts. Use parseDate() from dateWrappers instead.',
        },
      ],
    },
  },
  {
    // Allow `new Date()` (no-arg "today" reads) in features/gantt/** for the
    // Today-indicator render concern only (timeScale.todayX, GanttView's render-time
    // today read). Widened from GanttView.tsx-only to features/gantt/** in Plan 08
    // because timeScale.ts also performs the same UI-only today read per the locked
    // API surface (RESEARCH.md §Open Questions Q5). Engine-side code (src/domain/,
    // src/data/, src/stores/) still rejects `new Date()` (T-01-36 mitigation).
    files: ['src/features/gantt/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Build-tool configs run in Node and may legitimately use `new Date()`.
    // scripts/**/*.ts are Node-only build scripts (Plan 02-02 acquire/build pipeline).
    files: ['vite.config.ts', 'vitest.config.ts', 'eslint.config.js', 'scripts/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Node-only build scripts: relax browser-globals expectation.
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // shadcn-style UI primitives in src/ui/** re-export Radix primitives directly
    // (e.g., `export const Dialog = DialogPrimitive.Root`). The react-refresh rule
    // flags any non-component export, but these passthroughs are inert references
    // to upstream components — Fast Refresh works fine. Disable the rule for src/ui.
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
]);
