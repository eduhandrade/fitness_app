import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate } from "@/lib/date";
import { formatDistanceKm, formatDuration } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BikeTrainerLauncher } from "@/components/bike-trainer/bike-trainer-launcher";

export default async function BikeTrainerPage() {
  const userId = await requireUserId();

  const recentRides = await prisma.activity.findMany({
    where: { userId, sport: "BIKE_TRAINER" },
    orderBy: { startDate: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bike Trainer</h1>

      <Card>
        <CardContent className="pt-4">
          <BikeTrainerLauncher />
        </CardContent>
      </Card>

      {recentRides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent rides</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentRides.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/activities/${a.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{a.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {formatUtcDate(a.startDate, "long")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-foreground-muted">
                      {a.distanceM > 0 && <p>{formatDistanceKm(a.distanceM)}</p>}
                      <p>{formatDuration(a.movingTimeSec)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
