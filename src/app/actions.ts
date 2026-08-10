"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CallOutcome, ProspectStage } from "@/lib/types";

/**
 * Outcomes that imply a stage without you having to think about it mid-call.
 * Anything not listed leaves the stage alone — logging "no answer" on someone
 * already marked interested shouldn't demote them.
 */
const OUTCOME_TO_STAGE: Partial<Record<CallOutcome, ProspectStage>> = {
  spoke: "contacted",
  gatekeeper: "attempting",
  no_answer: "attempting",
  voicemail: "attempting",
  texted: "attempting",
  emailed: "attempting",
  callback_scheduled: "interested",
  not_interested: "lost",
  bad_number: "lost",
  wrong_number: "lost",
};

/** Stages that already represent progress past a plain dial attempt. */
const ADVANCED: ProspectStage[] = ["contacted", "interested", "quoted", "won"];

export async function logCall(formData: FormData) {
  const supabase = await createClient();

  const prospectId = String(formData.get("prospect_id"));
  const outcome = String(formData.get("outcome")) as CallOutcome;
  const notes = String(formData.get("notes") ?? "").trim();
  const nextAction = String(formData.get("next_action_at") ?? "").trim();

  const { error: callError } = await supabase.from("calls").insert({
    prospect_id: prospectId,
    outcome,
    notes: notes || null,
  });

  if (callError) return { error: callError.message };

  // Work out the new stage without clobbering hard-won progress.
  const { data: current } = await supabase
    .from("prospects")
    .select("stage")
    .eq("id", prospectId)
    .single();

  const suggested = OUTCOME_TO_STAGE[outcome];
  const patch: Record<string, unknown> = {
    next_action_at: nextAction || null,
  };

  if (suggested) {
    const isDemotion =
      ADVANCED.includes(current?.stage as ProspectStage) &&
      suggested === "attempting";

    if (!isDemotion) patch.stage = suggested;
  }

  if (outcome === "bad_number") patch.lost_reason = "bad_number";
  if (outcome === "wrong_number") patch.lost_reason = "bad_number";
  if (outcome === "not_interested") patch.lost_reason = "not_interested";

  const { error } = await supabase
    .from("prospects")
    .update(patch)
    .eq("id", prospectId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProspect(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const optional = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || null;
  };

  const patch: Record<string, unknown> = {
    business_name: String(formData.get("business_name") ?? "").trim(),
    contact_name: optional("contact_name"),
    phone: optional("phone"),
    email: optional("email"),
    category: optional("category"),
    city: optional("city"),
    stage: formData.get("stage"),
    lost_reason: optional("lost_reason"),
    website_status: formData.get("website_status"),
    chamber_member: formData.get("chamber_member") === "on",
    next_action_at: optional("next_action_at"),
    notes: optional("notes"),
  };

  const quoted = String(formData.get("quoted_amount") ?? "").trim();
  patch.quoted_amount = quoted ? Number(quoted) : null;

  // A stage that isn't "lost" shouldn't keep carrying a lost reason around.
  if (patch.stage !== "lost") patch.lost_reason = null;

  const { error } = await supabase.from("prospects").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createProspect(formData: FormData) {
  const supabase = await createClient();

  const optional = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || null;
  };

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      business_name: String(formData.get("business_name") ?? "").trim(),
      contact_name: optional("contact_name"),
      phone: optional("phone"),
      email: optional("email"),
      category: optional("category"),
      city: optional("city"),
      source: optional("source"),
      source_url: optional("source_url"),
      website_status: formData.get("website_status") || "unknown",
      chamber_member: formData.get("chamber_member") === "on",
      notes: optional("notes"),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export interface ImportRow {
  business_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  category?: string | null;
  city?: string | null;
  website?: string | null;
  source_url?: string | null;
  notes?: string | null;
}

/** Strip formatting so two spellings of the same number compare equal. */
function phoneKey(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return ten.length === 10 ? ten : null;
}

function formatPhone(phone: string | null | undefined): string | null {
  const key = phoneKey(phone);
  if (!key) return phone?.trim() || null;
  return `(${key.slice(0, 3)}) ${key.slice(3, 6)}-${key.slice(6)}`;
}

/**
 * Bulk-add prospects from a pasted list.
 *
 * Deduplicates on phone number first (the reliable key — the same business is
 * often spelled three ways across sources) and falls back to a case-insensitive
 * name match. Existing rows are never modified: a prospect you've already
 * worked, including one you closed, must not be silently resurrected by a
 * later import.
 *
 * icp_score needs no work here — it's a generated column, so every inserted row
 * is scored by the database on the way in.
 */
export async function bulkImportProspects(
  rows: ImportRow[],
  source: string,
  chamberMember: boolean,
) {
  const supabase = await createClient();

  if (!rows.length) return { error: "Nothing to import." };
  if (rows.length > 1000) {
    return { error: "That's over 1000 rows — split it into smaller batches." };
  }

  const { data: existing, error: readError } = await supabase
    .from("prospects")
    .select("business_name, phone");

  if (readError) return { error: readError.message };

  const seenPhones = new Set(
    (existing ?? []).map((p) => phoneKey(p.phone)).filter(Boolean) as string[],
  );
  const seenNames = new Set(
    (existing ?? []).map((p) => p.business_name.trim().toLowerCase()),
  );

  const toInsert = [];
  let duplicates = 0;
  let unnamed = 0;

  for (const row of rows) {
    const name = row.business_name?.trim();
    if (!name) {
      unnamed++;
      continue;
    }

    const key = phoneKey(row.phone);
    const nameKey = name.toLowerCase();

    if ((key && seenPhones.has(key)) || seenNames.has(nameKey)) {
      duplicates++;
      continue;
    }

    if (key) seenPhones.add(key);
    seenNames.add(nameKey);

    // A website column is the single most useful field in any lead export:
    // absence of one is the strongest buying signal in the scoring model.
    const website = row.website?.trim();
    const websiteStatus = website
      ? /facebook\.com|instagram\.com/i.test(website)
        ? "social_only"
        : "has_website"
      : "none";

    toInsert.push({
      business_name: name,
      contact_name: row.contact_name?.trim() || null,
      phone: formatPhone(row.phone),
      email: row.email?.trim() || null,
      category: row.category?.trim() || null,
      city: row.city?.trim() || null,
      source_url: row.source_url?.trim() || website || null,
      notes: row.notes?.trim() || null,
      source,
      chamber_member: chamberMember,
      website_status: websiteStatus,
      stage: "new",
    });
  }

  if (!toInsert.length) {
    return {
      ok: true,
      inserted: 0,
      duplicates,
      unnamed,
      message: "Every row was already in your pipeline.",
    };
  }

  const { error } = await supabase.from("prospects").insert(toInsert);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, inserted: toInsert.length, duplicates, unnamed };
}

/**
 * Promote a won prospect into a client plus an opening project, carrying the
 * contact details across so nothing gets retyped.
 */
export async function convertToClient(formData: FormData) {
  const supabase = await createClient();
  const prospectId = String(formData.get("prospect_id"));

  const { data: prospect, error: readError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (readError) return { error: readError.message };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      prospect_id: prospect.id,
      business_name: prospect.business_name,
      contact_name: prospect.contact_name,
      phone: prospect.phone,
      email: prospect.email,
      city: prospect.city,
      status: "active",
    })
    .select("id")
    .single();

  if (clientError) return { error: clientError.message };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      client_id: client.id,
      name: `${prospect.business_name} Website`,
      type: "website",
      status: "intake",
      price: prospect.quoted_amount,
      started_on: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (projectError) return { error: projectError.message };

  // An intake form is generated immediately so there's a link ready to send.
  await supabase
    .from("intake_forms")
    .insert({
      client_id: client.id,
      project_id: project.id,
      business_name: prospect.business_name,
    });

  await supabase
    .from("prospects")
    .update({ stage: "won", next_action_at: null })
    .eq("id", prospectId);

  revalidatePath("/", "layout");
  return { ok: true, clientId: client.id };
}

export async function saveProject(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const optional = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || null;
  };

  const price = String(formData.get("price") ?? "").trim();

  const { error } = await supabase
    .from("projects")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      type: formData.get("type"),
      status: formData.get("status"),
      price: price ? Number(price) : null,
      started_on: optional("started_on"),
      launched_on: optional("launched_on"),
      live_url: optional("live_url"),
      repo_url: optional("repo_url"),
      domain: optional("domain"),
      domain_registrar: optional("domain_registrar"),
      hosting: optional("hosting"),
      form_endpoint: optional("form_endpoint"),
      notes: optional("notes"),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveInvoice(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const optional = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || null;
  };

  const payload = {
    project_id: String(formData.get("project_id")),
    amount: Number(formData.get("amount")),
    status: formData.get("status"),
    description: optional("description"),
    issued_on: optional("issued_on"),
    due_on: optional("due_on"),
    paid_on: optional("paid_on"),
  };

  const { error } = id
    ? await supabase.from("invoices").update(payload).eq("id", id)
    : await supabase.from("invoices").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
