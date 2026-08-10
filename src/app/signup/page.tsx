import Link from "next/link";
import { accountExists } from "./actions";
import { SignupForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const exists = await accountExists();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {exists === null ? (
        <Unreachable />
      ) : exists ? (
        <AlreadySetUp />
      ) : (
        <SignupForm />
      )}
    </div>
  );
}

function AlreadySetUp() {
  return (
    <div className="card w-full max-w-sm p-6 text-center">
      <h1 className="text-lg font-semibold">Already set up</h1>
      <p className="mt-2 text-sm text-ink-muted">
        An account exists for this dashboard. This page only creates the very
        first one.
      </p>
      <Link href="/login" className="btn btn-primary mt-4 w-full">
        Go to sign in
      </Link>
      <p className="mt-3 text-xs text-ink-faint">
        Forgot the password? Reset it from Supabase &rarr; Authentication &rarr;
        Users.
      </p>
    </div>
  );
}

function Unreachable() {
  return (
    <div className="card w-full max-w-sm p-6">
      <h1 className="text-lg font-semibold text-warn">Can&rsquo;t reach Supabase</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Check that <code className="text-ink">.env</code> has all three Supabase
        values and that you restarted the dev server after editing it —
        environment variables are only read at startup.
      </p>
      <ul className="mt-3 space-y-1 font-mono text-xs text-ink-faint">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        <li>SUPABASE_SERVICE_ROLE_KEY</li>
      </ul>
    </div>
  );
}
