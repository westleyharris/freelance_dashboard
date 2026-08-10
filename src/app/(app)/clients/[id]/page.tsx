import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntakeLink } from "@/components/intake-link";
import { Badge, Field } from "@/components/ui";
import { money, projectStatusTone, shortDate, telHref } from "@/lib/format";
import {
  CLIENT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  type Client,
  type IntakeForm,
  type Project,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: projectData }, { data: intakeData }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase
        .from("projects")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("intake_forms").select("*").eq("client_id", id),
    ]);

  if (!client) notFound();

  const record = client as Client;
  const projects = (projectData ?? []) as Project[];
  const intakes = (intakeData ?? []) as IntakeForm[];
  const tel = telHref(record.phone);

  return (
    <div className="space-y-5">
      <Link href="/clients" className="text-xs text-ink-muted hover:text-ink">
        &larr; Clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {record.business_name}
          </h1>
          <div className="mt-2 flex gap-1.5">
            <Badge
              tone={
                record.status === "active" ? "bg-good-soft text-good" : undefined
              }
            >
              {CLIENT_STATUS_LABELS[record.status]}
            </Badge>
          </div>
        </div>
        {tel && (
          <a href={tel} className="btn btn-primary">
            Call
          </a>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
              Projects
            </h2>

            {projects.length === 0 ? (
              <p className="card p-4 text-sm text-ink-muted">
                No projects yet.
              </p>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="card block p-4 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{project.name}</div>
                      <div className="mt-1 text-xs text-ink-muted">
                        {PROJECT_TYPE_LABELS[project.type]}
                        {project.launched_on &&
                          ` · launched ${shortDate(project.launched_on)}`}
                      </div>
                    </div>
                    <Badge tone={projectStatusTone(project.status)}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                  {project.price !== null && (
                    <div className="mt-2 text-sm font-medium">
                      {money(project.price)}
                    </div>
                  )}
                </Link>
              ))
            )}
          </section>

          {intakes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
                Intake form
              </h2>
              {intakes.map((intake) => (
                <IntakeLink key={intake.id} intake={intake} />
              ))}
            </section>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-1 text-sm font-semibold">Contact</h2>
          <dl className="divide-y divide-border">
            <Field label="Contact">{record.contact_name ?? "—"}</Field>
            <Field label="Phone">
              {tel ? (
                <a href={tel} className="text-accent hover:underline">
                  {record.phone}
                </a>
              ) : (
                "—"
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
            <Field label="City">{record.city ?? "—"}</Field>
            <Field label="Client since">{shortDate(record.created_at)}</Field>
            {record.prospect_id && (
              <Field label="Came from">
                <Link
                  href={`/prospects/${record.prospect_id}`}
                  className="text-accent hover:underline"
                >
                  Original prospect
                </Link>
              </Field>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
