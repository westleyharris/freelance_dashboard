import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectEditor } from "@/components/project-editor";
import { InvoiceList } from "@/components/invoice-list";
import { Badge, Field } from "@/components/ui";
import { projectStatusTone, shortDate } from "@/lib/format";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  type Client,
  type IntakeForm,
  type Invoice,
  type Project,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const record = project as Project;

  const [{ data: client }, { data: invoiceData }, { data: intake }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .eq("id", record.client_id)
        .single(),
      supabase
        .from("invoices")
        .select("*")
        .eq("project_id", id)
        .order("issued_on", { ascending: false }),
      supabase
        .from("intake_forms")
        .select("*")
        .eq("project_id", id)
        .maybeSingle(),
    ]);

  const invoices = (invoiceData ?? []) as Invoice[];
  const answers = intake as IntakeForm | null;

  return (
    <div className="space-y-5">
      <Link href="/projects" className="text-xs text-ink-muted hover:text-ink">
        &larr; Projects
      </Link>

      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{record.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={projectStatusTone(record.status)}>
            {PROJECT_STATUS_LABELS[record.status]}
          </Badge>
          <Badge>{PROJECT_TYPE_LABELS[record.type]}</Badge>
          {client && (
            <Link
              href={`/clients/${client.id}`}
              className="text-xs text-accent hover:underline"
            >
              {(client as Client).business_name}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Invoices</h2>
            <InvoiceList projectId={record.id} invoices={invoices} />
          </div>

          {answers?.submitted_at ? (
            <div className="card p-4">
              <h2 className="mb-1 text-sm font-semibold">
                Intake answers
                <span className="ml-2 font-normal text-xs text-ink-faint">
                  submitted {shortDate(answers.submitted_at)}
                </span>
              </h2>
              <dl className="divide-y divide-border">
                <Field label="What the business does">
                  {answers.what_business_does ?? "—"}
                </Field>
                <Field label="Best contact">{answers.best_contact ?? "—"}</Field>
                <Field label="Service area">{answers.service_area ?? "—"}</Field>
                <Field label="Pages wanted">
                  {answers.pages_wanted?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {answers.pages_wanted.map((page) => (
                        <Badge key={page}>{page}</Badge>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Sites they like">
                  {answers.reference_sites ?? "—"}
                </Field>
                <Field label="Has text / photos">
                  {answers.has_content ?? "—"}
                </Field>
                <Field label="Anything special">
                  {answers.special_requests ?? "—"}
                </Field>
                <Field label="Anything else">
                  {answers.anything_else ?? "—"}
                </Field>
              </dl>
            </div>
          ) : (
            answers && (
              <div className="card p-4">
                <h2 className="text-sm font-semibold">Intake answers</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Not submitted yet. The link is on the{" "}
                  <Link
                    href={`/clients/${record.client_id}`}
                    className="text-accent hover:underline"
                  >
                    client page
                  </Link>
                  .
                </p>
              </div>
            )
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Project details</h2>
          <ProjectEditor project={record} />
        </div>
      </div>
    </div>
  );
}
