// Dialect-neutral output: schema.json plus one JSONL file per table.
// Seeders read this; key order follows the schema, so output is stable.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Dataset } from './generate.js';

export function serializeTable(dataset: Dataset, table: string): string {
  return (dataset.rows[table] ?? []).map((row) => JSON.stringify(row)).join('\n') + '\n';
}

export function serializeSchema(dataset: Dataset): string {
  const { meta, tables, logicalJoins } = dataset;
  return `${JSON.stringify({ meta, tables, logicalJoins }, null, 2)}\n`;
}

/** SHA-256 over schema and every table, used to prove determinism. */
export function datasetHash(dataset: Dataset): string {
  const hash = createHash('sha256').update(serializeSchema(dataset));
  for (const table of dataset.tables) hash.update(serializeTable(dataset, table.name));
  return hash.digest('hex');
}

export function writeDataset(dataset: Dataset, outDir: string): string[] {
  mkdirSync(outDir, { recursive: true });
  const written = [join(outDir, 'schema.json')];
  writeFileSync(written[0] ?? '', serializeSchema(dataset));
  for (const table of dataset.tables) {
    const file = join(outDir, `${table.name}.jsonl`);
    writeFileSync(file, serializeTable(dataset, table.name));
    written.push(file);
  }
  return written;
}
