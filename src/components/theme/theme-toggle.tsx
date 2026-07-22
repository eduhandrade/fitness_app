"use client";

import { useTheme, type Theme } from "./theme-provider";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex rounded-full border border-border p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            theme === opt.value
              ? "bg-primary-muted text-primary-strong"
              : "text-foreground-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
