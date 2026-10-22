export interface Slice {
  label: string;
  value: number;
  color: string;
}

/**
 * A donut drawn with a conic gradient. No chart library — the slices are a
 * handful of counts, and a gradient plus a legend is the whole component.
 */
export function DonutChart({
  title,
  slices,
  centerLabel = "total",
}: {
  title: string;
  slices: Slice[];
  centerLabel?: string;
}) {
  const visible = slices.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);

  let cursor = 0;
  const gradient =
    total === 0
      ? "var(--color-surface-2) 0% 100%"
      : visible
          .map((slice) => {
            const start = (cursor / total) * 100;
            cursor += slice.value;
            const end = (cursor / total) * 100;
            return `${slice.color} ${start}% ${end}%`;
          })
          .join(", ");

  return (
    <div className="card p-4">
      <h2 className="font-mono text-[0.65rem] tracking-[0.16em] text-ink-faint uppercase">
        {title}
      </h2>

      {total === 0 ? (
        <p className="mt-6 mb-4 text-sm text-ink-muted">Nothing to chart yet.</p>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <div
              className="h-full w-full rounded-full"
              style={{
                background: `conic-gradient(${gradient})`,
                boxShadow: "0 0 24px rgba(62, 224, 255, 0.12)",
              }}
            />
            <div className="absolute inset-[1.15rem] flex flex-col items-center justify-center rounded-full bg-surface">
              <div className="font-mono text-xl leading-none font-semibold">
                {total}
              </div>
              <div className="mt-1 font-mono text-[0.55rem] tracking-widest text-ink-faint uppercase">
                {centerLabel}
              </div>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {visible.map((slice) => (
              <li key={slice.label} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: slice.color }}
                />
                <span className="truncate text-ink-muted">{slice.label}</span>
                <span className="ml-auto font-mono text-ink">{slice.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
