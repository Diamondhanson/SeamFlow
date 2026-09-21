# seamflow-admin — SeamFlow Ops

The whole platform on one dashboard: every tailor, every client, both apps.
Built for the team, not for users.

## Running it

```bash
cp ../seamflow-api/.env .env.local   # DATABASE_URL
# plus NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (the app's
# EXPO_PUBLIC_SUPABASE_* values), and optionally SEAMFLOW_API_URL for the
# support inbox (defaults to the deployed API)
npm run dev                          # http://localhost:3200
```

Use the **session-mode** pooler URL (port `5432`), not the transaction pooler
(`6543`). Both work, but session mode holds the connection open between
requests, and the handshake to eu-west-1 is ~7.7s — with the transaction pooler
you pay it on almost every page load.

## Sections

| Route | What it answers |
|---|---|
| `/support` · `/support/[id]` | Help & Support inbox: tickets from both apps; reply, resolve |
| `/` | Are the two sides of the marketplace meeting? Funnel, arrivals, money, work in progress, merged timeline |
| `/tailors` · `/tailors/[id]` | Who is on the supply side, and everything one of them has built |
| `/orders` · `/orders/[id]` | Every order, filterable; items, measurements, photos, status history |
| `/invoices` · `/invoices/[id]` | Money per currency; line items, and whether the stored total agrees with them |
| `/clients` | Two populations — CRM rows and client-app accounts — shown separately, because nothing joins them |
| `/feed` | The publishing chain, which is the narrowest point in the product |
| `/enquiries` | Client↔tailor conversations, and why there are none yet |
| `/notifications` | What was sent, and whether it could have been delivered at all |
| `/health` | Records that are quietly wrong, with the three cleanups that fix them |

## Four things that are deliberate

**It is staff only.** Hosted at admin.seamflowtech.com. Every page sits behind
Supabase sign-in (Google, or email + password) AND the `staff` table — being
signed in is not enough. Middleware turns away anyone without a session;
`lib/auth.ts#requireStaff` checks the staff table on every page and inside every
server action. Add a person with `insert into staff (user_id) values ('<users.id>')`.
In production the app refuses to start without `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (lib/guard.ts), so a misconfigured deploy fails
closed instead of serving the platform to anyone.

**It can change exactly three things.** Merge duplicate clients, clear `'—'`
placeholder contact values, delete empty draft invoices. That list is an
allowlist in `lib/guard.ts`, enforced at the top of every write, not a
convention — a dashboard with no login should not be able to grow a delete
button by accident. Each action names its own rows in SQL rather than taking an
id from the client, multi-statement work runs in a transaction, and every run
appends to `.ops-audit.log` (gitignored). Everything else is `select`.

**Money is never summed across currencies.** Invoices are denominated
per-invoice; a tailor can hold one in XAF and one in NGN, and there is no
exchange-rate source in this system. Totals group by currency, monthly charts
are faceted one-per-currency, and there is no grand total anywhere.

**One query per page.** Each `lib/queries/*.ts` file exports a single function
that assembles everything that page needs as JSON in one statement. The first
version fanned seven queries out in parallel and took 40–60 seconds; it was
never the queries that were slow, it was seven round trips over a 3-connection
pool. Warm, a page is ~0.4s.

## Chart colours

Not hand-picked. `lib/palette.ts` holds an ordinal ramp and two categorical
slots, each run through the palette validator against this app's paper surface
before being kept — lightness band, chroma floor, colourblind separation and
contrast. Two rules keep the colour requirement small enough to validate:
faceting by currency instead of colouring by it, and single-series charts,
which need no identity colour at all.

Order status is pinned per key (`ORDER_STATUS_COLOR`) rather than assigned by
row position, so "delivered" is the same shade on every page and a filter that
changes the counts cannot repaint the bars.
