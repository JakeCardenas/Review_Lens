import { Skeleton } from "@/components/ui";

/** Same shape as the overview: a heading, the big sentiment line and bar, then the takeaway panel. */
export default function UploadLoading() {
  return (
    <div className="grid gap-10" aria-busy="true" aria-label="Loading">
      <div className="grid gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-5 w-full rounded-full" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-card" />
    </div>
  );
}
