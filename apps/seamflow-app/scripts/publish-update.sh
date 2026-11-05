#!/usr/bin/env bash
# Publish an over-the-air update (JavaScript + images only) to a channel.
#
#   npm run update:production -- "what changed, in a sentence"
#   npm run update:preview    -- "try this on a preview build first"
#
# Why this is a script and not a bare `eas update`:
#   An update is bundled on THIS machine, and the local .env (git-ignored) points the
#   app at localhost for development. A plain `eas update` would ship an app that talks
#   to your laptop. This script takes the values from that channel's profile in eas.json instead —
#   the same ones a build on that channel uses — and blanks the dev-only login variables.
#   Variables already in the environment win over .env, which is how this overrides it.
#
# Updates only reach builds with the SAME app version (runtimeVersion policy
# "appVersion"). Anything native (new native module, permission, icon, deep-link or
# entitlement change) needs a new store build instead. See docs/ota-updates.md.
set -euo pipefail
cd "$(dirname "$0")/.."

CHANNEL="${1:-}"
MESSAGE="${2:-}"
case "$CHANNEL" in production|preview) ;; *)
  echo "Usage: publish-update.sh <production|preview> \"what changed\"" >&2; exit 1 ;;
esac
if [ -z "$MESSAGE" ]; then
  echo "Usage: publish-update.sh $CHANNEL \"what changed\"" >&2
  exit 1
fi

# Never publish something that fails the project's own checks.
npx tsc --noEmit
node scripts/verify-i18n.mjs

# Export every env var of the channel's eas.json profile into this shell.
eval "$(node -e '
  const env = require("./eas.json").build[process.argv[1]].env;
  for (const [k, v] of Object.entries(env)) console.log(`export ${k}=${JSON.stringify(v)}`);
' "$CHANNEL")"
export EXPO_PUBLIC_DEV_EMAIL=""
export EXPO_PUBLIC_DEV_PASSWORD=""

case "$EXPO_PUBLIC_API_URL" in
  *localhost*|*127.0.0.1*) echo "Refusing: API URL is $EXPO_PUBLIC_API_URL" >&2; exit 1 ;;
esac

echo "Publishing to channel '$CHANNEL' (app version $(node -p 'require("./app.json").expo.version'))"
echo "API: $EXPO_PUBLIC_API_URL"
# IPv4-first: this machine's Node otherwise stalls on IPv6 (see the build notes).
NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection" \
  npx eas-cli update --channel "$CHANNEL" --message "$MESSAGE" --non-interactive
