# Deploying the SeamFlow API (Fly.io)

The mobile app needs the API on a **public URL** so a downloaded APK can reach
it (an APK can't talk to `localhost` / `10.0.2.2`). This deploys the NestJS API
to Fly.io. It reuses your existing Supabase database, so your data carries over.

Everything is scripted; the only manual parts are the ones that need **your Fly
account** (I can't log in for you).

## One-time setup

1. **Install the Fly CLI**
   ```bash
   brew install flyctl        # macOS
   # or: curl -L https://fly.io/install.sh | sh
   ```

2. **Log in / sign up** (opens a browser)
   ```bash
   fly auth login
   ```

3. **Create the app** (name must be globally unique on Fly)
   ```bash
   fly apps create seamflow-api
   # If that name is taken, pick another and update `app =` in fly.toml.
   ```

## Deploy

Run all of these **from the repo root** (`SeamFlow/`):

1. **Push secrets** (reads `apps/seamflow-api/.env`, skips PORT):
   ```bash
   ./apps/seamflow-api/deploy/fly-secrets.sh seamflow-api
   ```

2. **Build & deploy** (builds on Fly's servers — no local Docker/disk needed):
   ```bash
   fly deploy . \
     --config apps/seamflow-api/fly.toml \
     --dockerfile apps/seamflow-api/Dockerfile \
     --remote-only
   ```

3. **Verify** — you'll get a URL like `https://seamflow-api.fly.dev`:
   ```bash
   curl https://seamflow-api.fly.dev/health
   # → {"ok":true,"db":"up",...}
   ```

Then give me that URL — I'll point the app's `EXPO_PUBLIC_API_URL` at it and
kick off the EAS APK build.

## Notes / troubleshooting

- **`db` shows `down` in /health** → double-check `DATABASE_URL` made it into
  secrets (`fly secrets list -a seamflow-api`) and that Supabase allows the
  connection. The app still boots regardless.
- **OOM restarts in `fly logs`** → bump `memory` to `1gb` in fly.toml, redeploy.
- **Filtered install fails during build** → in the Dockerfile, replace
  `pnpm install --frozen-lockfile --filter "seamflow-api..."` with the full
  `pnpm install --frozen-lockfile` (slower, but installs the whole workspace).
- **Cold starts** → set `min_machines_running = 1` in fly.toml to keep one
  machine warm (small always-on cost).
- **Railway instead of Fly** → the same `Dockerfile` works; point a Railway
  service at it with root context and set the same env vars.
