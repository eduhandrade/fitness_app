import {
  FTMS_SERVICE,
  INDOOR_BIKE_DATA_CHARACTERISTIC,
  FITNESS_MACHINE_CONTROL_POINT_CHARACTERISTIC,
  OPCODE_REQUEST_CONTROL,
  OPCODE_START_OR_RESUME,
  OPCODE_STOP_OR_PAUSE,
  OPCODE_SET_INDOOR_BIKE_SIMULATION_PARAMETERS,
  OPCODE_RESPONSE_CODE,
  RESULT_SUCCESS,
} from "./ftms-constants";
import {
  parseIndoorBikeData,
  encodeRequestControl,
  encodeStartOrResume,
  encodeStop,
  encodeSetSimulationParameters,
} from "./ftms-parser";
import type { IndoorBikeSample, TrainerConnection } from "./types";

const CONTROL_RESPONSE_TIMEOUT_MS = 5000;

type PendingControlRequest = {
  opcode: number;
  resolve: () => void;
  reject: (error: Error) => void;
};

/** Real Web Bluetooth / FTMS implementation of `TrainerConnection`. FTMS
 * requires every Control Point write to be acknowledged by an indicated
 * response carrying the same op code before the trainer will act on it (and
 * simulation-parameter writes are rejected outright until Request Control
 * has succeeded) — `writeControlPoint` tracks exactly one in-flight request
 * at a time and resolves/rejects it when the matching indication arrives. */
export class BleTrainerConnection implements TrainerConnection {
  private device: BluetoothDevice | null = null;
  private controlPoint: BluetoothRemoteGATTCharacteristic | null = null;
  private pendingControlRequest: PendingControlRequest | null = null;
  private sampleCallbacks = new Set<(sample: IndoorBikeSample) => void>();
  private disconnectCallbacks = new Set<() => void>();

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth is not available in this browser.");
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [FTMS_SERVICE] }],
    });
    this.device.addEventListener("gattserverdisconnected", this.handleDisconnected);

    const server = await this.device.gatt!.connect();
    const service = await server.getPrimaryService(FTMS_SERVICE);

    const indoorBikeData = await service.getCharacteristic(INDOOR_BIKE_DATA_CHARACTERISTIC);
    await indoorBikeData.startNotifications();
    indoorBikeData.addEventListener("characteristicvaluechanged", this.handleIndoorBikeData);

    this.controlPoint = await service.getCharacteristic(
      FITNESS_MACHINE_CONTROL_POINT_CHARACTERISTIC
    );
    await this.controlPoint.startNotifications();
    this.controlPoint.addEventListener(
      "characteristicvaluechanged",
      this.handleControlPointResponse
    );
  }

  async requestControl(): Promise<void> {
    await this.writeControlPoint(OPCODE_REQUEST_CONTROL, encodeRequestControl());
  }

  async startOrResume(): Promise<void> {
    await this.writeControlPoint(OPCODE_START_OR_RESUME, encodeStartOrResume());
  }

  async setSimulationGrade(gradePct: number): Promise<void> {
    await this.writeControlPoint(
      OPCODE_SET_INDOOR_BIKE_SIMULATION_PARAMETERS,
      encodeSetSimulationParameters({ gradePct })
    );
  }

  async stop(): Promise<void> {
    await this.writeControlPoint(OPCODE_STOP_OR_PAUSE, encodeStop());
  }

  async disconnect(): Promise<void> {
    this.device?.gatt?.disconnect();
  }

  onSample(cb: (sample: IndoorBikeSample) => void): () => void {
    this.sampleCallbacks.add(cb);
    return () => this.sampleCallbacks.delete(cb);
  }

  onDisconnected(cb: () => void): () => void {
    this.disconnectCallbacks.add(cb);
    return () => this.disconnectCallbacks.delete(cb);
  }

  private writeControlPoint(opcode: number, payload: DataView): Promise<void> {
    if (!this.controlPoint) {
      return Promise.reject(new Error("Not connected to a trainer."));
    }
    const controlPoint = this.controlPoint;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingControlRequest?.opcode === opcode) {
          this.pendingControlRequest = null;
          reject(new Error("Timed out waiting for the trainer to acknowledge the command."));
        }
      }, CONTROL_RESPONSE_TIMEOUT_MS);

      this.pendingControlRequest = {
        opcode,
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      };

      controlPoint.writeValueWithResponse(payload.buffer as ArrayBuffer).catch((error) => {
        clearTimeout(timeout);
        this.pendingControlRequest = null;
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  private handleIndoorBikeData = (event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    if (!characteristic.value) return;
    const sample = parseIndoorBikeData(characteristic.value);
    for (const cb of this.sampleCallbacks) cb(sample);
  };

  private handleControlPointResponse = (event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value || value.byteLength < 3) return;

    const responseCode = value.getUint8(0);
    const requestOpcode = value.getUint8(1);
    const resultCode = value.getUint8(2);
    if (responseCode !== OPCODE_RESPONSE_CODE) return;
    if (!this.pendingControlRequest || this.pendingControlRequest.opcode !== requestOpcode) return;

    const { resolve, reject } = this.pendingControlRequest;
    this.pendingControlRequest = null;
    if (resultCode === RESULT_SUCCESS) {
      resolve();
    } else {
      reject(
        new Error(
          `Trainer rejected control opcode 0x${requestOpcode.toString(16)} (result 0x${resultCode.toString(16)}).`
        )
      );
    }
  };

  private handleDisconnected = () => {
    for (const cb of this.disconnectCallbacks) cb();
  };
}
