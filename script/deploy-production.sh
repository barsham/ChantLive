#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/chantlive}"
SERVICE_NAME="${SERVICE_NAME:-chantlive}"
BACKUP_DIR="${BACKUP_DIR:-/root/chantlive-backups}"
PORT="${PORT:-5000}"

deployment_diagnostics() {
  echo "Deployment diagnostics" >&2
  systemctl status "$SERVICE_NAME" --no-pager -n 20 >&2 || true
  systemctl status postgresql --no-pager -n 20 >&2 || true
  journalctl -u "$SERVICE_NAME" --no-pager -n 60 >&2 || true
  journalctl -u postgresql --no-pager -n 40 >&2 || true
}

trap deployment_diagnostics ERR

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

database_ready() {
  command -v pg_isready >/dev/null 2>&1 && pg_isready --dbname="$DATABASE_URL" --timeout=3 >/dev/null 2>&1
}

recover_database_if_local() {
  if database_ready; then
    echo "Database readiness check passed"
    return 0
  fi

  echo "Database is unavailable before deployment" >&2
  if [[ "$DATABASE_URL" =~ @(localhost|127\.0\.0\.1|\[::1\])([:/]) ]]; then
    echo "Attempting bounded recovery of local PostgreSQL" >&2
    systemctl restart postgresql
    for attempt in {1..20}; do
      if database_ready; then
        echo "Local PostgreSQL recovered after $attempt attempt(s)"
        return 0
      fi
      sleep 1
    done
  fi

  echo "Database recovery failed; deployment stopped before schema or service changes" >&2
  return 1
}

recover_database_if_local

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

echo "Installing service restart policy"
install -d -m 755 "/etc/systemd/system/${SERVICE_NAME}.service.d"
cat > "/etc/systemd/system/${SERVICE_NAME}.service.d/restart-policy.conf" <<'SYSTEMD'
[Unit]
StartLimitIntervalSec=120
StartLimitBurst=10

[Service]
Restart=on-failure
RestartSec=5s
SYSTEMD
systemctl daemon-reload

echo "Restarting $SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl is-active --quiet "$SERVICE_NAME"

echo "Verifying local liveness and database readiness"
for attempt in {1..30}; do
  if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null \
    && curl -fsS "http://127.0.0.1:$PORT/readyz" >/dev/null; then
    echo "Local readiness check passed"
    break
  fi

  if [[ "$attempt" -eq 30 ]]; then
    echo "Local readiness check failed after $attempt attempts" >&2
    exit 1
  fi

  sleep 1
done

echo "Confirming service remains ready"
for attempt in {1..3}; do
  sleep 5
  curl -fsS "http://127.0.0.1:$PORT/readyz" >/dev/null
done

echo "Deployment complete"
