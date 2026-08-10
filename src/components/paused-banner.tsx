/**
 * Shown when a query fails in a way consistent with the Supabase free tier
 * having paused the project after a quiet week.
 *
 * See https://supabase.com/docs/guides/platform/free-project-pausing —
 * projects with low activity over 7 days get paused, and the fix is a single
 * "Resume project" click. Data stays restorable for 90 days.
 *
 * In practice /api/cron/keepalive should prevent this ever rendering; it exists
 * so that if it does happen you get an actionable message instead of a crash.
 */
export function PausedBanner({ message }: { message: string }) {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];

  const resumeUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}`
    : "https://supabase.com/dashboard/projects";

  return (
    <div className="card mb-5 border-warn/40 bg-warn-soft p-4">
      <h2 className="text-sm font-semibold text-warn">
        Can&rsquo;t reach the database
      </h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        This usually means the Supabase project paused after a quiet week on the
        free plan. Your data is safe and restorable for 90 days — click{" "}
        <strong className="text-ink">Resume project</strong> and reload this
        page.
      </p>

      <a
        href={resumeUrl}
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary mt-3"
      >
        Open Supabase &rarr;
      </a>

      <p className="mt-3 font-mono text-xs break-words text-ink-faint">
        {message}
      </p>
    </div>
  );
}
