import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AnalyzeProgress } from "@/components/analyze-progress";
import { ImportUnfinished } from "@/components/import-unfinished";
import { providerLabel } from "@/lib/provider-label";
import { getDb } from "@/lib/server/db";
import { getProgress, getUpload } from "@/lib/server/uploads";

export const metadata: Metadata = { title: "Analysis progress" };

export default async function AnalyzePage({ params }: PageProps<"/uploads/[id]/analyze">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const [upload, progress] = await Promise.all([getUpload(db, id), getProgress(db, id)]);
  if (!upload || !progress) notFound();
  if (upload.status === "importing") return <ImportUnfinished />;
  return (
    <AnalyzeProgress uploadId={upload.id} initial={progress} methodLabel={providerLabel(upload.provider, upload.model)} />
  );
}
