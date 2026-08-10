import { checkEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Shown instead of a bare 500 when configuration is missing. Reached by a
 * redirect from the proxy, which can't render anything itself.
 */
export default function SetupPage() {
  const { ok, missing } = checkEnv();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <div className="card w-full p-6">
        {ok ? (
          <>
            <h1 className="text-lg font-semibold text-good">
              Configuration looks fine
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              All three Supabase variables are set. If you landed here from an
              error, redeploy — the running instance is older than the settings.
            </p>
            <a href="/" className="btn btn-primary mt-4">
              Go to the dashboard
            </a>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-warn">
              Missing environment variables
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              The app can&rsquo;t reach Supabase. Add these in Vercel under{" "}
              <strong className="text-ink">
                Settings → Environment Variables
              </strong>
              , then <strong className="text-ink">redeploy</strong> — Vercel only
              picks up new variables on a fresh build.
            </p>

            <ul className="mt-4 space-y-1.5">
              {missing.map((name) => (
                <li
                  key={name}
                  className="rounded-lg bg-bad-soft px-3 py-2 font-mono text-xs text-bad"
                >
                  {name}
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs text-ink-muted">
              <p className="font-medium text-ink">Where to find them</p>
              <p className="mt-1">
                Supabase → your project → Settings → API. The URL and{" "}
                <code>anon</code> key are the public pair; the{" "}
                <code>service_role</code> key is the secret one.
              </p>
              <p className="mt-2">
                Copy them from your local <code>.env</code> — the values are
                identical. Set them for{" "}
                <strong className="text-ink">
                  Production, Preview, and Development
                </strong>
                ; missing the Production scope is the usual cause of this.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
