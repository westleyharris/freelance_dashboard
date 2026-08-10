import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogCallForm } from "@/components/log-call-form";
import { ProspectEditor } from "@/components/prospect-editor";
import { ConvertButton } from "@/components/convert-button";
import { IcpBreakdown } from "@/components/icp-score";
import { OpenStatus } from "@/components/open-status";
import { Badge, Field } from "@/components/ui";
import {
  money,
  outcomeTone,
  relativeDay,
  shortDate,
  stageTone,
  telHref,
} from "@/lib/format";
import {
  LOST_REASON_LABELS,
  OUTCOME_LABELS,
  STAGE_LABELS,
  WEBSITE_STATUS_LABELS,
  type Call,
  type Prospect,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProspectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: prospect }, { data: callData }, { data: client }] =
    await Promise.all([
      supabase.from("prospects").select("*").eq("id", id).single(),
      supabase
        .from("calls")
        .select("*")
        .eq("prospect_id", id)
        .order("called_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, business_name")
        .eq("prospect_id", id)
        .maybeSingle(),
    ]);

  if (!prospect) notFound();

  const record = prospect as Prospect;
  const calls = (callData ?? []) as Call[];
  const tel = telHref(record.phone);

  return (
    <div className="space-y-5">
      <Link href="/prospects" className="text-xs text-ink-muted hover:text-ink">
        &larr; Pipeline
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">
            {record.business_name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={stageTone(record.stage)}>
              {STAGE_LABELS[record.stage]}
            </Badge>
            {record.lost_reason && (
              <Badge>{LOST_REASON_LABELS[record.lost_reason]}</Badge>
            )}
            {record.category && <Badge>{record.category}</Badge>}
            <Badge>{WEBSITE_STATUS_LABELS[record.website_status]}</Badge>
            {record.chamber_member && <Badge>Chamber</Badge>}
          </div>
          <div className="mt-2">
            <OpenStatus hours={record.opening_hours} showToday />
          </div>
        </div>

        <div className="flex gap-2">
          {tel && (
            <a href={tel} className="btn btn-primary">
              Call
            </a>
          )}
          {client ? (
            <Link href={`/clients/${client.id}`} className="btn btn-ghost">
              View client
            </Link>
          ) : (
            <ConvertButton prospectId={record.id} />
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="card p-4">
            <h2 className="mb-2 text-sm font-semibold">Log a call</h2>
            <LogCallForm prospectId={record.id} />
          </div>

          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">
              Call history{" "}
              <span className="font-normal text-ink-faint">
                ({calls.length})
              </span>
            </h2>

            {calls.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No calls logged in the dashboard yet.
                {record.legacy_attempts
                  ? ` The old spreadsheet suggests roughly ${record.legacy_attempts} prior attempt${
                      record.legacy_attempts === 1 ? "" : "s"
                    }, but it recorded no dates.`
                  : ""}
              </p>
            ) : (
              <ul className="space-y-3">
                {calls.map((call) => (
                  <li key={call.id} className="flex gap-3">
                    <div className="w-20 shrink-0 pt-0.5 text-xs text-ink-faint">
                      {shortDate(call.called_at)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge tone={outcomeTone(call.outcome)}>
                        {OUTCOME_LABELS[call.outcome]}
                      </Badge>
                      {call.notes && (
                        <p className="mt-1 text-sm text-ink-muted">
                          {call.notes}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(record.description || record.why_reliable) && (
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Research</h2>
              {record.description && (
                <p className="text-sm text-ink-muted">{record.description}</p>
              )}
              {record.why_reliable && (
                <>
                  <div className="mt-3 text-xs font-medium text-ink-muted">
                    Why they&rsquo;re a good fit
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {record.why_reliable}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <IcpBreakdown prospect={record} />

          <div className="card p-4">
            <h2 className="mb-1 text-sm font-semibold">Details</h2>
            <dl className="divide-y divide-border">
              <Field label="Contact">{record.contact_name ?? "—"}</Field>
              <Field label="Phone">
                {tel ? (
                  <a href={tel} className="text-accent hover:underline">
                    {record.phone}
                  </a>
                ) : (
                  (record.phone ?? "—")
                )}
              </Field>
              <Field label="Email">
                {record.email ? (
                  <a
                    href={`mailto:${record.email}`}
                    className="text-accent hover:underline"
                  >
                    {record.email}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Follow up">
                {record.next_action_at
                  ? `${shortDate(record.next_action_at)} (${relativeDay(record.next_action_at)})`
                  : "Not scheduled"}
              </Field>
              <Field label="Last contacted">
                {relativeDay(record.last_contacted_at)}
              </Field>
              <Field label="Quoted">{money(record.quoted_amount)}</Field>
              <Field label="Source">
                {record.source_url ? (
                  <a
                    href={record.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    {record.source ?? "Link"}
                  </a>
                ) : (
                  (record.source ?? "—")
                )}
              </Field>
            </dl>
          </div>

          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Edit</h2>
            <ProspectEditor prospect={record} />
          </div>
        </div>
      </div>
    </div>
  );
}
