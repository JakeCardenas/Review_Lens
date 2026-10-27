"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/client-api";

export function RetryFailedButton({ uploadId, count }: { uploadId: string; count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true);
    try {
      await api(`/api/uploads/${uploadId}/retry`, { method: "POST" });
      router.push(`/uploads/${uploadId}/analyze`);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "Couldn't retry the failed reviews.");
      setBusy(false);
    }
  }
  return (
    <Button onClick={() => void retry()} disabled={busy} size="sm">
      <RotateCcw aria-hidden className="size-4" />
      {busy ? "Retrying…" : `Retry ${count} failed`}
    </Button>
  );
}
