import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  phoneNumber: varchar("phone_number").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  name: varchar("name"), // Full name from onboarding
  age: varchar("age"), // Age from onboarding
  wellnessGoals: text("wellness_goals"), // JSON string of selected goals
  preferredTime: varchar("preferred_time"), // When they prefer wellness activities
  motivation: text("motivation"), // Their wellness motivation
  preferredLanguage: varchar("preferred_language").default("en"), // User's preferred language code for conversations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mood: text("mood").notNull(), // 'happy', 'sad', 'anxious', 'calm', 'excited'
  emoji: text("emoji").notNull(),
  note: text("note"),
  rating: integer("rating").notNull(), // 1-5 scale
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(), // 'family', 'friends', 'pets', 'other'
  isFavorite: boolean("is_favorite").default(false),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isFromUser: boolean("is_from_user").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const gratitudeEntries = pgTable("gratitude_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  date: timestamp("date").defaultNow(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  challengeId: varchar("challenge_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  type: varchar("type").notNull(),
  difficulty: varchar("difficulty").notNull(),
  points: integer("points").notNull(),
  icon: varchar("icon"),
  startDate: timestamp("start_date").defaultNow(),
  completedAt: timestamp("completed_at"),
  isActive: boolean("is_active").default(true),
});

export const challengeProgress = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  challengeId: varchar("challenge_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  completed: integer("completed").default(0),
  startDate: timestamp("start_date").defaultNow(),
  lastActivityDate: timestamp("last_activity_date"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  timestamp: true,
});

export const insertMemorySchema = createInsertSchema(memories).omit({
  id: true,
  timestamp: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertGratitudeEntrySchema = createInsertSchema(gratitudeEntries).omit({
  id: true,
  timestamp: true,
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  startDate: true,
});

export const insertChallengeProgressSchema = createInsertSchema(challengeProgress).omit({
  id: true,
  timestamp: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertGratitudeEntry = z.infer<typeof insertGratitudeEntrySchema>;
export type GratitudeEntry = typeof gratitudeEntries.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallengeProgress = z.infer<typeof insertChallengeProgressSchema>;
export type ChallengeProgress = typeof challengeProgress.$inferSelect;
