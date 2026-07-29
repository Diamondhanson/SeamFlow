# SeamFlow — tailor copilot plan (chat assistant over the tailor's own data)

Status: in build — v1 amendments folded in · Last updated: 2026-07-29

A chat assistant inside the tailor app. Two things at once: normal conversation
with the model, **and** the ability to answer questions about the tailor's own
business ("what's due this week?", "who owes me?") and perform real tasks on
request ("create an order for Ama, kaftan, due Friday") — always with a confirm
step before anything is written.

This is a *convenience layer over features that already exist*. It writes no new
business logic: its "tools" are thin wrappers around the NestJS services and
api-client resources already shipping today. Build it on the read side first;
add actions once that's solid.

---

## How it works, in one paragraph

The chat endpoint runs an **agentic loop**: it sends the conversation plus a list
of **tool definitions** to Claude; if Claude decides it needs data (or wants to
act) it returns a tool call; the server runs that tool — a few lines calling an
existing service, always scoped to the authenticated `tailorId` — feeds the
result back, and repeats until Claude has a final answer. Read tools run
immediately. **Write tools don't execute on the server from the model's word** —
they come back to the app as a *proposed action*, the tailor taps confirm, and
only then does the app call the real endpoint. So the model can *suggest* a
create/update, but a human always commits it.

This is the same `messages.create` API the `ai` module already uses for
`describeImage` — we're adding a `tools` array and a loop around it.

---

## 1. Data access — what "access to all our data" really means

The model never touches the database. It can only call tools you register, and
**every tool resolves `tailorId` from the auth context** (`requireTailorId`,
exactly like every existing controller). Consequences:

- It is structurally impossible for the assistant to read another tailor's data
  — the same tenant isolation the whole API already enforces applies to every
  tool call for free.
- "Access to all our data" = "everything you expose as a read tool." Wrap the
  main list/get endpoints and it can pull up essentially anything the app can
  show. Anything you *don't* wrap, it simply can't see.

So data coverage is a decision you make by choosing which tools to register —
not an all-or-nothing switch.

---

## 2. The tool registry (the pattern that keeps this cheap)

The single most important design choice: **register every tool in one place with
a uniform shape**, so adding a capability later is a ~5-line entry, not a wiring
exercise. Each entry is:

```ts
interface CopilotTool {
  name: string;                    // 'list_orders'
  description: string;             // WHEN to use it — this is what the model reads
  input: z.ZodTypeAny;             // Zod schema → JSON schema for the tool def
  kind: 'read' | 'write';          // read = run now; write = propose + confirm
  // read tools run server-side and return data:
  run?: (ctx: TailorCtx, args) => Promise<unknown>;
  // write tools describe the action for the confirm card; the APP executes on confirm:
  preview?: (ctx: TailorCtx, args) => Promise<ActionPreview>;
}
```

`TailorCtx` carries the resolved `tailorId` + the request-scoped clients. The
loop builds the Anthropic `tools` array from `input` (Zod → JSON schema), and
dispatches tool calls by `name`. Adding a feature later means appending one
`CopilotTool` to the registry — nothing else changes. (See §5.)

The system prompt is short and scoping: *you are SeamFlow's assistant for a
tailor; you can look up their clients, orders, invoices, measurements and
perform actions they confirm; only use the tools; never invent data; if a tool
returns nothing, say so.* It also carries **today's date (with weekday) and the
tailor's locale**, so the model does its own date math ("Friday" → an ISO date)
— no server-side date parsing anywhere.

### Tool output discipline (amendment — the biggest practical rule)

Tool handlers must **never return raw service rows**. The loop is stateless and
re-sends history each turn; a few full order objects would balloon every
subsequent call's cost and drown the model in JSON. Every read tool returns a
**projection** — the 4–6 fields the model actually needs (id, name, status, due
date…) — with a **row cap (~20)** and a `truncated: N` marker when more exist,
so the model can say "…and 12 more" or ask to narrow. This one rule keeps
per-turn cost flat as the tailor's data grows.

---

## 3. Starter tool list (all mapped to endpoints that exist today)

