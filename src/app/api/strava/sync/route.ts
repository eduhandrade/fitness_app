import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getValidStravaAccessToken } from "@/lib/strava-connection";
import { fetchStravaActivities, mapStravaSportType } from "@/lib/strava";

const PER_PAGE = 100;
const MAX_PAGES = 10;

export async function POST() {
  const userId = await requireUserId();

  const accessToken = await getValidStravaAccessToken(userId);
  if (!accessToken) {
    return NextResponse.json({ error: "Strava not connected" }, { status: 400 });
  }

  const connection = await prisma.stravaConnection.findUniqueOrThrow({
    where: { userId },
  });
  const after = connection.lastSyncedAt
    ? Math.floor(connection.lastSyncedAt.getTime() / 1000) - 60 * 60 * 24
    : undefined;

  let synced = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const activities = await fetchStravaActivities(accessToken, {
      page,
      perPage: PER_PAGE,
      after,
    });
    if (activities.length === 0) break;

    for (const activity of activities) {
      await prisma.activity.upsert({
        where: { stravaId: String(activity.id) },
        update: {
          name: activity.name,
          sport: mapStravaSportType(activity.sport_type),
          startDate: new Date(activity.start_date),
          movingTimeSec: activity.moving_time,
          elapsedTimeSec: activity.elapsed_time,
          distanceM: activity.distance,
          elevationGainM: activity.total_elevation_gain,
          avgHeartrate: activity.average_heartrate,
          maxHeartrate: activity.max_heartrate,
          avgSpeedMs: activity.average_speed,
          avgWatts: activity.average_watts,
          avgCadence: activity.average_cadence,
          calories: activity.calories,
          relativeEffort: activity.suffer_score,
        },
        create: {
          userId,
          source: "STRAVA",
          stravaId: String(activity.id),
          name: activity.name,
          sport: mapStravaSportType(activity.sport_type),
          startDate: new Date(activity.start_date),
          movingTimeSec: activity.moving_time,
          elapsedTimeSec: activity.elapsed_time,
          distanceM: activity.distance,
          elevationGainM: activity.total_elevation_gain,
          avgHeartrate: activity.average_heartrate,
          maxHeartrate: activity.max_heartrate,
          avgSpeedMs: activity.average_speed,
          avgWatts: activity.average_watts,
          avgCadence: activity.average_cadence,
          calories: activity.calories,
          relativeEffort: activity.suffer_score,
        },
      });
      synced++;
    }

    if (activities.length < PER_PAGE) break;
  }

  await prisma.stravaConnection.update({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({ synced });
}
