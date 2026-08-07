# Google Play listing copy

Paste-ready. Keep in sync when features ship — this is the only place the
store copy lives.

Field limits Play enforces: **title 30**, **short description 80**,
**full description 4000** characters.

---

## Title (30 max)

```
SeamFlow: Tailor Assistant
```

## Short description (80 max)

```
The AI tailor assistant for clients, measurements, orders and invoices.
```

## Full description (4000 max)

```
SeamFlow is your whole workshop, in one calm place.

Built for independent tailors and fashion designers, SeamFlow replaces the scattered notebooks, phone notes, and group chats with one organized home for your clients, measurements, orders, deadlines, and invoices. It is a tailor assistant in the truest sense: it holds the details, so you can spend your time on the craft.

EVERYTHING THE CRAFT NEEDS

AI ASSISTANT, BY TEXT OR VOICE
Ask "what is due this week?" or "who owes me money?" and get a straight answer about your own business. Tell it to create a client, an order, or an invoice and it prepares the record, shows you exactly what will be saved, and waits for your confirmation. Speak to it while your hands are busy, and have the replies read back to you.

SCAN MEASUREMENTS FROM PAPER
Photograph a filled measurement sheet and SeamFlow reads the numbers straight into a measurement set. Photograph a blank page from your measurement booklet and it becomes a reusable template. You check every value against the photo before anything is saved.

CLIENTS AND MEASUREMENTS
Save each client once, with as many measurement sets as they need. Build your own measurement templates for each garment type, and reuse a client's saved measurements on their next order, so nothing gets missed and nothing gets re-taken.

ORDERS WITH STATUS TRACKING
Move every order from registered, to in progress, to fitting, to delivered. You always know exactly where the work stands, and so does your client.

INVOICES AND DEPOSITS
Turn any finished order into an invoice, with separate lines for workmanship, fabric, and extras. Record a deposit and SeamFlow works out the balance due. Share it as a link, or send it as a PDF.

CALENDAR AND REMINDERS
See every fitting and delivery laid out day by day, and get a gentle nudge before each one. Deadlines stop sneaking up on you.

GROUP ORDERS
Wedding parties, aso-ebi, and uniforms made simple. Coordinate a whole group with shared fabric and per-member measurements, all in one place.

DESIGN STUDIO
Collect inspiration and fabric photos into a mood board you can actually browse. Open any image full screen, swipe through the collection, and let AI turn a reference photo into clean, structured design notes you can work from.

FABRIC LIBRARY
Photograph your stock, track supplier and cost per meter, and attach fabric straight to an order.

SHARE WITH CLIENTS
Send a simple link and your client sees their order, status, fitting date, and photos. There is no app for them to install.

PHONE, TABLET, OR COMPUTER
Use SeamFlow on your phone in the workshop, on a tablet at the cutting table, or in any browser on a laptop. Your work follows you.

PRIVATE AND PROTECTED
Lock the app with a PIN so your client list stays yours, even if someone else picks up your phone. Your data belongs to you, and we do not sell it.

BILINGUAL AND OFFLINE
Full English and French, on every screen. Take orders and make edits on the spot even with no signal, and everything syncs automatically when you are back online.

UP AND RUNNING IN MINUTES

1. Add a client. Type their name, phone, and measurements, import straight from your contacts, or scan a filled measurement sheet with your camera.

2. Create an order. Pick a garment, set the delivery date, and add design notes and reference photos. Or simply tell the assistant and confirm.

3. Get reminded, get paid. SeamFlow nudges you before every fitting and deadline, keeps your client in the loop, and turns the finished order into an invoice.

WHY WE BUILT IT

Independent tailors run real businesses on notebooks and memory. SeamFlow gives that craft modern tools, with a calm and considered interface that reflects the same care you put into your work. It starts bilingual, it is built offline-first, and it is growing toward every language and market where great clothes are still made by hand.

Free while SeamFlow is in early access.

Download SeamFlow and bring your whole workshop together.
```

---

## Graphics

| Asset | Spec | Where |
|---|---|---|
| App icon | 512x512 PNG, under 1 MB | `assets/brand/play-store-icon-512.png` |
| Feature graphic | 1024x500 PNG/JPEG | `assets/brand/play-feature-graphic-1024x500.png` |
| Phone screenshots | 2-8 shots, min 320px, 16:9 or 9:16 | **not made yet** |

### Regenerating them

Both come from the vector sources in `assets/brand/`, never from downscaling a
PNG. Requires `librsvg` (`brew install librsvg`).

App icon — full-bleed on purpose, because Play applies its own rounded mask and
a pre-rounded icon gets clipped twice:

```bash
rsvg-convert -w 512 -h 512 -b '#7B30E8' \
  assets/brand/icon-fullbleed.svg -o assets/brand/play-store-icon-512.png
```

Feature graphic — the composed source is `assets/brand/play-feature-graphic.svg`
(wordmark and mark embedded as data URIs so it renders standalone). Two things
that are easy to get wrong:

- **Brand fonts aren't installed system-wide.** They live in
  `node_modules/@expo-google-fonts/{fraunces,inter}/**/*.ttf`. Stage them in a
  temp dir and point fontconfig at it with `XDG_DATA_HOME`.
- **`PANGOCAIRO_BACKEND=fc` is required on macOS.** Without it rsvg goes through
  CoreText, silently ignores the staged fonts, and falls back to a generic sans
  — `fc-match` will still claim Fraunces resolves fine, so the only way to catch
  it is to look at the output.

```bash
TMP=$(mktemp -d) && mkdir -p "$TMP/fonts"
cp node_modules/@expo-google-fonts/fraunces/700Bold/Fraunces_700Bold.ttf "$TMP/fonts/"
cp node_modules/@expo-google-fonts/inter/{500Medium/Inter_500Medium,600SemiBold/Inter_600SemiBold}.ttf "$TMP/fonts/"
XDG_DATA_HOME="$TMP" PANGOCAIRO_BACKEND=fc rsvg-convert -w 1024 -h 500 -b '#7B30E8' \
  assets/brand/play-feature-graphic.svg -o assets/brand/play-feature-graphic-1024x500.png
```

Play may crop the feature graphic on some surfaces, so nothing important sits
within ~60px of an edge. Play's metadata policy also bans calls to action
("Download now") and ranking or price claims in graphics — keep it descriptive.
