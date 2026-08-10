"use client";

import { useState } from "react";
import { Badge } from "./ui";
import { shortDate } from "@/lib/format";
import type { IntakeForm } from "@/lib/types";

/**
 * The shareable intake link. Built in the browser from window.location so it's
 * correct on localhost and on the deployed domain without extra config.
 */
export function IntakeLink({ intake }: { intake: IntakeForm }) {
  const [copied, setCopied] = useState(false);
  const path = `/intake/${intake.token}`;
  const url =
    typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Website questions</span>
        {intake.submitted_at ? (
          <Badge tone="bg-good-soft text-good">
            Submitted {shortDate(intake.submitted_at)}
          </Badge>
        ) : (
          <Badge tone="bg-warn-soft text-warn">Waiting on client</Badge>
        )}
      </div>

      <p className="mt-1.5 text-xs text-ink-muted">
        {intake.submitted_at
          ? "Answers are on the project page."
          : "Text or email this link to the client."}
      </p>

      <div className="mt-3 flex gap-2">
        <input readOnly value={url} className="field font-mono text-xs" />
        <button onClick={copy} className="btn btn-ghost shrink-0">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-xs text-accent hover:underline"
      >
        Preview the form &rarr;
      </a>
    </div>
  );
}
