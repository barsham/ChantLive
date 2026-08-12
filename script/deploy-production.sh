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
  pg_lsclusters >&2 || true
  systemctl list-units 'postgresql@*' --all --no-pager >&2 || true
  journalctl -u "$SERVICE_NAME" --no-pager -n 60 >&2 || true
  journalctl -u postgresql --no-pager -n 40 >&2 || true
  tail -n 80 /var/log/postgresql/postgresql-*.log >&2 || true
  df -h / /var/lib/postgresql >&2 || true
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
    systemctl restart postgresql || true

    database_port=5432
    if [[ "$DATABASE_URL" =~ @([^/]+):([0-9]+)/ ]]; then
      database_port="${BASH_REMATCH[2]}"
    fi

    if command -v pg_lsclusters >/dev/null 2>&1 && command -v pg_ctlcluster >/dev/null 2>&1; then
      while read -r version cluster port status _; do
        if [[ "$port" == "$database_port" && "$status" != "online" ]]; then
          echo "Starting PostgreSQL cluster $version/$cluster on configured port $port" >&2
          pg_ctlcluster "$version" "$cluster" start || true
        fi
      done < <(pg_lsclusters --no-header)
    fi

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

echo "Installing dependencies"
npm ci --include=dev

echo "Checking TypeScript"
npm run check

echo "Building production bundle"
npm run build

database_recovered=false
if recover_database_if_local; then
  database_recovered=true
fi

if [[ "$database_recovered" == "true" ]]; then
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
else
  echo "Database remains unavailable; deploying the safe degraded web shell without schema changes" >&2
fi

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

echo "Verifying local liveness"
for attempt in {1..30}; do
  if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null; then
    echo "Local liveness check passed"
    break
  fi

  if [[ "$attempt" -eq 30 ]]; then
    echo "Local readiness check failed after $attempt attempts" >&2
    exit 1
  fi

  sleep 1
done

if [[ "$database_recovered" != "true" ]]; then
  echo "Degraded web shell is live, but production is not ready because PostgreSQL did not recover" >&2
  exit 1
fi

curl -fsS "http://127.0.0.1:$PORT/readyz" >/dev/null

echo "Confirming service remains ready"
for attempt in {1..3}; do
  sleep 5
  curl -fsS "http://127.0.0.1:$PORT/readyz" >/dev/null
done

echo "Deployment complete"
