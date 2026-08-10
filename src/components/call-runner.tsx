"use client";

import { useState } from "react";
import Link from "next/link";
import { LogCallForm } from "./log-call-form";
import { IcpBadge } from "./icp-score";
import { OpenStatus } from "./open-status";
import { Badge } from "./ui";
import { relativeDay, stageTone, telHref } from "@/lib/format";
import {
  CONNECTED_OUTCOMES,
  STAGE_LABELS,
  WEBSITE_STATUS_LABELS,
  type Prospect,
} from "@/lib/types";
import {
  CLOSING,
  OBJECTIONS,
  OPENING,
  PITCH,
  THE_LINE,
  WORDING_WARNING,
} from "@/lib/script";

/**
 * One prospect at a time with the script alongside. Advancing is local state
 * rather than navigation so a calling session doesn't fight page loads on a
 * phone with patchy signal.
 */
export function CallRunner({ queue }: { queue: Prospect[] }) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [conversations, setConversations] = useState(0);

  const prospect = queue[index];
  const remaining = queue.length - done.length;

  if (!prospect) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium">That&rsquo;s the whole list.</p>
        <p className="mt-1 text-sm text-ink-muted">
          {done.length} call{done.length === 1 ? "" : "s"} logged this session.
        </p>
        <Link href="/" className="btn btn-primary mt-4">
          Back to Today
        </Link>
      </div>
    );
  }

  const tel = telHref(prospect.phone);
  const isDone = done.includes(prospect.id);

  function advance() {
    setIndex((current) => Math.min(current + 1, queue.length));
  }

  return (
    <div className="space-y-4">
      {/* Session scoreboard — a calling run is a grind, and watching the count
          climb is most of what makes it bearable. */}
      <div className="card flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xl font-semibold tabular-nums">
              {done.length}
            </div>
            <div className="text-[0.65rem] tracking-wide text-ink-faint uppercase">
              logged
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-xl font-semibold tabular-nums text-good">
              {conversations}
            </div>
            <div className="text-[0.65rem] tracking-wide text-ink-faint uppercase">
              reached
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-xl font-semibold tabular-nums text-ink-muted">
              {remaining}
            </div>
            <div className="text-[0.65rem] tracking-wide text-ink-faint uppercase">
              left
            </div>
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setIndex((c) => Math.max(0, c - 1))}
            disabled={index === 0}
            className="btn btn-ghost px-2.5 py-1.5 disabled:opacity-40"
          >
            &larr;
          </button>
          <button onClick={advance} className="btn btn-ghost px-2.5 py-1.5">
            Skip &rarr;
          </button>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-info transition-all duration-500"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      {/* --- the prospect ------------------------------------------------- */}
      <div key={prospect.id} className="card rise-in p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{prospect.business_name}</h2>
            <div className="mt-1">
              <OpenStatus hours={prospect.opening_hours} showToday />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <IcpBadge score={prospect.icp_score} />
              <Badge tone={stageTone(prospect.stage)}>
                {STAGE_LABELS[prospect.stage]}
              </Badge>
              {prospect.category && <Badge>{prospect.category}</Badge>}
              <Badge>{WEBSITE_STATUS_LABELS[prospect.website_status]}</Badge>
              {prospect.chamber_member && <Badge>Chamber</Badge>}
            </div>
          </div>
          {isDone && <Badge tone="bg-good-soft text-good">Logged</Badge>}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {prospect.contact_name && (
            <div>
              <dt className="text-xs text-ink-muted">Ask for</dt>
              <dd className="font-medium">{prospect.contact_name}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-ink-muted">Last contact</dt>
            <dd>{relativeDay(prospect.last_contacted_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Calls logged</dt>
            <dd>
              {prospect.call_count}
              {prospect.legacy_attempts ? (
                <span className="text-ink-faint">
                  {" "}
                  (+{prospect.legacy_attempts} before import)
                </span>
              ) : null}
            </dd>
          </div>
          {prospect.source && (
            <div>
              <dt className="text-xs text-ink-muted">Source</dt>
              <dd className="truncate">{prospect.source}</dd>
            </div>
          )}
        </dl>

        {prospect.notes && (
          <p className="mt-3 rounded-lg bg-surface-2 p-2.5 text-xs text-ink-muted">
            {prospect.notes}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {tel ? (
            <a href={tel} className="btn btn-primary flex-1 text-base">
              Call {prospect.phone}
            </a>
          ) : (
            <span className="btn btn-ghost flex-1 text-ink-faint">
              No phone number
            </span>
          )}
          <Link
            href={`/prospects/${prospect.id}`}
            className="btn btn-ghost shrink-0"
          >
            Details
          </Link>
        </div>
      </div>

      {/* --- script ------------------------------------------------------- */}
      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-semibold">
          Script
        </summary>

        <div className="mt-3 space-y-3 text-sm">
          <Quote label="Opening">
            {OPENING.replace("{business}", prospect.business_name)}
          </Quote>

          {PITCH.map((line, i) => (
            <Quote key={i} label={i === 2 ? "Then ask" : undefined}>
              {line}
            </Quote>
          ))}

          <Quote label="Closing">{CLOSING}</Quote>

          <div className="rounded-lg border border-accent/30 bg-accent-soft p-3">
            <div className="text-xs font-medium text-accent">
              The line to remember
            </div>
            <p className="mt-1 text-sm">{THE_LINE}</p>
          </div>

          <p className="rounded-lg bg-warn-soft p-2.5 text-xs text-warn">
            {WORDING_WARNING}
          </p>
        </div>
      </details>

      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Objections
        </summary>
        <div className="mt-3 space-y-3">
          {OBJECTIONS.map(({ objection, response }) => (
            <div key={objection}>
              <div className="text-xs font-medium text-ink-muted">
                &ldquo;{objection}&rdquo;
              </div>
              <p className="mt-0.5 text-sm">{response}</p>
            </div>
          ))}
        </div>
      </details>

      {/* --- log ---------------------------------------------------------- */}
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold">Log the call</h3>
        <LogCallForm
          prospectId={prospect.id}
          shortcuts
          onLogged={(outcome) => {
            setDone((current) =>
              current.includes(prospect.id)
                ? current
                : [...current, prospect.id],
            );
            if (CONNECTED_OUTCOMES.includes(outcome)) {
              setConversations((n) => n + 1);
            }
            advance();
          }}
        />
      </div>
    </div>
  );
}

function Quote({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <div className="mb-0.5 text-xs font-medium text-ink-muted">{label}</div>
      )}
      <p className="rounded-lg border-l-2 border-border-strong bg-surface-2 p-2.5">
        {children}
      </p>
    </div>
  );
}
