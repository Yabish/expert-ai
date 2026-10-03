import { describe, expect, it } from 'vitest';
import { formatMoney, generateDataset, INVENTORY_STALENESS_DAYS } from './generate.js';
import { datasetHash, serializeTable } from './serialize.js';

const tiny = generateDataset({ size: 'tiny', seed: 7 });

describe('determinism', () => {
  it('produces byte-identical output for the same seed', () => {
    expect(datasetHash(generateDataset({ size: 'tiny', seed: 7 }))).toBe(datasetHash(tiny));
  });

  it('produces different output for a different seed', () => {
    expect(datasetHash(generateDataset({ size: 'tiny', seed: 8 }))).not.toBe(datasetHash(tiny));
  });

  it('never depends on the current date', () => {
    expect(tiny.meta.from).toBe('2024-10-01');
    expect(tiny.meta.to).toBe('2026-09-30');
  });
});

describe('referential integrity', () => {
  it('resolves every declared foreign key', () => {
    for (const table of tiny.tables) {
      for (const column of table.columns) {
        if (!column.references) continue;
        const { table: target, column: targetColumn } = column.references;
        const ids = new Set((tiny.rows[target] ?? []).map((row) => row[targetColumn]));
        for (const row of tiny.rows[table.name] ?? []) {
          const value = row[column.name];
          if (value === null) {
            expect(column.nullable, `${table.name}.${column.name} is null`).toBe(true);
          } else {
            expect(ids.has(value), `${table.name}.${column.name}=${String(value)}`).toBe(true);
          }
        }
      }
    }
  });

  it('resolves the undeclared logical join', () => {
    const codes = new Set((tiny.rows.categories ?? []).map((c) => c.code));
    for (const promo of tiny.rows.promotions ?? [])
      expect(codes.has(promo.category_code)).toBe(true);
  });

  it('emits every row with exactly the schema columns, in order', () => {
    for (const table of tiny.tables) {
      const expected = table.columns.map((c) => c.name);
      for (const row of tiny.rows[table.name] ?? []) expect(Object.keys(row)).toEqual(expected);
    }
  });
});

describe('content', () => {
  it('keeps every order inside the window', () => {
    for (const order of tiny.rows.orders ?? []) {
      const day = String(order.ordered_at).slice(0, 10);
      expect(day >= tiny.meta.from && day <= tiny.meta.to).toBe(true);
    }
  });

  it('mixes Arabic-script and Latin customer names', () => {
    const names = (tiny.rows.customers ?? []).map((c) => String(c.full_name));
    expect(names.some((n) => /[؀-ۿ]/.test(n))).toBe(true);
    expect(names.some((n) => /^[A-Za-z .-]+$/.test(n))).toBe(true);
  });

  it('contains nulls in optional customer fields', () => {
    expect((tiny.rows.customers ?? []).some((c) => c.email === null)).toBe(true);
  });

  it('keeps inventory stale by design', () => {
    const latest = (tiny.rows.inventory ?? [])
      .map((r) => String(r.snapshot_date))
      .sort()
      .at(-1);
    const limit = new Date(
      Date.parse(`${tiny.meta.to}T00:00:00Z`) - INVENTORY_STALENESS_DAYS * 86_400_000,
    );
    expect(latest !== undefined && latest <= limit.toISOString().slice(0, 10)).toBe(true);
  });

  it('includes cancelled orders and returns', () => {
    expect((tiny.rows.orders ?? []).some((o) => o.status === 'cancelled')).toBe(true);
    expect((tiny.rows.returns ?? []).length).toBeGreaterThan(0);
  });

  it('serializes every table as JSONL', () => {
    const lines = serializeTable(tiny, 'orders').trimEnd().split('\n');
    expect(lines).toHaveLength(tiny.rows.orders?.length ?? 0);
  });
});

describe('seasonality', () => {
  const small = generateDataset({ size: 'small', seed: 1 });
  const ramadans = small.meta.events.filter((e) => e.id === 'ramadan');
  const inRamadan = (day: string): boolean => ramadans.some((r) => r.start <= day && day <= r.end);
  const sweetsId = (small.rows.categories ?? []).find((c) => c.code === 'sweets')?.id;
  const sweetsProducts = new Set(
    (small.rows.products ?? []).filter((p) => p.category_id === sweetsId).map((p) => p.id),
  );
  const orderDay = new Map(
    (small.rows.orders ?? []).map((o) => [o.id, String(o.ordered_at).slice(0, 10)]),
  );

  it('sells more sweets per day during Ramadan', () => {
    let ramadanQty = 0;
    let otherQty = 0;
    for (const line of small.rows.order_lines ?? []) {
      if (!sweetsProducts.has(line.product_id)) continue;
      const day = orderDay.get(line.order_id) ?? '';
      if (inRamadan(day)) ramadanQty += Number(line.quantity);
      else otherQty += Number(line.quantity);
    }
    const ramadanDays = ramadans.reduce(
      (sum, r) => sum + (Date.parse(r.end) - Date.parse(r.start)) / 86_400_000 + 1,
      0,
    );
    const otherDays = 730 - ramadanDays;
    expect(ramadanQty / ramadanDays).toBeGreaterThan((otherQty / otherDays) * 1.5);
  });

  it('shifts Ramadan orders to the evening', () => {
    const ramadanOrders = (small.rows.orders ?? []).filter((o) =>
      inRamadan(String(o.ordered_at).slice(0, 10)),
    );
    expect(ramadanOrders.every((o) => Number(String(o.ordered_at).slice(11, 13)) >= 19)).toBe(true);
  });
});

describe('helpers', () => {
  it('formats minor units without float error', () => {
    expect(formatMoney(12345)).toBe('123.45');
    expect(formatMoney(5)).toBe('0.05');
    expect(formatMoney(-150)).toBe('-1.50');
  });
});
