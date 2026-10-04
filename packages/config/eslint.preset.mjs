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

// Open-core boundary (CLAUDE.md rule 10, ADR-0002): only ee/ and packs-ee/
// may import Enterprise code. Matches relative paths through those folders,
// the @expert-ai/ee* and @expert-ai/packs-ee* packages, and @ee/ aliases.
export const ENTERPRISE_IMPORT = String.raw`(^|/)(ee|packs-ee)(/|$)|^@expert-ai/(ee|packs-ee)(-|/|$)|^@ee(/|$)`;

const enterpriseMessage =
  'Community code must not import Enterprise code (ee/, packs-ee/). Attach through a Community extension point instead (CLAUDE.md rule 10, ADR-0002).';

// esquery regex literals cannot contain "/", so slashes are written as \x2F.
const enterpriseRegex = ENTERPRISE_IMPORT.replaceAll('/', String.raw`\x2F`);
const noEnterpriseSyntax = [
  { selector: `ImportExpression[source.value=/${enterpriseRegex}/]`, message: enterpriseMessage },
  {
    selector: `CallExpression[callee.name='require'][arguments.0.value=/${enterpriseRegex}/]`,
    message: enterpriseMessage,
  },
];

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
      'no-restricted-syntax': ['error', noDefaultExport, ...noEnterpriseSyntax],
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: ENTERPRISE_IMPORT, message: enterpriseMessage }] },
      ],
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
    rules: { 'no-restricted-syntax': ['error', ...noEnterpriseSyntax] },
  },
  {
    // Enterprise code may import Community code and other Enterprise code.
    files: ['ee/**', 'packs-ee/**'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': ['error', noDefaultExport],
    },
  },
);
