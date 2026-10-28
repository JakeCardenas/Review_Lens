import Image from "next/image";

/**
 * The ReviewLens eagle, shown as an app tile. The artwork is used as provided (resized only);
 * the rounded corners just frame the square image.
 */
export function EagleMark({ size = 36, label, className = "" }: { size?: number; label?: string; className?: string }) {
  return (
    <Image
      src="/brand/reviewlens-eagle.png"
      alt={label ?? ""}
      width={size}
      height={size}
      priority={size <= 40}
      className={`shrink-0 rounded-[24%] ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
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
