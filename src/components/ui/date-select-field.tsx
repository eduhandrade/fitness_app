"use client";

import { useState } from "react";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const selectClass =
  "w-full rounded-xl border border-border bg-surface-hover px-2 py-2 text-sm outline-none focus:border-primary";

/**
 * Three plain <select>s instead of a native <input type="date">. iOS
 * Safari's native date picker enforces its own internal minimum width for
 * the pt-BR long date format ("15 de set. de 1987") that ignores CSS
 * width/min-width entirely — the field visually overflows its container no
 * matter how much room it's given, even alone on a full-width row. Three
 * narrow selects sidestep that native-widget quirk completely: their width
 * is ordinary, CSS-controlled content, never wider than "Sep"/"1987".
 */
export function DateSelectField({
  id,
  name,
  defaultValue,
  minYear,
  maxYear,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  minYear: number;
  maxYear: number;
}) {
  const initial = defaultValue?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [year, setYear] = useState<number | "">(initial ? Number(initial[1]) : "");
  const [month, setMonth] = useState<number | "">(initial ? Number(initial[2]) : "");
  const [day, setDay] = useState<number | "">(initial ? Number(initial[3]) : "");

  const maxDay = year && month ? daysInMonth(year, month) : 31;
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const isoValue =
    year && month && day
      ? `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, maxDay)).padStart(2, "0")}`
      : "";

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        aria-label="Day"
        className={selectClass}
        value={day}
        onChange={(e) => setDay(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        aria-label="Month"
        className={selectClass}
        value={month}
        onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="Year"
        className={selectClass}
        value={year}
        onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <input type="hidden" id={id} name={name} value={isoValue} />
    </div>
  );
}
