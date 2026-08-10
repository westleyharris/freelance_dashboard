"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { PAGE_OPTIONS } from "@/lib/types";

/**
 * Public submission. Writes with the service role because the client filling
 * this in has no Supabase session — authorization is the unguessable token in
 * the URL, checked here.
 *
 * Deliberately narrow: only the answer columns are writable, and a form that
 * has already been submitted is rejected so a leaked link can't overwrite
 * answers later.
 */
export async function submitIntake(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Missing form token." };

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("intake_forms")
    .select("id, submitted_at")
    .eq("token", token)
    .maybeSingle();

  if (!existing) return { error: "This form link is no longer valid." };
  if (existing.submitted_at) return { error: "This form was already submitted." };

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || null;
  };

  // Only accept page names from the known list.
  const pages = formData
    .getAll("pages_wanted")
    .map(String)
    .filter((page) => (PAGE_OPTIONS as readonly string[]).includes(page));

  const custom = text("pages_custom");
  if (custom) pages.push(custom);

  const { error } = await supabase
    .from("intake_forms")
    .update({
      business_name: text("business_name"),
      what_business_does: text("what_business_does"),
      best_contact: text("best_contact"),
      service_area: text("service_area"),
      pages_wanted: pages.length ? pages : null,
      reference_sites: text("reference_sites"),
      has_content: text("has_content"),
      special_requests: text("special_requests"),
      anything_else: text("anything_else"),
      submitted_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) return { error: error.message };

  return { ok: true };
}
