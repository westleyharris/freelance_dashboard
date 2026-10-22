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

  // Scheduled follow-ups stay in date order — those are promises.
  // Fresh names go alphabetical. Chamber is the warm list you haven't dialed.
  const { data } =
    mode === "chamber"
      ? await base
          .eq("stage", "new")
          .eq("chamber_member", true)
          .eq("source", "Rockwall Chamber")
          .order("business_name")
          .limit(2000)
      : mode === "new"
        ? await base
            .eq("stage", "new")
            .order("business_name")
            .limit(2000)
        : await base
            .not("next_action_at", "is", null)
            .lte("next_action_at", today)
            .order("next_action_at", { ascending: true });

  let queue = (data ?? []) as Prospect[];

  if (mode === "chamber") {
    // No website is still the pitch. Sort this first so the open-now sort
    // below keeps it inside each open/closed group.
    const siteRank = (p: Prospect) =>
      p.website_status === "none" || p.website_status === "social_only"
        ? 0
        : p.website_status === "sitebuilder"
          ? 1
          : 2;
    queue = [...queue].sort((a, b) => siteRank(a) - siteRank(b));
  }

  if (mode === "new" || mode === "chamber") {
    // Open-now wins, because a lead that's shut is a wasted dial. Within
    // each group the order above is preserved — Array.sort is stable.
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
          mode === "chamber"
            ? `${queue.length} Rockwall Chamber members. No website comes up first — the directory doesn't include hours.`
            : mode === "new"
              ? `Open now first, then best fit — ${openNow} open right now`
              : "Follow-ups due today or overdue"
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/call"
          className={`btn ${!mode ? "btn-primary" : "btn-ghost"}`}
        >
          Due today
        </Link>
        <Link
          href="/call?mode=new"
          className={`btn ${mode === "new" ? "btn-primary" : "btn-ghost"}`}
        >
          Never called
        </Link>
        <Link
          href="/call?mode=chamber"
          className={`btn ${mode === "chamber" ? "btn-primary" : "btn-ghost"}`}
        >
          Chamber
        </Link>
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title={
            mode === "chamber"
              ? "No uncalled chamber members"
              : mode === "new"
                ? "No uncalled prospects left"
                : "Nothing due right now"
          }
          hint={
            mode === "chamber"
              ? "Every Rockwall Chamber member with a number has been dialed at least once. Anyone you already had in the pipeline still gets the warm opener when they come up."
              : mode === "new"
                ? "Every prospect with a phone number has been dialed at least once. Add more prospects to keep the list full."
                : "Follow-ups show up here on their due date. Switch to Chamber for the warm list, or Never called for everyone else."
          }
          action={
            <Link
              href={
                mode === "new"
                  ? "/prospects/new"
                  : mode === "chamber"
                    ? "/call?mode=new"
                    : "/call?mode=chamber"
              }
              className="btn btn-primary"
            >
              {mode === "new"
                ? "Add a prospect"
                : mode === "chamber"
                  ? "Call someone new"
                  : "Start the warm list"}
            </Link>
          }
        />
      ) : (
        <CallRunner queue={queue} />
      )}
    </div>
  );
}