### Read tools — run immediately, no confirmation

| Tool | Wraps | Answers |
|---|---|---|
| `search_clients` | `clients.list({ q })` | "find client Ama", "clients named Kofi" |
| `get_client` | `clients.get(id)` | "show Ama's profile" |
| `search_orders` | `orders.list({ status, clientId, q, dueBefore, dueAfter })` | "what's due this week", "orders in testing", "Kofi's orders" |
| `get_order` | `orders.get(id)` | order detail + items + recent events |
| `list_order_items` | `orderItems.listForOrder(orderId)` | "what's in this order" |
| `list_invoices` | `invoices.list()` | "show my invoices" |
| `get_invoice` | `invoices.get(id)` | one invoice |
| `get_client_measurements` | `measurementSets.listForClient(clientId)` | "pull up Ama's measurements" |
| `list_group_orders` | `groupOrders.list({ status })` | "my group orders" |
| `get_group_order` | `groupOrders.get(id)` | group + members |
| `list_designs` | `designs.list()` | "my saved designs" |
| `list_fabrics` | `fabrics.list()` | "what fabrics do I have" |
| `business_summary` | composed from `orders.list` + `invoices.list` | "how's business?", "what's due this week?", "who owes me?" |

> `search_orders` already supports status / client / free-text / due-date-range
> filters server-side, so most "what's due…" and "who's in status X" questions
> are one tool call. **Amendment: `business_summary` is v1, not optional** — the
> list endpoints return rows, not sums, and the headline pitch questions
> ("who owes me?", "what's due this week?") are aggregations. It composes counts
> by status, due-soon orders, and invoice totals (draft/sent, balance due =
> total − deposit) from the existing services; no new SQL. True *payment*
> tracking still waits on the paused payments phase — "who owes me" answers from
> invoice balances, and the copilot should say so.

### Write tools — proposed, then confirmed in-app

| Tool | Wraps | Example ask |
|---|---|---|
| `create_client` | `clients.create` | "add client Ama, +237…" |
| `update_client` | `clients.update` | "change Ama's phone to…" |
| `create_order` | `orders.create` | "new order for Kofi, kaftan, due Friday" |
| `update_order` | `orders.update` | "move this order's due date to next Monday" |
| `set_order_status` | `orders.transition` | "mark this order delivered" (state machine enforced) |
| `add_order_item` | `orderItems.createForOrder` | "add a matching trouser to this order" |
| `update_order_item` / `remove_order_item` | `orderItems.update` / `.delete` | "remove the cap from this order" |
| `add_measurements` | `measurementSets.createForClient` | "save these measurements to Ama" |
| `create_invoice` | `invoices.createForOrder` | "make an invoice for this order" |
| `update_invoice` / `mark_invoice_sent` | `invoices.update` (status → sent) | "mark this invoice as sent" |
| `share_order_link` | `shareLinks.issueForOrder` | "get the WhatsApp link for this order" |
| `share_invoice_link` | `invoices.issueLink` | "send this invoice to the client" |
| `create_group_order` | `groupOrders.createWithMembers` | "start a group order for the Mensah wedding, 6 people" |
| `promote_member_to_client` | `groupOrderMembers.promoteToClient` | "make this member a full client" |

**Deliberately excluded from v1:** `delete_order` / `delete_client` (destructive —
leave to the UI, or require a typed confirmation), and anything about **payments
/ marking paid** — there's no manual-payment endpoint yet and deposit collection
is paused on the roadmap, so the copilot can't touch money movement today. Add
those tools the day those features land (see §5).

---

## 4. The confirm-card flow (how a human always commits)

1. Tailor: *"Create an order for Kofi — kaftan, due Friday, note 'gold buttons'."*
2. **Amendment — the model resolves, not the server.** Write tools accept
   **resolved ids only** (`clientId`, not a name). The model first calls
   `search_clients("Kofi")` — the loop it already runs — picks the id (or asks
   "you have two Kofis, which one?"), and computes "Friday" → ISO itself from
   the date in the system prompt. Then it calls `create_order` with clean args.
