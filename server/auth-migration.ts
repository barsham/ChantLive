// Additive, restart-safe migration. The legacy session table is deliberately untouched.
export const betterAuthMigration = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS auth_sessions (
  id text PRIMARY KEY, token text NOT NULL UNIQUE,
  user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamp NOT NULL, created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(), ip_address text, user_agent text
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_accounts (
  id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL,
  user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password text, access_token text, refresh_token text, id_token text,
  access_token_expires_at timestamp, refresh_token_expires_at timestamp, scope text,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_provider_account_idx ON auth_accounts(provider_id, account_id);
CREATE INDEX IF NOT EXISTS auth_accounts_user_idx ON auth_accounts(user_id);
CREATE TABLE IF NOT EXISTS auth_verifications (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL,
  expires_at timestamp NOT NULL, created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications(identifier);
INSERT INTO auth_accounts (id, account_id, provider_id, user_id, password)
SELECT 'legacy-' || id, id, 'credential', id, password_hash FROM users WHERE password_hash IS NOT NULL
ON CONFLICT DO NOTHING;
-- Once copied, old hashes must never restore a password changed through Better Auth.
UPDATE users SET password_hash = NULL, verification_token = NULL,
  verification_token_expires = NULL, password_reset_token = NULL, password_reset_expires = NULL
WHERE EXISTS (SELECT 1 FROM auth_accounts a WHERE a.user_id = users.id AND a.provider_id = 'credential');
`;
