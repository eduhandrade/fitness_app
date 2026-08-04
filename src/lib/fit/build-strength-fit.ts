import {
  Encoder,
  Profile,
  type FileIdMesg,
  type SetMesg,
  type LapMesg,
  type SessionMesg,
  type ActivityMesg,
} from "@garmin/fitsdk";
import { classifyExercise } from "@/lib/gym/muscle-groups";

// Hand-picked from the FIT global profile (see src/lib/fit/build-fit.ts for
// why this SDK exposes no named enum constants).
const FIT_FILE_TYPE_ACTIVITY = 4;
const FIT_MANUFACTURER_DEVELOPMENT = 255;
const FIT_SPORT_TRAINING = 10;
const FIT_SUB_SPORT_STRENGTH_TRAINING = 20;
const FIT_EVENT_TIMER = 0;
const FIT_EVENT_TYPE_STOP_ALL = 4;
const FIT_ACTIVITY_TYPE_MANUAL = 0;
const FIT_SET_TYPE_ACTIVE = 1;

/** Sets without a real elapsed-time recording (this app's logging form is a
 * post-hoc checklist, not a live-timed stopwatch) get spread evenly across
 * the session's reported duration; a floor keeps timestamps from all
 * collapsing onto the same instant if duration is ever 0. */
const FALLBACK_SECONDS_PER_SET = 60;

export type StrengthSetInput = {
  exerciseName: string;
  reps: number;
  weightKg: number;
};

export type FitStrengthActivitySummary = {
  startDate: Date;
  movingTimeSec: number;
};

/** Builds a FIT Activity file for a gym session as structured `SET`
 * messages (one per logged set, tagged with Garmin's `exercise_category`
 * enum via `classifyExercise` so Strava recognizes the exercise group
 * instead of showing an opaque blob) rather than a single summary —
 * mirrors the RECORD-per-sample approach in build-fit.ts but for strength
 * training's message vocabulary. */
export function buildStrengthActivityFitFile(
  activity: FitStrengthActivitySummary,
  sets: StrengthSetInput[]
): Uint8Array {
  const encoder = new Encoder();
  const startDate = activity.startDate;
  const durationSec =
    activity.movingTimeSec > 0
      ? activity.movingTimeSec
      : Math.max(FALLBACK_SECONDS_PER_SET, sets.length * FALLBACK_SECONDS_PER_SET);
  const endDate = new Date(startDate.getTime() + durationSec * 1000);

  const fileId: FileIdMesg = {
    type: FIT_FILE_TYPE_ACTIVITY,
    manufacturer: FIT_MANUFACTURER_DEVELOPMENT,
    product: 0,
    timeCreated: startDate,
  };
  encoder.onMesg(Profile.MesgNum.FILE_ID, fileId);

  const secondsPerSet = sets.length > 0 ? durationSec / sets.length : 0;
  sets.forEach((set, index) => {
    const timestamp = new Date(startDate.getTime() + index * secondsPerSet * 1000);
    const classification = classifyExercise(set.exerciseName);

    const setMesg: SetMesg = {
      timestamp,
      repetitions: set.reps,
      weight: set.weightKg > 0 ? set.weightKg : undefined,
      setType: FIT_SET_TYPE_ACTIVE,
      category: classification ? [classification.fitCategory] : undefined,
      messageIndex: index,
    };
    encoder.onMesg(Profile.MesgNum.SET, setMesg);
  });

  const lap: LapMesg = {
    timestamp: endDate,
    startTime: startDate,
    totalElapsedTime: durationSec,
    totalTimerTime: durationSec,
    sport: FIT_SPORT_TRAINING,
    subSport: FIT_SUB_SPORT_STRENGTH_TRAINING,
    event: FIT_EVENT_TIMER,
    eventType: FIT_EVENT_TYPE_STOP_ALL,
  };
  encoder.onMesg(Profile.MesgNum.LAP, lap);

  const session: SessionMesg = {
    timestamp: endDate,
    startTime: startDate,
    sport: FIT_SPORT_TRAINING,
    subSport: FIT_SUB_SPORT_STRENGTH_TRAINING,
    totalElapsedTime: durationSec,
    totalTimerTime: durationSec,
    event: FIT_EVENT_TIMER,
    eventType: FIT_EVENT_TYPE_STOP_ALL,
    numLaps: 1,
  };
  encoder.onMesg(Profile.MesgNum.SESSION, session);

  const activityMesg: ActivityMesg = {
    timestamp: endDate,
    totalTimerTime: durationSec,
    numSessions: 1,
    type: FIT_ACTIVITY_TYPE_MANUAL,
    event: FIT_EVENT_TIMER,
    eventType: FIT_EVENT_TYPE_STOP_ALL,
  };
  encoder.onMesg(Profile.MesgNum.ACTIVITY, activityMesg);

  return encoder.close();
}
