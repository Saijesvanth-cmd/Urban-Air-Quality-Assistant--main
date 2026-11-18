import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const householdProfiles = pgTable('household_profiles', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  profileName: text('profile_name').notNull(),
  demographics: text('demographics').notNull(),
  sensitivityLevel: text('sensitivity_level').notNull(),
  safeIndoorPm25Target: integer('safe_indoor_pm25_target').default(25).notNull(),
  notes: text('notes').default('').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const searchQueries = pgTable('search_queries', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  cityId: text('city_id').notNull(),
  cityName: text('city_name').notNull(),
  aqi: integer('aqi').notNull(),
  pm25: integer('pm25').notNull(),
  windKmh: integer('wind_kmh').notNull(),
  queryText: text('query_text').notNull(),
  aiSummary: text('ai_summary').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customRoutines = pgTable('custom_routines', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  pm25ReductionUg: integer('pm25_reduction_ug').default(15).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  householdProfiles: many(householdProfiles),
  searchQueries: many(searchQueries),
  customRoutines: many(customRoutines),
}));

export const householdProfilesRelations = relations(householdProfiles, ({ one }) => ({
  user: one(users, {
    fields: [householdProfiles.userUid],
    references: [users.uid],
  }),
}));

export const searchQueriesRelations = relations(searchQueries, ({ one }) => ({
  user: one(users, {
    fields: [searchQueries.userUid],
    references: [users.uid],
  }),
}));

export const customRoutinesRelations = relations(customRoutines, ({ one }) => ({
  user: one(users, {
    fields: [customRoutines.userUid],
    references: [users.uid],
  }),
}));
