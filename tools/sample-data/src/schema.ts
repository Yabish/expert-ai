// Dialect-neutral schema for the retail dataset. Seeders map these types
// to each database (for example `text` becomes NVARCHAR on SQL Server so
// Arabic round-trips).

export type ColumnType = 'int' | 'decimal' | 'text' | 'date' | 'timestamp' | 'bool';

export interface Column {
  name: string;
  type: ColumnType;
  nullable?: boolean;
  /** [precision, scale] for decimals. */
  decimal?: readonly [number, number];
  maxLength?: number;
  references?: { table: string; column: string };
}

export interface Table {
  name: string;
  description: string;
  columns: readonly Column[];
  primaryKey: readonly string[];
}

export interface LogicalJoin {
  from: { table: string; column: string };
  to: { table: string; column: string };
  description: string;
}

const money = { type: 'decimal', decimal: [14, 2] } as const;
const id = { name: 'id', type: 'int' } as const;
const ref = (name: string, table: string, nullable = false): Column => ({
  name,
  type: 'int',
  nullable,
  references: { table, column: 'id' },
});

export const retailTables: readonly Table[] = [
  {
    name: 'categories',
    description: 'Product categories',
    primaryKey: ['id'],
    columns: [
      id,
      { name: 'code', type: 'text', maxLength: 32 },
      { name: 'name_en', type: 'text', maxLength: 100 },
      { name: 'name_ar', type: 'text', maxLength: 100 },
    ],
  },
  {
    name: 'products',
    description: 'Sellable items',
    primaryKey: ['id'],
    columns: [
      id,
      { name: 'sku', type: 'text', maxLength: 32 },
      { name: 'name_en', type: 'text', maxLength: 200 },
      { name: 'name_ar', type: 'text', maxLength: 200 },
      ref('category_id', 'categories'),
      { name: 'unit_price', ...money },
      { name: 'unit_cost', ...money },
      { name: 'uom', type: 'text', maxLength: 16 },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'stores',
    description: 'Physical stores (the branch dimension)',
    primaryKey: ['id'],
    columns: [
      id,
      { name: 'code', type: 'text', maxLength: 16 },
      { name: 'name_en', type: 'text', maxLength: 100 },
      { name: 'name_ar', type: 'text', maxLength: 100 },
      { name: 'city_en', type: 'text', maxLength: 64 },
      { name: 'city_ar', type: 'text', maxLength: 64 },
      { name: 'opened_on', type: 'date' },
    ],
  },
  {
    name: 'customers',
    description: 'Registered customers; walk-in sales have no customer',
    primaryKey: ['id'],
    columns: [
      id,
      { name: 'full_name', type: 'text', maxLength: 200 },
      { name: 'email', type: 'text', maxLength: 200, nullable: true },
      { name: 'phone', type: 'text', maxLength: 32, nullable: true },
      { name: 'city_en', type: 'text', maxLength: 64 },
      { name: 'loyalty_tier', type: 'text', maxLength: 16, nullable: true },
      { name: 'created_at', type: 'timestamp' },
    ],
  },
  {
    name: 'promotions',
    description: 'Category-wide discounts; linked to categories by code, with no declared FK',
    primaryKey: ['id'],
    columns: [
      id,
      { name: 'name_en', type: 'text', maxLength: 200 },
      { name: 'name_ar', type: 'text', maxLength: 200 },
      { name: 'category_code', type: 'text', maxLength: 32 },
      { name: 'discount_pct', type: 'decimal', decimal: [5, 2] },
      { name: 'starts_on', type: 'date' },
      { name: 'ends_on', type: 'date' },
    ],
  },
  {
    name: 'orders',
    description: 'Sales tickets; cancelled orders stay in the table',
    primaryKey: ['id'],
    columns: [
      id,
      ref('store_id', 'stores'),
      ref('customer_id', 'customers', true),
      { name: 'ordered_at', type: 'timestamp' },
      { name: 'status', type: 'text', maxLength: 16 },
      { name: 'currency', type: 'text', maxLength: 3 },
      { name: 'total_amount', ...money },
    ],
  },
  {
    name: 'order_lines',
    description: 'Items on an order',
    primaryKey: ['id'],
    columns: [
      id,
      ref('order_id', 'orders'),
      ref('product_id', 'products'),
      ref('promotion_id', 'promotions', true),
      { name: 'quantity', type: 'int' },
      { name: 'unit_price', ...money },
      { name: 'discount_amount', ...money },
      { name: 'line_total', ...money },
    ],
  },
  {
    name: 'returns',
    description: 'Returned quantities against an order line',
    primaryKey: ['id'],
    columns: [
      id,
      ref('order_line_id', 'order_lines'),
      { name: 'returned_at', type: 'timestamp' },
      { name: 'quantity', type: 'int' },
      { name: 'refund_amount', ...money },
      { name: 'reason', type: 'text', maxLength: 32 },
    ],
  },
  {
    name: 'inventory',
    description: 'Monthly stock snapshots per store and product; intentionally stale',
    primaryKey: ['id'],
    columns: [
      id,
      ref('store_id', 'stores'),
      ref('product_id', 'products'),
      { name: 'snapshot_date', type: 'date' },
      { name: 'quantity_on_hand', type: 'int' },
    ],
  },
];

export const retailLogicalJoins: readonly LogicalJoin[] = [
  {
    from: { table: 'promotions', column: 'category_code' },
    to: { table: 'categories', column: 'code' },
    description: 'Undeclared on purpose, so context selection must discover it',
  },
];
