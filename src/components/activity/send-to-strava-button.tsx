"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  sendActivityToStrava,
  checkStravaUploadStatus,
} from "@/app/(app)/activities/actions";

const POLL_INTERVAL_MS = 3000;

type Phase = "idle" | "uploading" | "processing" | "needs_reconnect" | "error" | "done";

export function SendToStravaButton({
  activityId,
  alreadySentStravaId,
}: {
  activityId: string;
  alreadySentStravaId?: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(alreadySentStravaId ? "done" : "idle");
  const [stravaActivityId, setStravaActivityId] = useState<string | null>(
    alreadySentStravaId ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  function pollUploadStatus(uploadId: string) {
    pollTimer.current = setTimeout(async () => {
      try {
        const result = await checkStravaUploadStatus(activityId, uploadId);
        if (unmountedRef.current) return;
        if (result.status === "pending") {
          pollUploadStatus(uploadId);
        } else if (result.status === "done") {
          setStravaActivityId(result.stravaActivityId);
          setPhase("done");
          router.refresh();
        } else {
          setErrorMessage(result.error);
          setPhase("error");
        }
      } catch (err) {
        if (unmountedRef.current) return;
        setErrorMessage(err instanceof Error ? err.message : "Upload status check failed.");
        setPhase("error");
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleSend() {
    setPhase("uploading");
    setErrorMessage(null);
    try {
      const result = await sendActivityToStrava(activityId);
      if (result.status === "needs_reconnect") {
        setPhase("needs_reconnect");
        return;
      }
      setPhase("processing");
      pollUploadStatus(result.uploadId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed.");
      setPhase("error");
    }
  }

  if (phase === "done" && stravaActivityId) {
    return (
      <a
        href={`https://www.strava.com/activities/${stravaActivityId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button type="button" variant="secondary">
          View on Strava ↗
        </Button>
      </a>
    );
  }

  if (phase === "needs_reconnect") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-foreground-muted">
          Strava needs permission to accept uploads. Reconnect your account, then try again.
        </p>
        <a href="/api/strava/connect">
          <Button type="button" variant="secondary">
            Reconnect Strava
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errorMessage && <p className="text-xs text-danger">{errorMessage}</p>}
      <Button
        type="button"
        variant="secondary"
        disabled={phase === "uploading" || phase === "processing"}
        onClick={handleSend}
      >
        {phase === "uploading"
          ? "Uploading…"
          : phase === "processing"
            ? "Processing…"
            : phase === "error"
              ? "Try again"
              : "Send to Strava"}
      </Button>
    </div>
  );
}