3. Because `create_order` is a `write` tool, the server does **not** create
   anything. `preview()` shrinks to *validate + describe*: check the ids exist
   (via the same tenant-scoped getters), flag problems (`warnings`, e.g. an
   illegal status jump), and return an **ActionPreview**:
   `{ id, tool, args, display, warnings }` — where `display` carries resolved
   human names ("Kofi Mensah") for the card.
4. The app renders a **confirm card** in the chat: *"Create order 'Kaftan' for
   Kofi Mensah, due 1 Aug 2026. [Confirm] [Edit] [Cancel]."* The card is
   composed **by the app from `display` + `args`** (localized en/fr), never
   from the model's prose — so a poisoned client note can't misdirect a write
   invisibly (prompt-injection defense: what you confirm is what executes).
5. On **Confirm**, the app calls the real endpoint (`orders.create(args)`)
   through the normal api-client + react-query path — so the cache invalidates
   and the rest of the app updates exactly as if the tailor had used the form.
   The result renders as a local "Done ✓" bubble — **no extra model round-trip
   on confirm** (saves a full Sonnet call per action).
6. **Cancel** drops it. Editing is conversational (v1): the card says *"Need a
   change? Just say it in the chat"* — a correction in plain words produces a
   fresh proposal, which beats a field-editor form for hands-busy tailors.

Key point: writes go through the **same api-client calls the screens already
use** — the model's role ends at *proposing well-formed arguments*. This keeps
validation, RLS, and cache behavior identical to manual use, and means a
misunderstanding is a declined card, never a bad write.

---

## 5. Adding features later — what's automatic, what isn't

Honest answer: **not automatic, but cheap and mechanical.** The model can only
call tools in the registry, so a new feature needs a registry entry — but if §2
is built cleanly, that entry is the whole job:

- New endpoint ships (say, a payments/"record payment" API later) →
- add one `CopilotTool` (`record_payment`, `kind: 'write'`, a `preview` that
  calls the new resource) with a one-line `description` →
- it's now in scope. No loop changes, no prompt surgery.

What it does **not** do: discover new endpoints on its own, or infer a capability
you didn't register. And one thing to watch as the registry grows past ~30–40
tools: the model gets slower/less precise at picking the right one. Mitigations
when you get there: group tools by area, or add a lightweight routing step that
first picks a domain then loads only those tools. Not a v1 concern.

---

## 6. Backend & app work

**Backend — a small `assistant` module** (its own module; the `ai` module stays
image/notes-focused).

- `POST /assistant/chat`: body `{ messages: ChatMessage[] }`. Resolves
  `tailorId` via `requireTailorId`. Runs the agentic loop against Claude with
  the registry's tool defs. Returns `{ reply, pendingAction?, toolsUsed }` —
  `pendingAction` is an ActionPreview the app must confirm; `toolsUsed` lets
  the UI caption the turn ("checked your orders"), a cheap stand-in for live
  progress until streaming lands.
- Reuse the existing Anthropic client + **503-when-`ANTHROPIC_API_KEY`-unset**
  contract verbatim.
- **Model:** use a Sonnet model here, not the Haiku used for image describe —
  multi-step tool selection reasons better on Sonnet. Cap loop iterations
  (e.g. ≤6 tool rounds) as a runaway guard.
- The registry + tool handlers (thin calls into `ClientsService`,
  `OrdersService`, `InvoicesService`, `MeasurementSetsService`, etc.).

**State (decided: on-device only, no database).** v1 is stateless server-side:
the app holds the conversation and resends recent history each turn. The thread
persists **on the device** (AsyncStorage) so it survives app restarts, capped
(~60 messages) — when it overflows, the oldest messages are trimmed; a "clear
conversation" action wipes it. Nothing is stored server-side; a `chat_messages`
table remains a clean later add if cross-device history is ever wanted.

**Schemas + api-client.** Add `ChatMessage`, the request/response, and
`ActionPreview` types to `packages/schemas` (a new `assistant.ts`, re-exported
via the index `export *`); add an `assistant.chat()` method in `api-client`;
rebuild both packages (`pnpm --filter @seamflow/schemas build`, `… api-client
build`), per `CLAUDE.md`.

