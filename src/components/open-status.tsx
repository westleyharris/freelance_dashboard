"use client";

import { useEffect, useState } from "react";
import { getOpenState, todayHours, type OpeningHours } from "@/lib/hours";

/**
 * Whether the business is open right now, in their time zone.
 *
 * Computed on the client and refreshed every minute: a calling session runs for
 * an hour or more, and a badge that still says "open until 5 PM" at 5:30 is
 * worse than no badge. Rendering starts as null so server and client markup
 * agree on the first paint.
 */
export function OpenStatus({
  hours,
  showToday = false,
}: {
  hours: OpeningHours | null | undefined;
  showToday?: boolean;
}) {
  const [state, setState] = useState<ReturnType<typeof getOpenState> | null>(
    null,
  );

  useEffect(() => {
    const update = () => setState(getOpenState(hours));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [hours]);

  if (!state || state.status === "unknown") return null;

  const open = state.status === "open";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${
          open ? "bg-good-soft text-good" : "bg-surface-2 text-ink-muted"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            open ? "live-dot bg-good" : "bg-ink-faint"
          }`}
        />
        {state.detail}
      </span>

      {showToday && todayHours(hours) && (
        <span className="text-xs text-ink-faint">{todayHours(hours)}</span>
      )}
    </div>
  );
}
