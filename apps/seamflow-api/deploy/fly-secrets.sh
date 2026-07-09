#!/usr/bin/env bash
#
# Push the API's environment as Fly secrets. Run AFTER `fly auth login` and
# `fly apps create <name>`. Reads apps/seamflow-api/.env (which is gitignored
# and never baked into the image) and imports every KEY=VALUE except PORT
# (PORT is provided by fly.toml).
#
# Usage:  ./deploy/fly-secrets.sh [app-name]
#         (defaults to "seamflow-api")

set -euo pipefail

APP="${1:-seamflow-api}"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: no .env found at $ENV_FILE" >&2
  exit 1
fi

echo "Importing secrets from $ENV_FILE into Fly app: $APP"

# Strip comments/blank lines and PORT, then hand the rest to `fly secrets
# import` (reads KEY=VALUE pairs from stdin — values never touch the terminal).
grep -vE '^[[:space:]]*(#|$)' "$ENV_FILE" \
  | grep -vE '^[[:space:]]*PORT=' \
  | fly secrets import --app "$APP"

echo "Done. Deploy with:"
echo "  fly deploy . --config apps/seamflow-api/fly.toml \\"
echo "    --dockerfile apps/seamflow-api/Dockerfile --remote-only"
