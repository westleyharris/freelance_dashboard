import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, ChamberBadge, EmptyState, PageHeader } from "@/components/ui";
import { relativeDay, stageTone, telHref } from "@/lib/format";
import {
  LOST_REASON_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
  type Prospect,
  type ProspectStage,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  stage?: string;
  q?: string;
  category?: string;
  chamber?: string;
}>;

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { stage, q, category, chamber } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("prospects").select("*");

  if (stage && STAGE_ORDER.includes(stage as ProspectStage)) {
    query = query.eq("stage", stage);
  } else if (!stage) {
    // Default view hides closed-out prospects — 53 of the 83 imported rows are
    // dead, and showing them by default buries everything actionable.
    query = query.neq("stage", "lost");
  }

  if (category) query = query.eq("category", category);
  if (q) query = query.ilike("business_name", `%${q}%`);
  if (chamber === "1") query = query.eq("chamber_member", true);

  const { data } = await query
    .order("next_action_at", { ascending: true, nullsFirst: false })
    .order("business_name");

  const prospects = (data ?? []) as Prospect[];

  // Counts for the filter chips, unaffected by the current filter.
  const { data: allStages } = await supabase.from("prospects").select("stage");
  const counts = (allStages ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.stage] = (acc[row.stage] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const total = allStages?.length ?? 0;

  const chipClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
      active
        ? "bg-accent text-[#041018]"
        : "bg-surface-2 text-ink-muted hover:text-ink"
    }`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pipeline"
        subtitle={`${prospects.length} shown · ${total} total`}
        action={
          <div className="flex gap-2">
            <Link href="/prospects/import" className="btn btn-ghost">
              Import
            </Link>
            <Link href="/prospects/new" className="btn btn-primary">
              Add prospect
            </Link>
          </div>
        }
      />

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search business name…"
          className="field"
        />
        {stage && <input type="hidden" name="stage" value={stage} />}
        {chamber === "1" && <input type="hidden" name="chamber" value="1" />}
        <button className="btn btn-ghost">Search</button>
      </form>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link
          href={`/prospects?${new URLSearchParams({ ...(q && { q }), ...(chamber === "1" && { chamber: "1" }) })}`}
          className={chipClass(!stage)}
        >
          Open ({total - (counts.lost ?? 0)})
        </Link>
        {STAGE_ORDER.map((option) => (
          <Link
            key={option}
            href={`/prospects?${new URLSearchParams({ stage: option, ...(q && { q }), ...(chamber === "1" && { chamber: "1" }) })}`}
            className={chipClass(stage === option)}
          >
            {STAGE_LABELS[option]} ({counts[option] ?? 0})
          </Link>
        ))}
      </div>

      <div className="text-xs">
        <Link
          href={
            chamber === "1"
              ? `/prospects?${new URLSearchParams({ ...(stage && { stage }), ...(q && { q }) })}`
              : `/prospects?${new URLSearchParams({ ...(stage && { stage }), ...(q && { q }), chamber: "1" })}`
          }
          className={
            chamber === "1"
              ? "font-medium text-chamber"
              : "text-ink-muted hover:text-ink"
          }
        >
          {chamber === "1" ? "Showing chamber members" : "Chamber members only"}
        </Link>
      </div>

      {prospects.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          hint="Try a different stage or clear the search."
          action={
            <Link href="/prospects" className="btn btn-ghost">
              Clear filters
            </Link>
          }
        />
      ) : (
        <ul className="card divide-y divide-border">
          {prospects.map((prospect) => {
            const tel = telHref(prospect.phone);

            return (
              <li key={prospect.id} className="flex items-center gap-3 p-3 sm:px-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/prospects/${prospect.id}`}
                    className="block truncate text-sm font-medium hover:text-accent"
                  >
                    {prospect.business_name}
                  </Link>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
                    <Badge tone={stageTone(prospect.stage)}>
                      {prospect.stage === "lost" && prospect.lost_reason
                        ? LOST_REASON_LABELS[prospect.lost_reason]
                        : STAGE_LABELS[prospect.stage]}
                    </Badge>
                    {prospect.chamber_member && <ChamberBadge />}
                    {prospect.category && <span>{prospect.category}</span>}
                    {prospect.next_action_at && (
                      <span className="text-warn">
                        follow up {relativeDay(prospect.next_action_at)}
                      </span>
                    )}
                    {prospect.call_count > 0 && (
                      <span>
                        {prospect.call_count} call
                        {prospect.call_count === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>

                {tel && (
                  <a href={tel} className="btn btn-ghost shrink-0 px-3">
                    Call
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
