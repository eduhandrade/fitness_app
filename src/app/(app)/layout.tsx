import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { requireUserId } from "@/lib/session";

// Every page here reads live, frequently-changing data straight from the
// database (weight log, activities, training plan progress) — without an
// auth check forcing dynamic rendering anymore, Next.js would otherwise
// prerender these once at build time and freeze the data.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Gates every route under (app) — redirects to /login if unauthenticated.
  // requireUserId() is wrapped in React's cache(), so this and each page's
  // own call dedupe into a single session lookup per request.
  await requireUserId();

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 pb-24 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-6 md:pb-10">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
