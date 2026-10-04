// Proves the open-core boundary (CLAUDE.md rule 10) by linting probe
// sources through the real root ESLint config.
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const eslint = new ESLint({ cwd: root });
const BOUNDARY_RULES = new Set(['no-restricted-imports', 'no-restricted-syntax']);

/** Rule ids of boundary violations reported for `code` at `filePath`. */
async function violations(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId !== null && BOUNDARY_RULES.has(m.ruleId))
    .map((m) => m.ruleId);
}

describe('Community code cannot import Enterprise code', () => {
  const blocked = [
    ['relative path into ee/', "import { a } from '../../../ee/license/index.js';"],
    ['relative path into packs-ee/', "import { a } from '../../packs-ee/accounting/loader.js';"],
    ['package name', "import { a } from '@expert-ai/ee';"],
    ['package name with suffix', "import { a } from '@expert-ai/ee-sso';"],
    ['enterprise packs package', "import { a } from '@expert-ai/packs-ee';"],
    ['path alias', "import { a } from '@ee/sso';"],
    ['re-export', "export { a } from '../../ee/x.js';"],
    ['export all', "export * from '@expert-ai/ee/sso';"],
    ['dynamic import', "export const m = await import('../../ee/x.js');"],
    ['require', "export const m = require('../../packs-ee/x');"],
  ];

  for (const [name, code] of blocked) {
    for (const file of [
      'packages/core/src/probe.mjs',
      'apps/web/src/probe.mjs',
      'tools/sample-data/src/probe.mjs',
      'scripts/probe.mjs',
    ]) {
      it(`blocks ${name} from ${file.split('/')[0]}/`, async () => {
        expect(await violations(code, file)).not.toHaveLength(0);
      });
    }
  }

  it('allows Enterprise code to import Community code', async () => {
    const code =
      "import { a } from '@expert-ai/core';\nimport { b } from '../../ee/shared.js';\nexport { a, b };";
    expect(await violations(code, 'ee/sso/src/probe.mjs')).toEqual([]);
    expect(await violations(code, 'packs-ee/tools/probe.mjs')).toEqual([]);
  });

  it('does not flag look-alike names', async () => {
    const code = [
      "import { a } from '../free/x.js';",
      "import { b } from '@expert-ai/eel';",
      "import { c } from './employee.js';",
      "import { d } from '@expert-ai/core/fee';",
      'export { a, b, c, d };',
    ].join('\n');
    expect(await violations(code, 'packages/core/src/probe.mjs')).toEqual([]);
  });

  it('still allows default exports only in tool config files', async () => {
    expect(await violations('export default {};', 'packages/core/src/probe.mjs')).toEqual([
      'no-restricted-syntax',
    ]);
    expect(await violations('export default {};', 'packages/core/vitest.config.mjs')).toEqual([]);
    expect(
      await violations(
        "export default await import('../../ee/x.js');",
        'packages/core/vitest.config.mjs',
      ),
    ).toEqual(['no-restricted-syntax']);
  });
});
