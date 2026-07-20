/** Formats a stored UTC-midnight "calendar day" Date, ignoring server timezone. */
export function formatUtcDate(
  date: Date,
  style: "short" | "long" = "short"
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: style === "long" ? "numeric" : undefined,
  }).format(date);
}

export function toUtcDateOnly(isoDateString: string): Date {
  return new Date(`${isoDateString}T00:00:00.000Z`);
}

/** YYYY-MM-DD for populating an <input type="date"> from a stored UTC-midnight Date. */
export function toIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

const WEEKDAY_SHORT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Formats weekday indices (0=Monday..6=Sunday) as "Mon, Wed, Fri". */
export function formatWeekdays(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_SHORT_LABELS[d])
    .join(", ");
}
