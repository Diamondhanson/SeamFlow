# seamflow-admin — SeamFlow Ops

A single read-only page showing the whole platform: every tailor, every client,
both apps, on one screen. Built for the team, not for users.

## Running it

```bash
cp ../seamflow-api/.env .env.local   # only DATABASE_URL is used
npm run dev                          # http://localhost:3200
```

Use the **session-mode** pooler URL (port `5432`), not the transaction pooler
(`6543`). Both work, but session mode holds the connection open between
requests, and the connection handshake to eu-west-1 is ~7.7s — with the
transaction pooler you pay it on almost every page load.

## Three things that are deliberate

**It is local only.** `lib/guard.ts` throws at import time if `NODE_ENV` is
`production`. There is no authentication and the page shows every tailor's
client list and revenue, so deploying it anywhere reachable would leak the
customer base of the whole platform. If it ever needs to be hosted, add auth
first — the escape-hatch env var is named to be uncomfortable to type on
purpose.

**It cannot write.** Every query in `lib/metrics.ts` is a `select`. A dashboard
that can mutate is an admin tool, and an admin tool needs the auth this app
does not have.

**Money is never summed across currencies.** Invoices are denominated
per-invoice; a tailor can hold one in XAF and one in NGN. The "Invoiced"
section groups by currency and shows no grand total, because a grand total
would be a confident, meaningless number.

## Layout

One query (`getDashboard()`) assembles the entire payload as JSON in a single
statement. Seven parallel queries over a 3-connection pool made the page take
40–60 seconds, nearly all of it latency rather than work; one statement makes
it ~0.4s warm.

The page order is an argument rather than a menu:

1. **Platform** — raw counts, as a baseline
2. **Marketplace funnel** — tailors → published designs → enquiries →
   commissions → claims. Where it hits zero is where the product stops
3. **Invoiced** — per currency
4. **Orders by status** — where work in progress actually sits
5. **Tailors** — per-account drill-down
6. **Recent activity** — both apps merged into one timeline
7. **Data health** — integrity checks, each mapped to a real defect in this
   codebase rather than generic hygiene

Vanity counts at the top would bury the funnel, and the funnel is the only
thing here that can tell you the marketplace is not working yet.
