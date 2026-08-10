"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logCall } from "@/app/actions";
import { OUTCOME_LABELS, type CallOutcome } from "@/lib/types";
import { outcomeTone } from "@/lib/format";

/**
 * Outcome buttons ordered by how often they actually happen on a cold-call
 * run, so the common taps sit closest to the thumb.
 */
const OUTCOMES: CallOutcome[] = [
  "no_answer",
  "voicemail",
  "spoke",
  "not_interested",
  "callback_scheduled",
  "gatekeeper",
  "bad_number",
  "wrong_number",
  "texted",
  "emailed",
];

/** Outcomes where you almost always want to come back to them. */
const SUGGESTS_FOLLOWUP: CallOutcome[] = [
  "no_answer",
  "voicemail",
  "spoke",
  "callback_scheduled",
  "gatekeeper",
  "texted",
  "emailed",
];

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function LogCallForm({
  prospectId,
  onLogged,
}: {
  prospectId: string;
  onLogged?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!outcome) return;

    const data = new FormData();
    data.set("prospect_id", prospectId);
    data.set("outcome", outcome);
    data.set("notes", notes);
    data.set("next_action_at", nextAction);

    startTransition(async () => {
      const result = await logCall(data);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setOutcome(null);
      setNotes("");
      setNextAction("");
      setError(null);
      onLogged?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="label">What happened?</span>
        <div className="flex flex-wrap gap-1.5">
          {OUTCOMES.map((option) => {
            const selected = outcome === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setOutcome(option);
                  // Pre-fill a sensible follow-up so scheduling is one tap.
                  if (!nextAction && SUGGESTS_FOLLOWUP.includes(option)) {
                    setNextAction(daysFromNow(option === "spoke" ? 7 : 3));
                  }
                }}
                className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                  selected
                    ? `border-transparent ${outcomeTone(option)}`
                    : "border-border bg-surface-2 text-ink-muted hover:text-ink"
                }`}
              >
                {OUTCOME_LABELS[option]}
              </button>
            );
          })}
        </div>
      </div>

      {outcome && (
        <>
          <div>
            <label className="label" htmlFor="call-notes">
              Notes
            </label>
            <textarea
              id="call-notes"
              rows={2}
              className="field"
              placeholder="What did they say?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="next-action">
              Follow up on
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="next-action"
                type="date"
                className="field flex-1"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
              />
              {[
                ["Tomorrow", 1],
                ["3 days", 3],
                ["1 week", 7],
              ].map(([label, days]) => (
                <button
                  key={label as string}
                  type="button"
                  onClick={() => setNextAction(daysFromNow(days as number))}
                  className="btn btn-ghost px-2.5 py-1.5 text-xs"
                >
                  {label}
                </button>
              ))}
              {nextAction && (
                <button
                  type="button"
                  onClick={() => setNextAction("")}
                  className="text-xs text-ink-faint hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">
              Leave empty if you&rsquo;re done with this one.
            </p>
          </div>

          {error && <p className="text-sm text-bad">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="btn btn-primary w-full"
          >
            {pending ? "Saving…" : "Log call"}
          </button>
        </>
      )}
    </div>
  );
}
