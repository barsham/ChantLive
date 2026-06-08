#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/chantlive}"
SERVICE_NAME="${SERVICE_NAME:-chantlive}"
BACKUP_DIR="${BACKUP_DIR:-/root/chantlive-backups}"
PORT="${PORT:-5000}"

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $APP_DIR/.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$APP_DIR/.env"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL must be set in $APP_DIR/.env" >&2
  exit 1
fi

echo "Installing dependencies"
npm ci --include=dev

echo "Checking TypeScript"
npm run check

echo "Building production bundle"
npm run build

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/predeploy-${GITHUB_SHA:-manual}-$timestamp.dump"

if command -v pg_dump >/dev/null 2>&1; then
  echo "Creating database backup at $backup_file"
  pg_dump --format=custom --no-owner --no-privileges --file="$backup_file" "$DATABASE_URL"
  chmod 600 "$backup_file"
else
  echo "pg_dump is not installed; skipping database backup" >&2
fi

echo "Applying database schema changes"
npm run db:push -- --force

echo "Pruning development dependencies"
npm prune --omit=dev

echo "Restarting $SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl is-active --quiet "$SERVICE_NAME"

echo "Verifying local HTTP response"
curl -fsS -I "http://127.0.0.1:$PORT/" >/dev/null

echo "Deployment complete"
