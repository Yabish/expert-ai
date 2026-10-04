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

const packageNames = (names) => `^(${names.join('|')})(/|$)`;

// Import groups (CLAUDE.md rules 3, 5 and 10). no-restricted-imports options
// are replaced wholesale by each flat-config override, so every directory
// composes the full list of groups it must still respect.
const importGroups = {
  enterprise: { regex: ENTERPRISE_IMPORT, message: enterpriseMessage },
  next: {
    regex: packageNames(['next']),
    message: 'Packages stay framework-free; only apps/web may import Next.js (CLAUDE.md rule 5).',
  },
  aiSdks: {
    regex: packageNames([
      'ai',
      '@ai-sdk/[^/]+',
      'openai',
      '@anthropic-ai/[^/]+',
      '@google/genai',
      '@google/generative-ai',
      '@google-cloud/vertexai',
      '@mistralai/[^/]+',
      'cohere-ai',
      'groq-sdk',
      'ollama',
      '@aws-sdk/client-bedrock[^/]*',
    ]),
    message:
      'Vendor and AI SDKs live only in packages/providers; use the provider abstraction (CLAUDE.md rule 3).',
  },
  sourceDrivers: {
    regex: packageNames(['mysql2', 'mariadb', 'mssql', 'tedious', 'oracledb', 'mongodb']),
    message:
      'Database drivers live only in packages/connectors (connectors execute guarded queries).',
  },
  appDbDrivers: {
    regex: packageNames(['pg', 'pg-[^/]+', 'better-sqlite3']),
    message:
      'Database drivers live only in packages/connectors, or packages/storage for the app DB.',
  },
  appDbLibraries: {
    regex: packageNames(['drizzle-orm', 'drizzle-kit', 'sqlite-vec', 'pgvector']),
    message: 'App-DB libraries live only in packages/storage.',
  },
};

const restrictImports = (...groups) => [
  'error',
  { patterns: groups.map((group) => importGroups[group]) },
];

const allDrivers = ['sourceDrivers', 'appDbDrivers'];

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
      'no-restricted-imports': restrictImports(
        'enterprise',
        'aiSdks',
        ...allDrivers,
        'appDbLibraries',
      ),
    },
  },
  {
    files: ['packages/**'],
    rules: {
      'no-restricted-imports': restrictImports(
        'enterprise',
        'next',
        'aiSdks',
        ...allDrivers,
        'appDbLibraries',
      ),
    },
  },
  {
    files: ['packages/providers/**'],
    rules: {
      'no-restricted-imports': restrictImports(
        'enterprise',
        'next',
        ...allDrivers,
        'appDbLibraries',
      ),
    },
  },
  {
    files: ['packages/connectors/**'],
    rules: {
      'no-restricted-imports': restrictImports('enterprise', 'next', 'aiSdks', 'appDbLibraries'),
    },
  },
  {
    // The app DB is Postgres or SQLite (SPEC §12); analyzed sources stay in connectors.
    files: ['packages/storage/**'],
    rules: {
      'no-restricted-imports': restrictImports('enterprise', 'next', 'aiSdks', 'sourceDrivers'),
    },
  },
  {
    // Dev tooling (seeders) loads sample data straight into the dev databases.
    files: ['tools/**', 'scripts/**'],
    rules: { 'no-restricted-imports': restrictImports('enterprise', 'aiSdks', 'appDbLibraries') },
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
      'no-restricted-imports': restrictImports('aiSdks', ...allDrivers, 'appDbLibraries'),
      'no-restricted-syntax': ['error', noDefaultExport],
    },
  },
);
