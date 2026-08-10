import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { money, projectStatusTone, telHref } from "@/lib/format";
import {
  CLIENT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  type Client,
  type Project,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();

  const [{ data: clientData }, { data: projectData }] = await Promise.all([
    supabase.from("clients").select("*").order("business_name"),
    supabase.from("projects").select("*"),
  ]);

  const clients = (clientData ?? []) as Client[];
  const projects = (projectData ?? []) as Project[];

  const byClient = projects.reduce<Record<string, Project[]>>((acc, p) => {
    (acc[p.client_id] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length === 1 ? "" : "s"}`}
      />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          hint="When a prospect closes, open them in the pipeline and hit 'Mark as won'. That creates the client, an opening project, and an intake form link to send them."
          action={
            <Link href="/prospects" className="btn btn-primary">
              Go to pipeline
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((client) => {
            const clientProjects = byClient[client.id] ?? [];
            const value = clientProjects.reduce(
              (sum, p) => sum + Number(p.price ?? 0),
              0,
            );
            const tel = telHref(client.phone);

            return (
              <div key={client.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/clients/${client.id}`}
                    className="text-sm font-medium hover:text-accent"
                  >
                    {client.business_name}
                  </Link>
                  <Badge
                    tone={
                      client.status === "active"
                        ? "bg-good-soft text-good"
                        : undefined
                    }
                  >
                    {CLIENT_STATUS_LABELS[client.status]}
                  </Badge>
                </div>

                {client.contact_name && (
                  <p className="mt-1 text-xs text-ink-muted">
                    {client.contact_name}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {clientProjects.length === 0 ? (
                    <span className="text-xs text-ink-faint">No projects</span>
                  ) : (
                    clientProjects.map((project) => (
                      <Badge
                        key={project.id}
                        tone={projectStatusTone(project.status)}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                    ))
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-ink-faint">
                    {value > 0 ? money(value) : "No price set"}
                  </span>
                  {tel && (
                    <a
                      href={tel}
                      className="text-xs text-accent hover:underline"
                    >
                      {client.phone}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
