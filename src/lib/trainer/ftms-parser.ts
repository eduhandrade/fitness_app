import {
  OPCODE_REQUEST_CONTROL,
  OPCODE_SET_INDOOR_BIKE_SIMULATION_PARAMETERS,
  OPCODE_START_OR_RESUME,
  OPCODE_STOP_OR_PAUSE,
} from "./ftms-constants";
import type { IndoorBikeSample } from "./types";

/** Indoor Bike Data flags bitmask (FTMS spec). Bit 0 is inverted: 0 means
 * Instantaneous Speed IS present, 1 means it's omitted. */
const FLAG_MORE_DATA = 1 << 0;
const FLAG_AVG_SPEED = 1 << 1;
const FLAG_INST_CADENCE = 1 << 2;
const FLAG_AVG_CADENCE = 1 << 3;
const FLAG_TOTAL_DISTANCE = 1 << 4;
const FLAG_RESISTANCE_LEVEL = 1 << 5;
const FLAG_INST_POWER = 1 << 6;
const FLAG_AVG_POWER = 1 << 7;
const FLAG_EXPENDED_ENERGY = 1 << 8;
const FLAG_HEART_RATE = 1 << 9;
const FLAG_METABOLIC_EQUIVALENT = 1 << 10;
const FLAG_ELAPSED_TIME = 1 << 11;
const FLAG_REMAINING_TIME = 1 << 12;

/** Parses an FTMS "Indoor Bike Data" characteristic notification. Field
 * presence and order are both driven by the leading flags bitmask — fields
 * only appear on the wire when their bit is set, always in bit order. */
export function parseIndoorBikeData(dv: DataView): IndoorBikeSample {
  let offset = 0;
  const flags = dv.getUint16(offset, true);
  offset += 2;

  const sample: IndoorBikeSample = {};

  if ((flags & FLAG_MORE_DATA) === 0) {
    sample.instSpeedMs = kmhRawToMs(dv.getUint16(offset, true));
    offset += 2;
  }
  if (flags & FLAG_AVG_SPEED) {
    sample.avgSpeedMs = kmhRawToMs(dv.getUint16(offset, true));
    offset += 2;
  }
  if (flags & FLAG_INST_CADENCE) {
    sample.instCadenceRpm = dv.getUint16(offset, true) * 0.5;
    offset += 2;
  }
  if (flags & FLAG_AVG_CADENCE) {
    sample.avgCadenceRpm = dv.getUint16(offset, true) * 0.5;
    offset += 2;
  }
  if (flags & FLAG_TOTAL_DISTANCE) {
    sample.totalDistanceM = readUint24(dv, offset);
    offset += 3;
  }
  if (flags & FLAG_RESISTANCE_LEVEL) {
    offset += 2; // sint16, unitless — not modeled
  }
  if (flags & FLAG_INST_POWER) {
    sample.instPowerW = dv.getInt16(offset, true);
    offset += 2;
  }
  if (flags & FLAG_AVG_POWER) {
    sample.avgPowerW = dv.getInt16(offset, true);
    offset += 2;
  }
  if (flags & FLAG_EXPENDED_ENERGY) {
    offset += 5; // total(uint16) + perHour(uint16) + perMinute(uint8) — not modeled
  }
  if (flags & FLAG_HEART_RATE) {
    sample.heartrateBpm = dv.getUint8(offset);
    offset += 1;
  }
  if (flags & FLAG_METABOLIC_EQUIVALENT) {
    offset += 1;
  }
  if (flags & FLAG_ELAPSED_TIME) {
    sample.elapsedTimeSec = dv.getUint16(offset, true);
    offset += 2;
  }
  if (flags & FLAG_REMAINING_TIME) {
    offset += 2;
  }

  return sample;
}

function kmhRawToMs(raw: number): number {
  return (raw * 0.01) / 3.6;
}

function readUint24(dv: DataView, offset: number): number {
  return dv.getUint8(offset) | (dv.getUint8(offset + 1) << 8) | (dv.getUint8(offset + 2) << 16);
}

/** Parses a standard Heart Rate Measurement characteristic value (0x2A37).
 * Flags bit 0 selects whether the value is a uint8 or a uint16. */
export function parseHeartRateMeasurement(dv: DataView): number {
  const flags = dv.getUint8(0);
  const is16Bit = (flags & 0x01) === 1;
  return is16Bit ? dv.getUint16(1, true) : dv.getUint8(1);
}

function toDataView(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

export function encodeRequestControl(): DataView {
  return toDataView([OPCODE_REQUEST_CONTROL]);
}

export function encodeStartOrResume(): DataView {
  return toDataView([OPCODE_START_OR_RESUME]);
}

export function encodeStop(): DataView {
  // Stop/Pause takes one parameter byte: 0x01 = stop, 0x02 = pause.
  return toDataView([OPCODE_STOP_OR_PAUSE, 0x01]);
}

/** Encodes "Set Indoor Bike Simulation Parameters" (control point op 0x11):
 * wind speed (sint16, 0.001 m/s), grade (sint16, 0.01 %), crr (uint8,
 * 0.0001, unitless rolling resistance coefficient), cw (uint8, 0.01 kg/m
 * wind resistance coefficient). Defaults for crr/cw are typical
 * road-bike-on-smooth-road values, matching what most trainer apps send. */
export function encodeSetSimulationParameters(opts: {
  gradePct: number;
  windSpeedMs?: number;
  crr?: number;
  cw?: number;
}): DataView {
  const dv = new DataView(new ArrayBuffer(7));
  let offset = 0;
  dv.setUint8(offset, OPCODE_SET_INDOOR_BIKE_SIMULATION_PARAMETERS);
  offset += 1;
  dv.setInt16(offset, Math.round((opts.windSpeedMs ?? 0) * 1000), true);
  offset += 2;
  dv.setInt16(offset, Math.round(opts.gradePct * 100), true);
  offset += 2;
  dv.setUint8(offset, Math.round((opts.crr ?? 0.004) * 10000));
  offset += 1;
  dv.setUint8(offset, Math.round((opts.cw ?? 0.51) * 100));
  offset += 1;
  return dv;
}
