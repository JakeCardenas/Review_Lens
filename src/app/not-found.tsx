import { SearchX } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState
      icon={<SearchX aria-hidden className="size-6" />}
      title="This page doesn't exist"
      action={<ButtonLink href="/">Go to your uploads</ButtonLink>}
    >
      The upload may have been deleted, or the link is incomplete.
    </EmptyState>
  );
}
