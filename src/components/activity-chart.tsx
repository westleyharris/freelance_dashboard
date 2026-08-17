import type { Call } from "@/lib/types";
import { CONNECTED_OUTCOMES } from "@/lib/types";

/**
 * Calls per day for the last fortnight, split by whether anyone picked up.
 *
 * Plain divs rather than a charting library: it's fourteen bars, and shipping a
 * chart bundle to render them would cost more than the feature is worth.
 */
export function ActivityChart({ calls }: { calls: Call[] }) {
  const days: { label: string; date: string; total: number; reached: number }[] =
    [];

  for (let back = 13; back >= 0; back--) {
    const date = new Date();
    date.setDate(date.getDate() - back);
    const key = date.toISOString().slice(0, 10);

    const onDay = calls.filter((c) => c.called_at.slice(0, 10) === key);
    days.push({
      label: date.toLocaleDateString("en-US", { weekday: "narrow" }),
      date: key,
      total: onDay.length,
      reached: onDay.filter((c) => CONNECTED_OUTCOMES.includes(c.outcome))
        .length,
    });
  }

  const peak = Math.max(1, ...days.map((d) => d.total));
  const totalCalls = days.reduce((sum, d) => sum + d.total, 0);

  if (totalCalls === 0) {
    return (
      <div className="card p-4">
        <h2 className="text-sm font-semibold">Last 14 days</h2>
        <p className="mt-1 text-sm text-ink-muted">
          No calls logged yet. They&rsquo;ll show up here as you work the list.
        </p>
      </div>
    );
  }

  const busiest = days.reduce((a, b) => (b.total > a.total ? b : a));

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Last 14 days</h2>
        <span className="text-xs text-ink-faint">
          {totalCalls} calls · best day {busiest.total}
        </span>
      </div>

      <div className="mt-4">
        {/* % bar heights need a fixed-height track; day labels live below it. */}
        <div className="flex h-24 items-end gap-1">
          {days.map((day) => (
            <div
              key={day.date}
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              {day.total > 0 && (
                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-t transition-all duration-300"
                  style={{
                    height: `${Math.max(8, (day.total / peak) * 100)}%`,
                  }}
                >
                  {/* Reached-a-person portion sits on top of the total. */}
                  <div
                    className="w-full bg-accent/35"
                    style={{
                      height: `${((day.total - day.reached) / day.total) * 100}%`,
                    }}
                  />
                  <div
                    className="w-full bg-good"
                    style={{
                      height: `${(day.reached / day.total) * 100}%`,
                    }}
                  />
                </div>
              )}

              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {day.total} call{day.total === 1 ? "" : "s"}, {day.reached}{" "}
                reached
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          {days.map((day) => (
            <span
              key={`${day.date}-label`}
              className="min-w-0 flex-1 text-center text-[0.6rem] text-ink-faint"
            >
              {day.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-4 border-t border-border pt-2.5 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-good" /> reached a person
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-accent/35" /> no answer
        </span>
      </div>
    </div>
  );
}
