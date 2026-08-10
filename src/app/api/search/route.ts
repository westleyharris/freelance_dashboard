import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Minimal prospect list for the command palette.
 *
 * The whole book is a few hundred rows of short strings, so it ships once and
 * filters in the browser — instant keystrokes with no request per character.
 * Auth still applies: this uses the session client, so RLS governs it and a
 * signed-out request returns nothing.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("prospects")
    .select("id, business_name, phone, category, city, stage, icp_score")
    .order("icp_score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospects: data ?? [] });
}
