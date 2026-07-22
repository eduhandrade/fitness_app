import Link from "next/link";
import { NAV_ITEMS } from "./nav-items";
import { TopBarNavLink } from "./top-bar-nav-link";
import { LogoMark } from "@/components/brand/logo-mark";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="text-[17px] font-bold tracking-tight text-foreground">
            TRIVO
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <TopBarNavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>

        <Link
          href="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors"
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 13a7.97 7.97 0 0 0 0-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3.5h-4l-.3 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.97 7.97 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 2.6h4l.3-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
