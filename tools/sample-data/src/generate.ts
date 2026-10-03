// Generates the synthetic retail dataset (SPEC §13.3): two years ending on
// a fixed anchor date, spanning two Ramadans, with seasonality, promotions,
// returns and a deliberately stale inventory table.
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { addDays, daysBetween, eachDay, weekday } from './dates.js';
import { type EventOccurrence, loadEventDefinitions, resolveEvents } from './events.js';
import {
  arabicFamilyNames,
  arabicFirstNames,
  categorySeeds,
  cities,
  englishFamilyNames,
  englishFirstNames,
  productVariants,
  transliteratedFamilyNames,
  transliteratedFirstNames,
} from './names.js';
import { createRng, type Rng } from './rng.js';
import { type LogicalJoin, retailLogicalJoins, retailTables, type Table } from './schema.js';

export type Value = string | number | boolean | null;
export type Row = Record<string, Value>;

export type DatasetSize = 'tiny' | 'small' | 'default';

export interface GenerateOptions {
  seed?: number;
  size?: DatasetSize;
  /** Last day of data (inclusive). Fixed by default so output never depends on "today". */
  anchor?: string;
  years?: number;
  currency?: string;
}

export interface Dataset {
  meta: {
    seed: number;
    size: DatasetSize;
    from: string;
    to: string;
    currency: string;
    events: EventOccurrence[];
  };
  tables: readonly Table[];
  logicalJoins: readonly LogicalJoin[];
  rows: Record<string, Row[]>;
}

const SIZES: Record<
  DatasetSize,
  { stores: number; productsPerCategory: number; customers: number; ordersPerStoreDay: number }
> = {
  tiny: { stores: 2, productsPerCategory: 3, customers: 80, ordersPerStoreDay: 1.2 },
  small: { stores: 5, productsPerCategory: 8, customers: 600, ordersPerStoreDay: 2.5 },
  default: { stores: 20, productsPerCategory: 50, customers: 12_000, ordersPerStoreDay: 6 },
};

/** Inventory snapshots stop this many days before the anchor (the stale table). */
export const INVENTORY_STALENESS_DAYS = 45;

const SeasonalitySchema = z.object({
  version: z.literal(1),
  weekdayFactors: z.array(z.number().positive()).length(7),
  events: z.record(
    z.string(),
    z.object({
      traffic: z.number().positive(),
      eveningShift: z.boolean().optional(),
      categories: z.record(z.string(), z.number().positive()),
    }),
  ),
  returns: z.object({
    baseRate: z.number().min(0).max(1),
    spikeAfterEvent: z.string(),
    spikeDays: z.number().int().positive(),
    spikeRate: z.number().min(0).max(1),
  }),
  cancellationRate: z.number().min(0).max(1),
  promoLift: z.number().positive(),
});
type Seasonality = z.infer<typeof SeasonalitySchema>;

