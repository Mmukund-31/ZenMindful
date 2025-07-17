import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Ensure DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

// Strip off sslmode param if needed – pg uses ssl option directly
const connectionString = process.env.DATABASE_URL.replace('?sslmode=require', '');

console.log("Loaded DB URL:", connectionString);

// Create connection pool with SSL override
export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Bypass self-signed cert issue
  },
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Initialize Drizzle
export const db = drizzle(pool, { schema });
