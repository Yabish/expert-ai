// pnpm --filter @expert-ai/sample-data generate -- --size small --seed 42 --out .cache/sample-data
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { generateDataset } from './generate.js';
import { datasetHash, writeDataset } from './serialize.js';

const ArgsSchema = z.object({
  size: z.enum(['tiny', 'small', 'default']),
  seed: z.coerce.number().int().nonnegative(),
  out: z.string().min(1),
  anchor: z.iso.date().optional(),
});

const { values } = parseArgs({
  options: {
    size: { type: 'string', default: 'default' },
    seed: { type: 'string', default: '42' },
    out: { type: 'string', default: '.cache/sample-data' },
    anchor: { type: 'string' },
  },
});
const args = ArgsSchema.parse(values);

const dataset = generateDataset({
  size: args.size,
  seed: args.seed,
  ...(args.anchor ? { anchor: args.anchor } : {}),
});
writeDataset(dataset, args.out);
for (const table of dataset.tables) {
  console.log(`${table.name.padEnd(12)} ${String(dataset.rows[table.name]?.length ?? 0)}`);
}
console.log(
  `${dataset.meta.from} → ${dataset.meta.to}  sha256 ${datasetHash(dataset)}  → ${args.out}`,
);
