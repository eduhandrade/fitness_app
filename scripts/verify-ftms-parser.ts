/** Byte-level sanity check for the FTMS parser/encoder — hand-constructs
 * DataViews with known flag bitmasks and field values (matching the
 * Bluetooth FTMS spec's Indoor Bike Data layout) and asserts the parsed/
 * encoded output is exactly right. Run with `npx tsx scripts/verify-ftms-parser.ts`.
 * This is the piece of Phase 2 that can't be tested against a real trainer
 * in this sandbox, so getting the byte math right here matters a lot. */
import {
  parseIndoorBikeData,
  parseHeartRateMeasurement,
  encodeSetSimulationParameters,
} from "../src/lib/trainer/ftms-parser";

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}`);
  if (!pass) {
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual:   ${JSON.stringify(actual)}`);
    failures++;
  }
}

function bytesToDataView(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

function dataViewToBytes(dv: DataView): number[] {
  return Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
}

// --- Indoor Bike Data: speed (bit0=0 => present) + cadence + power + heart rate ---
{
  // flags = InstCadence(1<<2) | InstPower(1<<6) | HeartRate(1<<9) = 0x244
  const bytes = [
    0x44, 0x02, // flags = 0x0244
    0xb8, 0x0b, // inst speed raw = 3000 (30.00 km/h)
    0xb4, 0x00, // inst cadence raw = 180 (90.0 rpm)
    0xdc, 0x00, // inst power = 220 W
    0x91, // heart rate = 145 bpm
  ];
  const result = parseIndoorBikeData(bytesToDataView(bytes));
  assertEqual(
    result,
    { instSpeedMs: 3000 * 0.01 / 3.6, instCadenceRpm: 90, instPowerW: 220, heartrateBpm: 145 },
    "Indoor Bike Data: speed + cadence + power + heart rate"
  );
}

// --- Indoor Bike Data: MoreData=1 (speed omitted) + distance + avg power + elapsed time ---
{
  // flags = MoreData(1<<0) | TotalDistance(1<<4) | AvgPower(1<<7) | ElapsedTime(1<<11) = 0x0891
  const bytes = [
    0x91, 0x08, // flags = 0x0891
    0x39, 0x30, 0x00, // total distance (uint24) = 12345 m
    0xb4, 0x00, // avg power = 180 W
    0x10, 0x0e, // elapsed time = 3600 s
  ];
  const result = parseIndoorBikeData(bytesToDataView(bytes));
  assertEqual(
    result,
    { totalDistanceM: 12345, avgPowerW: 180, elapsedTimeSec: 3600 },
    "Indoor Bike Data: MoreData=1 (no speed) + distance + avg power + elapsed time"
  );
}

// --- Heart Rate Measurement: uint8 format ---
{
  const bytes = [0x00, 0x48]; // flags=0 (uint8 format), value=72
  const bpm = parseHeartRateMeasurement(bytesToDataView(bytes));
  assertEqual(bpm, 72, "Heart Rate Measurement: uint8 format");
}

// --- Heart Rate Measurement: uint16 format ---
{
  const bytes = [0x01, 0x2c, 0x01]; // flags=1 (uint16 format), value=300 LE
  const bpm = parseHeartRateMeasurement(bytesToDataView(bytes));
  assertEqual(bpm, 300, "Heart Rate Measurement: uint16 format");
}

// --- Set Indoor Bike Simulation Parameters: positive grade ---
{
  const dv = encodeSetSimulationParameters({ gradePct: 8 });
  assertEqual(
    dataViewToBytes(dv),
    [0x11, 0x00, 0x00, 0x20, 0x03, 0x28, 0x33],
    "encodeSetSimulationParameters: +8% grade, default wind/crr/cw"
  );
}

// --- Set Indoor Bike Simulation Parameters: negative grade ---
{
  const dv = encodeSetSimulationParameters({ gradePct: -5.25 });
  assertEqual(
    dataViewToBytes(dv),
    [0x11, 0x00, 0x00, 0xf3, 0xfd, 0x28, 0x33],
    "encodeSetSimulationParameters: -5.25% grade, default wind/crr/cw"
  );
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
