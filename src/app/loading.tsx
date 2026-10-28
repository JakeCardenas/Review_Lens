import { Skeleton } from "@/components/ui";

/** Same shape as the home page: a title, a line of text, the latest upload, then the list of earlier ones. */
export default function Loading() {
  return (
    <div className="grid gap-10" aria-busy="true" aria-label="Loading">
      <div className="grid gap-3">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="h-52 w-full rounded-card" />
      <Skeleton className="h-40 w-full rounded-card" />
    </div>
  );
}
