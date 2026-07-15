import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate, toIsoDateOnly } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StravaConnectionCard } from "@/components/settings/strava-connection-card";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function SettingsPage() {
  const userId = await requireUserId();

  const [connection, profile] = await Promise.all([
    prisma.stravaConnection.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Strava</CardTitle>
        </CardHeader>
        <CardContent>
          <StravaConnectionCard
            connected={!!connection}
            athleteId={connection?.athleteId}
            lastSyncedAt={
              connection?.lastSyncedAt
                ? formatUtcDate(connection.lastSyncedAt, "long")
                : undefined
            }
          />
          <Link
            href="/activities"
            className="mt-3 inline-block text-xs font-medium text-foreground-muted underline decoration-border underline-offset-4 hover:text-foreground"
          >
            View all activities →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            heightCm={profile?.heightCm}
            dateOfBirth={
              profile?.dateOfBirth ? toIsoDateOnly(profile.dateOfBirth) : null
            }
            sex={profile?.sex}
          />
        </CardContent>
      </Card>
    </div>
  );
}
