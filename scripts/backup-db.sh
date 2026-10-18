#!/usr/bin/env bash
#
# Take a restorable backup of the SeamFlow database.
#
# WHY THIS EXISTS: there was no backup of any kind. No dump, no script, no
# schedule, no policy. Supabase's free tier includes no automated backups, and
# because the migration history has drifted (see P-22 in docs/qa-audit-plan.md)
# rebuilding from supabase/migrations would not reproduce production either. So
# there was no path back from a bad migration, a mistaken delete, or a lost
# project — for a database holding real tailors' client books.
#
# Restoring is documented in docs/database-recovery.md. An untested restore is
# not a backup, so read that before you need it.
#
#   ./scripts/backup-db.sh                      # writes ./backups/<stamp>.dump
#   BACKUP_GPG_PASSPHRASE=… ./scripts/backup-db.sh   # …and encrypts it
#
# Reads DATABASE_URL from the environment, or from apps/seamflow-api/.env.

set -euo pipefail

cd "$(dirname "$0")/.."

URL="${DATABASE_URL:-}"
if [[ -z "$URL" && -f apps/seamflow-api/.env ]]; then
  URL="$(sed -n 's/^DATABASE_URL=//p' apps/seamflow-api/.env | tr -d "\"'" | tr -d '\r')"
fi
if [[ -z "$URL" ]]; then
  echo "error: DATABASE_URL is not set and apps/seamflow-api/.env has none." >&2
  exit 1
fi

# The pooler's TRANSACTION port (6543) cannot serve pg_dump — it needs one
# session for the whole dump. 5432 on the same host is the session pooler.
URL="${URL/:6543/:5432}"

# pg_dump refuses outright to dump a server newer than itself, and says so in a
# way that is easy to mistake for a connection problem. Check it first and name
# the fix, because the machine this is most likely to be run from has the
# Homebrew client, which trails well behind Supabase.
server_major="$(psql "$URL" -XAt -c 'show server_version;' | cut -d. -f1)"
dump_major="$(pg_dump --version | sed -E 's/.* ([0-9]+).*/\1/')"
if (( dump_major < server_major )); then
  cat >&2 <<MSG
error: pg_dump is version ${dump_major}; the server is ${server_major}.
       pg_dump cannot dump a newer server, so this would fail with a message
       that reads like a connection error.

       macOS:  brew install postgresql@${server_major}
               and put its bin directory ahead of the old client on PATH:
               export PATH="\$(brew --prefix postgresql@${server_major})/bin:\$PATH"

       The nightly GitHub Actions backup installs the right client itself, so
       it is unaffected by whatever is on this machine.
MSG
  exit 1
fi

mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="backups/seamflow-${stamp}.dump"

# -Fc  custom format: compressed, and pg_restore can pick single tables out of
#      it, which is what you want at 3am when one table was wrecked.
# -n public -n auth
#      The two schemas that hold what is ours. Supabase manages storage,
#      realtime, vault and the rest; dumping them produces a restore that
#      fights the platform. Uploaded FILES are not in here at all — see the
#      recovery doc.
# --no-owner --no-privileges
#      Role names differ in a fresh project; without these the restore stops on
#      every GRANT.
echo "Dumping public + auth from server ${server_major}…"
pg_dump "$URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=auth \
  --file="$out"

size="$(du -h "$out" | cut -f1)"
echo "Wrote ${out} (${size})"

# The dump contains client names, phone numbers, addresses and body
# measurements. Encrypt it if a passphrase was given — and the scheduled
# workflow always gives one, because an artifact is not a safe home for
# plaintext personal data.
if [[ -n "${BACKUP_GPG_PASSPHRASE:-}" ]]; then
  if ! command -v gpg >/dev/null 2>&1; then
    echo "error: BACKUP_GPG_PASSPHRASE is set but gpg is not installed." >&2
    exit 1
  fi
  gpg --batch --yes --symmetric --cipher-algo AES256 \
      --passphrase "$BACKUP_GPG_PASSPHRASE" \
      --output "${out}.gpg" "$out"
  rm -f "$out"
  echo "Encrypted to ${out}.gpg (plaintext removed)"
else
  echo
  echo "NOTE: not encrypted. This file holds client names, phone numbers,"
  echo "      addresses and body measurements. Do not commit it or upload it"
  echo "      anywhere shared. backups/ is gitignored."
fi
