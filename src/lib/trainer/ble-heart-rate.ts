import { HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT_CHARACTERISTIC } from "./ftms-constants";
import { parseHeartRateMeasurement } from "./ftms-parser";
import type { HeartRateConnection } from "./types";

/** A KICKR has no heart-rate sensor of its own — this pairs an independent
 * BLE heart rate strap (standard Heart Rate Service, 0x180D) alongside the
 * trainer connection. */
export class BleHeartRateConnection implements HeartRateConnection {
  private device: BluetoothDevice | null = null;
  private sampleCallbacks = new Set<(bpm: number) => void>();

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth is not available in this browser.");
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }],
    });

    const server = await this.device.gatt!.connect();
    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
    const measurement = await service.getCharacteristic(HEART_RATE_MEASUREMENT_CHARACTERISTIC);
    await measurement.startNotifications();
    measurement.addEventListener("characteristicvaluechanged", this.handleMeasurement);
  }

  async disconnect(): Promise<void> {
    this.device?.gatt?.disconnect();
  }

  onSample(cb: (bpm: number) => void): () => void {
    this.sampleCallbacks.add(cb);
    return () => this.sampleCallbacks.delete(cb);
  }

  private handleMeasurement = (event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    if (!characteristic.value) return;
    const bpm = parseHeartRateMeasurement(characteristic.value);
    for (const cb of this.sampleCallbacks) cb(bpm);
  };
}
