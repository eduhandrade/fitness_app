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