export function loadSeasonality(
  path = new URL('../data/seasonality.json', import.meta.url),
): Seasonality {
  return SeasonalitySchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

/** Integer minor units (halalas) → "123.45". Money is never a float. */
export function formatMoney(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}${String(Math.trunc(abs / 100))}.${String(abs % 100).padStart(2, '0')}`;
}

interface Category {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
}

interface Product {
  id: number;
  sku: string;
  nameEn: string;
  nameAr: string;
  categoryId: number;
  priceMinor: number;
  costMinor: number;
  uom: string;
  active: boolean;
}

interface Store {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
  cityEn: string;
  cityAr: string;
  openedOn: string;
}

interface Customer {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  cityEn: string;
  loyaltyTier: string | null;
  createdAt: string;
}

interface Promotion {
  id: number;
  nameEn: string;
  nameAr: string;
  categoryCode: string;
  discountBasisPoints: number;
  startsOn: string;
  endsOn: string;
}

const pad = (value: number, width: number): string => String(value).padStart(width, '0');
const timestamp = (day: string, hour: number, minute: number): string =>
  `${day}T${pad(hour, 2)}:${pad(minute, 2)}:00`;

export function generateDataset(options: GenerateOptions = {}): Dataset {
  const seed = options.seed ?? 42;
  const size = options.size ?? 'default';
  const anchor = options.anchor ?? '2026-09-30';
  const years = options.years ?? 2;
  const currency = options.currency ?? 'SAR';
  const params = SIZES[size];
  const from = addDays(anchor, -365 * years + 1);
  const rng = createRng(seed);
  const seasonality = loadSeasonality();
  const events = resolveEvents(loadEventDefinitions(), from, anchor);

  const categories = buildCategories();
  const products = buildProducts(rng, params.productsPerCategory, categories);
  const stores = buildStores(rng, params.stores, from);
  const customers = buildCustomers(rng, params.customers, from, anchor);
  const promotions = buildPromotions(rng, events, seasonality, categories);
  const productsByCategory = new Map(
    categories.map((c) => [c.id, products.filter((p) => p.categoryId === c.id)]),
  );

  const activePromotion = (day: string, categoryCode: string): Promotion | undefined =>
    promotions.find((p) => p.categoryCode === categoryCode && p.startsOn <= day && day <= p.endsOn);
  const returnSpikes = events
    .filter((event) => event.id === seasonality.returns.spikeAfterEvent)
    .map((event) => ({ start: event.end, end: addDays(event.end, seasonality.returns.spikeDays) }));

  const orders: Row[] = [];
  const orderLines: Row[] = [];
  const returns: Row[] = [];

  for (const day of eachDay(from, anchor)) {
    const effects = events
      .filter((event) => event.start <= day && day <= event.end)
      .flatMap((event) => {
        const effect = seasonality.events[event.id];
        return effect ? [effect] : [];
      });
    const traffic =
      (seasonality.weekdayFactors[weekday(day)] ?? 1) *
      effects.reduce((product, effect) => product * effect.traffic, 1);
    const eveningShift = effects.some((effect) => effect.eveningShift === true);
    const categoryWeight = (code: string): number =>
      effects.reduce((product, effect) => product * (effect.categories[code] ?? 1), 1) *
      (activePromotion(day, code) ? seasonality.promoLift : 1);
    const returnRate = returnSpikes.some((s) => s.start < day && day <= s.end)
      ? seasonality.returns.spikeRate
      : seasonality.returns.baseRate;

    for (const store of stores) {
      if (store.openedOn > day) continue;
      const count = Math.round(params.ordersPerStoreDay * traffic * (0.8 + 0.4 * rng.next()));

      for (let n = 0; n < count; n++) {
        const orderId = orders.length + 1;
        const customer = rng.chance(0.7) ? rng.pick(customers) : undefined;
        const customerId = customer && customer.createdAt.slice(0, 10) <= day ? customer.id : null;
        // During Ramadan, shopping moves to after iftar.
        const hour = eveningShift
          ? rng.int(19, 23)
          : rng.weighted([9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 23], (h) =>
              h >= 17 ? 2 : 1,
            );
        const status = rng.chance(seasonality.cancellationRate) ? 'cancelled' : 'completed';
        const lineCount = rng.weighted([1, 2, 3, 4, 5], (k) => [40, 30, 18, 8, 4][k - 1] ?? 1);
        let total = 0;

        for (let l = 0; l < lineCount; l++) {
          const category = rng.weighted(categories, (c) => categoryWeight(c.code));
          const product = rng.pick(productsByCategory.get(category.id) ?? []);
          const bulk = category.code === 'food' || category.code === 'beverages';
          const quantity = bulk ? rng.int(1, 6) : rng.int(1, 2);
          const promo = activePromotion(day, category.code);
          const gross = product.priceMinor * quantity;
          const discount = promo ? Math.round((gross * promo.discountBasisPoints) / 10_000) : 0;
          const lineTotal = gross - discount;
          total += lineTotal;
          const lineId = orderLines.length + 1;
          orderLines.push({
            id: lineId,
            order_id: orderId,
            product_id: product.id,
            promotion_id: promo ? promo.id : null,
            quantity,
            unit_price: formatMoney(product.priceMinor),
            discount_amount: formatMoney(discount),
            line_total: formatMoney(lineTotal),
          });

          if (status === 'completed' && rng.chance(returnRate)) {
            const returnedDay = addDays(day, rng.int(1, 14));
            if (returnedDay <= anchor) {
              const returnedQty = rng.int(1, quantity);
              returns.push({
                id: returns.length + 1,
                order_line_id: lineId,
                returned_at: timestamp(returnedDay, rng.int(10, 21), rng.int(0, 59)),
                quantity: returnedQty,
                refund_amount: formatMoney(Math.round((lineTotal * returnedQty) / quantity)),
                reason: rng.pick(['defective', 'wrong_size', 'changed_mind', 'damaged']),
              });
            }
          }
        }

        orders.push({
          id: orderId,
          store_id: store.id,
          customer_id: customerId,
          ordered_at: timestamp(day, hour, rng.int(0, 59)),
          status,
          currency,
          total_amount: formatMoney(total),
        });
      }
    }
  }

  return {
    meta: { seed, size, from, to: anchor, currency, events },
    tables: retailTables,
    logicalJoins: retailLogicalJoins,
    rows: {
      categories: categories.map((c) => ({
        id: c.id,
        code: c.code,
        name_en: c.nameEn,
        name_ar: c.nameAr,
      })),
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name_en: p.nameEn,
        name_ar: p.nameAr,
        category_id: p.categoryId,
        unit_price: formatMoney(p.priceMinor),
        unit_cost: formatMoney(p.costMinor),
        uom: p.uom,
        active: p.active,
      })),
      stores: stores.map((s) => ({
        id: s.id,
        code: s.code,
        name_en: s.nameEn,
        name_ar: s.nameAr,
        city_en: s.cityEn,
        city_ar: s.cityAr,
        opened_on: s.openedOn,
      })),
      customers: customers.map((c) => ({
        id: c.id,
        full_name: c.fullName,
        email: c.email,
        phone: c.phone,
        city_en: c.cityEn,
        loyalty_tier: c.loyaltyTier,
        created_at: c.createdAt,
      })),
      promotions: promotions.map((p) => ({
        id: p.id,
        name_en: p.nameEn,
        name_ar: p.nameAr,
        category_code: p.categoryCode,
        // Basis points → percentage with two decimals (1500 → "15.00").
        discount_pct: formatMoney(p.discountBasisPoints),
        starts_on: p.startsOn,
        ends_on: p.endsOn,
      })),
      orders,
      order_lines: orderLines,
      returns,
      inventory: buildInventory(rng, stores, products, categories, from, anchor),
    },
  };
}

function buildCategories(): Category[] {
  return categorySeeds.map((seed, index) => ({
    id: index + 1,
    code: seed.code,
    nameEn: seed.en,
    nameAr: seed.ar,
  }));
}

function buildProducts(rng: Rng, perCategory: number, categories: readonly Category[]): Product[] {
  const products: Product[] = [];
  categorySeeds.forEach((seed, categoryIndex) => {
    const category = categories[categoryIndex];
    if (!category) return;
    for (let i = 0; i < perCategory; i++) {
      const [itemEn, itemAr] = seed.items[i % seed.items.length] ?? ['Item', 'منتج'];
      const round = Math.floor(i / seed.items.length);
      const [variantEn, variantAr] = productVariants[round % productVariants.length] ?? ['', ''];
      const edition = round >= productVariants.length ? ` ${String(round)}` : '';
      const priceMinor = rng.int(seed.price[0] * 100, seed.price[1] * 100);
      products.push({
        id: products.length + 1,
        sku: `${seed.code.slice(0, 3).toUpperCase()}-${pad(i + 1, 4)}`,
        nameEn: `${variantEn} ${itemEn}${edition}`,
        nameAr: `${itemAr} ${variantAr}${edition}`,
        categoryId: category.id,
        priceMinor,
        costMinor: Math.round(priceMinor * (0.55 + 0.25 * rng.next())),
        uom: seed.uom,
        active: rng.chance(0.95),
      });
    }
  });
  return products;
}

function buildStores(rng: Rng, count: number, from: string): Store[] {
  const perCity = new Map<string, number>();
  return Array.from({ length: count }, (_, index) => {
    const city = rng.weighted(cities, (c) => c.weight);
    const n = (perCity.get(city.en) ?? 0) + 1;
    perCity.set(city.en, n);
    // The last store opens mid-window, so "since it opened" questions have data to answer.
    const openedOn =
      index === count - 1 && count > 1 ? addDays(from, 300) : addDays(from, -rng.int(200, 2000));
    return {
      id: index + 1,
      code: `ST${pad(index + 1, 3)}`,
      nameEn: `${city.en} Branch ${String(n)}`,
      nameAr: `فرع ${city.ar} ${String(n)}`,
      cityEn: city.en,
      cityAr: city.ar,
      openedOn,
    };
  });
}

function buildCustomers(rng: Rng, count: number, from: string, anchor: string): Customer[] {
  const span = daysBetween(addDays(from, -365), anchor);
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const style = rng.next();
    let fullName: string;
    let emailLocal: string;
    if (style < 0.6) {
      fullName = `${rng.pick(arabicFirstNames)} ${rng.pick(arabicFamilyNames)}`;
      emailLocal = `customer${String(id)}`;
    } else {
      const latinArabic = style < 0.85;
      const first = rng.pick(latinArabic ? transliteratedFirstNames : englishFirstNames);
      const last = rng.pick(latinArabic ? transliteratedFamilyNames : englishFamilyNames);
      fullName = `${first} ${last}`;
      emailLocal = `${first}.${last}${String(id)}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
    }
    const created = addDays(from, -365 + rng.int(0, span));
    return {
      id,
      fullName,
      email: rng.chance(0.25) ? null : `${emailLocal}@example.com`,
      phone: rng.chance(0.15) ? null : `+9665${pad(rng.int(0, 99_999_999), 8)}`,
      cityEn: rng.weighted(cities, (c) => c.weight).en,
      loyaltyTier: rng.chance(0.4) ? null : rng.pick(['silver', 'gold', 'platinum']),
      createdAt: timestamp(created, rng.int(8, 22), rng.int(0, 59)),
    };
  });
}

