# `scripts/` — end-to-end smoke tests

Two different kinds of test live in this repo. They are not interchangeable.

| | `src/**/*.spec.ts` | `scripts/test-*.ts` |
|---|---|---|
| Runner | `pnpm test` (vitest) | `pnpm test:<name>` (node) |
| Needs | nothing | a running API **and** a live Supabase project |
| Writes data | no | **yes** |
| Runs in CI | **yes, on every PR** | no — see below |
| Good at | branches, guards, invariants, edge cases | proving the whole stack is wired together |

## Why these are not in CI

Each one signs in as a real Supabase user, calls the HTTP API, and leaves rows
behind. Running them on a pull request would need production-grade credentials
in CI and would write test data into a real project. Until there is a dedicated
staging Supabase project with its own throwaway data, these stay manual.

They are still the most valuable tests in the repo for "did I break the wiring",
so run them before anything that ships.

## Running them

Each needs `apps/seamflow-api/.env` filled in (`SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `DATABASE_URL`, …) and the dev server up:

```bash
pnpm dev            # in one terminal, from apps/seamflow-api
pnpm test:orders    # in another
```

Everything at once — stops at the first failure, so the name it stops on is
the thing that broke:

```bash
pnpm test:e2e:all
```

## When to run what

- **Every commit** — `pnpm test` and `pnpm lint`. CI does this for you.
- **Before a release build (EAS / Render deploy)** — `pnpm test:e2e:all`.
- **After touching auth, orders, groups, subscriptions or chat** — at minimum
  the matching `test:*` for the area, because the unit tests do not cover the
  guard chain end to end.

## Adding one

Keep the existing shape: a local `assert()` that `process.exit(1)`s with a
readable message, and no dependency on the order other scripts ran in. Then add
it to `scripts/all.mjs` so `test:e2e:all` picks it up.
