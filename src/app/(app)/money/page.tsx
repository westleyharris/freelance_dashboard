import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, EmptyState, PageHeader, Stat } from "@/components/ui";
import { invoiceStatusTone, money, shortDate } from "@/lib/format";
import {
  INVOICE_STATUS_LABELS,
  type Client,
  type Invoice,
  type Project,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const supabase = await createClient();

  const [{ data: invoiceData }, { data: projectData }, { data: clientData }] =
    await Promise.all([
      supabase.from("invoices").select("*").order("issued_on", {
        ascending: false,
        nullsFirst: false,
      }),
      supabase.from("projects").select("*"),
      supabase.from("clients").select("id, business_name"),
    ]);

  const invoices = (invoiceData ?? []) as Invoice[];
  const projects = (projectData ?? []) as Project[];
  const clients = (clientData ?? []) as Pick<Client, "id" | "business_name">[];

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const clientById = new Map(clients.map((c) => [c.id, c.business_name]));
  const thisYear = new Date().getFullYear();

  const collected = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const collectedThisYear = invoices
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paid_on &&
        new Date(i.paid_on).getFullYear() === thisYear,
    )
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const outstanding = invoices
    .filter((i) => ["sent", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const contracted = projects.reduce((sum, p) => sum + Number(p.price ?? 0), 0);

  // Collected per month, most recent 6 months that have any activity.
  const byMonth = invoices
    .filter((i) => i.status === "paid" && i.paid_on)
    .reduce<Record<string, number>>((acc, i) => {
      const key = i.paid_on!.slice(0, 7);
      acc[key] = (acc[key] ?? 0) + Number(i.amount);
      return acc;
    }, {});

  const months = Object.entries(byMonth).sort().slice(-6);
  const peak = Math.max(1, ...months.map(([, value]) => value));

  return (
    <div className="space-y-6">
      <PageHeader title="Money" subtitle="Invoices and revenue" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={`Collected ${thisYear}`}
          value={money(collectedThisYear)}
          tone="text-good"
        />
        <Stat
          label="Outstanding"
          value={money(outstanding)}
          hint="sent but not paid"
          tone={outstanding > 0 ? "text-warn" : undefined}
        />
        <Stat
          label="Collected all time"
          value={money(collected)}
        />
        <Stat
          label="Contracted"
          value={money(contracted)}
          hint="total project prices"
        />
      </div>

      {months.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
            Collected by month
          </h2>
          <div className="card space-y-2 p-4">
            {months.map(([month, value]) => (
              <div key={month} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-ink-muted">
                  {new Date(`${month}-02`).toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit",
                  })}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-surface-2">
                  <div
                    className="h-full rounded bg-good/70"
                    style={{ width: `${(value / peak) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-medium">
                  {money(value)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
          All invoices
        </h2>

        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            hint="Add invoices from a project page. Once they're marked paid, revenue shows up here."
            action={
              <Link href="/projects" className="btn btn-ghost">
                Go to projects
              </Link>
            }
          />
        ) : (
          <ul className="card divide-y divide-border">
            {invoices.map((invoice) => {
              const project = projectById.get(invoice.project_id);
              const clientName = project
                ? clientById.get(project.client_id)
                : null;

              return (
                <li
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 p-3 sm:px-4"
                >
                  <div className="min-w-0">
                    {project ? (
                      <Link
                        href={`/projects/${project.id}`}
                        className="block truncate text-sm font-medium hover:text-accent"
                      >
                        {clientName ?? project.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">Invoice</span>
                    )}
                    <div className="mt-0.5 truncate text-xs text-ink-faint">
                      {invoice.description ?? project?.name}
                      {invoice.issued_on &&
                        ` · ${shortDate(invoice.issued_on)}`}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    <Badge tone={invoiceStatusTone(invoice.status)}>
                      {INVOICE_STATUS_LABELS[invoice.status]}
                    </Badge>
                    <span className="w-20 text-right text-sm font-medium">
                      {money(Number(invoice.amount))}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
