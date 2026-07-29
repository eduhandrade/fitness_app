/** Web Bluetooth is only ever available in Chrome/Edge/Android-Chrome/
 * Desktop — never in Safari/iOS in any browser, no workaround (a WebKit
 * restriction). Capability-detect at runtime rather than user-agent
 * sniffing, since that's the only reliable signal and it also covers other
 * unsupported browsers (e.g. desktop Firefox) for free. */
export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}
