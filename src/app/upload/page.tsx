import type { Metadata } from "next";
import { connection } from "next/server";
import { UploadWizard } from "@/components/upload/upload-wizard";
import { getProviderInfo } from "@/lib/analysis/providers";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "New upload" };

export default async function UploadPage() {
  await connection(); // read the analysis settings per request, not at build time
  await requireUser("/upload");
  const provider = getProviderInfo();
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">New upload</h1>
        <p className="mt-1 text-ink-2">Add a CSV of customer reviews. ReviewLens labels each review and finds what customers talk about.</p>
      </div>
      <UploadWizard provider={{ label: provider.label, external: provider.external, problem: provider.problem }} />
    </div>
  );
}
