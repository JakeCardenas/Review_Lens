import { Skeleton } from "@/components/ui";

export default function UploadLoading() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-24 w-full rounded-card" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-card lg:col-span-2" />
        <Skeleton className="h-72 rounded-card lg:col-span-3" />
      </div>
    </div>
  );
}
