import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { money } from "@/lib/format";
import type { Invoice, Project, Prospect } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ m?: string }>;

interface Entry {
  date: string;
  kind: "followup" | "launch" | "invoice";
  label: string;
  href: string;
  detail?: string;
}

const TONE: Record<Entry["kind"], string> = {
  followup: "bg-accent-soft text-accent",
  launch: "bg-good-soft text-good",
  invoice: "bg-warn-soft text-warn",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { m } = await searchParams;
  const supabase = await createClient();

  // `m` is an offset in months from today, so paging never depends on parsing
  // a date out of the URL.
  const offset = Number(m ?? 0) || 0;
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + offset);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [{ data: prospectData }, { data: projectData }, { data: invoiceData }] =
    await Promise.all([
      supabase
        .from("prospects")
        .select("id, business_name, next_action_at, stage")
        .not("next_action_at", "is", null)
        .gte("next_action_at", iso(first))
        .lte("next_action_at", iso(last)),
      supabase
        .from("projects")
        .select("id, name, launched_on")
        .not("launched_on", "is", null)
        .gte("launched_on", iso(first))
        .lte("launched_on", iso(last)),
      supabase
        .from("invoices")
        .select("id, project_id, amount, due_on, status")
        .not("due_on", "is", null)
        .gte("due_on", iso(first))
        .lte("due_on", iso(last)),
    ]);

  const entries: Entry[] = [
    ...((prospectData ?? []) as Pick<
      Prospect,
      "id" | "business_name" | "next_action_at" | "stage"
    >[]).map((p) => ({
      date: p.next_action_at!,
      kind: "followup" as const,
      label: p.business_name,
      href: `/prospects/${p.id}`,
    })),
    ...((projectData ?? []) as Pick<Project, "id" | "name" | "launched_on">[]).map(
      (p) => ({
        date: p.launched_on!,
        kind: "launch" as const,
        label: p.name,
        href: `/projects/${p.id}`,
      }),
    ),
    ...((invoiceData ?? []) as Pick<
      Invoice,
      "id" | "project_id" | "amount" | "due_on" | "status"
    >[])
      .filter((i) => i.status !== "paid" && i.status !== "void")
      .map((i) => ({
        date: i.due_on!,
        kind: "invoice" as const,
        label: `${money(Number(i.amount))} due`,
        href: `/projects/${i.project_id}`,
      })),
  ];

  const byDate = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    (acc[entry.date] ??= []).push(entry);
    return acc;
  }, {});

  // Pad the grid so the 1st lands on its real weekday.
  const cells: (Date | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from(
      { length: last.getDate() },
      (_, i) => new Date(year, month, i + 1),
    ),
  ];

  const todayIso = iso(new Date());

  return (
    <div className="space-y-5">
      <PageHeader
        title={cursor.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
        subtitle={`${entries.length} thing${entries.length === 1 ? "" : "s"} this month`}
        action={
          <div className="flex gap-2">
            <Link href={`/calendar?m=${offset - 1}`} className="btn btn-ghost">
              &larr;
            </Link>
            {offset !== 0 && (
              <Link href="/calendar" className="btn btn-ghost">
                Today
              </Link>
            )}
            <Link href={`/calendar?m=${offset + 1}`} className="btn btn-ghost">
              &rarr;
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
        <Legend tone={TONE.followup} label="Follow-up call" />
        <Legend tone={TONE.launch} label="Project launched" />
        <Legend tone={TONE.invoice} label="Invoice due" />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-[0.65rem] font-medium tracking-wide text-ink-faint uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`pad-${i}`} className="min-h-20 bg-canvas/40" />;
            }

            const key = iso(date);
            const items = byDate[key] ?? [];
            const isToday = key === todayIso;

            return (
              <div
                key={key}
                className={`min-h-20 border-t border-r border-border p-1.5 last:border-r-0 ${
                  isToday ? "bg-accent-soft/40" : ""
                }`}
              >
                <div
                  className={`mb-1 text-xs ${
                    isToday
                      ? "font-semibold text-accent"
                      : "text-ink-faint"
                  }`}
                >
                  {date.getDate()}
                </div>

                <div className="space-y-0.5">
                  {items.slice(0, 3).map((entry, j) => (
                    <Link
                      key={`${entry.href}-${j}`}
                      href={entry.href}
                      className={`block truncate rounded px-1.5 py-0.5 text-[0.65rem] ${TONE[entry.kind]}`}
                      title={entry.label}
                    >
                      {entry.label}
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <div className="px-1.5 text-[0.6rem] text-ink-faint">
                      +{items.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {entries.length === 0 && (
        <p className="text-sm text-ink-muted">
          Nothing scheduled this month. Follow-ups appear here when you set a
          date while logging a call.
        </p>
      )}
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${tone}`} />
      {label}
    </span>
  );
}
