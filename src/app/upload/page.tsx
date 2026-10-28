import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { UploadWizard } from "@/components/upload/upload-wizard";
import { getProviderInfo } from "@/lib/analysis/providers";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Upload reviews" };

export default async function UploadPage() {
  await connection(); // read the analysis settings per request, not at build time
  await requireUser("/upload");
  const provider = getProviderInfo();
  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <div className="grid gap-5">
        <Link href="/" className="press nav-label inline-flex w-fit items-center gap-1.5 rounded-control py-1 pr-2 text-[13px] text-accent-ink">
          <ArrowLeft aria-hidden className="size-4" strokeWidth={3} />
          All uploads
        </Link>
        <PageHeader
          title="Upload reviews"
          description="Add a CSV of customer reviews. ReviewLens labels each review and finds what customers talk about."
        />
      </div>
      <UploadWizard provider={{ label: provider.label, external: provider.external, problem: provider.problem }} />
    </div>
  );
}
