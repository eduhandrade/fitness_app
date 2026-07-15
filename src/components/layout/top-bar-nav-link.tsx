"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBarNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary-muted text-primary-strong"
          : "text-foreground-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
