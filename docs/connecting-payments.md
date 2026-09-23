# Connecting a payment provider

Everything around subscriptions is finished and tested: trials, entitlement,
the caps and gates, the plans screen, the buying flow, webhooks, receipts,
reminders and the ops levers. What is missing is the rail that moves money.

This is the whole job.

## 1. Write the adapter

One file in `apps/seamflow-api/src/subscriptions/providers/`, implementing
`PaymentProvider` (see `payment-provider.ts`). Four members:

| Member | What it must do |
|---|---|
| `name` | Short id stored on every payment row (`'fapshi'`, …) |
| `isConfigured()` | False when credentials are missing — checkout then answers 503 |
| `supports(method)` | Which of `mtn_momo` / `orange_money` / `card` it can take |
| `start(input)` | Begin a collection; return the provider's own reference |
| `parseWebhook(headers, rawBody)` | **Verify the signature**, then say which payment and whether it succeeded — or return `null` |

`parseWebhook` returning `null` for anything unverified is the door to the
money. `FakePaymentProvider` in the same folder is a working example, signature
check included, and `scripts/test-subscriptions.ts` already proves the path
around it — including that an unsigned webhook is refused and a webhook
delivered twice credits once.

## 2. Register it

In `payment-provider.factory.ts`, add one `case`:

```ts
case 'fapshi': return new FapshiProvider(config);
```

## 3. Configure the server

On Render, set:

- `SUBSCRIPTION_PAYMENT_PROVIDER=fapshi`
- whatever keys the adapter reads (API key, secret, webhook secret)

Nothing else in the codebase learns the provider's name.

## 4. Point the provider's webhook at us

`POST https://seamflow-api.onrender.com/subscriptions/webhook/<provider>`

It is public by design — the signature is the authentication — and always
answers `200`, because a provider that receives an error retries for hours and
an unverifiable body is not something a retry fixes. The raw bytes are
preserved for signature checking (`rawBody: true` in `main.ts`); do not
re-serialise the parsed body.

## 5. Test with real money, once

Buy the monthly plan from the app on a real handset. Check:

- the payment appears in **Ops → Subscriptions** revenue
- the tailor's `premium_until` moved by 30 days
- the tailor got the "payment received" push

## 6. Turn the limits on

**Ops → Subscriptions → Free limits & premium gates → Turn limits on.** That is
the last step, and the only one that changes what tailors can do. It takes
effect within ~15 seconds with no deploy, and the same switch turns it back off
if anything goes wrong.

## What is deliberately NOT built

**Card auto-renewal** (saved cards, the 30-day charge job, the 7-day dunning
window with retries on days 1/3/5/7 — appendix I.6). It needs a provider whose
tokenisation shape we can honour; guessing now means rewriting later. The
account states (`grace`, `graceUntil`) and `SubscriptionsService.startGrace()`
already exist for it.

Until then, card payments work exactly like mobile money: a prepaid block of
time that the tailor renews. Nothing about that is broken — it is how the whole
model already works, and mobile money cannot auto-renew anyway.
