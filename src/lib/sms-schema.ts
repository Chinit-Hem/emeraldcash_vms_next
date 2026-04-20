import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const sms_assets = pgTable('sms_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  item_code: varchar('item_code', { length: 64 }),
  type: varchar('type', { length: 64 }).notNull(),
  category: varchar('category', { length: 64 }),
  quantity: integer('quantity').default(1),
  location: varchar('location', { length: 128 }),
  assigned_to: varchar('assigned_to', { length: 128 }),
  image_url: text('image_url'),
  document_url: text('document_url'),
  description: text('description'),
  refId: varchar('ref_id', { length: 128 }),
  status: varchar('status', { length: 32 }).notNull().default('Available'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sms_transfers = pgTable('sms_transfers', {
  id: uuid('id').defaultRandom().primaryKey(),
  assetId: uuid('asset_id').notNull().references(() => sms_assets.id),
  senderId: integer('sender_id').notNull(),
  receiverId: integer('receiver_id').notNull(),
  location: varchar('location', { length: 128 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  remark: text('remark'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
});

export const sms_transfer_images = pgTable('sms_transfer_images', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  transferId: uuid('transfer_id').notNull().references(() => sms_transfers.id),
  imageUrl: varchar('image_url', { length: 512 }).notNull(),
});

export const sms_audit_logs = pgTable('sms_audit_logs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const smsRelations = relations(sms_assets, ({ many }) => ({
  transfers: many(sms_transfers),
}));

export const transferRelations = relations(sms_transfers, ({ one, many }) => ({
  asset: one(sms_assets, {
    fields: [sms_transfers.assetId],
    references: [sms_assets.id],
  }),
  images: many(sms_transfer_images),
}));

export type SmsAsset = typeof sms_assets.$inferSelect;
export type SmsTransfer = typeof sms_transfers.$inferSelect;
export type SmsTransferImage = typeof sms_transfer_images.$inferSelect;
export type SmsAuditLog = typeof sms_audit_logs.$inferSelect;

