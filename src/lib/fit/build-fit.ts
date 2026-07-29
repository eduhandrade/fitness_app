import {
  Encoder,
  Profile,
  type FileIdMesg,
  type RecordMesg,
  type LapMesg,
  type SessionMesg,
  type ActivityMesg,
} from "@garmin/fitsdk";
import type { TrainerStreamSample } from "@/lib/trainer/types";

// The FIT profile's enum values are plain numbers in this SDK (no named
// constant exports like Profile.Sport.CYCLING), so these are hand-picked
// from the FIT global profile.
const FIT_FILE_TYPE_ACTIVITY = 4;
const FIT_MANUFACTURER_DEVELOPMENT = 255;
const FIT_SPORT_CYCLING = 2;
const FIT_SUB_SPORT_INDOOR_CYCLING = 6;
const FIT_EVENT_TIMER = 0;
const FIT_EVENT_TYPE_STOP_ALL = 4;
const FIT_ACTIVITY_TYPE_MANUAL = 0;

const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;

function degreesToSemicircles(deg: number): number {
  return Math.round(deg * SEMICIRCLES_PER_DEGREE);
}

function roundOrUndefined(value: number | null | undefined): number | undefined {
  return value != null ? Math.round(value) : undefined;
}

export type FitActivitySummary = {
  startDate: Date;
  movingTimeSec: number;
  distanceM: number;
  elevationGainM: number;
  avgWatts?: number | null;
  maxWatts?: number | null;
  normalizedPower?: number | null;
  avgHeartrate?: number | null;
  maxHeartrate?: number | null;
  avgCadence?: number | null;
  maxCadence?: number | null;
};

/** Builds a FIT Activity file (FILE_ID, one RECORD per sample, a single
 * LAP/SESSION covering the whole ride, and an ACTIVITY summary) so a
 * trainer-recorded ride can be uploaded to Strava with full time-series
 * data — not just summary stats. Embeds position/altitude per record when
 * the sample carries them (i.e. a GPX route was loaded), so Strava renders
 * a real route map; a routeless free ride omits position entirely. */
export function buildActivityFitFile(
  activity: FitActivitySummary,
  samples: TrainerStreamSample[]
): Uint8Array {
  const encoder = new Encoder();
  const startDate = activity.startDate;
  const endDate = new Date(startDate.getTime() + activity.movingTimeSec * 1000);

  const fileId: FileIdMesg = {
    type: FIT_FILE_TYPE_ACTIVITY,
    manufacturer: FIT_MANUFACTURER_DEVELOPMENT,
    product: 0,
    timeCreated: startDate,
  };
  encoder.onMesg(Profile.MesgNum.FILE_ID, fileId);

  for (const sample of samples) {
    const timestamp = new Date(startDate.getTime() + sample.t * 1000);
    const hasPosition = sample.lat != null && sample.lng != null;

    const record: RecordMesg = {
      timestamp,
      positionLat: hasPosition ? degreesToSemicircles(sample.lat!) : undefined,
      positionLong: hasPosition ? degreesToSemicircles(sample.lng!) : undefined,
      altitude: sample.elevationM,
      power: roundOrUndefined(sample.watts),
      cadence: roundOrUndefined(sample.cadenceRpm),
      heartRate: roundOrUndefined(sample.heartrateBpm),
      speed: sample.speedMs,
      distance: sample.distanceM,
    };
    encoder.onMesg(Profile.MesgNum.RECORD, record);
  }

  const summaryFields = {
    avgHeartRate: roundOrUndefined(activity.avgHeartrate),
    maxHeartRate: roundOrUndefined(activity.maxHeartrate),
    avgPower: roundOrUndefined(activity.avgWatts),
    maxPower: roundOrUndefined(activity.maxWatts),
    avgCadence: roundOrUndefined(activity.avgCadence),
    maxCadence: roundOrUndefined(activity.maxCadence),
    totalAscent: activity.elevationGainM > 0 ? Math.round(activity.elevationGainM) : undefined,
  };

  const lap: LapMesg = {
    timestamp: endDate,
    startTime: startDate,
    totalElapsedTime: activity.movingTimeSec,
    totalTimerTime: activity.movingTimeSec,
    totalDistance: activity.distanceM,
    sport: FIT_SPORT_CYCLING,
    subSport: FIT_SUB_SPORT_INDOOR_CYCLING,
    event: FIT_EVENT_TIMER,
    eventType: FIT_EVENT_TYPE_STOP_ALL,
    ...summaryFields,
  };
  encoder.onMesg(Profile.MesgNum.LAP, lap);

  const session: SessionMesg = {
    timestamp: endDate,
    startTime: startDate,
    sport: FIT_SPORT_CYCLING,
    subSport: FIT_SUB_SPORT_INDOOR_CYCLING,
    totalElapsedTime: activity.movingTimeSec,
    totalTimerTime: activity.movingTimeSec,
    totalDistance: activity.distanceM,
    event: FIT_EVENT_TIMER,
    eventType: FIT_EVENT_TYPE_STOP_ALL,
    numLaps: 1,
    normalizedPower: roundOrUndefined(activity.normalizedPower),
    ...summaryFields,
  };
  encoder.onMesg(Profile.MesgNum.SESSION, session);

  const activityMesg: ActivityMesg = {
    timestamp: endDate,
    totalTimerTime: activity.movingTimeSec,
    numSessions: 1,
    type: FIT_ACTIVITY_TYPE_MANUAL,
    event: FIT_EVENT_TIMER,
    eventType: FIT_EVENT_TYPE_STOP_ALL,
  };
  encoder.onMesg(Profile.MesgNum.ACTIVITY, activityMesg);

  return encoder.close();
}
