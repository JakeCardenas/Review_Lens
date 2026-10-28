import Image from "next/image";

// The eagle silhouette, exactly as provided (1402 x 1122, transparent background).
const MARK = { src: "/brand/reviewlens-mark.png", width: 1402, height: 1122 };

/** The ReviewLens eagle mark. The square logo is only for browser and home-screen icons. */
export function BrandMark({
  height = 48,
  label,
  priority = false,
  className = "",
}: {
  height?: number;
  label?: string;
  priority?: boolean;
  className?: string;
}) {
  const width = Math.round((height * MARK.width) / MARK.height);
  return (
    <Image
      src={MARK.src}
      alt={label ?? ""}
      width={width}
      height={height}
      priority={priority}
      className={`shrink-0 ${className}`}
      style={{ width, height }}
    />
  );
}

/** The St. Paul University Philippines seal, unaltered, at a small size. */
export function SpupSeal({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/brand/spup-seal.png"
      alt="St. Paul University Philippines seal"
      width={size}
      height={size}
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
