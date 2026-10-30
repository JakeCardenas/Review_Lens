import { Mascots } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

/** The public welcome page for signed-out visitors: the mascots on one side, the slogan and two clear actions on the other. */
export function PublicWelcome() {
  return (
    <section aria-labelledby="welcome-title" className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-16 lg:py-8">
      <Mascots
        preload
        sizes="(min-width: 1024px) 480px, 300px"
        className="mx-auto w-full max-w-[260px] sm:max-w-[340px] lg:max-w-[480px]"
      />
      <div className="grid justify-items-center gap-6 text-center">
        <h1 id="welcome-title" className="max-w-lg font-display text-[2rem] font-black leading-tight text-ink sm:text-[2.5rem]">
          See what your reviews are really saying.
        </h1>
        <p className="max-w-sm text-body text-ink-2">
          Upload a CSV of customer reviews and find out how people feel and what they talk about.
        </p>
        <div className="grid w-full max-w-sm gap-3">
          <ButtonLink href="/sign-up" className="w-full">
            Get started
          </ButtonLink>
          <ButtonLink href="/sign-in" variant="secondary" className="w-full">
            I already have an account
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
