"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { disconnectStrava } from "@/app/(app)/settings/actions";

export function StravaConnectionCard({
  connected,
  athleteId,
  lastSyncedAt,
}: {
  connected: boolean;
  athleteId?: string;
  lastSyncedAt?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data.error ?? "Sync failed.");
      } else {
        setSyncMessage(`Synced ${data.synced} activities.`);
        router.refresh();
      }
    } catch {
      setSyncMessage("Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-foreground-muted">
          Connect your Strava account to automatically pull in your swim, bike,
          and run activities.
        </p>
        <a href="/api/strava/connect">
          <Button type="button">Connect Strava</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Connected as athlete <span className="text-foreground-muted">#{athleteId}</span>
      </p>
      <p className="text-xs text-foreground-muted">
        {lastSyncedAt ? `Last synced ${lastSyncedAt}` : "Never synced yet"}
      </p>
      {syncMessage && <p className="text-xs text-primary-strong">{syncMessage}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(() => disconnectStrava())}
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}
