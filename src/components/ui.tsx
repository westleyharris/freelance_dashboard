import Link from "next/link";
import type { ReactNode } from "react";

export function ChamberBadge() {
  return <Badge tone="bg-chamber-soft text-chamber">Chamber</Badge>;
}

export function Badge({
  children,
  tone = "bg-surface-2 text-ink-muted",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Headline number for the dashboard. `hint` explains what it means. */
export function Stat({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  tone?: string;
}) {
  const body = (
    <div className="card group relative h-full overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40">
      <span className="pointer-events-none absolute top-2 left-2 h-2 w-2 border-t border-l border-accent/40" />
      <span className="pointer-events-none absolute top-2 right-2 h-2 w-2 border-t border-r border-accent/40" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-2 w-2 border-b border-l border-accent/40" />
      <span className="pointer-events-none absolute right-2 bottom-2 h-2 w-2 border-r border-b border-accent/40" />
      <div className="font-mono text-[0.65rem] tracking-[0.14em] text-ink-faint uppercase">
        {label}
      </div>
      <div className={`mt-2 font-mono text-2xl font-semibold ${tone ?? ""}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-md text-sm text-ink-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Label/value row used across the detail pages. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="text-sm break-words">{children ?? "—"}</dd>
    </div>
  );
}
