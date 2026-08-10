#!/usr/bin/env node
/**
 * Pull qualified leads from the Google Places API.
 *
 * The point of this script is what it *rejects*. The first 83 prospects were
 * 17% dead numbers and included 32 emergency-trade businesses that never had a
 * reason to buy a website. Everything below is a hard gate against repeating
 * that, and every rejection is counted so you can see the filter working.
 *
 *   node scripts/fetch-leads.mjs --dry-run     # show the query plan, spend nothing
 *   node scripts/fetch-leads.mjs               # fetch, filter, write leads.csv
 *   node scripts/fetch-leads.mjs --cities Rockwall,Rowlett --min-reviews 10
 *
 * Output is a CSV shaped for the dashboard's /prospects/import screen, so you
 * still get to eyeball the list before anything lands in the pipeline.
 *
 * Billing note: asking for phone + website puts these calls in the pricier
 * Places "Advanced/Enterprise" field tier rather than Basic. Both fields are
 * the entire point here, so that's unavoidable — check your usage in the Google
 * Cloud console, and set a quota cap there before a long run.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* ------------------------------------------------------------------ config */

/**
 * Search terms, restricted to businesses whose customers plan and compare
 * before buying. Emergency and walk-in trades are deliberately absent: they
 * were 0 for 32.
 */
const CATEGORIES = [
  "party rental",
  "event rentals",
  "balloon decorations",
  "photo booth rental",
  "event planner",
  "wedding photographer",
  "photographer",
  "handyman",
  "remodeling contractor",
  "custom cabinets",
  "fence company",
  "pet grooming",
  "dog boarding",
  "med spa",
  "day spa",
  "hair salon",
  "barber shop",
  "auto detailing",
  "boutique",
  "personal trainer",
];

const CITIES = [
  "Rockwall, TX",
  "Rowlett, TX",
  "Mesquite, TX",
  "Garland, TX",
  "Forney, TX",
  "Wylie, TX",
  "Sachse, TX",
  "Murphy, TX",
  "Royse City, TX",
  "Heath, TX",
  "Terrell, TX",
  "Sunnyvale, TX",
];

/** Toll-free prefixes mean a call centre or franchise, not a local owner. */
const TOLL_FREE = new Set(["800", "888", "877", "866", "855", "844", "833"]);

/** DFW and surrounding area codes. Outside these is flagged, not rejected. */
const LOCAL_AREA_CODES = new Set([
  "214", "469", "972", "945", "682", "817", "430", "903", "940", "254",
]);

/**
 * Business types to throw out regardless of what was searched for.
 *
 * A search term is a guess; `primaryTypeDisplayName` is what Google says the
 * business actually is. Searching "catering" returns BBQ joints and searching
 * "quinceanera dresses" returns 37 clothing stores — none of which have ever
 * bought from you (food & drink was 3-of-4 marked not-a-fit). Filtering on the
 * returned type instead of the query is what keeps this list callable.
 *
 * Word boundaries matter here: \bbar\b must not swallow "Barber shop".
 */
const REJECT_TYPES =
  /\b(restaurant|cafe|coffee|bar|pub|lounge|grill|diner|pizzeria|deli|bakery|food|snack|candy|ice cream|grocery|supermarket|liquor|wholesaler|convenience|pharmacy|bank|church|school|dentist|doctor|clinic|hospital|insurance|attorney|lawyer|hotel|motel|apartment|storage|dealer|gas station|smoke shop|vape)\b/i;

/**
 * Retail. Sells goods over a counter rather than a service you book, so the
 * website pitch is weak. Excluded by default; pass --allow-retail to keep them.
 *
 * Spelled out in full rather than matching bare "shop"/"store" — a loose
 * \bshop\b threw out every "Barber shop", which is a service business.
 */
const RETAIL_TYPES =
  /\b(clothing|discount|home goods|gift|department|thrift|electronics|hardware|home improvement|cake|furniture|jewelry|book)\s+(store|shop)\b/i;

/** A page on one of these is not a real website — it's the opportunity. */
const SOCIAL_HOSTS = /facebook\.com|instagram\.com|linktr\.ee|linktree|m\.me/i;
const SITEBUILDER_HOSTS =
  /business\.site|wixsite\.com|wix\.com|squarespace\.com|weebly\.com|godaddysites\.com|myshopify\.com|square\.site|carrd\.co/i;

