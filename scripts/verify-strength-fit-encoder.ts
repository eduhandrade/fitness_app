import { Decoder, Stream, type SetMesg } from "@garmin/fitsdk";
import { buildStrengthActivityFitFile } from "../src/lib/fit/build-strength-fit";
import type { StrengthSetInput } from "../src/lib/fit/build-strength-fit";

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok: ${label}`);
  } else {
    console.error(`  FAIL: ${label}`);
    failures++;
  }
}

const startDate = new Date("2026-08-04T18:00:00Z");
const sets: StrengthSetInput[] = [
  { exerciseName: "Supino reto", reps: 10, weightKg: 60 },
  { exerciseName: "Supino reto", reps: 8, weightKg: 65 },
  { exerciseName: "Rosca direta", reps: 12, weightKg: 15 },
  { exerciseName: "Exercício não reconhecido", reps: 10, weightKg: 20 },
];

console.log("Building strength FIT file...");
const bytes = buildStrengthActivityFitFile({ startDate, movingTimeSec: 2400 }, sets);
check("produces a non-empty buffer", bytes.length > 0);

const decoder = new Decoder(Stream.fromByteArray(bytes));
check("checkIntegrity() passes", decoder.checkIntegrity());

const { messages, errors } = decoder.read();
check("no decode errors", errors.length === 0);
if (errors.length > 0) console.error(errors);

check("has 1 fileIdMesg", messages.fileIdMesgs?.length === 1);
check("has 4 setMesgs", messages.setMesgs?.length === sets.length);

const set0 = messages.setMesgs?.[0];
check("set[0].repetitions matches", set0?.repetitions === 10);
check("set[0].weight matches (kg round-trip)", Math.abs((set0?.weight ?? -1) - 60) < 0.1);
check("set[0].category recognized as benchPress", set0?.category?.[0] === "benchPress");
check("set[0].setType is active", set0?.setType === "active");

const set2 = messages.setMesgs?.[2];
check("set[2].category recognized as curl", set2?.category?.[0] === "curl");

const set3 = messages.setMesgs?.[3];
check("set[3] (unrecognized exercise) has no category", set3?.category === undefined);

// Timestamps should be strictly increasing across sets.
const timestamps = (messages.setMesgs ?? []).map((s: SetMesg) =>
  s.timestamp instanceof Date ? s.timestamp.getTime() : -1
);
let increasing = true;
for (let i = 1; i < timestamps.length; i++) {
  if (timestamps[i] <= timestamps[i - 1]) increasing = false;
}
check("set timestamps strictly increase", increasing);

check("has 1 sessionMesg", messages.sessionMesgs?.length === 1);
check("session.sport is Training", messages.sessionMesgs?.[0]?.sport === "training");
check(
  "session.subSport is Strength Training",
  messages.sessionMesgs?.[0]?.subSport === "strengthTraining"
);
check(
  "session.totalElapsedTime matches",
  messages.sessionMesgs?.[0]?.totalElapsedTime === 2400
);

check("has 1 lapMesg", messages.lapMesgs?.length === 1);
check("has 1 activityMesg", messages.activityMesgs?.length === 1);

// Zero-duration fallback: timestamps still shouldn't collapse to one instant.
console.log("\nBuilding with movingTimeSec=0 (fallback spacing)...");
const fallbackBytes = buildStrengthActivityFitFile({ startDate, movingTimeSec: 0 }, sets);
const fallbackDecoder = new Decoder(Stream.fromByteArray(fallbackBytes));
const { messages: fallbackMessages } = fallbackDecoder.read();
const fallbackTimestamps = (fallbackMessages.setMesgs ?? []).map((s: SetMesg) =>
  s.timestamp instanceof Date ? s.timestamp.getTime() : -1
);
check(
  "fallback: set timestamps are still distinct",
  new Set(fallbackTimestamps).size === fallbackTimestamps.length
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
