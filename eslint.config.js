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
    // Allow `new Date()` (no-arg "today" reads) in features/gantt/GanttView.tsx
    // for the Today-indicator render concern only. Plan 08 documents this exception.
    files: ['src/features/gantt/GanttView.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Build-tool configs run in Node and may legitimately use `new Date()`.
    files: ['vite.config.ts', 'vitest.config.ts', 'eslint.config.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
