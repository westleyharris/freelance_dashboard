/**
 * Open/closed state from the Places API `regularOpeningHours` shape.
 *
 * Every prospect is in Texas, so business-local time is America/Chicago. That's
 * resolved explicitly rather than relying on the viewer's clock — checking
 * hours from a laptop set to another zone would otherwise report the wrong
 * answer, which is worse than showing nothing.
 */

export interface OpeningPeriod {
  open?: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

export interface OpeningHours {
  periods?: OpeningPeriod[];
  weekdayDescriptions?: string[];
}

export type OpenState =
  | { status: "open"; detail: string }
  | { status: "closed"; detail: string }
  | { status: "unknown"; detail: string };

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Current day-of-week and minutes-since-midnight in the business's zone. */
function nowInCentral(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = get("weekday");
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

  // Intl can return "24" at midnight; fold it back to 0.
  const hour = Number(get("hour")) % 24;
  return { day: day < 0 ? 0 : day, minutes: hour * 60 + Number(get("minute")) };
}

function formatClock(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${h} ${period}` : `${h}:${String(minute).padStart(2, "0")} ${period}`;
}

export function getOpenState(hours: OpeningHours | null | undefined): OpenState {
  if (!hours?.periods?.length) {
    return { status: "unknown", detail: "Hours unknown" };
  }

  const { day, minutes } = nowInCentral();

  // A 7-day period with no close means open 24/7.
  const alwaysOpen =
    hours.periods.length === 1 &&
    hours.periods[0].open?.hour === 0 &&
    !hours.periods[0].close;
  if (alwaysOpen) return { status: "open", detail: "Open 24 hours" };

  for (const period of hours.periods) {
    if (!period.open || !period.close) continue;

    const openMins = period.open.hour * 60 + period.open.minute;
    const closeMins = period.close.hour * 60 + period.close.minute;

    // Same-day window.
    if (period.open.day === day && period.close.day === day) {
      if (minutes >= openMins && minutes < closeMins) {
        return {
          status: "open",
          detail: `Open until ${formatClock(period.close.hour, period.close.minute)}`,
        };
      }
    }

    // Window running past midnight into the next day.
    if (period.open.day === day && period.close.day !== day) {
      if (minutes >= openMins) {
        return {
          status: "open",
          detail: `Open until ${formatClock(period.close.hour, period.close.minute)}`,
        };
      }
    }
    if (period.close.day === day && period.open.day !== day) {
      if (minutes < closeMins) {
        return {
          status: "open",
          detail: `Open until ${formatClock(period.close.hour, period.close.minute)}`,
        };
      }
    }
  }

  // Closed. Find the next opening within the coming week.
  for (let ahead = 0; ahead < 8; ahead++) {
    const checkDay = (day + ahead) % 7;
    const candidates = hours.periods
      .filter((p) => p.open?.day === checkDay)
      .map((p) => p.open!)
      .filter((o) => ahead > 0 || o.hour * 60 + o.minute > minutes)
      .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

    const next = candidates[0];
    if (!next) continue;

    const when =
      ahead === 0 ? "today" : ahead === 1 ? "tomorrow" : DAY_NAMES[checkDay];
    return {
      status: "closed",
      detail: `Closed · opens ${when} at ${formatClock(next.hour, next.minute)}`,
    };
  }

  return { status: "closed", detail: "Closed" };
}

export function todayHours(hours: OpeningHours | null | undefined): string | null {
  if (!hours?.weekdayDescriptions?.length) return null;
  const { day } = nowInCentral();
  // Google's array starts on Monday; JS days start on Sunday.
  const index = day === 0 ? 6 : day - 1;
  return hours.weekdayDescriptions[index] ?? null;
}
