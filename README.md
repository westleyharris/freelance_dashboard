# Freelance Dashboard

Prospecting, call tracking, clients, projects, and invoicing for Harris Web Works.
Replaces `Prospects.xlsx`.

Next.js 16 · Supabase Postgres · deployed on Vercel.

---

## What it does

| Screen | Answers |
| --- | --- |
| **Today** | Who do I call today? How many calls did I make this week, and how many reached a person? |
| **Calling mode** | One prospect at a time, tap to dial, script on screen, log the outcome in two taps. |
| **Pipeline** | Every prospect by stage, with follow-up dates and full call history. |
| **Clients** | Won deals, their projects, and the intake form link to send them. |
| **Projects** | Build status plus where everything lives — repo, domain, registrar, hosting, form endpoint. |
| **Money** | Invoices, what's outstanding, what's been collected. |
| **Intake form** | A public link that replaces the Word doc questionnaire. |

---

## Setup

### 1. Environment variables

Copy `.env.example` to `.env` and fill it in from **Settings → API** in the
Supabase dashboard:

```bash
cp .env.example .env
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It has no `NEXT_PUBLIC_`
prefix, which is what keeps it off the browser — don't add one.

Next.js reads env files **at startup only**. Restart the dev server after
editing.

### 2. Create the database

**Already done** for project `mbukjplyrcpvtekcexmg` — schema, 83 prospects, 4
clients, 4 projects are live.

To rebuild the schema from scratch, run `supabase/migrations/0001_init.sql` in
the Supabase **SQL Editor**. There is no seed file — the app is the system of
record now.

### 3. Run it and create your account

```bash
npm install && npm run dev
```

Open **/signup** and create your login. That page works only while zero users
exist and refuses afterwards — this dashboard has no invite system and RLS gives
every authenticated user full access to prospects, client contacts, and revenue,
so an open registration route would hand the business to anyone who found the
URL.

Need a second user later? Add them deliberately from **Supabase →
Authentication → Users**, with **Auto Confirm User** ticked.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add all four environment variables from `.env` under
   **Settings → Environment Variables**. Generate `CRON_SECRET` with
   `openssl rand -hex 32`.
4. Deploy.

`vercel.json` registers a daily cron on `/api/cron/keepalive`.

### If the deploy shows "Internal Server Error"

That bare, unstyled message means middleware threw before any page could
render — almost always a missing environment variable, since `proxy.ts` runs on
every request and calls Supabase.

The app now redirects to **`/setup`** instead, which names exactly which
variables are missing. Two things catch people out:

1. **Set them for Production, not just Development.** Vercel scopes variables
   per environment, and missing the Production scope is the usual cause.
2. **Redeploy after adding them.** `NEXT_PUBLIC_*` values are inlined into the
   bundle at build time, so a running deployment can't pick them up — it needs a
   fresh build.

For any other 500, the real stack trace is in Vercel under
**your project → Logs**, filtered to Runtime.

### About the keep-alive

Supabase [pauses free-plan projects](https://supabase.com/docs/guides/platform/free-project-pausing)
that show low activity across a 7-day window. Their docs say a few database
requests per day is enough to stay active, so the cron touches three tables once
a day and that's the whole job.

If it ever pauses anyway, the app detects the failed query and shows a banner
with a direct link to **Resume project** instead of a stack trace. Data stays
restorable for 90 days.

Note that Vercel's Hobby plan runs crons **once per day** at an approximate
time. That's sufficient here.

---

## Data origin

The original 83 prospects came from `Prospects.xlsx`, which is now retired —
this app is the system of record. The importer and its generated SQL have been
deleted; only `supabase/migrations/0001_init.sql` remains as the schema.

Two artifacts of that history are still in the schema:

- **`prospects.legacy_attempts`** — dial counts inferred from the old notes
  ("Called twice" → 2). The spreadsheet had no call dates, so these were never
  written to `calls`; seeding invented history would have corrupted connect-rate
  metrics permanently. The UI shows them separately and stats ignore them. All
  real metrics start from the first call logged in the app.
- **`prospects.notes`** — the original free-text note, preserved verbatim.

Note that a closed prospect's note often still reads like a live deal
(*"Def follow up he said he is interested…"*). In the spreadsheet the row colour
was the truth and the note was noise; here the `stage` column is the truth.

---

## ICP scoring

`prospects.icp_score` is a generated column (0–100) that orders the calling
queue. Weights live in `icp_category_points()`, `icp_website_points()`, and
`icp_source_points()` in the schema — change them with a migration and every row
rescores automatically.

Derived from the outcomes of the first 83 calls:

| Signal | Weight | Why |
| --- | --- | --- |
| Category tier A — events, party, signs, handyman, remodel, photography, pet | +40 | Customers plan and compare; a website is the sales tool. 3 events calls → 2 wins |
| Category tier C — plumbing, roofing, HVAC, tree, lawn, food | +5 | Emergency or walk-in trade. 32 calls → 0 wins |
| Social presence, no website | +30 | Already markets itself, missing the asset. Fit 2 of 3 wins |
| No website at all | +25 | |
| Already has a website | +0 | |
| Chamber member | +20 | Dues mean they've decided to spend on visibility. Closed 25% |
| Source: chamber / Nextdoor / referral / in person | +15 | All 3 wins came from these |
| Source: Google Maps, scraped directories | +0 | 0 wins from 54 calls |
| No phone number | −20 | 17% of the first list had dead numbers |

**This is tuned on three wins.** It encodes a hypothesis about which businesses
buy websites, not a validated model — the fact that won prospects average 77 and
lost average 24 is partly circular. Use it to order the queue, and re-tune once
there's real volume behind it.

---

## Keyboard

| Key | Does |
| --- | --- |
| `Cmd/Ctrl+K` | Search every prospect by name, category, city, or partial phone number; also jumps to any screen |
| `↑` `↓` `↵` | Move and open within the palette |
| `1`–`9` | Pick a call outcome in calling mode |
| `Esc` | Close the palette |

The palette loads the prospect list once and filters in the browser, so typing
stays instant. Number keys are ignored while a text field has focus, so notes
can contain digits.

---

## Lead generation

```bash
node scripts/fetch-leads.mjs --dry-run     # query plan, spends nothing
node scripts/fetch-leads.mjs               # fetch + filter -> leads.csv
node scripts/backfill-hours.mjs --dry-run  # see what needs hours
node scripts/backfill-hours.mjs            # add opening hours
```

`fetch-leads.mjs` queries Google Places across your service area and keeps only
businesses that pass every gate: operating, real phone (no toll-free), 5+
reviews, **no real website**, right business type, in your service area, and not
already in your pipeline. Output goes to `leads.csv` for review, then into
`/prospects/import`.

The gates matter more than the volume. Two filtering bugs worth remembering:

- It filters on Google's returned `primaryTypeDisplayName`, not the search term.
  Searching "catering" returns BBQ joints; "quinceanera dresses" returned 37
  clothing stores.
- `city` comes from the street address, not the city searched. Google's text
  search happily returns businesses hours away — an early run surfaced leads in
  Longview and New Braunfels.

`backfill-hours.mjs` adds opening hours to prospects that lack them, one
targeted lookup each rather than re-running the whole sweep. It only touches
rows where `opening_hours` is null, so it's safe to re-run after an interruption,
and it confirms each match by phone number before writing — a name-only match
can easily be a different business.

---

## Schema notes

- **`prospects.next_action_at`** is the single source of truth for "who do I
  call today". It replaces the old Yes/No `Follow up?` column, which couldn't
  express *when*.
- **`calls`** is one row per dial. A trigger keeps `prospects.call_count` and
  `last_contacted_at` in sync so the pipeline list never has to aggregate.
- **Logging a call moves the stage automatically** (see `OUTCOME_TO_STAGE` in
  `src/app/actions.ts`), but never demotes. Logging "no answer" on someone
  already marked interested leaves them interested.
- **`intake_forms.token`** is a random 32-character hex string. The public form
  writes through the service role rather than an anon RLS policy, so a leaked
  anon key can't enumerate or edit intake records.

---

## Layout

```
src/
  app/
    (app)/           signed-in screens — Today, call, pipeline, clients, projects, money
    intake/[token]/  public client questionnaire, no auth
    api/cron/        keep-alive
    actions.ts       server actions for all writes
  components/        UI, call runner, editors
  lib/
    script.ts        talking points from Call_Script.pdf
    types.ts         mirrors the SQL schema
supabase/
  migrations/        schema, in version control
```

## Connecting Claude to this database

Use the **"supabase personal"** connector, which is authorized against the
`personal` org and reaches project `mbukjplyrcpvtekcexmg`.

The default Supabase connector is authorized against the `IME` org and **cannot
see this project** — Supabase OAuth grants are per-organization, so it returns
an empty list no matter how many times it's retried.
