import { words } from "./english";

/** Tagalog words that say "not" or "none", including common texting spellings. */
export const TAGALOG_NEGATIONS = words(`
  hindi hndi hnd hinde nde indi di wala walang wla wlang ayaw ayoko wag huwag hwag
`);

/**
 * Tagalog markers, pronouns, particles and connectors, including texting spellings
 * ("nman", "ung", "xa"). Used as keyword stopwords and to recognise Tagalog text.
 */
export const TAGALOG_FUNCTION_WORDS = words(`
  ang ng nang mga sa si ni kay kina ay na pa po opo ho
  ako ko akin aking ka mo ikaw iyo iyong siya sya xa niya nya kanya kaniya kami namin amin tayo natin atin
  kayo ninyo nyo inyo sila nila kanila
  ito eto iyan yan iyon yon yun yung ung yong dito dyan diyan doon dun
  pero kasi kc kase dahil para pra kung kng kapag pag nung noong habang tapos tas saka sana
  naman nman nmn lang lng lamang din rin dn rn pala nga ngayon talaga tlga tlaga muna ba daw raw kaya pang
  meron mayroon mas pinaka napaka sobrang sobrng parang prang ganun ganon ganito ganyan yata siguro baka medyo medjo
`);

/** Texting spellings of Tagalog negations, so keywords such as "hindi maganda" are counted together. */
export const TAGALOG_SPELLINGS: ReadonlyMap<string, string> = new Map([
  ["hndi", "hindi"],
  ["hnd", "hindi"],
  ["hinde", "hindi"],
  ["nde", "hindi"],
  ["indi", "hindi"],
  ["wla", "wala"],
  ["wlang", "walang"],
  ["hwag", "huwag"],
]);

/** Frequent words in Filipino shopping reviews, used only to recognise Tagalog text. */
const TAGALOG_REVIEW_WORDS = words(`
  maganda ganda gnda mganda pangit panget sira nasira masira mabilis bilis mabagal bagal matagal tagal
  dumating darating dumtng pagdating natanggap nareceive nadeliver padala pinadala binili bili bumili bibili
  tela kulay sukat laki maliit malaki kasya sakto sulit mura mahal presyo bayad salamat slamat ingat ulit
  balot nakabalot kahon gumana gumagana nagana gamit gamitin maayos ayos nakakadismaya dismayado nakakainis
  galing magaling matibay marupok manipis makapal malambot mabango mabaho masarap sobra
  tindahan bumalik ibalik palit papalitan kulang kumpleto nagustuhan gusto bigay binigay
`);

export const TAGALOG_WORDS = new Set([...TAGALOG_FUNCTION_WORDS, ...TAGALOG_NEGATIONS, ...TAGALOG_REVIEW_WORDS]);
