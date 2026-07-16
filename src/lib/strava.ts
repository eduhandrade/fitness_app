import { Sport } from "@/generated/prisma/enums";

const STRAVA_OAUTH_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_OAUTH_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export function buildStravaAuthorizeUrl(): string {
  const url = new URL(STRAVA_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", requireEnv("STRAVA_CLIENT_ID"));
  url.searchParams.set("redirect_uri", requireEnv("STRAVA_REDIRECT_URI"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read_all,profile:read_all");
  return url.toString();
}

export type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
};

export async function exchangeStravaCode(
  code: string
): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("STRAVA_CLIENT_ID"),
      client_secret: requireEnv("STRAVA_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshStravaToken(
  refreshToken: string
): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("STRAVA_CLIENT_ID"),
      client_secret: requireEnv("STRAVA_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type StravaActivity = {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  moving_time: number;
  elapsed_time: number;
  distance: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number;
  average_watts?: number;
  average_cadence?: number;
  calories?: number;
  suffer_score?: number;
};

export async function fetchStravaActivities(
  accessToken: string,
  { page, perPage, after }: { page: number; perPage: number; after?: number }
): Promise<StravaActivity[]> {
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  if (after) url.searchParams.set("after", String(after));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

const SPORT_TYPE_MAP: Record<string, Sport> = {
  Run: Sport.RUN,
  TrailRun: Sport.RUN,
  Treadmill: Sport.RUN,
  VirtualRun: Sport.RUN,
  Ride: Sport.RIDE,
  MountainBikeRide: Sport.RIDE,
  GravelRide: Sport.RIDE,
  EBikeRide: Sport.RIDE,
  VirtualRide: Sport.RIDE,
  Handcycle: Sport.RIDE,
  Swim: Sport.SWIM,
  WeightTraining: Sport.STRENGTH,
  Workout: Sport.STRENGTH,
  Crossfit: Sport.STRENGTH,
  StairStepper: Sport.STRENGTH,
};

export function mapStravaSportType(sportType: string): Sport {
  return SPORT_TYPE_MAP[sportType] ?? Sport.OTHER;
}
