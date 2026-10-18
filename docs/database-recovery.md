# Getting the database back

Read this **before** you need it. The one thing that makes a backup real is
having restored it once while nothing was wrong.

---

## What exists now

| | |
|---|---|
| Nightly dump | `.github/workflows/backup-database.yml`, 02:20 UTC — one hour before the account purge, so there is always a pre-purge snapshot |
| On demand | `./scripts/backup-db.sh` |
| Contents | the `public` and `auth` schemas, custom format, AES256-encrypted |
| Kept | 90 days, as a GitHub Actions artifact |
| **Not** included | **uploaded files** — see "What a dump does not cover" |

**It is off until you add two secrets.** Settings → Secrets and variables →
Actions: `BACKUP_DATABASE_URL` (port **5432**, the session pooler) and
`BACKUP_GPG_PASSPHRASE`. Keep a copy of that passphrase somewhere other than
this repository — without it the backups are unreadable, including by you.

Until then the job runs nightly, reports that it is not configured, and
succeeds, so it is not a red cross every morning for something nobody set up.

---

## Restore

### 1. Get a dump and decrypt it

From the Actions run (artifacts tab), or `backups/` locally.

```bash
gpg --batch --decrypt --passphrase "$BACKUP_GPG_PASSPHRASE" \
    --output seamflow.dump seamflow-<stamp>.dump.gpg
```

### 2. Look at it before you restore anything

`pg_restore -l` lists what is in the archive without touching a database. If
this does not look like the whole app, stop — restoring a truncated dump over a
damaged database makes things worse, not better.

```bash
pg_restore -l seamflow.dump | head -40
pg_restore -l seamflow.dump | grep -c 'TABLE DATA'
```

### 3. Restore into somewhere that is not production

A Supabase branch, a second project, or local Postgres. **Never straight into
production** — if the dump turns out to be bad you have then lost the damaged
copy too, which was still evidence.

```bash
pg_restore --no-owner --no-privileges --clean --if-exists \
           -d "$TARGET_DATABASE_URL" seamflow.dump
```

### 4. Check it is actually the business

Row counts are the fastest honest check. As of 2026-10-18 production held
roughly 38 users, 22 tailors, 63 clients, 22 orders and 45 measurement sets —
so a restore returning single digits is wrong even if the command succeeded.

```sql
select 'users' t, count(*) from users
union all select 'tailors', count(*) from tailors
union all select 'clients', count(*) from clients
union all select 'orders',  count(*) from orders
union all select 'measurement_sets', count(*) from measurement_sets;
```

Then point a local API at it (`DATABASE_URL`) and run
`pnpm test:e2e:all` from `apps/seamflow-api`. Those 30 scripts exercise the real
HTTP surface, and they are the closest thing to "is this database usable".

### 5. Only then cut over

Repoint `DATABASE_URL` in Render, and `EXPO_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_ANON_KEY` if the project itself changed — note those two
are baked into app builds, so a new project means a new app release. That is a
good reason to restore into the *same* project where you can.

---

## What a dump does not cover

- **Uploaded files.** Every photo lives in Supabase Storage, not in Postgres:
  order photos, designs, works, avatars, chat media, verification evidence.
  A restored database will have rows pointing at objects that may be gone. They
  need their own copy (`supabase storage` CLI or the S3-compatible API).
- **Supabase-managed schemas** — `storage`, `realtime`, `vault`. Deliberately
  excluded: dumping them produces a restore that fights the platform.
- **Auth configuration** — providers, redirect URLs, email templates. These are
  project settings, not rows. Write them down separately.
- **Secrets.** Render and Vercel environment variables are not in here.

---

## Two things that make this weaker than it looks

**The migration history has drifted.** 35 of the migrations in
`supabase/migrations` are applied to production but unrecorded (finding P-22),
so a from-scratch rebuild does *not* reproduce production. That is why these
dumps matter more than they would in a healthy project — and why repairing the
history is worth doing, so there are two independent routes back instead of one.

**A GitHub artifact is a stopgap.** 90 days, in the same account as the code,
and it only runs if Actions runs. The real answer once there is money in the
business is **Supabase Pro**: daily backups plus point-in-time recovery, which
can wind back to a few minutes before a mistake instead of to last night. At
that point this workflow becomes the off-site second copy rather than the only
one.

---

## Test it

Put a reminder in for one afternoon. Restore the most recent dump into a throwaway
project, run step 4, and write the date here:

> Last tested restore: **never**
