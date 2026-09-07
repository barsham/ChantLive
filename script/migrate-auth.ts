import { ensureUserAuthColumns, pool } from "../server/db";

try {
  await ensureUserAuthColumns();
  console.log("Authentication migration complete.");
} finally {
  await pool.end();
}
