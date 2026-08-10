"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertToClient } from "@/app/actions";

/** Turns a won prospect into a client + opening project + intake form link. */
export function ConvertButton({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function convert() {
    const data = new FormData();
    data.set("prospect_id", prospectId);

    startTransition(async () => {
      const result = await convertToClient(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push(`/clients/${result.clientId}`);
    });
  }

  return (
    <div>
      <button onClick={convert} className="btn btn-ghost" disabled={pending}>
        {pending ? "Converting…" : "Mark as won"}
      </button>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
