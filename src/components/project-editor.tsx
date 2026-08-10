"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProject } from "@/app/actions";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  type Project,
  type ProjectStatus,
  type ProjectType,
} from "@/lib/types";

export function ProjectEditor({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveProject(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={project.id} />

      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          className="field"
          defaultValue={project.name}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="type">
            Type
          </label>
          <select
            id="type"
            name="type"
            className="field"
            defaultValue={project.type}
          >
            {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((key) => (
              <option key={key} value={key}>
                {PROJECT_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="field"
            defaultValue={project.status}
          >
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(
              (key) => (
                <option key={key} value={key}>
                  {PROJECT_STATUS_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="price">
          Project price ($)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="1"
          className="field"
          defaultValue={project.price ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="started_on">
            Started
          </label>
          <input
            id="started_on"
            name="started_on"
            type="date"
            className="field"
            defaultValue={project.started_on ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="launched_on">
            Launched
          </label>
          <input
            id="launched_on"
            name="launched_on"
            type="date"
            className="field"
            defaultValue={project.launched_on ?? ""}
          />
        </div>
      </div>

      <fieldset className="space-y-3 border-t border-border pt-3">
        <legend className="text-xs font-medium text-ink-muted">
          Where it lives
        </legend>

        <div>
          <label className="label" htmlFor="live_url">
            Live URL
          </label>
          <input
            id="live_url"
            name="live_url"
            type="url"
            className="field"
            defaultValue={project.live_url ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="repo_url">
            Repository
          </label>
          <input
            id="repo_url"
            name="repo_url"
            type="url"
            className="field"
            placeholder="https://github.com/…"
            defaultValue={project.repo_url ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="domain">
            Domain
          </label>
          <input
            id="domain"
            name="domain"
            className="field"
            defaultValue={project.domain ?? ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="domain_registrar">
              Registrar
            </label>
            <input
              id="domain_registrar"
              name="domain_registrar"
              className="field"
              defaultValue={project.domain_registrar ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="hosting">
              Hosting
            </label>
            <input
              id="hosting"
              name="hosting"
              className="field"
              defaultValue={project.hosting ?? ""}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="form_endpoint">
            Form handler
          </label>
          <input
            id="form_endpoint"
            name="form_endpoint"
            className="field"
            defaultValue={project.form_endpoint ?? ""}
          />
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="field"
          defaultValue={project.notes ?? ""}
        />
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : saved ? "Saved" : "Save project"}
      </button>
    </form>
  );
}
