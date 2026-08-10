#!/usr/bin/env node
/**
 * Fill in opening hours for prospects that don't have them yet.
 *
 * The original lead sweep didn't request hours, so they aren't in the data.
 * This is the cheap way to add them: one targeted lookup per prospect that
 * needs it, rather than re-running the whole city x category search. Roughly
 * 130 requests instead of ~1,800.
 *
 *   node scripts/backfill-hours.mjs --dry-run   # show what it would look up
 *   node scripts/backfill-hours.mjs             # fetch and save
 *   node scripts/backfill-hours.mjs --limit 20  # try a small batch first
 *
 * Safe to re-run: it only touches rows where opening_hours is null, so an
 * interrupted run picks up where it stopped.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = Number(
  args.indexOf("--limit") !== -1 ? args[args.indexOf("--limit") + 1] : 0,
);

const { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY, GOOGLE_PLACES_API_KEY: PLACES_KEY } = env;

if (!SUPABASE_URL || !KEY) {
  console.error("Supabase env missing. Check .env");
  process.exit(1);
}
if (!PLACES_KEY && !DRY_RUN) {
  console.error("GOOGLE_PLACES_API_KEY missing. Check .env");
  process.exit(1);
}

const sb = (p, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

const digits = (s) => (s ?? "").replace(/\D/g, "").slice(-10);

async function lookup(prospect) {
  // Name plus city is specific enough to land on the right listing; the phone
  // check below is what actually confirms it.
  const query = [prospect.business_name, prospect.city, "TX"]
    .filter(Boolean)
    .join(", ");

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_KEY,
        "X-Goog-FieldMask": [
          "places.id",
          "places.nationalPhoneNumber",
          "places.regularOpeningHours",
        ].join(","),
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 3 }),
    },
  );

  if (!response.ok) {
    throw new Error(`${response.status} ${(await response.text()).slice(0, 160)}`);
  }

  const { places = [] } = await response.json();

  // Only accept a result whose phone matches — a name-only match can easily be
  // a different business, and writing the wrong hours is worse than none.
  const wanted = digits(prospect.phone);
  return (
    places.find((p) => digits(p.nationalPhoneNumber) === wanted) ?? null
  );
}

async function main() {
  const query =
    "prospects?select=id,business_name,city,phone&opening_hours=is.null" +
    "&phone=not.is.null&stage=in.(new,attempting,contacted,interested,quoted)" +
    "&order=icp_score.desc";

  const response = await sb(query);
  if (!response.ok) {
    console.error(`Could not read prospects: ${response.status}`);
    process.exit(1);
  }

  let pending = await response.json();
  if (LIMIT) pending = pending.slice(0, LIMIT);

  console.log(`${pending.length} live prospects have no hours yet.`);
  console.log(`That's ${pending.length} Places lookups.\n`);

  if (DRY_RUN) {
    for (const p of pending.slice(0, 10)) {
      console.log(`  ${p.business_name} — ${p.city ?? "?"}`);
    }
    if (pending.length > 10) console.log(`  … and ${pending.length - 10} more`);
    console.log("\nDry run: nothing requested, nothing billed.");
    return;
  }

  let found = 0;
  let missed = 0;
  let failed = 0;

  for (const [i, prospect] of pending.entries()) {
    process.stdout.write(
      `\r[${i + 1}/${pending.length}] ${prospect.business_name.slice(0, 40).padEnd(40)}`,
    );

    let place;
    try {
      place = await lookup(prospect);
    } catch (error) {
      failed++;
      console.error(`\n  ${prospect.business_name}: ${error.message}`);
      continue;
    }

    if (!place?.regularOpeningHours) {
      missed++;
      continue;
    }

    const patch = await sb(`prospects?id=eq.${prospect.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        place_id: place.id ?? null,
        opening_hours: place.regularOpeningHours,
      }),
    });

    if (patch.ok) found++;
    else failed++;
  }

  console.log("\n");
  console.log(`  ${found} prospects now have hours`);
  console.log(`  ${missed} had no hours published on Google`);
  if (failed) console.log(`  ${failed} failed`);
  console.log("\nCalling mode will now show open/closed before you dial.");
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
