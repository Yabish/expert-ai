// Proves CLAUDE.md rules 3 and 5 (and the driver and app-DB boundaries) by
// linting probe imports through the real root ESLint config.
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const eslint = new ESLint({ cwd: root });

async function blocked(source, filePath) {
  const [result] = await eslint.lintText(`import * as m from '${source}';\nexport { m };\n`, {
    filePath,
  });
  return (result?.messages ?? []).some((m) => m.ruleId === 'no-restricted-imports');
}

const at = (dir) => `${dir}/src/probe.mjs`;
const CORE = at('packages/core');
const WEB = at('apps/web');
const PROVIDERS = at('packages/providers');
const CONNECTORS = at('packages/connectors');
const STORAGE = at('packages/storage');
const TOOLS = at('tools/sample-data');

/** [source, file, expectedBlocked, why] */
const cases = [
  // Rule 5: packages stay framework-free.
  ['next', CORE, true, 'Next.js in a package'],
  ['next/server', STORAGE, true, 'Next.js subpath in a package'],
  ['next/server', WEB, false, 'Next.js in the web app'],
  ['nextra', CORE, false, 'look-alike of next'],

  // Rule 3: vendor and AI SDKs only in packages/providers.
  ['ai', CORE, true, 'Vercel AI SDK core outside providers'],
  ['@ai-sdk/openai', CORE, true, 'AI SDK provider outside providers'],
  ['openai', WEB, true, 'vendor SDK in the web app'],
  ['@anthropic-ai/sdk', CONNECTORS, true, 'vendor SDK in connectors'],
  ['@google/genai', TOOLS, true, 'vendor SDK in tools'],
  ['ollama', CORE, true, 'local provider SDK outside providers'],
  ['@aws-sdk/client-bedrock-runtime', CORE, true, 'Bedrock client outside providers'],
  ['@ai-sdk/openai', PROVIDERS, false, 'AI SDK inside providers'],
  ['ai', PROVIDERS, false, 'AI SDK core inside providers'],
  ['ai-utils', CORE, false, 'look-alike of ai'],
  ['@aws-sdk/client-s3', CORE, false, 'non-Bedrock AWS client'],

  // Database drivers only in connectors (and the app DB in storage).
  ['pg', CORE, true, 'driver in core'],
  ['mssql', WEB, true, 'driver in the web app'],
  ['mariadb', PROVIDERS, true, 'driver in providers'],
  ['pg-cursor', CORE, true, 'pg helper package in core'],
  ['pg', CONNECTORS, false, 'driver in connectors'],
  ['mssql', CONNECTORS, false, 'driver in connectors'],
  ['pg', STORAGE, false, 'app DB driver in storage'],
  ['better-sqlite3', STORAGE, false, 'app DB driver in storage'],
  ['mssql', STORAGE, true, 'analyzed-source driver in storage'],
  ['mssql', TOOLS, false, 'driver in dev seeders'],
  ['pgvector-like', CORE, false, 'look-alike of pg'],

  // App-DB libraries only in storage.
  ['drizzle-orm', CORE, true, 'ORM outside storage'],
  ['drizzle-orm/pg-core', CONNECTORS, true, 'ORM subpath in connectors'],
  ['drizzle-orm', STORAGE, false, 'ORM in storage'],

  // The Enterprise boundary still holds in every override.
  ['@expert-ai/ee', PROVIDERS, true, 'Enterprise import from providers'],
  ['@expert-ai/ee', CONNECTORS, true, 'Enterprise import from connectors'],
  ['@expert-ai/ee', STORAGE, true, 'Enterprise import from storage'],
  ['@expert-ai/ee', TOOLS, true, 'Enterprise import from tools'],
  ['@expert-ai/ee', WEB, true, 'Enterprise import from the web app'],

  // Enterprise code is still bound by the vendor and driver rules.
  ['openai', 'ee/sso/src/probe.mjs', true, 'vendor SDK in ee/'],
  ['@expert-ai/core', 'ee/sso/src/probe.mjs', false, 'Community import from ee/'],
];

describe('architecture boundaries', () => {
  for (const [source, file, expected, why] of cases) {
    it(`${expected ? 'blocks' : 'allows'} ${source} in ${file.split('/src')[0]} (${why})`, async () => {
      expect(await blocked(source, file)).toBe(expected);
    });
  }
});
