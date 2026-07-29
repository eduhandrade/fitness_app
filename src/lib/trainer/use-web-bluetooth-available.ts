"use client";

import { useSyncExternalStore } from "react";
import { isWebBluetoothAvailable } from "./capability";

function subscribe() {
  return () => {};
}

function getServerSnapshot(): boolean {
  return false;
}

/** Client-only capability check. Uses useSyncExternalStore (rather than
 * useState+useEffect) so React reconciles the server-vs-client snapshot
 * difference itself during hydration — `navigator.bluetooth` doesn't exist
 * during SSR, so the server always "sees" unavailable, and this is the
 * React-idiomatic way to surface a corrected client-only value without a
 * setState-in-effect anti-pattern or a hydration mismatch. */
export function useWebBluetoothAvailable(): boolean {
  return useSyncExternalStore(subscribe, isWebBluetoothAvailable, getServerSnapshot);
}
