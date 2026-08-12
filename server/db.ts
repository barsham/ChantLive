import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3_000,
  ssl: process.env.DATABASE_URL.includes("sslmode=disable")
    ? false
    : { rejectUnauthorized: false },
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
    ADD COLUMN IF NOT EXISTS password_reset_expires timestamp,
    ADD COLUMN IF NOT EXISTS last_activity_at timestamp;
  `);
}

export async function ensureDemoColumnsAndTables(): Promise<void> {
  await pool.query(`
    ALTER TABLE demonstrations
    ADD COLUMN IF NOT EXISTS public_id varchar(12);

    ALTER TABLE demonstrations
    ADD COLUMN IF NOT EXISTS support_url text;

    ALTER TABLE demonstrations
    ADD COLUMN IF NOT EXISTS support_label text;

    ALTER TABLE demonstrations
    ADD COLUMN IF NOT EXISTS scheduled_at timestamp;

    ALTER TABLE demonstrations
    ADD COLUMN IF NOT EXISTS location_name text;

    ALTER TABLE demonstrations
    ADD COLUMN IF NOT EXISTS meeting_point text;

    ALTER TABLE demonstrations
    ADD COLUMN IF NOT EXISTS arrival_note text;

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
    ADD COLUMN IF NOT EXISTS live_controller_user_id varchar(255) REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS live_control_claimed_at timestamp,
    ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

    CREATE TABLE IF NOT EXISTS safety_checks (
      id varchar(255) PRIMARY KEY,
      demonstration_id varchar(255) NOT NULL REFERENCES demonstrations(id) ON DELETE CASCADE,
      kind text NOT NULL,
      message text NOT NULL,
      instruction text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      resolution_message text,
      created_at timestamp NOT NULL DEFAULT now(),
      closed_at timestamp
    );

    CREATE INDEX IF NOT EXISTS safety_checks_demo_created_idx
    ON safety_checks (demonstration_id, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS safety_checks_one_open_per_demo_idx
    ON safety_checks (demonstration_id)
    WHERE status = 'open';

    CREATE TABLE IF NOT EXISTS safety_check_responses (
      safety_check_id varchar(255) NOT NULL REFERENCES safety_checks(id) ON DELETE CASCADE,
      session_id text NOT NULL,
      response text NOT NULL,
      note text,
      updated_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (safety_check_id, session_id)
    );

    CREATE TABLE IF NOT EXISTS assistance_requests (
      id varchar(255) PRIMARY KEY,
      demonstration_id varchar(255) NOT NULL REFERENCES demonstrations(id) ON DELETE CASCADE,
      type text NOT NULL,
      message text NOT NULL,
      session_id text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      created_at timestamp NOT NULL DEFAULT now(),
      resolved_at timestamp
    );

    CREATE INDEX IF NOT EXISTS assistance_requests_demo_created_idx
    ON assistance_requests (demonstration_id, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS assistance_requests_one_open_per_type_idx
    ON assistance_requests (demonstration_id, session_id, type)
    WHERE status = 'open';

    CREATE TABLE IF NOT EXISTS conduct_reports (
      id varchar(255) PRIMARY KEY,
      demonstration_id varchar(255) NOT NULL REFERENCES demonstrations(id) ON DELETE CASCADE,
      session_id text NOT NULL,
      category text NOT NULL,
      urgency text NOT NULL DEFAULT 'follow_up',
      details text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      organizer_response text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      acknowledged_at timestamp,
      resolved_at timestamp
    );

    ALTER TABLE conduct_reports
    ADD COLUMN IF NOT EXISTS acknowledged_at timestamp;

    CREATE INDEX IF NOT EXISTS conduct_reports_demo_created_idx
    ON conduct_reports (demonstration_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS conduct_reports_demo_status_idx
    ON conduct_reports (demonstration_id, status, urgency);

    CREATE UNIQUE INDEX IF NOT EXISTS conduct_reports_one_matching_open_idx
    ON conduct_reports (demonstration_id, session_id, category, md5(lower(details)))
    WHERE status <> 'resolved';

    CREATE TABLE IF NOT EXISTS run_sheet_items (
      id varchar(255) PRIMARY KEY,
      demonstration_id varchar(255) NOT NULL REFERENCES demonstrations(id) ON DELETE CASCADE,
      order_index integer NOT NULL,
      kind text NOT NULL DEFAULT 'custom',
      title text NOT NULL,
      participant_note text,
      planned_duration_minutes integer NOT NULL DEFAULT 10,
      status text NOT NULL DEFAULT 'pending',
      started_at timestamp,
      completed_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS run_sheet_items_demo_order_idx
    ON run_sheet_items (demonstration_id, order_index);

    CREATE UNIQUE INDEX IF NOT EXISTS run_sheet_items_one_active_per_demo_idx
    ON run_sheet_items (demonstration_id)
    WHERE status = 'active';

    CREATE TABLE IF NOT EXISTS run_sheet_templates (
      id varchar(255) PRIMARY KEY,
      owner_user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      category text NOT NULL DEFAULT 'custom',
      stages jsonb NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS run_sheet_templates_owner_updated_idx
    ON run_sheet_templates (owner_user_id, updated_at DESC);
  `);
}
