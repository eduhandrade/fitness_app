import Link from "next/link";
import { PRIMARY_NAV_ITEMS } from "./nav-items";
import { TopBarNavLink } from "./top-bar-nav-link";
import { LogoMark } from "@/components/brand/logo-mark";
import { MoreMenu } from "./more-menu";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="text-[17px] font-bold tracking-tight text-foreground">
            TRIVO
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <TopBarNavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>

        <MoreMenu />
      </div>
    </header>
  );
}
