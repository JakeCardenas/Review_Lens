import { Skeleton } from "@/components/ui";

/** Same shape as the overview: filters, three summary tiles, then two rows of cards. */
export default function UploadLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-24 w-full rounded-card" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <Skeleton className="h-44 rounded-card lg:col-span-3" />
        <Skeleton className="h-44 rounded-card sm:col-span-2 lg:col-span-6" />
        <Skeleton className="h-44 rounded-card lg:col-span-3" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-96 rounded-card lg:col-span-7" />
        <Skeleton className="h-96 rounded-card lg:col-span-5" />
      </div>
    </div>
  );
}
