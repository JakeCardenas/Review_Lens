"use client";

import { Button, ButtonLink, Notice } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Notice tone="error" title="This page couldn't load">
        ReviewLens couldn&apos;t reach its data. If you&apos;re running it yourself, check that DATABASE_URL is set and the database
        is running, then try again.
        {error.digest && <span className="mt-1 block text-xs">Reference: {error.digest}</span>}
      </Notice>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go to your uploads
        </ButtonLink>
      </div>
    </div>
  );
}
