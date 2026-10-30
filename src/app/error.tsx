"use client";

import { Mascots } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-xl flex-col items-center px-6 py-12 text-center"
    >
      <Mascots sizes="200px" className="mb-6 w-[200px]" />
      <h1 className="font-display text-[2rem] font-black leading-tight text-ink">This page didn&apos;t load</h1>
      <p className="mt-2 text-body text-ink-2">Something went wrong on our side. Try again in a moment.</p>
      <p className="mt-2 text-[15px] text-ink-2">
        Running ReviewLens yourself? Check that DATABASE_URL is set and the database is running.
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
