import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, EmptyState, PageHeader, Section, Stat } from "@/components/ui";
import { money, relativeDay, stageTone, telHref } from "@/lib/format";
import {
  CONNECTED_OUTCOMES,
  STAGE_LABELS,
  type Call,
  type Invoice,
  type Prospect,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function TodayPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();

  const [dueResult, callsResult, pipelineResult, invoicesResult, neverResult] =
    await Promise.all([
      // Anything scheduled for today or already overdue.
      supabase
        .from("prospects")
        .select("*")
        .not("stage", "in", "(won,lost)")
        .not("next_action_at", "is", null)
        .lte("next_action_at", today)
        .order("next_action_at", { ascending: true }),

      supabase.from("calls").select("*").gte("called_at", weekAgo),

      supabase.from("prospects").select("stage, quoted_amount"),

      supabase.from("invoices").select("*"),

      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("stage", "new"),
    ]);

  const due = (dueResult.data ?? []) as Prospect[];
  const calls = (callsResult.data ?? []) as Call[];
  const pipeline = (pipelineResult.data ?? []) as Pick<
    Prospect,
    "stage" | "quoted_amount"
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
                      {prospect.contact_name && (
                        <span className="truncate text-xs text-ink-faint">
                          · {prospect.contact_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {tel && (
                    <a href={tel} className="btn btn-primary shrink-0">
                      Call
                    </a>
                  )}
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
