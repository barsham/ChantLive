import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function ensureUserAuthColumns(): Promise<void> {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash text,
    ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS verification_token text,
    ADD COLUMN IF NOT EXISTS verification_token_expires timestamp,
    ADD COLUMN IF NOT EXISTS password_reset_token text,
    ADD COLUMN IF NOT EXISTS password_reset_expires timestamp;
  `);
}
