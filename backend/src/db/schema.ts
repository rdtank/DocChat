import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'

// Users table. Documents/chunks/conversations come in later steps (Days 20–26).
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