/* --------------------------------------------------------------- arguments */

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const DRY_RUN = has("dry-run");
const MIN_REVIEWS = Number(flag("min-reviews", 5));
const MAX_PAGES = Number(flag("max-pages", 2)); // 20 results per page
const INCLUDE_SITEBUILDER = !has("no-sitebuilder");
const ALLOW_RETAIL = has("allow-retail");
const cities = flag("cities", null)?.split(",").map((c) =>
  c.trim().endsWith("TX") ? c.trim() : `${c.trim()}, TX`,
) ?? CITIES;
const categories = flag("categories", null)?.split(",").map((c) => c.trim()) ?? CATEGORIES;

/* ------------------------------------------------------------------- setup */

function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const API_KEY = env.GOOGLE_PLACES_API_KEY;

if (!API_KEY && !DRY_RUN) {
  console.error("GOOGLE_PLACES_API_KEY is not set in .env");
  process.exit(1);
}

/* ------------------------------------------------------------------ places */

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.businessStatus",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.googleMapsUri",
  "places.shortFormattedAddress",
  "nextPageToken",
].join(",");

async function searchPlaces(query) {
  const results = [];
  let pageToken;

  for (let page = 0; page < MAX_PAGES; page++) {
    const body = { textQuery: query, maxResultCount: 20 };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Places API ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    results.push(...(data.places ?? []));

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // The token needs a moment before it resolves.
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

/* ----------------------------------------------------------------- filters */

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const ten =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return ten.length === 10 ? ten : null;
}

/** Returns null if the lead passes, or a string reason if it should be cut. */
function rejectionReason(place) {
  if (place.businessStatus !== "OPERATIONAL") return "not operating";

  const type = place.primaryTypeDisplayName?.text ?? "";
  if (type && REJECT_TYPES.test(type)) return `wrong business type (${type})`;
  if (type && !ALLOW_RETAIL && RETAIL_TYPES.test(type)) {
    return `retail, not a service (${type})`;
  }

  const phone = normalizePhone(place.nationalPhoneNumber);
  if (!phone) return "no usable phone";
  if (TOLL_FREE.has(phone.slice(0, 3))) return "toll-free (chain/call centre)";

  const reviews = place.userRatingCount ?? 0;
  if (reviews < MIN_REVIEWS) return `too few reviews (${reviews})`;

  const site = place.websiteUri;
  if (site && !SOCIAL_HOSTS.test(site)) {
    if (SITEBUILDER_HOSTS.test(site)) {
      if (!INCLUDE_SITEBUILDER) return "has a sitebuilder site";
    } else {
      return "already has a real website";
    }
  }

  return null;
}

function websiteLabel(site) {
  if (!site) return "";
  if (SOCIAL_HOSTS.test(site)) return site;
  if (SITEBUILDER_HOSTS.test(site)) return site;
  return site;
}

/* ------------------------------------------------- existing pipeline check */

/**
 * Pull everyone already in the pipeline so they never reach the CSV.
 *
 * The importer also dedupes, but catching it here matters more: the whole
 * value of this output is that every line is worth a call. A business you
 * already closed showing up as a "new lead" wastes exactly the attention this
 * script exists to protect.
 */
async function loadExistingKeys() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("Supabase env missing — skipping the already-contacted check.");
    return { phones: new Set(), names: new Set() };
  }

  const response = await fetch(
    `${url}/rest/v1/prospects?select=business_name,phone`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );

  if (!response.ok) {
    console.warn(`Could not read existing prospects (${response.status}).`);
    return { phones: new Set(), names: new Set() };
  }

  const rows = await response.json();
  return {
    phones: new Set(rows.map((r) => normalizePhone(r.phone)).filter(Boolean)),
    names: new Set(rows.map((r) => r.business_name.trim().toLowerCase())),
  };
}

/* --------------------------------------------------------------------- csv */

const CSV_COLUMNS = [
  "business_name",
  "phone",
  "website",
  "category",
  "city",
  "source_url",
  "notes",
];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/* -------------------------------------------------------------------- main */

