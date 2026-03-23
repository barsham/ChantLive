import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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

export async function ensureDemoColumnsAndTables(): Promise<void> {
  await pool.query(`
    ALTER TABLE demonstrations
    ADD COLUMN IF NOT EXISTS public_id varchar(12);

    UPDATE demonstrations
    SET public_id = substr(md5(random()::text || clock_timestamp()::text), 1, 8)
    WHERE public_id IS NULL;

    ALTER TABLE demonstrations
    ALTER COLUMN public_id SET NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'demonstrations_public_id_unique'
      ) THEN
        ALTER TABLE demonstrations
        ADD CONSTRAINT demonstrations_public_id_unique UNIQUE (public_id);
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS demo_admins (
      demonstration_id varchar(255) NOT NULL REFERENCES demonstrations(id) ON DELETE CASCADE,
      user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (demonstration_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS demo_state (
      demonstration_id varchar(255) PRIMARY KEY REFERENCES demonstrations(id) ON DELETE CASCADE,
      current_chant_id varchar(255) REFERENCES chants(id),
      auto_rotate boolean NOT NULL DEFAULT false,
      rotation_interval integer NOT NULL DEFAULT 60,
      cycle_count integer NOT NULL DEFAULT 1,
      leader_duration integer NOT NULL DEFAULT 4,
      people_duration integer NOT NULL DEFAULT 3,
      current_phase text NOT NULL DEFAULT 'leader',
      current_cycle integer NOT NULL DEFAULT 1,
      updated_at timestamp NOT NULL DEFAULT now()
    );

    ALTER TABLE demo_state
    ADD COLUMN IF NOT EXISTS auto_rotate boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS rotation_interval integer NOT NULL DEFAULT 60,
    ADD COLUMN IF NOT EXISTS cycle_count integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS leader_duration integer NOT NULL DEFAULT 4,
    ADD COLUMN IF NOT EXISTS people_duration integer NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS current_phase text NOT NULL DEFAULT 'leader',
    ADD COLUMN IF NOT EXISTS current_cycle integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
  `);
}
