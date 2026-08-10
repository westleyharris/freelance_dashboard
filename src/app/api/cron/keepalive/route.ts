import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Daily ping to keep the Supabase free-tier project out of auto-pause.
 *
 * Supabase pauses free projects showing low activity across a 7-day window;
 * their docs say "a few user requests to the database each day" is enough to
 * stay active. A scheduled hit on this route provides that floor even during a
 * stretch where no calls get logged.
 *
 * Scheduled by vercel.json. Vercel sends CRON_SECRET as a bearer token when the
 * env var is set, which is what stops anyone else from hammering this.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();

  // Touch several tables so the activity looks like genuine usage rather than
  // a single repeated query.
  const [prospects, calls, projects] = await Promise.all([
    supabase.from("prospects").select("id", { count: "exact", head: true }),
    supabase.from("calls").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
  ]);

  const failure = prospects.error ?? calls.error ?? projects.error;
  if (failure) {
    return NextResponse.json(
      { ok: false, error: failure.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    pingedAt: new Date().toISOString(),
    counts: {
      prospects: prospects.count,
      calls: calls.count,
      projects: projects.count,
    },
  });
}
