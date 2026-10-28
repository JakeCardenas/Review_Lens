"use client";

import { EagleMark } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-xl flex-col items-center rounded-card border-2 border-line bg-surface px-6 py-12 text-center"
    >
      <EagleMark size={64} className="mb-4" />
      <h1 className="font-display text-heading-sm font-black text-brand-display">This page couldn&apos;t load</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        ReviewLens couldn&apos;t reach its data. Try again in a moment. If you&apos;re running it yourself, check that DATABASE_URL is
        set and the database is running.
      </p>
      {error.digest && <p className="mt-2 text-[13px] text-ink-3">Reference: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go to your uploads
        </ButtonLink>
      </div>
    </div>
  );
}
