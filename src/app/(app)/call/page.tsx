import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CallRunner } from "@/components/call-runner";
import { EmptyState, PageHeader } from "@/components/ui";
import { getOpenState } from "@/lib/hours";
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

  let queue = (data ?? []) as Prospect[];

  if (mode === "new") {
    // Open-now wins over fit, because a great lead that's shut is a wasted
    // dial. Within each group the score order above is preserved — Array.sort
    // is stable, so this reorders the groups without shuffling their contents.
    //
    // Businesses with unknown hours sit between open and closed: they might
    // pick up, and 16 of the leads have no hours published at all.
    const rank = (p: Prospect) => {
      const state = getOpenState(p.opening_hours);
      return state.status === "open" ? 0 : state.status === "unknown" ? 1 : 2;
    };
    queue = [...queue].sort((a, b) => rank(a) - rank(b));
  }

  const openNow = queue.filter(
    (p) => getOpenState(p.opening_hours).status === "open",
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calling mode"
        subtitle={
          mode === "new"
            ? `Open now first, then best fit — ${openNow} open right now`
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
