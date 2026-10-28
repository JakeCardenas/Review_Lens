"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/client-api";

const EXPORT_FILTER_KEYS = ["from", "to", "product", "rating_min", "rating_max", "sentiment", "topic", "confidence", "status", "q"];

/** Download links for the labeled dataset and the summary, carrying the filters shown on the page. */
export function ExportLinks({ uploadId }: { uploadId: string }) {
  const searchParams = useSearchParams();
  const filters = new URLSearchParams();
  for (const key of EXPORT_FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) filters.set(key, value);
  }
  const query = filters.toString();
  const base = `/api/uploads/${uploadId}/export`;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={query ? "Download CSV files of the filtered reviews" : "Download CSV files"}>
      <a href={`${base}?type=reviews${query ? `&${query}` : ""}`} className={buttonClasses("secondary", "sm")}>
        <Download aria-hidden className="size-4" />
        <span>
          <span className="sm:hidden">Reviews</span>
          <span className="hidden sm:inline">Labeled reviews</span> CSV
        </span>
      </a>
      <a href={`${base}?type=summary${query ? `&${query}` : ""}`} className={buttonClasses("secondary", "sm")}>
        <Download aria-hidden className="size-4" />
        Summary CSV
      </a>
    </div>
  );
}

/** Two-step delete so a stray tap can't remove an upload. */
export function DeleteUploadButton({ uploadId, name }: { uploadId: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/uploads/${uploadId}`, { method: "DELETE" });
      toast.success(`Deleted “${name}”`);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "The upload couldn't be deleted.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-ink-2! hover:bg-danger-soft! hover:text-danger!">
        <Trash2 aria-hidden className="size-4" />
        Delete
      </Button>
    );
  }
  return (
    <div
      className="pop-in flex flex-wrap items-center gap-2 rounded-2xl border-[1.5px] border-[#f6d1cd] bg-danger-soft px-3 py-2"
      role="group"
      aria-label="Confirm delete"
    >
      <span className="text-sm font-bold">Delete this upload and all its reviews?</span>
      <Button variant="danger" size="sm" onClick={() => void remove()} disabled={busy}>
        {busy ? "Deleting…" : "Delete permanently"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        Keep it
      </Button>
    </div>
  );
}
