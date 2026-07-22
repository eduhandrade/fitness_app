import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate, toIsoDateOnly } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StravaConnectionCard } from "@/components/settings/strava-connection-card";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ strava_error?: string; strava_connected?: string }>;
}) {
  const userId = await requireUserId();
  const { strava_error, strava_connected } = await searchParams;

  const [connection, profile] = await Promise.all([
    prisma.stravaConnection.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      {strava_error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Strava connection failed: <span className="font-mono">{strava_error}</span>
        </div>
      )}
      {strava_connected && !strava_error && (
        <div className="rounded-2xl border border-primary/40 bg-primary-muted p-4 text-sm text-primary-strong">
          Strava connected successfully.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

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