**App — a chat screen.**

- A new tab/entry → message list + input, built from the existing UI kit
  (`Text`, `Card`, `ListRow`, `Button`, `Input`). Assistant text renders as
  bubbles; a `write` action renders the **confirm card**.
- On confirm, call the real api-client method via a react-query mutation so the
  cache invalidates like any other write; post the result back into the thread.
- **Non-streaming first** (simplest — show a "thinking…" indicator during the
  loop). Token streaming is a v2 polish.
- **i18n (mandatory, en + fr):** all UI chrome — the input placeholder, "Confirm
  / Edit / Cancel", the thinking + error states, the 503 "assistant
  unavailable" message — goes through `t()` in both locales; `i18n:check` must
  pass. (The model's *replies* are generated text, not UI strings, and are
  naturally in the tailor's language.)
- **Skeleton vs indicator:** the chat isn't a data-fetch list, so the
  skeleton-loader rule doesn't apply; use a "thinking" indicator for the
  in-flight turn.

---

## 7. Guardrails

- **Tenant isolation:** every tool scoped to `tailorId` (free via
  `requireTailorId`).
- **Human-in-the-loop writes:** the server never mutates from the model's
  output; the app executes on explicit confirm.
- **No destructive tools in v1** (no delete); **no money tools** until those
  endpoints exist.
- **Bounded loop:** cap tool rounds; on tool error, return the error to the
  model so it can recover or explain, rather than crashing the turn.
- **Cost awareness:** each chat turn may be several model calls (the tool loop);
  Sonnet + a round cap keeps it predictable. Ships dark behind the API key.

---

## 8. Voice (Tier 1 — on-device, hands-free chat)

Voice is a sandwich around the copilot, not a change to it: **speak → text →
the copilot above → text → spoken reply.** The model and tools are untouched;
we add speech-to-text on the input and text-to-speech on the output. Tier 1 is
fully **on-device, free, and app-only** — no backend, no new cost, no new
endpoint. (Tier 2 — cloud STT/TTS for accuracy and natural voices — is a later
upgrade; see the note at the end.)

> Honest constraint: Claude is text-only — there's no voice *in the model*. Both
> ends are separate device capabilities we wrap around it. Tier 1 uses the
> phone's built-in speech engines, so nothing leaves the device for voice.

### The two halves

- **Speech-to-text (input):** `expo-speech-recognition` (community module, not
  first-party Expo — it needs a **native rebuild**, same caveat as
  `expo-image-picker` on older dev APKs, so the app lazy-loads it and hides the
  mic when the module isn't in the build). It wraps the native iOS
  Speech framework + Android `SpeechRecognizer`. A mic button on the chat screen
  starts a session; partial transcripts stream into the text input as the tailor
  talks; on stop, the finished text is sent as a normal chat turn. Set the
  recognizer locale from the app's current i18n language (`en`/`fr`) so it
  listens in the right language.
- **Text-to-speech (output):** `expo-speech` (`Speech.speak`) reads the
  assistant's reply aloud, first-party and offline. Pass the matching `language`
  (`en`/`fr`) so a French tailor hears French. A "speak replies" toggle in
  settings controls whether replies auto-play; a tap-to-play button on each
  assistant bubble covers the rest.

### Flow

1. Tap the **mic** → `listening…` state; live transcript fills the input.
2. Stop (tap again, or on natural pause) → the transcript is sent exactly like a
   typed message — the copilot loop and confirm-card flow are unchanged.
3. The assistant's text reply renders as usual; if "speak replies" is on,
   `Speech.speak` reads it. **Write actions still show the confirm card** — voice
   never auto-commits; the tailor taps Confirm (or says nothing and it waits).

### What it touches

- **App only.** A mic button + listening indicator, a speak toggle + per-bubble
  play, and wiring both to the recognizer locale / speech language. No backend,
  no schema, no api-client change.
- **Mic permission** (`NSSpeechRecognitionUsageDescription` +
  `NSMicrophoneUsageDescription` on iOS, `RECORD_AUDIO` on Android) — model it on
  the existing camera-permission handling.
- **i18n (en + fr):** the mic/stop/listening/"speak replies" labels and the
  permission-denied message go through `t()` in both locales; `i18n:check` must
  pass. The recognizer locale and `Speech.speak` language both read from the
  active app language.

### Known Tier-1 limits (why Tier 2 exists)

On-device recognition is fine for clean English but weaker on African-accented
English and French — exactly where Tier 2's cloud STT (e.g. Whisper) is worth
it. On-device `expo-speech` voices sound robotic; natural cloud voices
(ElevenLabs/OpenAI) are the Tier-2 output upgrade. And the loop is serial
(listen → think → speak), so it feels turn-based, not conversational — a
"listening / thinking / speaking" indicator sets the right expectation; true
low-latency streaming is a Tier-2 concern. None of these block shipping Tier 1
to validate that tailors actually want to talk to it.

---

## Build checklist

**Foundation**

- [ ] `assistant.ts` schemas (`ChatMessage`, request/response, `ActionPreview`);
      re-exported; rebuild schemas.
- [ ] `assistant.chat()` in api-client; rebuild.
- [ ] `CopilotTool` registry type + agentic loop in the `assistant` module.
- [ ] `POST /ai/chat` controller, `requireTailorId`, Sonnet model, round cap,
      503 reuse.

**Read tools (ship this first — it's the "ask about my business" MVP)**

- [ ] Register the read tools in §3 as thin service calls returning **trimmed
      projections with row caps** (never raw rows).
- [ ] `business_summary` aggregation tool (v1, per the §3 amendment).

**Chat UI**

- [ ] Chat screen (message list + input) from the UI kit; "thinking" indicator.
- [ ] i18n keys (en + fr); `i18n:check` green.

**Write tools + confirm flow**

- [ ] `ActionPreview` + confirm card (Confirm / Edit / Cancel).
- [ ] Register the write tools in §3; execute on confirm via react-query
      mutations so the cache invalidates.
- [ ] Argument resolution in `preview()` (names → ids, "Friday" → ISO date).

**Voice — Tier 1 (on-device; app-only, ship after the copilot works by text)**

- [ ] `expo-speech-recognition` mic button → live transcript into the chat input;
      recognizer locale follows the app language (en/fr).
- [ ] `expo-speech` reads assistant replies; "speak replies" toggle + per-bubble
      play; speech language follows the app language.
- [ ] Mic/speech permissions (iOS usage strings + Android `RECORD_AUDIO`),
      modeled on the camera-permission flow.
- [ ] Voice-sent messages go through the identical copilot loop; write actions
      still require a tapped confirm card.
- [ ] i18n (en + fr) for all voice UI strings; `i18n:check` green.
- [ ] _(Tier 2, later:)_ cloud STT (Whisper/Deepgram) for accent/French accuracy
      + natural cloud TTS; needs transcribe/TTS endpoints + per-minute cost.

**Verify**

- [ ] Reads: due-this-week, by-status, by-client, measurements lookup all return
      correct data and nothing cross-tenant.
- [ ] Voice: mic fills the input in both en and fr; replies speak in the right
      language; a spoken "create/mark…" still lands on a confirm card.
- [ ] Writes: every action lands on a confirm card; nothing writes without
      confirm; illegal order-status jumps are rejected (409) and surfaced.
- [ ] `npm run lint` (incl. `i18n:check`) + schemas/api-client builds pass.

---

## If you only remember three things

1. **The model gets tools, not the database.** Every tool is auto-scoped to the
   tailor, so "access to all our data" = "the read tools you register," and
   cross-tenant leakage is impossible by construction.
2. **Reads run; writes are proposed and confirmed.** The server never mutates
   from the model's word — the app commits on a confirm card, through the same
   api-client calls the screens already use.
3. **Build the registry cleanly and growth is cheap.** New features become
   ~5-line tool entries; nothing is automatic, but nothing is hard either.
