import {
  users,
  moodEntries,
  memories,
  chatMessages,
  gratitudeEntries,
  challenges,
  challengeProgress,
  type User,
  type UpsertUser,
  type MoodEntry,
  type InsertMoodEntry,
  type Memory,
  type InsertMemory,
  type ChatMessage,
  type InsertChatMessage,
  type GratitudeEntry,
  type InsertGratitudeEntry,
  type Challenge,
  type ChallengeProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  createMoodEntry(moodEntry: InsertMoodEntry): Promise<MoodEntry>;
  getMoodEntriesByUser(userId: string): Promise<MoodEntry[]>;
  getRecentMoodEntry(userId: string): Promise<MoodEntry | undefined>;
  
  createMemory(memory: InsertMemory): Promise<Memory>;
  getMemoriesByUser(userId: string): Promise<Memory[]>;
  getMemoriesByCategory(userId: string, category: string): Promise<Memory[]>;
  updateMemoryFavorite(id: number, isFavorite: boolean): Promise<Memory | undefined>;
  
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByUser(userId: string): Promise<ChatMessage[]>;
  
  createGratitudeEntry(entry: InsertGratitudeEntry): Promise<GratitudeEntry>;
  getGratitudeEntriesByUser(userId: string): Promise<GratitudeEntry[]>;
  
  getActiveChallengesByUser(userId: string): Promise<Challenge[]>;
  getAvailableChallenges(userId: string): Promise<Challenge[]>;
  getCompletedChallengesByUser(userId: string): Promise<Challenge[]>;
  joinChallenge(userId: string, challengeId: string): Promise<ChallengeProgress>;
  updateChallengeProgress(userId: string, challengeId: string, completed: boolean, date?: string): Promise<ChallengeProgress>;
  
  updateUserLanguage(userId: string, language: string): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createMoodEntry(insertMoodEntry: InsertMoodEntry): Promise<MoodEntry> {
    const [moodEntry] = await db
      .insert(moodEntries)
      .values({
        ...insertMoodEntry,
        note: insertMoodEntry.note || null,
      })
      .returning();
    return moodEntry;
  }

  async getMoodEntriesByUser(userId: string): Promise<MoodEntry[]> {
    return await db
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.timestamp)); // Most recent first
  }

  async getRecentMoodEntry(userId: string): Promise<MoodEntry | undefined> {
    const [entry] = await db
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.timestamp))
      .limit(1);
    return entry;
  }

  async createMemory(insertMemory: InsertMemory): Promise<Memory> {
    const [memory] = await db
      .insert(memories)
      .values({
        ...insertMemory,
        description: insertMemory.description || null,
        isFavorite: insertMemory.isFavorite || false,
      })
      .returning();
    return memory;
  }

  async getMemoriesByUser(userId: string): Promise<Memory[]> {
    return await db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(memories.timestamp);
  }

  async getMemoriesByCategory(userId: string, category: string): Promise<Memory[]> {
    return await db
      .select()
      .from(memories)
      .where(and(eq(memories.userId, userId), eq(memories.category, category)))
      .orderBy(memories.timestamp);
  }

  async updateMemoryFavorite(id: number, isFavorite: boolean): Promise<Memory | undefined> {
    const [memory] = await db
      .update(memories)
      .set({ isFavorite })
      .where(eq(memories.id, id))
      .returning();
    return memory;
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getChatMessagesByUser(userId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.timestamp);
  }

  async createGratitudeEntry(insertEntry: InsertGratitudeEntry): Promise<GratitudeEntry> {
    const [entry] = await db
      .insert(gratitudeEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async getGratitudeEntriesByUser(userId: string): Promise<GratitudeEntry[]> {
    return await db
      .select()
      .from(gratitudeEntries)
      .where(eq(gratitudeEntries.userId, userId))
      .orderBy(gratitudeEntries.date);
  }

  async getActiveChallengesByUser(userId: string): Promise<any[]> {
    try {
      // Use raw SQL to query the actual database structure
      const result = await db.execute(
        sql.raw(`SELECT * FROM challenge_progress WHERE user_id = '${userId}'`)
      );
      
      // Return progress data with predefined challenge info and daily streak count
      const challengesWithProgress = await Promise.all(
        (result.rows || []).map(async (p: any) => {
          // Get daily completion count for streak tracking
          const streakResult = await db.execute(
            sql.raw(`
              SELECT COUNT(*) as total_days
              FROM challenge_daily_progress 
              WHERE user_id = '${userId}' AND challenge_id = '${p.challenge_id}' AND completed = true
            `)
          );
          
          const totalDays = (streakResult.rows && streakResult.rows[0]) ? Number((streakResult.rows[0] as any).total_days) : 0;
          
          return {
            challengeId: p.challenge_id,
            progress: { completed: totalDays },
            ...this.getPredefinedChallengeInfo(p.challenge_id)
          };
        })
      );
      
      return challengesWithProgress;
    } catch (error) {
      console.error("Error fetching active challenges:", error);
      return [];
    }
  }

  async getAvailableChallenges(userId: string): Promise<any[]> {
    try {
      // Get user's started challenges using raw SQL
      const result = await db.execute(
        sql.raw(`SELECT challenge_id FROM challenge_progress WHERE user_id = '${userId}'`)
      );
      
      const startedChallengeIds = (result.rows || []).map((row: any) => row.challenge_id);
      const predefinedChallenges = this.getAllPredefinedChallenges();
      
      return predefinedChallenges.filter(c => !startedChallengeIds.includes(c.id));
    } catch (error) {
      console.error("Error fetching available challenges:", error);
      return this.getAllPredefinedChallenges();
    }
  }

  async getCompletedChallengesByUser(userId: string): Promise<any[]> {
    try {
      // Get completed challenges using raw SQL
      const result = await db.execute(
        sql.raw(`
          SELECT challenge_id, date, completed 
          FROM challenge_progress 
          WHERE user_id = '${userId}' AND completed = true
        `)
      );
      
      // Return completed challenges with proper info
      return (result.rows || []).map((p: any) => ({
        ...this.getPredefinedChallengeInfo(p.challenge_id),
        completedAt: p.date,
        progress: { completed: 1 }
      }));
    } catch (error) {
      console.error("Error fetching completed challenges:", error);
      return [];
    }
  }

  async joinChallenge(userId: string, challengeId: string): Promise<ChallengeProgress> {
    try {
      // Execute direct SQL insertion to handle the schema properly
      await db.execute(
        sql.raw(`
          INSERT INTO challenge_progress (challenge_id, user_id, date, completed)
          VALUES ('${challengeId}', '${userId}', NOW(), false)
          ON CONFLICT DO NOTHING
        `)
      );
      
      return {
        id: Date.now(),
        challengeId,
        userId,
        completed: 0,
        startDate: new Date(),
        lastActivityDate: null,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error joining challenge:", error);
      throw error;
    }
  }

  async updateUserLanguage(userId: string, language: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ preferredLanguage: language, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateChallengeProgress(userId: string, challengeId: string, completed: boolean, date?: string): Promise<ChallengeProgress> {
    try {
      const targetDate = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      if (completed) {
        // Record daily progress
        await db.execute(
          sql.raw(`
            INSERT INTO challenge_daily_progress (challenge_id, user_id, date, completed)
            VALUES ('${challengeId}', '${userId}', '${targetDate}', true)
            ON CONFLICT (challenge_id, user_id, date) 
            DO UPDATE SET completed = true
          `)
        );
        
        // Update main progress table
        await db.execute(
          sql.raw(`
            UPDATE challenge_progress 
            SET completed = true, date = NOW() 
            WHERE user_id = '${userId}' AND challenge_id = '${challengeId}'
          `)
        );
      }
      
      // Get current streak and completion count
      const streakResult = await db.execute(
        sql.raw(`
          SELECT COUNT(*) as total_days
          FROM challenge_daily_progress 
          WHERE user_id = '${userId}' AND challenge_id = '${challengeId}' AND completed = true
        `)
      );
      
      const totalDays = (streakResult.rows && streakResult.rows[0]) ? Number((streakResult.rows[0] as any).total_days) : 0;
      
      return {
        id: Date.now(),
        challengeId,
        userId,
        completed: totalDays,
        startDate: new Date(),
        lastActivityDate: new Date(),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      throw error;
    }
  }

  private getPredefinedChallengeInfo(challengeId: string) {
    const challenges = this.getAllPredefinedChallenges();
    return challenges.find(c => c.id === challengeId) || { 
      id: challengeId, 
      title: "Unknown Challenge", 
      duration: 7,
      points: 50,
      icon: "🎯"
    };
  }

  private getAllPredefinedChallenges() {
    return [
      {
        id: "mindful-week",
        title: "7-Day Mindfulness Challenge",
        description: "Practice 5 minutes of mindful breathing daily for one week",
        duration: 7,
        type: "breathing",
        difficulty: "Beginner",
        points: 50,
        icon: "🧘‍♀️"
      },
      {
        id: "gratitude-streak", 
        title: "14-Day Gratitude Streak",
        description: "Write 3 things you're grateful for every day for 2 weeks",
        duration: 14,
        type: "gratitude", 
        difficulty: "Easy",
        points: 70,
        icon: "🙏"
      },
      {
        id: "mood-tracker",
        title: "21-Day Mood Awareness", 
        description: "Log your mood twice daily and reflect on patterns",
        duration: 21,
        type: "mood",
        difficulty: "Easy", 
        points: 80,
        icon: "😊"
      },
      {
        id: "stress-buster",
        title: "10-Day Stress Relief",
        description: "Use stress management tools daily when feeling overwhelmed", 
        duration: 10,
        type: "wellness",
        difficulty: "Intermediate",
        points: 60,
        icon: "🌟"
      }
    ];
  }
}

export const storage = new DatabaseStorage();
