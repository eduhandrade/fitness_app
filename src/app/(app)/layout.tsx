import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";

// Every page here reads live, frequently-changing data straight from the
// database (weight log, activities, training plan progress) — without an
// auth check forcing dynamic rendering anymore, Next.js would otherwise
// prerender these once at build time and freeze the data.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-10">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
