# Moving the API to Frankfurt

**Why:** the API runs in Render's **Oregon** region. The database is at
`aws-0-eu-west-1.pooler.supabase.com` — **Ireland**. Every query crosses the
Atlantic, roughly 150 ms each way, and the auth guard crosses it twice before
any handler starts. `render.yaml` line 17 even carries the instruction: *"pick
the region nearest your Supabase project."*

**Why Frankfurt and not "move the database":** Render has no Ireland region, and
Frankfurt is its nearest (~1,100 km, ~20 ms). Moving Supabase instead would mean
restoring into a new project, which changes the project ref — and that ref is
baked into every app build as `EXPO_PUBLIC_SUPABASE_URL`. Moving Render is by
far the smaller change.

**Expected gain:** ~150 ms off *every* database query. On a typical authenticated
request that is ~300 ms, before counting the handler's own queries.

---

## Read this first: two traps

**1. A new service means a new URL, and installed apps break.**

Render **cannot change a service's region after creation.** The `region:` field
applies only when a service is first created, so this is "create a new service",
not "edit the old one". The new service gets a new `*.onrender.com` hostname.

`https://seamflow-api.onrender.com` is baked into:

| Where | What |
|---|---|
| `apps/seamflow-app/eas.json` | `EXPO_PUBLIC_API_URL`, in both `preview` and `production` |
| `apps/seamflow-app/lib/config.ts` | `HOSTED_API` fallback |
| `apps/seamflow-client/eas.json` | same two profiles |
| `apps/seamflow-client/lib/config.ts` | `HOSTED_API` fallback |
| `apps/seamflow-admin/lib/*.ts` (7 files) | default when `SEAMFLOW_API_URL` is unset |
| Fapshi dashboard | the webhook URL — **not in this repo** |

Play Store closed testing has been live since 17 Aug, so there are installed
builds pointing at the old hostname. They do not update themselves.

**2. While both services are running, every cron runs twice.**

`autoDeploy: true` means a new service built from `main` starts its own copy of
all ten scheduled jobs. One of them, `renewalReminders`, has no dedupe (finding
Q-5), so **every tailor would get the subscription-expiry email and push twice**
for as long as both services are up. Keep the overlap short, and prefer doing
the cutover outside 09:00 UTC, when that job fires.

---

## Path A — custom domain first (recommended)

Nothing breaks, because the apps stop depending on the Render hostname before it
changes. Slower, because it needs an app release in the middle.

### A1. Put a domain in front of the current service

1. Render dashboard → the **seamflow-api** service → **Settings** → find the
   **Custom Domains** section → add `api.seamflowtech.com`.
2. Render shows a DNS target. Add it at your DNS provider as a **CNAME** for
   `api` pointing at that target. (`seamflowtech.com` is on Vercel, so add the
   record there; do **not** point it at Vercel.)
3. Wait for Render to show the domain as verified with a certificate issued.
4. Check it: `curl -s https://api.seamflowtech.com/health` should return the
   same JSON as the onrender.com URL.

### A2. Ship an app release that uses the domain

Change the six app references listed above from
`https://seamflow-api.onrender.com` to `https://api.seamflowtech.com`, then
build and roll out to closed testing. **Wait until testers are on that build**
— this is the step that makes the rest safe.

The admin app reads `SEAMFLOW_API_URL` first, so set that in Vercel instead of
relying on the default.

### A3. Create the Frankfurt service

1. Update `render.yaml` → `region: frankfurt` (already done on this branch, see
   the comment there).
2. Render dashboard → **New +** → **Web Service** (or **Blueprint** against this
   repo) → choose **Frankfurt** as the region. Name it something distinct, e.g.
   `seamflow-api-eu`.
3. Re-enter all **19** secrets. They are `sync: false`, so nothing copies them:

   `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SHARE_LINK_JWT_SECRET`, `WEB_BASE_URL`,
   `REDIS_URL`, `SENTRY_DSN`, `ANTHROPIC_API_KEY`,
   `SUBSCRIPTION_PAYMENT_PROVIDER`, `FAPSHI_ENV`, `FAPSHI_API_USER`,
   `FAPSHI_API_KEY`, `FAPSHI_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `EMAIL_REPLY_TO`, `APP_WEB_URL`, and `NODE_ENV=production`.

   **`NODE_ENV=production` is not optional.** With it missing, `envSchema`
   defaults to `development` — and while the dev-hook routes no longer exist in
   production builds, that default also changes Sentry's sampling and the OTP
   provider's refusal rules. Set it explicitly.

4. Let it deploy. Check its own onrender.com URL directly:
   `curl -s https://<new-name>.onrender.com/health` — expect `"db":"up"`.
5. Compare latency against the old one. The Frankfurt service should be visibly
   faster on anything that touches the database.

### A4. Cut over

1. Remove `api.seamflowtech.com` from the **Oregon** service.
2. Add it to the **Frankfurt** service, and wait for the certificate.
3. Confirm: `curl -s https://api.seamflowtech.com/health` — the `commit` field
   should match the new service's deploy.
4. Repoint the **Fapshi webhook** to `https://api.seamflowtech.com/subscriptions/webhook/fapshi`.
   Miss this and payments stop settling silently — the webhook would keep
   arriving at a service you are about to delete.
5. **Suspend or delete the Oregon service now**, to stop the duplicate crons.

---

## Path B — straight swap (faster, breaks installed builds)

Only if you are willing to force a new build on your closed testers.

1. Do **A3** (create the Frankfurt service, re-enter the secrets, verify it).
2. Change the six app references to the new onrender.com hostname and ship a
   build.
3. Repoint the Fapshi webhook.
4. Delete the Oregon service.

Every installed build from before step 2 stops working — it will keep calling a
hostname that no longer exists. Given closed testing only, that may be an
acceptable trade; it will not be once you are on the App Store, which is the
argument for doing Path A now while it is still cheap.

---

## Afterwards

- Update `docs/ROADMAP.md`, which names `seamflow-api.onrender.com` as the API.
- `curl` the public feed and confirm `cf-cache-status` becomes `HIT` on a second
  request — the cache headers added in this branch should now be doing work.
- Re-run `pnpm test:e2e:all` from `apps/seamflow-api` against the new URL before
  trusting it.
