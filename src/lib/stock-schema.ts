import { pgTable, serial, varchar, integer, timestamp, boolean, text, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Stock Items table
export const stock_items = pgTable('stock_items', {
  id: serial('id').primaryKey(),
  model_key: varchar('model_key', { length: 128 }).notNull().unique(),
  location: varchar('location', { length: 64 }).notNull(),
  quantity: integer('quantity').notNull().default(0),
  min_stock: integer('min_stock').notNull().default(5),
  available: integer('available').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),
  last_updated: timestamp('last_updated').notNull().defaultNow(),
  brand: varchar('brand', { length: 64 }).notNull(),
  model: varchar('model', { length: 128 }).notNull(),
  year: integer('year'),
  condition: varchar('condition', { length: 32 }).notNull(),
  color: varchar('color', { length: 32 }).notNull(),
  is_low_stock: boolean('is_low_stock').notNull().default(false),
}, (table) => ({
  modelKeyIdx: index('stock_items_model_key_idx').on(table.model_key),
  locationIdx: index('stock_items_location_idx').on(table.location),
  lowStockIdx: index('stock_items_low_stock_idx').on(table.is_low_stock),
}));

// Stock Movements table
export const stock_movements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  stock_item_id: integer('stock_item_id').notNull().references(() => stock_items.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 10 }).notNull(), // IN, OUT, ADJUST, TRANSFER
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  user_id: integer('user_id'),
  from_location: varchar('from_location', { length: 64 }),
  to_location: varchar('to_location', { length:64 }),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  itemIdIdx: index('stock_movements_item_id_idx').on(table.stock_item_id),
  typeIdx: index('stock_movements_type_idx').on(table.type),
  createdIdx: index('stock_movements_created_idx').on(table.created_at),
}));

// Relations
export const stockRelations = relations(stock_items, ({ many }) => ({
  movements: many(stock_movements),
}));

export const movementRelations = relations(stock_movements, ({ one }) => ({
  stockItem: one(stock_items, {
    fields: [stock_movements.stock_item_id],
    references: [stock_items.id],
  }),
}));

// Types for queries
export type StockItemTable = typeof stock_items.$inferSelect;
export type StockMovementTable = typeof stock_movements.$inferSelect;
export type NewStockItem = typeof stock_items.$inferInsert;
export type NewStockMovement = typeof stock_movements.$inferInsert;

