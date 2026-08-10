import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { IntakeFormView } from "./form";
import type { IntakeForm } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Public page — no auth. Reached only by knowing the random token, and read
 * through the service client because the anon role has no policy on this table.
 */
export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("intake_forms")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!data) notFound();

  const intake = data as IntakeForm;

  if (intake.submitted_at) {
    return (
      <Shell>
        <div className="card p-8 text-center">
          <h1 className="text-lg font-semibold">Thanks — got it.</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your answers came through. Wes will be in touch shortly.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <IntakeFormView intake={intake} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <div className="text-sm font-semibold">Harris Web Works</div>
        <p className="text-xs text-ink-faint">harriswebworks.dev</p>
      </header>
      {children}
      <footer className="mt-8 text-center text-xs text-ink-faint">
        Questions? Just reply to the message this link came from.
      </footer>
    </div>
  );
}
