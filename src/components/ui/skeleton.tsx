export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-hover ${className}`} />;
}

/** Generic per-route loading state — a title bar plus a few card-shaped
 * placeholders, close enough to every page's real shape (title + 2-3 cards)
 * to avoid a jarring layout shift once real content arrives, without
 * needing a bespoke skeleton per route. */
export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}
