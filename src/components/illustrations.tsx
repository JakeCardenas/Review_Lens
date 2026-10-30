import type { ReactNode } from "react";

export type StickerName = "csv" | "explore" | "report" | "ready";

// ReviewLens stickers. Each is built like the buttons: white paper with a grey outline and a thicker
// grey lower edge, plus one round badge in lime or blue that sits on its own deeper edge, cut out with
// a white ring. Shapes are chunky and rounded on a 64px grid. From 36px up the main object gets a
// small face; smaller copies (inside buttons) drop it so they stay crisp.
const INK = "var(--ink)";
const LINE = "var(--line)";
const PAPER = "var(--surface)";

/** Two eyes with a glint and a smile, or closed happy eyes and an open smile ("joy"). */
function Face({ x, y, scale = 1, joy = false }: { x: number; y: number; scale?: number; joy?: boolean }) {
  const k = scale;
  const ex = 5.2 * k;
  if (joy) {
    return (
      <>
        <path
          d={`M${x - ex - 2.6 * k} ${y + 0.8 * k}q${2.6 * k} ${-3.6 * k} ${5.2 * k} 0M${x + ex - 2.6 * k} ${y + 0.8 * k}q${2.6 * k} ${-3.6 * k} ${5.2 * k} 0`}
          stroke={INK}
          strokeWidth={2.4 * k}
        />
        <path d={`M${x - 4.6 * k} ${y + 4.6 * k}h${9.2 * k}a${4.6 * k} ${4.6 * k} 0 0 1 ${-9.2 * k} 0z`} fill={INK} />
      </>
    );
  }
  return (
    <>
      <ellipse cx={x - ex} cy={y} rx={2.5 * k} ry={3.3 * k} fill={INK} />
      <ellipse cx={x + ex} cy={y} rx={2.5 * k} ry={3.3 * k} fill={INK} />
      <circle cx={x - ex + 0.9 * k} cy={y - 1.3 * k} r={0.95 * k} fill="#fff" />
      <circle cx={x + ex + 0.9 * k} cy={y - 1.3 * k} r={0.95 * k} fill="#fff" />
      <path d={`M${x - 3.6 * k} ${y + 5.2 * k}q${3.6 * k} ${3.6 * k} ${7.2 * k} 0`} stroke={INK} strokeWidth={2.5 * k} />
    </>
  );
}

/** A round badge on its own deeper edge, cut out of whatever is behind it with a white ring. */
function Badge({ fill, edge, children }: { fill: string; edge: string; children: ReactNode }) {
  return (
    <>
      <circle cx="47" cy="45" r="13.5" fill="#fff" />
      <circle cx="47" cy="48.5" r="13.5" fill="#fff" />
      <circle cx="47" cy="48.5" r="10.5" fill={edge} />
      <circle cx="47" cy="45" r="10.5" fill={fill} />
      {children}
    </>
  );
}

/** The sheet character: a spreadsheet with a lime header row. */
function Sheet({ face, joy = false }: { face: boolean; joy?: boolean }) {
  return (
    <>
      <rect x="8" y="9" width="40" height="48" rx="10" fill={LINE} />
      <rect x="8" y="5" width="40" height="48" rx="10" fill={PAPER} stroke={LINE} strokeWidth="3" />
      <path d="M8 15a10 10 0 0 1 10-10h20a10 10 0 0 1 10 10v4H8z" fill="var(--lime)" />
      <path d="M21.5 6.5v12.5M34.5 6.5v12.5" stroke="#fff" strokeWidth="2" />
      <rect x="8" y="5" width="40" height="48" rx="10" stroke={LINE} strokeWidth="3" />
      {face ? (
        <Face x={28} y={30} joy={joy} />
      ) : (
        <>
          <rect x="15" y="29" width="20" height="4.5" rx="2.25" fill="var(--sky)" />
          <rect x="15" y="37" width="13" height="4.5" rx="2.25" fill="var(--sky)" />
        </>
      )}
      {face && !joy && <rect x="15" y="42" width="13" height="4.5" rx="2.25" fill="var(--sky)" />}
    </>
  );
}

