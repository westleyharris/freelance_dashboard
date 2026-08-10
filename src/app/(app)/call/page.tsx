import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CallRunner } from "@/components/call-runner";
import { EmptyState, PageHeader } from "@/components/ui";
import type { Prospect } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ mode?: string }>;

export default async function CallPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { mode } = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // "due" works the scheduled follow-ups; "new" burns down the never-called
  // list. Both skip anyone already won or closed out.
  const base = supabase
    .from("prospects")
    .select("*")
    .not("stage", "in", "(won,lost)")
    .not("phone", "is", null);

  // Fresh prospects go best-fit-first so the strongest leads get dialled while
  // you're sharp. Scheduled follow-ups stay in date order — those are promises.
  const { data } =
    mode === "new"
      ? await base
          .eq("stage", "new")
          .order("icp_score", { ascending: false })
          .order("business_name")
      : await base
          .not("next_action_at", "is", null)
          .lte("next_action_at", today)
          .order("next_action_at", { ascending: true });

  const queue = (data ?? []) as Prospect[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calling mode"
        subtitle={
          mode === "new"
            ? "Prospects you haven't dialed yet — best fit first"
            : "Follow-ups due today or overdue"
        }
      />

      <div className="flex gap-2">
        <Link
          href="/call"
          className={`btn ${mode !== "new" ? "btn-primary" : "btn-ghost"}`}
        >
          Due today
        </Link>
        <Link
          href="/call?mode=new"
          className={`btn ${mode === "new" ? "btn-primary" : "btn-ghost"}`}
        >
          Never called
        </Link>
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title={
            mode === "new"
              ? "No uncalled prospects left"
              : "Nothing due right now"
          }
          hint={
            mode === "new"
              ? "Every prospect with a phone number has been dialed at least once. Add more prospects to keep the list full."
              : "Follow-ups show up here on their due date. Switch to 'Never called' to work through fresh prospects instead."
          }
          action={
            <Link
              href={mode === "new" ? "/prospects/new" : "/call?mode=new"}
              className="btn btn-primary"
            >
              {mode === "new" ? "Add a prospect" : "Call someone new"}
            </Link>
          }
        />
      ) : (
        <CallRunner queue={queue} />
      )}
    </div>
  );
}
