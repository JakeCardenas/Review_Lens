import Image from "next/image";
// Imported rather than linked by path, so the file's content hash is part of its URL and a replaced
// picture is never served from an old cache (browser, image optimizer or CDN).
import mascotsImage from "../../public/brand/reviewlens-mascots.webp";

// The eagle silhouette, exactly as provided (1402 x 1122, transparent background).
const MARK = { src: "/brand/reviewlens-mark.png", width: 1402, height: 1122 };

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
 * The mascots illustration (1254 x 1254, exactly as provided, on a white background that matches the
 * page), for the few moments that welcome someone: the public welcome page, the first
 * upload, and the not-found and error screens. It sits straight on the white page. Decorative: the words
 * beside it carry the message.
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
    <Image src={mascotsImage} alt="" preload={preload} sizes={sizes} className={`h-auto ${className}`} />
  );
}