const ART: Record<StickerName, (face: boolean) => ReactNode> = {
  // Upload reviews: the sheet with a blue upload badge.
  csv: (face) => (
    <>
      <Sheet face={face} />
      <Badge fill="var(--blue)" edge="var(--blue-edge)">
        <path d="M47 50V40.5M42.8 44.5L47 40.3l4.2 4.2" stroke="#fff" strokeWidth="3.2" />
      </Badge>
    </>
  ),
  // Explore feedback: a review bubble under the lens character.
  explore: (face) => (
    <>
      <path
        d="M14 10h20a10 10 0 0 1 10 10v8a10 10 0 0 1-10 10H21l-7 7v-7a10 10 0 0 1-10-10v-8A10 10 0 0 1 14 10z"
        fill={LINE}
      />
      <path
        d="M14 6h20a10 10 0 0 1 10 10v8a10 10 0 0 1-10 10H21l-7 7v-7a10 10 0 0 1-10-10v-8A10 10 0 0 1 14 6z"
        fill={PAPER}
        stroke={LINE}
        strokeWidth="3"
      />
      <rect x="11" y="14" width="20" height="5" rx="2.5" fill="var(--lime)" />
      <rect x="11" y="23" width="12" height="5" rx="2.5" fill={LINE} />
      <path d="M50 47l7.5 7.5" stroke="#fff" strokeWidth="14" />
      <path d="M50 47l7.5 7.5" stroke="var(--lime-edge)" strokeWidth="8" />
      <circle cx="40" cy="36" r="18" fill="#fff" />
      <circle cx="40" cy="39.5" r="15" fill="var(--lime-edge)" />
      <circle cx="40" cy="36" r="15" fill="var(--lime)" />
      <circle cx="40" cy="36" r="10.5" fill="var(--sky)" />
      <path d="M27.6 31.5a13 13 0 0 1 6.4-7.6" stroke="#fff" strokeWidth="2.6" opacity=".7" />
      {face ? <Face x={40} y={35.5} scale={0.8} /> : <path d="M34.5 33.5a6.5 6.5 0 0 1 4.5-4.2" stroke="#fff" strokeWidth="2.6" />}
    </>
  ),
  // Export report: a document with a folded corner, a small bar chart and a lime download badge.
  report: (face) => (
    <>
      <path d="M19 9h18l10 10v30a10 10 0 0 1-10 10H19A10 10 0 0 1 9 49V19A10 10 0 0 1 19 9z" fill={LINE} />
      <path d="M19 5h18l10 10v30a10 10 0 0 1-10 10H19A10 10 0 0 1 9 45V15A10 10 0 0 1 19 5z" fill={PAPER} stroke={LINE} strokeWidth="3" />
      <path d="M37 5v6a4 4 0 0 0 4 4h6" fill={LINE} stroke={LINE} strokeWidth="3" />
      {face ? <Face x={25} y={21} scale={0.85} /> : <rect x="15" y="15" width="14" height="4.5" rx="2.25" fill={LINE} />}
      <rect x="15" y="34" width="6" height="12" rx="3" fill="var(--lime)" />
      <rect x="24.5" y={face ? 30 : 25} width="6" height={face ? 16 : 21} rx="3" fill="var(--blue)" />
      <Badge fill="var(--lime)" edge="var(--lime-edge)">
        <path d="M47 39.8v9.6M42.8 45.4l4.2 4.2 4.2-4.2" stroke="var(--on-brand)" strokeWidth="3.2" />
      </Badge>
    </>
  ),
  // Ready: the sheet again, happy, with a lime check badge and two blue sparkles.
  ready: (face) => (
    <>
      <Sheet face={face} joy />
      <Badge fill="var(--lime)" edge="var(--lime-edge)">
        <path d="m42.4 45.2 3.2 3.2 6-6.4" stroke="var(--on-brand)" strokeWidth="3.2" />
      </Badge>
      <path d="M55 6v7M51.5 9.5h7M5 30v4M3 32h4" stroke="var(--blue)" strokeWidth="2.4" />
    </>
  ),
};

/**
 * ReviewLens stickers for the main jobs: the sheet for uploading, the lens for exploring feedback, the
 * report for exporting, and the happy sheet when something is ready. Used sparingly, always beside a
 * visible label; decorative, so screen readers skip them.
 */
export function Sticker({ name, size = 24, className = "" }: { name: StickerName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {ART[name](size >= 36)}
    </svg>
  );
}
