import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActivityChart } from "@/components/activity-chart";
import { DonutChart } from "@/components/donut";
import { OpenStatus } from "@/components/open-status";
import { Badge, ChamberBadge, EmptyState, PageHeader, Section, Stat } from "@/components/ui";
import { money, relativeDay, stageTone, telHref } from "@/lib/format";
import {
  CONNECTED_OUTCOMES,
  OUTCOME_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
  WEBSITE_STATUS_LABELS,
  type Call,
  type CallOutcome,
  type Invoice,
  type Prospect,
  type ProspectStage,
  type WebsiteStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

const STAGE_COLORS: Record<ProspectStage, string> = {
  new: "#5d6e86",
  attempting: "#3ee0ff",
  contacted: "#8b7cff",
  interested: "#ffc857",
  quoted: "#ff9f43",
  won: "#3dffb0",
  lost: "#ff5d73",
};

const SITE_COLORS: Record<WebsiteStatus, string> = {
  none: "#3ee0ff",
  social_only: "#8b7cff",
  sitebuilder: "#ffc857",
  has_website: "#5d6e86",
  unknown: "#2c415c",
};

const OUTCOME_COLORS: Record<CallOutcome, string> = {
  spoke: "#3dffb0",
  callback_scheduled: "#ffc857",
  voicemail: "#3ee0ff",
  gatekeeper: "#8b7cff",
  no_answer: "#5d6e86",
  texted: "#7af0ff",
  emailed: "#7af0ff",
  not_interested: "#ff5d73",
  bad_number: "#ff5d73",
  wrong_number: "#ff9f43",
};

export default async function TodayPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const fortnightAgo = new Date(Date.now() - 14 * DAY).toISOString();

  const [dueResult, callsResult, pipelineResult, invoicesResult, neverResult, chamberResult] =
    await Promise.all([
      // Anything scheduled for today or already overdue.
      supabase
        .from("prospects")
        .select("*")
        .not("stage", "in", "(won,lost)")
        .not("next_action_at", "is", null)
        .lte("next_action_at", today)
        .order("next_action_at", { ascending: true }),

      // Two weeks, so the activity chart and the 7-day stats share one query.
      supabase.from("calls").select("*").gte("called_at", fortnightAgo),

      supabase
        .from("prospects")
        .select("stage, quoted_amount, website_status"),

      supabase.from("invoices").select("*"),

      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("stage", "new"),

      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("stage", "new")
        .eq("chamber_member", true)
        .eq("source", "Rockwall Chamber")
        .not("phone", "is", null),
    ]);

  const due = (dueResult.data ?? []) as Prospect[];
  const allCalls = (callsResult.data ?? []) as Call[];
  // Headline stats stay on the 7-day window; the chart uses the full fortnight.
  const calls = allCalls.filter((c) => c.called_at >= weekAgo);
  const pipeline = (pipelineResult.data ?? []) as Pick<
    Prospect,
    "stage" | "quoted_amount" | "website_status"
  >[];
  const invoices = (invoicesResult.data ?? []) as Invoice[];

  const connected = calls.filter((c) =>
    CONNECTED_OUTCOMES.includes(c.outcome),
  ).length;
  const connectRate = calls.length
    ? Math.round((connected / calls.length) * 100)
    : null;

  const activeCount = pipeline.filter(
    (p) => !["won", "lost"].includes(p.stage),
  ).length;

  const openQuoted = pipeline
    .filter((p) => ["interested", "quoted"].includes(p.stage))
    .reduce((sum, p) => sum + (p.quoted_amount ?? 0), 0);

  const outstanding = invoices
    .filter((i) => ["sent", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const paidThisYear = invoices
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paid_on &&
        new Date(i.paid_on).getFullYear() === new Date().getFullYear(),
    )
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const overdue = due.filter(
    (p) => p.next_action_at && p.next_action_at < today,
  ).length;

  const openPipeline = pipeline.filter(
    (p) => !["won", "lost"].includes(p.stage),
  );

  const stageSlices = STAGE_ORDER.filter(
    (stage) => stage !== "won" && stage !== "lost",
  ).map((stage) => ({
    label: STAGE_LABELS[stage],
    value: openPipeline.filter((p) => p.stage === stage).length,
    color: STAGE_COLORS[stage],
  }));

  const websiteSlices = (
    Object.keys(WEBSITE_STATUS_LABELS) as WebsiteStatus[]
  ).map((status) => ({
    label: WEBSITE_STATUS_LABELS[status],
    value: openPipeline.filter((p) => p.website_status === status).length,
    color: SITE_COLORS[status],
  }));

  const outcomeCounts = calls.reduce<Partial<Record<CallOutcome, number>>>(
    (acc, call) => {
      acc[call.outcome] = (acc[call.outcome] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const outcomeSlices = (Object.keys(OUTCOME_LABELS) as CallOutcome[])
    .filter((outcome) => outcomeCounts[outcome])
    .map((outcome) => ({
      label: OUTCOME_LABELS[outcome],
      value: outcomeCounts[outcome] ?? 0,
      color: OUTCOME_COLORS[outcome],
    }));

  return (
    <div className="space-y-7">
      <PageHeader
        title="Today"
        subtitle={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        action={
          due.length > 0 ? (
            <Link href="/call" className="btn btn-primary">
              Start calling ({due.length})
            </Link>
          ) : (
            <Link href="/call" className="btn btn-ghost">
              Calling mode
            </Link>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Follow-ups due"
          value={due.length}
          hint={overdue > 0 ? `${overdue} overdue` : "nothing overdue"}
          tone={overdue > 0 ? "text-warn" : undefined}
          href="/call"
        />
        <Stat
          label="Calls this week"
          value={calls.length}
          hint={
            connectRate === null
              ? "no calls logged yet"
              : `${connectRate}% reached a person`
          }
        />
        <Stat
          label="Active pipeline"
          value={activeCount}
          hint={`${neverResult.count ?? 0} never called`}
          href="/prospects"
        />
        <Stat
          label="Unpaid invoices"
          value={money(outstanding)}
          hint={`${money(paidThisYear)} collected this year`}
          tone={outstanding > 0 ? "text-warn" : undefined}
          href="/money"
        />
      </div>

      {(chamberResult.count ?? 0) > 0 && (
        <Link
          href="/call?mode=chamber"
          className="card group relative flex flex-wrap items-center justify-between gap-4 overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40"
        >
          <span className="absolute inset-y-0 left-0 w-1 bg-accent" />
          <div className="pl-2">
            <div className="font-mono text-[0.65rem] tracking-[0.16em] text-accent uppercase">
              Warm list
            </div>
            <p className="mt-1 text-xl font-semibold">
              {chamberResult.count} chamber{" "}
              {chamberResult.count === 1 ? "member" : "members"} with no website
            </p>
            <p className="mt-1 max-w-xl text-sm text-ink-muted">
              You just joined the Rockwall Chamber. Open with that.
            </p>
          </div>
          <span className="btn btn-primary">Start warm calls</span>
        </Link>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <DonutChart title="Open pipeline" slices={stageSlices} />
        <DonutChart title="Websites" slices={websiteSlices} centerLabel="open" />
        <DonutChart
          title="Calls this week"
          slices={outcomeSlices}
          centerLabel="calls"
        />
      </div>

      <ActivityChart calls={allCalls} />

      <Section
        title={`Call list — ${due.length} due`}
        action={
          due.length > 0 && (
            <Link href="/call" className="text-xs text-accent hover:underline">
              Open calling mode &rarr;
            </Link>
          )
        }
      >
        {due.length === 0 ? (
          <EmptyState
            title="Nothing scheduled for today"
            hint="Follow-ups appear here on their due date. Set one whenever you log a call, or work through the prospects you haven't dialed yet."
            action={
              <Link href="/prospects?stage=new" className="btn btn-ghost">
                See uncalled prospects
              </Link>
            }
          />
        ) : (
          <ul className="card divide-y divide-border">
            {due.map((prospect) => {
              const tel = telHref(prospect.phone);
              const isOverdue =
                prospect.next_action_at && prospect.next_action_at < today;

              return (
                <li
                  key={prospect.id}
                  className="flex items-center gap-3 p-3 sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/prospects/${prospect.id}`}
                      className="block truncate text-sm font-medium hover:text-accent"
                    >
                      {prospect.business_name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={stageTone(prospect.stage)}>
                        {STAGE_LABELS[prospect.stage]}
                      </Badge>
                      <span
                        className={`text-xs ${isOverdue ? "text-warn" : "text-ink-faint"}`}
                      >
                        due {relativeDay(prospect.next_action_at)}
                      </span>
                      {prospect.chamber_member && <ChamberBadge />}
                      {prospect.contact_name && (
                        <span className="truncate text-xs text-ink-faint">
                          · {prospect.contact_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <OpenStatus hours={prospect.opening_hours} />
                    {tel && (
                      <a href={tel} className="btn btn-primary">
                        Call
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {openQuoted > 0 && (
        <Section title="Open opportunity">
          <div className="card p-4">
            <div className="text-2xl font-semibold">{money(openQuoted)}</div>
            <p className="mt-1 text-sm text-ink-muted">
              Total quoted to prospects who are interested but haven&rsquo;t
              closed yet.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}
