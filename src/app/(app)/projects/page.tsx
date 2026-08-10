import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { money, projectStatusTone, shortDate } from "@/lib/format";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  type Client,
  type Project,
  type ProjectStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

/** Active work first; finished and shelved work sinks to the bottom. */
const BOARD: ProjectStatus[] = [
  "intake",
  "design",
  "build",
  "review",
  "launched",
  "on_hold",
  "cancelled",
];

export default async function ProjectsPage() {
  const supabase = await createClient();

  const [{ data: projectData }, { data: clientData }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("clients").select("id, business_name"),
  ]);

  const projects = (projectData ?? []) as Project[];
  const clients = (clientData ?? []) as Pick<Client, "id" | "business_name">[];
  const clientName = new Map(clients.map((c) => [c.id, c.business_name]));

  const active = projects.filter(
    (p) => !["launched", "cancelled"].includes(p.status),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        subtitle={`${active.length} in progress · ${projects.length} total`}
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          hint="Projects are created automatically when you mark a prospect as won."
        />
      ) : (
        <div className="space-y-6">
          {BOARD.map((status) => {
            const group = projects.filter((p) => p.status === status);
            if (group.length === 0) return null;

            return (
              <section key={status} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    {PROJECT_STATUS_LABELS[status]}
                  </h2>
                  <span className="text-xs text-ink-faint">{group.length}</span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {group.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="card block p-3.5 transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {project.name}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-ink-muted">
                            {clientName.get(project.client_id) ??
                              "Unknown client"}
                          </div>
                        </div>
                        <Badge tone={projectStatusTone(project.status)}>
                          {PROJECT_TYPE_LABELS[project.type]}
                        </Badge>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium">
                          {money(project.price)}
                        </span>
                        {project.launched_on && (
                          <span className="text-ink-faint">
                            {shortDate(project.launched_on)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
