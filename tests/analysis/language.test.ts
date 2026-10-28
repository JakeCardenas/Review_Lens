import { describe, expect, it } from "vitest";
import { describeLanguage, detectLanguage } from "@/lib/analysis/language";

describe("detectLanguage", () => {
  it("accepts English reviews", () => {
    expect(detectLanguage("The kettle arrived quickly and works perfectly, very happy with it.")).toMatchObject({
      status: "supported",
      code: "eng",
    });
  });

  it("marks another language as unsupported and names it", () => {
    expect(detectLanguage("El producto llegó tarde y la caja estaba rota, estoy muy decepcionado con la tienda.")).toEqual({
      status: "unsupported",
      code: "spa",
      name: "Spanish",
    });
  });

  it("marks reviews that mix English with another language", () => {
    expect(detectLanguage("Great product pero mabagal ang delivery at sira ang kahon pagdating.").status).toBe("mixed");
  });

  it("cannot tell the language of very short text", () => {
    expect(detectLanguage("Love it!").status).toBe("undetermined");
    expect(detectLanguage("").status).toBe("undetermined");
  });
});

describe("detectLanguage for a provider that reads Tagalog", () => {
  const tagalog = { tagalog: true };

  it("accepts Tagalog reviews", () => {
    expect(detectLanguage("Sobrang ganda ng tela at mabilis dumating. Salamat po!", tagalog)).toEqual({
      status: "supported",
      code: "tgl",
      name: "Tagalog",
    });
  });

  it("reads texting spellings as Tagalog", () => {
    expect(detectLanguage("hndi xa gumana, ung isa nman sira na pagdating", tagalog)).toMatchObject({
      status: "supported",
      code: "tgl",
    });
  });

  it("marks Taglish as Tagalog mixed with English", () => {
    expect(detectLanguage("Maganda naman yung quality and walang sira, thank you seller", tagalog)).toEqual({
      status: "mixed",
      code: "tgl",
      name: "Tagalog",
    });
  });

  it("keeps an English review with one Tagalog courtesy word as English", () => {
    expect(detectLanguage("Fast delivery and great quality, thank you po", tagalog)).toMatchObject({
      status: "supported",
      code: "eng",
    });
  });

  it("reads Taglish written in texting shorthand", () => {
    for (const text of [
      "ok nmn ung bag pero ndi matibay ung strap",
      "wla pdn reply si seller, tas sira pa ung box",
      "gnda sna kso ndi gumana agd",
    ]) {
      expect(detectLanguage(text, tagalog).code).toBe("tgl");
    }
  });

  it("does not mistake Spanish for Tagalog", () => {
    expect(
      detectLanguage("El producto llegó tarde y la caja estaba rota, pero el vendedor fue muy amable.", tagalog),
    ).toMatchObject({ status: "unsupported", code: "spa" });
  });

  it("leaves Basic mode's reading of Tagalog unchanged", () => {
    expect(detectLanguage("Sobrang ganda ng tela at mabilis dumating. Salamat po!").status).toBe("unsupported");
  });
});

describe("describeLanguage", () => {
  it("names the language of a supported review", () => {
    expect(describeLanguage("supported", "eng")).toBe("English");
    expect(describeLanguage("supported", "tgl")).toBe("Tagalog");
  });

  it("calls Tagalog mixed with English Taglish", () => {
    expect(describeLanguage("mixed", "tgl")).toBe("Taglish (Tagalog and English)");
    expect(describeLanguage("mixed", "spa")).toBe("Mixed (English and Spanish)");
  });

  it("marks unsupported and undetermined languages", () => {
    expect(describeLanguage("unsupported", "spa")).toBe("Spanish (not supported yet)");
    expect(describeLanguage("undetermined", "und")).toBe("Too short to tell");
  });
});
