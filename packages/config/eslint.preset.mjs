// Shared ESLint flat config. Type-aware rules apply to TypeScript; JS
// (scripts, config files) gets the syntactic rules only.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const noDefaultExport = {
  selector: 'ExportDefaultDeclaration',
  message: 'Use named exports (CLAUDE.md code conventions).',
};

export const ignores = [
  '**/dist/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.next/**',
  '**/node_modules/**',
];

export const config = defineConfig(
  { ignores },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-restricted-syntax': ['error', noDefaultExport],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // Tools (ESLint, Vitest, Prettier, Next.js) require a default export here.
    files: ['**/*.config.{js,mjs,cjs,ts,mts}', '**/*.preset.mjs'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
