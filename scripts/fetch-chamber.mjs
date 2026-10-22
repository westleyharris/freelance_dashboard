#!/usr/bin/env node
/**
 * Pull the Rockwall Area Chamber member directory into the pipeline.
 *
 * These are warm calls: you're a member, they are too, and the opener is
 * "I just joined and saw you in the directory" — not a cold Google scrape.
 * Businesses already in the pipeline are marked chamber members so the warm
 * script shows up the next time you dial them. Everyone else is inserted.
 *
 *   node scripts/fetch-chamber.mjs --dry-run
 *   node scripts/fetch-chamber.mjs --csv-only
 *   node scripts/fetch-chamber.mjs
 *
 * Listings live at business.rockwallchamber.org/list/searchalpha/{letter}.
 * The card has the phone; the member page has the website and category.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = "https://business.rockwallchamber.org";
const LETTERS = ["0-9", ..."abcdefghijklmnopqrstuvwxyz".split("")];

const UA =
  "Mozilla/5.0 (compatible; HarrisWebWorks/1.0; Rockwall Chamber member; directory import)";

const SOCIAL_HOSTS = /facebook\.com|instagram\.com|linktr\.ee|linktree|m\.me/i;
const SITEBUILDER_HOSTS =
  /business\.site|wixsite\.com|wix\.com|squarespace\.com|weebly\.com|godaddysites\.com|myshopify\.com|square\.site|carrd\.co/i;

/** The chamber itself, and this dashboard's owner, are not prospects. */
const SKIP_NAMES =
  /^(rockwall area chamber( of commerce)?|harris web works)$/i;

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY_RUN = has("dry-run");
const CSV_ONLY = has("csv-only");
const letters = flag("letters", null)?.split(",").map((l) => l.trim().toLowerCase()) ?? LETTERS;

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

function decode(value) {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const ten =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return ten.length === 10 ? ten : null;
}