function buildPromotions(
  rng: Rng,
  events: readonly EventOccurrence[],
  seasonality: Seasonality,
  categories: readonly Category[],
): Promotion[] {
  const promotions: Promotion[] = [];
  for (const event of events) {
    const effect = seasonality.events[event.id];
    if (!effect) continue;
    // Promote the category the event lifts most.
    const [code] = Object.entries(effect.categories).sort((a, b) => b[1] - a[1])[0] ?? [];
    const category = categories.find((c) => c.code === code);
    if (!category) continue;
    promotions.push({
      id: promotions.length + 1,
      nameEn: `${event.nameEn} ${category.nameEn} offer`,
      nameAr: `عرض ${event.nameAr} على ${category.nameAr}`,
      categoryCode: category.code,
      discountBasisPoints: rng.int(10, 30) * 100,
      startsOn: event.start,
      endsOn: event.end,
    });
  }
  return promotions;
}

function buildInventory(
  rng: Rng,
  stores: readonly Store[],
  products: readonly Product[],
  categories: readonly Category[],
  from: string,
  anchor: string,
): Row[] {
  const lastSnapshot = addDays(anchor, -INVENTORY_STALENESS_DAYS);
  const snapshots = eachDay(from, lastSnapshot).filter((day) => day.endsWith('-01'));
  const bulk = new Set(
    categories.filter((c) => c.code === 'food' || c.code === 'beverages').map((c) => c.id),
  );
  const rows: Row[] = [];
  for (const snapshotDate of snapshots) {
    for (const store of stores) {
      if (store.openedOn > snapshotDate) continue;
      for (const product of products) {
        rows.push({
          id: rows.length + 1,
          store_id: store.id,
          product_id: product.id,
          snapshot_date: snapshotDate,
          quantity_on_hand: bulk.has(product.categoryId) ? rng.int(0, 400) : rng.int(0, 60),
        });
      }
    }
  }
  return rows;
}
