# App Store "App Privacy" answers — ready to copy

Where: App Store Connect → SeamFlow → **App Privacy** → *Get Started / Edit*.
Apple has no API for this page, so it has to be entered by hand. It takes about
10 minutes. Every answer below comes from the app's code and from
https://www.seamflowtech.com/privacy (last updated October 8, 2026). If the
policy changes, change this page too.

## First two questions

| Question | Answer |
|---|---|
| Do you or your third-party partners collect data from this app? | **Yes, we collect data** |
| Do you use data for **tracking** (linking with other companies' data for ads, or sharing with data brokers)? | **No.** SeamFlow shows no ads and sells nothing. |

Because the answer to tracking is **No**, you do not need the App Tracking
Transparency prompt, and every "Used for tracking?" box below stays **No**.

## Data types to tick

For every row: **Linked to the user's identity = Yes** (it belongs to an account),
**Used for tracking = No**, **Purpose = App Functionality** (the only purpose
unless the table says more).

| Apple category | Data type | Why SeamFlow has it |
|---|---|---|
| Contact Info | **Email Address** | sign-up and sign-in |
| Contact Info | **Phone Number** | sign-up, optional phone check, clients' numbers a designer records |
| Contact Info | **Name** | business name; names of clients a designer records |
| Contact Info | **Physical Address** | client addresses a designer records |
| Contacts | **Contacts** | the one phone contact a designer picks to save as a client |
| Location | **Coarse Location** | one rounded reading, only when a designer taps "confirm my area" |
| User Content | **Photos or Videos** | work photos, design photos, shared photos, measurement-sheet scans |
| User Content | **Audio Data** | voice notes sent in chat |
| User Content | **Emails or Text Messages** | chat messages between a shop and a customer |
| User Content | **Customer Support** | support tickets, with their photos |
| User Content | **Other User Content** | measurements, orders, notes, invoices, fabrics, designs a designer publishes |
| Purchases | **Purchase History** | the record of a subscription payment (bought on the website; the app only shows status) |
| Identifiers | **User ID** | account id |
| Identifiers | **Device ID** | the push-notification token |

### Where the answer is "Third party" or has an extra purpose

* **Photos, Other User Content, Emails or Text Messages, Name** can be sent to
  Anthropic (the AI provider) **only after the person taps Allow** in the app's
  new consent question. Apple asks whether collected data is shared with third
  parties for the listed purposes — the purpose is still **App Functionality**,
  and Anthropic is a service provider acting for us (it does not train on the
  data), so this is not "sharing for advertising".

## Types to leave UNticked

Health & Fitness · Financial Info (we never see or store card numbers — card
details go straight to the payment provider on the website) · Sensitive Info ·
Browsing History · Search History · Usage Data (no analytics SDK in the app) ·
Diagnostics (the app has no crash reporter yet — see below) · Surroundings ·
Body (see note) · Other Data Types.

## Things to decide yourself

1. **Body measurements.** Apple's "Body" category is for things like body-shape
   scans. Tailoring measurements are typed numbers on an order, so they are
   listed above under *Other User Content*. If you want to be extra careful you
   can also tick *Health & Fitness → Fitness*; it is not required.
2. **Diagnostics.** The API (not the app) sends error reports to Sentry. The
   app itself has no crash reporter (`lib/crash-reporting.ts` is an empty
   seam). If you turn that on later, also tick **Diagnostics → Crash Data**.
3. **Photos library / camera / microphone / contacts** are each optional and
   only asked when used — nothing to declare beyond the table.

## After entering

Apple shows a preview "nutrition label". It should read roughly: *Data Linked
to You — Contact Info, Contacts, Location, User Content, Purchases,
Identifiers.* **Nothing under "Data Used to Track You".** Press **Publish**.