function formatPhone(ten) {
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function websiteStatus(site, socialOnly) {
  if (site && !SOCIAL_HOSTS.test(site)) {
    return SITEBUILDER_HOSTS.test(site) ? "sitebuilder" : "has_website";
  }
  if ((site && SOCIAL_HOSTS.test(site)) || socialOnly) return "social_only";
  return "none";
}

async function get(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return response.text();
}

function parseCards(html) {
  const cards = [];
  const parts = html.split('data-memid="').slice(1);

  for (const part of parts) {
    const memid = part.match(/^(\d+)/)?.[1];
    if (!memid) continue;

    const level = decode(part.match(/data-gz-wp="([^"]*)"/)?.[1] ?? "");
    const profile = part.match(
      /href="(https:\/\/business\.rockwallchamber\.org\/list\/member\/[^"]+)"/,
    )?.[1];
    const name = decode(
      part.match(/gz-card-title[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1] ?? "",
    );
    const phoneRaw = part.match(
      /gz-card-phone[\s\S]*?<span>([^<]+)<\/span>/,
    )?.[1];
    const city = decode(part.match(/gz-address-city">([^<]+)/)?.[1] ?? "");
    const blurb = decode(
      part.match(/gz-member-description">([\s\S]*?)<\/p>/)?.[1] ?? "",
    );

    if (!name || !profile) continue;
    cards.push({ memid, level, profile, name, phoneRaw, city, blurb });
  }

  return cards;
}

function parseProfile(html) {
  const categories = [
    ...html.matchAll(/class="gz-cat">([^<]+)/g),
  ].map((m) => decode(m[1]).replace(/,\s*$/, ""));

  const website = html.match(
    /gz-card-website[\s\S]*?href="(https?:\/\/[^"]+)"/,
  )?.[1];

  const social = /gz-social-(facebook|instagram)/.test(html);
  const about = decode(
    html.match(/gz-details-about[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1] ?? "",
  );

  return {
    categories: [...new Set(categories.filter(Boolean))],
    website: website && !website.startsWith("javascript:") ? website : null,
    social,
    about,
  };
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return out;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_COLUMNS = [
  "business_name",
  "phone",
  "website",
  "category",
  "city",
  "source_url",
  "notes",
];

async function supabaseFetch(pathname, options = {}) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env is missing — use --csv-only, or set .env.");
  }

  const response = await fetch(`${url}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text.slice(0, 400)}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function loadExisting() {
  const rows = await supabaseFetch(
    "prospects?select=id,business_name,phone,category,city,source_url,website_status,description,notes,why_reliable,chamber_member",
  );
  return rows ?? [];
}

function upgradeStatus(current, next) {
  const rank = {
    unknown: 0,
    none: 1,
    social_only: 2,
    sitebuilder: 3,
    has_website: 4,
  };
  if ((rank[next] ?? 0) > (rank[current] ?? 0)) return next;
  if (current === "unknown") return next;
  return current;
}

async function main() {
  console.log(
    `Rockwall Chamber directory — ${letters.length} letter pages\n`,
  );

  if (DRY_RUN) {
    for (const letter of letters) {
      console.log(`  ${BASE}/list/searchalpha/${letter}`);
    }
    console.log("\nDry run. Nothing was fetched.");
    return;
  }

  const byId = new Map();

  for (const letter of letters) {
    const url = `${BASE}/list/searchalpha/${letter}`;
    process.stdout.write(`  ${letter.toUpperCase().padEnd(4)}`);
    let html;
    try {
      html = await get(url);
    } catch (error) {
      console.log(`failed (${error.message})`);
      continue;
    }

    const cards = parseCards(html);
    let added = 0;
    for (const card of cards) {
      if (!byId.has(card.memid)) {
        byId.set(card.memid, card);
        added++;
      }
    }
    console.log(`${cards.length} listed, ${added} new`);
    await new Promise((r) => setTimeout(r, 150));
  }

  const members = [...byId.values()];
  console.log(`\n${members.length} unique members. Reading profiles…\n`);

  let done = 0;
  await mapPool(members, 4, async (member) => {
    try {
      const html = await get(member.profile);
      Object.assign(member, parseProfile(html));
    } catch (error) {
      member.categories = [];
      member.website = null;
      member.social = false;
      member.about = "";
      member.profileError = error.message;
    }
    done++;
    if (done % 25 === 0 || done === members.length) {
      process.stdout.write(`\r  ${done}/${members.length} profiles`);
    }
    await new Promise((r) => setTimeout(r, 80));
  });
  console.log("\n");

  const leads = [];
  const skipped = { noPhone: 0, self: 0, duplicatePhone: 0, hasWebsite: 0 };
  const seenPhones = new Set();

  for (const member of members) {
    if (SKIP_NAMES.test(member.name.trim())) {
      skipped.self++;
      continue;
    }

    const phone = normalizePhone(member.phoneRaw);
    if (!phone) {
      skipped.noPhone++;
      continue;
    }
    if (seenPhones.has(phone)) {
      skipped.duplicatePhone++;
      continue;
    }
    seenPhones.add(phone);

    const status = websiteStatus(member.website, member.social);
    // A real site (including Wix and the other builders) is not the pitch.
    // Social-only and no site stay — that's the warm list worth dialing.
    if (status === "has_website" || status === "sitebuilder") {
      skipped.hasWebsite = (skipped.hasWebsite ?? 0) + 1;
      continue;
    }
    const category = member.categories?.slice(0, 2).join(", ") || null;
    const about = (member.about || member.blurb || "").slice(0, 1200);
    const level = member.level && member.level !== "0" ? member.level : null;

    leads.push({
      business_name: member.name,
      phone: formatPhone(phone),
      phoneKey: phone,
      website: member.website ?? "",
      website_status: status,
      category,
      city: member.city || "Rockwall",
      source_url: member.profile,
      description: about || null,
      notes: [
        "Rockwall Chamber member",
        level ? `${level} listing` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      why_reliable:
        "Fellow Rockwall Chamber member. Open with the fact you just joined and saw them in the directory.",
    });
  }

  leads.sort((a, b) => a.business_name.localeCompare(b.business_name));

  const outPath = path.join(ROOT, "chamber-leads.csv");
  fs.writeFileSync(
    outPath,
    [
      CSV_COLUMNS.join(","),
      ...leads.map((lead) =>
        CSV_COLUMNS.map((column) => csvCell(lead[column])).join(","),
      ),
    ].join("\n") + "\n",
  );

  const byStatus = leads.reduce((acc, lead) => {
    acc[lead.website_status] = (acc[lead.website_status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Callable members: ${leads.length}`);
  console.log(`  skipped ${skipped.noPhone} with no phone`);
  console.log(`  skipped ${skipped.duplicatePhone} duplicate numbers`);
  console.log(`  skipped ${skipped.hasWebsite} that already have a website`);
  console.log(`  skipped ${skipped.self} (you, or the chamber itself)`);
  console.log(
    `  websites: ${Object.entries(byStatus)
      .map(([k, n]) => `${n} ${k.replaceAll("_", " ")}`)
      .join(", ")}`,
  );
  console.log(`  wrote ${path.relative(ROOT, outPath)}\n`);

  if (CSV_ONLY) {
    console.log("CSV only — nothing was written to the pipeline.");
    return;
  }

  const existing = await loadExisting();
  const existingPhones = new Map();
  const existingNames = new Map();
  for (const row of existing) {
    const key = normalizePhone(row.phone);
    if (key && !existingPhones.has(key)) existingPhones.set(key, row);
    existingNames.set(row.business_name.trim().toLowerCase(), row);
  }

  const toInsert = [];
  const toUpdate = [];

  for (const lead of leads) {
    const match =
      existingPhones.get(lead.phoneKey) ??
      existingNames.get(lead.business_name.trim().toLowerCase());

    if (match) {
      const patch = { chamber_member: true };
      if (!match.category && lead.category) patch.category = lead.category;
      if (!match.city && lead.city) patch.city = lead.city;
      if (!match.source_url) patch.source_url = lead.source_url;
      if (!match.description && lead.description) {
        patch.description = lead.description;
      }
      if (!match.why_reliable) patch.why_reliable = lead.why_reliable;
      if (!match.notes) patch.notes = lead.notes;

      const nextStatus = upgradeStatus(
        match.website_status,
        lead.website_status,
      );
      if (nextStatus !== match.website_status) {
        patch.website_status = nextStatus;
      }

      const changed = Object.keys(patch).some(
        (key) => patch[key] !== match[key],
      );
      if (changed) toUpdate.push({ id: match.id, patch });
      continue;
    }

    toInsert.push({
      business_name: lead.business_name,
      phone: lead.phone,
      category: lead.category,
      city: lead.city,
      description: lead.description,
      why_reliable: lead.why_reliable,
      source: "Rockwall Chamber",
      source_url: lead.source_url,
      website_status: lead.website_status,
      chamber_member: true,
      notes: lead.notes,
      stage: "new",
    });
  }

  console.log(
    `${toUpdate.length} already in the pipeline will be marked as chamber members.`,
  );
  console.log(`${toInsert.length} new prospects to add.\n`);

  let updated = 0;
  await mapPool(toUpdate, 6, async ({ id, patch }) => {
    await supabaseFetch(`prospects?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    updated++;
    if (updated % 25 === 0 || updated === toUpdate.length) {
      process.stdout.write(`\r  updated ${updated}/${toUpdate.length}`);
    }
  });
  if (toUpdate.length) console.log("");

  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    await supabaseFetch("prospects", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(chunk),
    });
    inserted += chunk.length;
    process.stdout.write(`\r  inserted ${inserted}/${toInsert.length}`);
  }
  if (toInsert.length) console.log("");

  console.log(
    `\nDone. ${inserted} added, ${updated} existing calls can now open warm.`,
  );
  console.log("Open Calling mode → Chamber to work the new list.");
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
