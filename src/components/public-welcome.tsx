import Image from "next/image";
import { ButtonLink } from "@/components/ui";

// The ReviewLens mascots, exactly as provided (1254 x 1254, on the same sky blue as the welcome page).
const MASCOTS = { src: "/brand/reviewlens-mascots.webp", width: 1254, height: 1254 };

/** The public welcome page for signed-out visitors: the mascots on one side, the slogan and two clear actions on the other. */
export function PublicWelcome() {
  return (
    <section
      data-public-page
      aria-labelledby="welcome-title"
      className="mx-auto grid w-full max-w-6xl items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-16 lg:py-8"
    >
      <Image
        src={MASCOTS.src}
        alt=""
        width={MASCOTS.width}
        height={MASCOTS.height}
        priority
        sizes="(min-width: 1024px) 480px, 280px"
        className="mx-auto h-auto w-full max-w-[240px] sm:max-w-[320px] lg:max-w-[480px]"
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
          {/* The longer label steps down a size on the narrowest phones so it stays on one line. */}
          <ButtonLink href="/sign-in" variant="secondary" className="w-full px-4 max-[359px]:text-[13px] max-[359px]:tracking-[0.03em]">
            I already have an account
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
