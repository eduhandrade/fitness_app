"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useWebBluetoothAvailable } from "@/lib/trainer/use-web-bluetooth-available";

export function BikeTrainerLauncher() {
  const bluetoothAvailable = useWebBluetoothAvailable();

  if (!bluetoothAvailable) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-semibold text-warning">INDISPONÍVEL NO IOS</p>
          <p className="mt-1 text-xs text-foreground-muted">
            O Web Bluetooth não é suportado no Safari/iOS — é uma limitação da
            Apple, sem solução possível no navegador. Abra esta página no Chrome
            do seu tablet Android pra conectar o rolo de treino por Bluetooth.
          </p>
        </div>
        <Link href="/bike-trainer/ride">
          <Button variant="secondary" className="w-full">
            Try demo mode (no trainer needed)
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Link href="/bike-trainer/ride">
      <Button className="w-full">Start ride</Button>
    </Link>
  );
}
