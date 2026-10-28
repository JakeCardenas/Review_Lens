import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState mascot heading="h1" title="We couldn't find that page" action={<ButtonLink href="/">Go to your uploads</ButtonLink>}>
      The upload may have been deleted, or the link may be incomplete.
    </EmptyState>
  );
}
