import type {
  CallOutcome,
  InvoiceStatus,
  ProjectStatus,
  ProspectStage,
} from "./types";

export function money(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "3 days ago", "yesterday", "in 2 days" — the phrasing used in call lists. */
export function relativeDay(value: string | null | undefined): string {
  if (!value) return "never";

  const then = new Date(value);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOfDay(then) - startOfDay(new Date())) / 86_400_000,
  );

  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days === 1) return "tomorrow";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
}

/** Strips formatting so tel: links work reliably on iOS. */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `tel:+${digits.length === 10 ? "1" : ""}${digits}`;
}

/* ---------------------------------------------------------------------------
   Semantic colors. Returned as class strings so they can be composed.
--------------------------------------------------------------------------- */

export function stageTone(stage: ProspectStage): string {
  switch (stage) {
    case "won":
      return "bg-good-soft text-good";
    case "interested":
    case "quoted":
      return "bg-warn-soft text-warn";
    case "contacted":
      return "bg-accent-soft text-accent";
    case "attempting":
      return "bg-info-soft text-info";
    case "lost":
      return "bg-surface-2 text-ink-faint";
    default:
      return "bg-surface-2 text-ink-muted";
  }
}

export function outcomeTone(outcome: CallOutcome): string {
  switch (outcome) {
    case "spoke":
    case "callback_scheduled":
      return "bg-good-soft text-good";
    case "voicemail":
    case "texted":
    case "emailed":
    case "gatekeeper":
      return "bg-accent-soft text-accent";
    case "bad_number":
    case "wrong_number":
    case "not_interested":
      return "bg-bad-soft text-bad";
    default:
      return "bg-surface-2 text-ink-muted";
  }
}

export function projectStatusTone(status: ProjectStatus): string {
  switch (status) {
    case "launched":
      return "bg-good-soft text-good";
    case "build":
    case "design":
      return "bg-accent-soft text-accent";
    case "review":
      return "bg-warn-soft text-warn";
    case "on_hold":
    case "cancelled":
      return "bg-surface-2 text-ink-faint";
    default:
      return "bg-info-soft text-info";
  }
}

export function invoiceStatusTone(status: InvoiceStatus): string {
  switch (status) {
    case "paid":
      return "bg-good-soft text-good";
    case "overdue":
      return "bg-bad-soft text-bad";
    case "sent":
      return "bg-warn-soft text-warn";
    default:
      return "bg-surface-2 text-ink-faint";
  }
}
