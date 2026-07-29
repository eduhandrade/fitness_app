import { Decoder, Stream } from "@garmin/fitsdk";
import { buildActivityFitFile } from "../src/lib/fit/build-fit";
import type { TrainerStreamSample } from "../src/lib/trainer/types";

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok: ${label}`);
  } else {
    console.error(`  FAIL: ${label}`);
    failures++;
  }
}

function approx(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) <= epsilon;
}

const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;
function semicirclesToDegrees(value: number): number {
  return value / SEMICIRCLES_PER_DEGREE;
}

// Route-based ride: 5 samples, 1Hz, with GPS (as if a GPX route was loaded).
const startDate = new Date("2026-07-01T12:00:00Z");
const samples: TrainerStreamSample[] = [
  { t: 0, watts: 150, cadenceRpm: 80, heartrateBpm: 120, speedMs: 5, distanceM: 0, elevationM: 100, lat: -23.55, lng: -46.63 },
  { t: 1, watts: 180, cadenceRpm: 82, heartrateBpm: 125, speedMs: 5.2, distanceM: 5.1, elevationM: 100.5, lat: -23.5501, lng: -46.63 },
  { t: 2, watts: 210, cadenceRpm: 85, heartrateBpm: 130, speedMs: 5.4, distanceM: 10.4, elevationM: 101, lat: -23.5502, lng: -46.63 },
  { t: 3, watts: 300, cadenceRpm: 90, heartrateBpm: 140, speedMs: 5.6, distanceM: 15.9, elevationM: 102, lat: -23.5503, lng: -46.63 },
  { t: 4, watts: 190, cadenceRpm: 83, heartrateBpm: 128, speedMs: 5.3, distanceM: 21.2, elevationM: 101.5, lat: -23.5504, lng: -46.63 },
];

const summary = {
  startDate,
  movingTimeSec: 4,
  distanceM: 21.2,
  elevationGainM: 2,
  avgWatts: 206,
  maxWatts: 300,
  normalizedPower: 218.4,
  avgHeartrate: 128.6,
  maxHeartrate: 140,
  avgCadence: 84,
  maxCadence: 90,
};

console.log("Building FIT file with GPS...");
const bytes = buildActivityFitFile(summary, samples);
check("produces a non-empty buffer", bytes.length > 0);

const stream = Stream.fromByteArray(bytes);
const decoder = new Decoder(stream);
check("checkIntegrity() passes (valid CRC/header)", decoder.checkIntegrity());

const { messages, errors } = decoder.read();
check("no decode errors", errors.length === 0);
if (errors.length > 0) console.error(errors);

check("has 1 fileIdMesg", messages.fileIdMesgs?.length === 1);
check("fileIdMesg.type is Activity", messages.fileIdMesgs?.[0]?.type === "activity");

check("has 5 recordMesgs", messages.recordMesgs?.length === samples.length);
const rec2 = messages.recordMesgs?.[2];
check("record[2].power matches", rec2?.power === 210);
check("record[2].cadence matches", rec2?.cadence === 85);
check("record[2].heartRate matches", rec2?.heartRate === 130);
check("record[2].distance matches", approx(rec2?.distance ?? -1, 10.4, 0.01));
check(
  "record[2].positionLat round-trips to original degrees",
  approx(semicirclesToDegrees(rec2?.positionLat ?? -999e9), -23.5502, 1e-4)
);
check(
  "record[2].positionLong round-trips to original degrees",
  approx(semicirclesToDegrees(rec2?.positionLong ?? -999e9), -46.63, 1e-4)
);
check("record[2].altitude matches", approx(rec2?.altitude ?? -1, 101, 0.1));

check("has 1 lapMesg", messages.lapMesgs?.length === 1);
check("lap.totalDistance matches", approx(messages.lapMesgs?.[0]?.totalDistance ?? -1, 21.2, 0.01));
check("lap.avgPower matches", messages.lapMesgs?.[0]?.avgPower === 206);

check("has 1 sessionMesg", messages.sessionMesgs?.length === 1);
const session = messages.sessionMesgs?.[0];
check("session.normalizedPower matches", session?.normalizedPower === 218);
check("session.maxPower matches", session?.maxPower === 300);
check("session.sport is Cycling", session?.sport === "cycling");
check("session.subSport is Indoor Cycling", session?.subSport === "indoorCycling");

check("has 1 activityMesg", messages.activityMesgs?.length === 1);

// Routeless free ride: no lat/lng/elevation on any sample.
console.log("\nBuilding FIT file without GPS (free ride)...");
const freeRideSamples: TrainerStreamSample[] = samples.map((s) => ({
  t: s.t,
  watts: s.watts,
  cadenceRpm: s.cadenceRpm,
  heartrateBpm: s.heartrateBpm,
  speedMs: s.speedMs,
  distanceM: s.distanceM,
}));
const freeBytes = buildActivityFitFile({ ...summary, elevationGainM: 0 }, freeRideSamples);
const freeDecoder = new Decoder(Stream.fromByteArray(freeBytes));
check("free ride checkIntegrity() passes", freeDecoder.checkIntegrity());
const { messages: freeMessages, errors: freeErrors } = freeDecoder.read();
check("free ride: no decode errors", freeErrors.length === 0);
check(
  "free ride: no positionLat on records",
  (freeMessages.recordMesgs ?? []).every(
    (r: { positionLat?: number }) => r.positionLat === undefined
  )
);
check("free ride: still has power data", freeMessages.recordMesgs?.[2]?.power === 210);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
