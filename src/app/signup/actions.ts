"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * One-time account bootstrap.
 *
 * This dashboard has no invite system and RLS grants every authenticated user
 * full access to prospects, client contacts, and revenue. An open signup route
 * would therefore hand the whole business to anyone who found the URL.
 *
 * So this refuses to run once any user exists. It's a first-boot convenience,
 * not a registration system. Add any later users from the Supabase dashboard
 * deliberately.
 */
export async function bootstrapAccount(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are both required." };
  }
  if (password.length < 8) {
    return { error: "Use at least 8 characters." };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY isn't set. Add it to .env and restart the dev server.",
    };
  }

  const { data: existing, error: listError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (listError) {
    return { error: `Couldn't reach Supabase: ${listError.message}` };
  }

  if (existing.users.length > 0) {
    return {
      error:
        "An account already exists. This page only works for the very first one — sign in instead, or add more users from the Supabase dashboard.",
    };
  }

  // email_confirm skips the confirmation email, which would otherwise need SMTP
  // configured before you could get in at all.
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return { error: error.message };

  return { ok: true };
}

/** Drives which form the signup page shows. */
export async function accountExists(): Promise<boolean | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (error) return null;
    return data.users.length > 0;
  } catch {
    return null;
  }
}
