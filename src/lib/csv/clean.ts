const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Normalizes review text: strips HTML, decodes entities, removes control characters, collapses whitespace. */
export function cleanText(raw: string): string {
  return decodeEntities(
    String(raw ?? "")
      .normalize("NFC")
      .replace(/<\s*(br|\/p|\/div|\/li)\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,!?;:)]/gi;
const HANDLE = /(^|[^\w@[])@[A-Za-z0-9_]{2,30}\b/g;
const NUMBER_RUN = /(?<![\w.])\+?\d[\d\s().-]{5,}\d(?![\w])/g;

/** Masks emails, links, social handles, phone numbers and long account/order numbers. */
export function maskPersonalData(text: string): string {
  return text
    .replace(URL_PATTERN, "[link]")
    .replace(EMAIL, "[email]")
    .replace(HANDLE, "$1[handle]")
    .replace(NUMBER_RUN, (match) => {
      const digits = match.replace(/\D/g, "").length;
      if (/^\d{4}-\d{2}-\d{2}$/.test(match)) return match;
      if (digits >= 16) return "[number]";
      if (digits < 7) return match;
      const hasSeparators = /[\s().+-]/.test(match);
      return hasSeparators ? "[phone]" : "[number]";
    });
}

/** True when text shows signs of a non-UTF-8 file (replacement characters or common mojibake). */
export function looksMisencoded(text: string): boolean {
  return /�|Ã[\u0080-¿]|â€[™œ\u009d“”˜]/.test(text);
}
