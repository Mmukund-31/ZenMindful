// db.ts
import { Pool } from 'pg';

if (!process.env.SKIP_DB || process.env.SKIP_DB === 'false') {
  if (!process.env.DATABASE_URL) {
    throw new Error("❌ DATABASE_URL must be set when SKIP_DB is false or undefined");
  }
}

export const db = process.env.SKIP_DB === 'true'
  ? { execute: async () => {} } // dummy db
  : new Pool({ connectionString: process.env.DATABASE_URL });
