import Image from "next/image";

// The eagle silhouette, exactly as provided (1402 x 1122, transparent background).
const MARK = { src: "/brand/reviewlens-mark.png", width: 1402, height: 1122 };

// The ReviewLens mascots, exactly as provided (1254 x 1254, on a sky blue that matches --sky).
const MASCOTS = { src: "/brand/reviewlens-mascots.webp", width: 1254, height: 1254 };

/** The ReviewLens eagle mark: the logo in the header. The square logo is only for browser and home-screen icons. */
export function BrandMark({
  height = 48,
  label,
  eager = false,
  className = "",
}: {
  height?: number;
  label?: string;
  /** Load right away, for a mark that is always on the first screen. */
  eager?: boolean;
  className?: string;
}) {
  const width = Math.round((height * MARK.width) / MARK.height);
  return (
    <Image
      src={MARK.src}
      alt={label ?? ""}
      width={width}
      height={height}
      loading={eager ? "eager" : undefined}
      className={`shrink-0 ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * The mascots illustration on its own sky-blue panel, for the few moments that welcome someone: the
 * public welcome page, the first upload and the page-not-found screen. Decorative: the words beside it
 * carry the message. The panel's padding keeps the picture whole; nothing is cropped.
 */
export function Mascots({
  sizes,
  preload = false,
  className = "",
}: {
  sizes: string;
  /** Preload it when it is the page's largest picture on the first screen. */
  preload?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-[28px] bg-accent-soft p-2.5 ${className}`}>
      <Image src={MASCOTS.src} alt="" width={MASCOTS.width} height={MASCOTS.height} preload={preload} sizes={sizes} className="h-auto w-full" />
    </div>
  );
}
