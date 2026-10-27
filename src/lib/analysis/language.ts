import { francAll } from "franc-min";
import type { LanguageStatus } from "@/lib/types";
import { ENGLISH_WORDS, FOREIGN_WORDS } from "./english";

export type LanguageResult = { status: LanguageStatus; code: string; name: string };

const LANGUAGE_NAMES: Record<string, string> = {
  eng: "English", spa: "Spanish", por: "Portuguese", fra: "French", deu: "German", ita: "Italian", nld: "Dutch",
  tgl: "Tagalog", ceb: "Cebuano", ind: "Indonesian", zlm: "Malay", tur: "Turkish", rus: "Russian", ukr: "Ukrainian",
  pol: "Polish", ron: "Romanian", hun: "Hungarian", ces: "Czech", swe: "Swedish", jpn: "Japanese", kor: "Korean",
  cmn: "Chinese", arb: "Arabic", hin: "Hindi", ben: "Bengali", vie: "Vietnamese", tha: "Thai", urd: "Urdu",
  pes: "Persian", swh: "Swahili", jav: "Javanese", sun: "Sundanese", ell: "Greek", heb: "Hebrew",
};

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? "another language";
}

const UNDETERMINED: LanguageResult = { status: "undetermined", code: "und", name: "Unknown" };

/**
 * Decides whether a review can be labeled as English. franc-min alone often misreads short
 * English reviews, so the decision also counts common English and non-English words.
 */
export function detectLanguage(text: string): LanguageResult {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 15) return UNDETERMINED;

  const tokens = text.toLowerCase().replace(/’/g, "'").match(/\p{L}+(?:'\p{L}+)?/gu) ?? [];
  const english = tokens.filter((t) => ENGLISH_WORDS.has(t)).length;
  const foreign = tokens.filter((t) => FOREIGN_WORDS.has(t)).length;
  const nonLatin = letters.filter((l) => !/\p{Script=Latin}/u.test(l)).length / letters.length;

  const ranked = francAll(text, { minLength: 10 });
  const top = ranked[0]?.[0] ?? "und";
  const otherCode = ranked.find(([code]) => code !== "eng" && code !== "und")?.[0] ?? "und";
  const result = (status: LanguageStatus, code: string): LanguageResult => ({ status, code, name: languageName(code) });

  if (nonLatin > 0.3) return english >= 2 ? result("mixed", otherCode) : result("unsupported", otherCode);
  if (english >= 2 && foreign >= 2) return result("mixed", otherCode);
  if (foreign >= 2 && english <= 1) return result("unsupported", top === "eng" ? otherCode : top);
  if (english >= 1 || top === "eng") return result("supported", "eng");
  if (top === "und") return UNDETERMINED;
  return result("unsupported", top);
}