async function main() {
  const queries = [];
  for (const city of cities) {
    for (const category of categories) {
      queries.push({ city, category, query: `${category} in ${city}` });
    }
  }

  console.log(
    `${queries.length} queries — ${categories.length} categories x ${cities.length} cities`,
  );
  console.log(
    `up to ${MAX_PAGES} pages each, so at most ~${queries.length * MAX_PAGES * 20} raw results\n`,
  );

  if (DRY_RUN) {
    console.log("Dry run. Sample queries:");
    for (const q of queries.slice(0, 8)) console.log(`  ${q.query}`);
    console.log(`  … and ${queries.length - 8} more`);
    console.log("\nNothing was requested and nothing was billed.");
    return;
  }

  const existing = await loadExistingKeys();
  console.log(
    `${existing.names.size} businesses already in the pipeline will be skipped.\n`,
  );

  const kept = [];
  const seenPlaceIds = new Set();
  const seenPhones = new Set();
  const nameCount = new Map();
  const rejects = new Map();
  const note = (reason) => rejects.set(reason, (rejects.get(reason) ?? 0) + 1);

  let done = 0;
  for (const { city, category, query } of queries) {
    done++;
    process.stdout.write(`\r[${done}/${queries.length}] ${query.padEnd(52)}`);

    let places;
    try {
      places = await searchPlaces(query);
    } catch (error) {
      console.error(`\n  failed: ${error.message}`);
      continue;
    }

    for (const place of places) {
      if (seenPlaceIds.has(place.id)) continue;
      seenPlaceIds.add(place.id);

      const reason = rejectionReason(place);
      if (reason) {
        note(reason);
        continue;
      }

      const phone = normalizePhone(place.nationalPhoneNumber);
      if (seenPhones.has(phone)) {
        note("duplicate phone across queries");
        continue;
      }
      seenPhones.add(phone);

      const name = place.displayName?.text ?? "";

      if (existing.phones.has(phone) || existing.names.has(name.trim().toLowerCase())) {
        note("already in your pipeline");
        continue;
      }

      nameCount.set(name, (nameCount.get(name) ?? 0) + 1);

      const reviews = place.userRatingCount ?? 0;
      const rating = place.rating ? `${place.rating}★` : "no rating";
      const local = LOCAL_AREA_CODES.has(phone.slice(0, 3));

      // Google's text search happily returns businesses well outside the named
      // city, so take the city from the actual address rather than the query —
      // otherwise a Greenville shop gets filed under Rockwall.
      const address = place.shortFormattedAddress ?? "";
      const addressCity = address.split(",").map((s) => s.trim()).at(-1) || "";
      const actualCity = addressCity || city.replace(", TX", "");

      kept.push({
        business_name: name,
        phone: `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`,
        website: websiteLabel(place.websiteUri),
        category: place.primaryTypeDisplayName?.text || category,
        city: actualCity,
        source_url: place.googleMapsUri ?? "",
        notes: [
          `${rating}, ${reviews} reviews`,
          address,
          local ? null : `out-of-area area code ${phone.slice(0, 3)}`,
        ]
          .filter(Boolean)
          .join(" · "),
        _reviews: reviews,
      });
    }
  }

  console.log("\n");

  // A name recurring across several cities is a franchise, not an owner-operator.
  const chains = new Set(
    [...nameCount.entries()].filter(([, n]) => n >= 3).map(([name]) => name),
  );
  const final = kept.filter((lead) => {
    if (chains.has(lead.business_name)) {
      note("looks like a chain (same name in 3+ cities)");
      return false;
    }
    return true;
  });

  // Best-reviewed first: a busy business with no website is the strongest lead.
  final.sort((a, b) => b._reviews - a._reviews);

  const outPath = path.join(ROOT, "leads.csv");
  fs.writeFileSync(
    outPath,
    [
      CSV_COLUMNS.join(","),
      ...final.map((lead) => CSV_COLUMNS.map((c) => csvCell(lead[c])).join(",")),
    ].join("\n") + "\n",
  );

  console.log(`Examined ${seenPlaceIds.size} businesses.\n`);
  console.log("Rejected:");
  for (const [reason, count] of [...rejects.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${reason}`);
  }

  console.log(`\nKept ${final.length} qualified leads -> ${path.relative(ROOT, outPath)}`);
  console.log("\nTop 10 by review count:");
  for (const lead of final.slice(0, 10)) {
    console.log(
      `  ${lead.business_name.slice(0, 34).padEnd(34)} ${lead.phone}  ${lead._reviews} reviews  ${lead.city}`,
    );
  }
  console.log(
    "\nOpen leads.csv, give it a look, then paste it into /prospects/import.",
  );
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
