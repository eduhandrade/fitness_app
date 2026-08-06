"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShareIcon } from "@/components/icons";

export function InviteFriendButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/signup?code=${encodeURIComponent(inviteCode)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Trivo",
          text: "Estou usando o Trivo para acompanhar meus treinos de triathlon. Entra com esse link:",
          url,
        });
      } catch {
        // AbortError when the user cancels the native share sheet — not an error.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="secondary" onClick={handleClick} className="w-full">
        <ShareIcon className="h-4 w-4" />
        Invite a friend
      </Button>
      {copied && <p className="text-center text-xs text-primary-strong">Link copiado!</p>}
    </div>
  );
}
